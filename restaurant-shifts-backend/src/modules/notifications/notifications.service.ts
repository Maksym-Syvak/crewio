import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import {
  Notification,
  NotificationStatus,
  NotificationType,
} from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { TelegramService } from '../telegram/telegram.service';
import { UsersService } from '../users/users.service';
import { EmployeesService } from '../employees/employees.service';
import { formatDateShort, formatDateUk, formatTimeHm } from '../shifts/utils/date-format';
import { getAvailableSlots } from '../shifts/utils/shift-helpers';

export interface ScheduleGeneratedPayload {
  restaurant_id: string;
  count: number;
  date_from: string;
  date_to: string;
  shifts: { id: string }[];
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    private readonly telegram: TelegramService,
    private readonly usersService: UsersService,
    private readonly employeesService: EmployeesService,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
  ) {}

  findAll(userId?: string) {
    return this.repo.find({
      where: userId ? { user_id: userId } : {},
      order: { created_at: 'DESC' },
    });
  }

  async create(dto: CreateNotificationDto) {
    const notification = this.repo.create({
      ...dto,
      status: NotificationStatus.UNREAD,
    });
    const saved = await this.repo.save(notification);

    const user = await this.usersService.findById(dto.user_id);
    if (user) {
      const frontendUrl = this.config.get<string>('FRONTEND_URL');
      const replyMarkup = this.buildReplyMarkup(dto, frontendUrl);

      const delivered = await this.telegram.sendMessage(
        user.telegram_id,
        `<b>${dto.title}</b>\n${dto.body}`,
        replyMarkup ? { replyMarkup } : undefined,
      );
      if (delivered) {
        saved.status = NotificationStatus.SENT;
        await this.repo.save(saved);
      }
    }

    this.events.emit('notification.created', saved);
    return saved;
  }

  private buildReplyMarkup(dto: CreateNotificationDto, frontendUrl?: string) {
    if (!frontendUrl) return undefined;

    if (dto.metadata?.action === 'view_schedule') {
      return {
        inline_keyboard: [
          [{ text: 'Переглянути', web_app: { url: `${frontendUrl}/shifts` } }],
        ],
      };
    }

    if (dto.metadata?.action === 'book_shift' && dto.related_shift_id) {
      return {
        inline_keyboard: [
          [
            {
              text: 'Забронювати',
              web_app: { url: `${frontendUrl}/shifts/${dto.related_shift_id}` },
            },
          ],
        ],
      };
    }

    if (dto.metadata?.action === 'view_shift' && dto.related_shift_id) {
      return {
        inline_keyboard: [
          [
            {
              text: 'Переглянути',
              web_app: { url: `${frontendUrl}/shifts/${dto.related_shift_id}` },
            },
          ],
        ],
      };
    }

    return undefined;
  }

  async markRead(id: string) {
    await this.repo.update(id, { status: NotificationStatus.READ });
    return this.repo.findOne({ where: { id } });
  }

  private async notifyRestaurantEmployees(
    restaurantId: string,
    build: (userId: string) => Omit<CreateNotificationDto, 'user_id'>,
  ) {
    const employees = await this.employeesService.findActiveByRestaurant(restaurantId);
    for (const employee of employees) {
      if (!employee.user_id) continue;
      await this.create({ user_id: employee.user_id, ...build(employee.user_id) });
    }
  }

  private buildUrgentBody(shift: any) {
    const available = getAvailableSlots(shift);
    return [
      '',
      'Заклад:',
      shift.restaurant?.name ?? '—',
      '',
      'Дата:',
      formatDateShort(shift.start_time),
      '',
      'Час:',
      `${formatTimeHm(shift.start_time)}-${formatTimeHm(shift.end_time)}`,
      '',
      'Вільних місць:',
      String(available),
    ].join('\n');
  }

  @OnEvent('schedule.generated')
  async onScheduleGenerated(payload: ScheduleGeneratedPayload) {
    const periodFrom = formatDateUk(payload.date_from);
    const periodTo = formatDateUk(payload.date_to);
    const body = [
      '',
      'Період:',
      `${periodFrom} - ${periodTo}`,
      '',
      'Доступно:',
      `${payload.count} змін.`,
    ].join('\n');

    await this.notifyRestaurantEmployees(payload.restaurant_id, () => ({
      type: NotificationType.SCHEDULE_PUBLISHED,
      title: '📅 Додано новий графік.',
      body,
      metadata: {
        action: 'view_schedule',
        date_from: payload.date_from,
        date_to: payload.date_to,
        shift_count: payload.count,
        shift_ids: payload.shifts.map((s) => s.id),
      },
    }));

    this.events.emit('ws.schedule_generated', payload);
  }

  @OnEvent('shift.emergency')
  async onEmergencyShift(shift: any) {
    await this.sendUrgentNotification(shift);
    this.events.emit('ws.emergency_shift', shift);
  }

  @OnEvent('shift.urgent_reminder')
  async onUrgentReminder(payload: { shift: any; threshold: number }) {
    await this.sendUrgentNotification(payload.shift);
  }

  private async sendUrgentNotification(shift: any) {
    const body = this.buildUrgentBody(shift);

    await this.notifyRestaurantEmployees(shift.restaurant_id, () => ({
      type: NotificationType.URGENT_REPLACEMENT,
      title: '🚨 Потрібно закрити зміну',
      body,
      related_shift_id: shift.id,
      metadata: { action: 'book_shift', shift_id: shift.id },
    }));
  }

  @OnEvent('replacement.requested')
  async onReplacementRequested(payload: { request: any; shift: any }) {
    this.events.emit('ws.replacement_request', payload);
  }

  @OnEvent('replacement.accepted')
  async onReplacementAccepted(request: any) {
    this.events.emit('ws.replacement_accepted', request);
  }
}
