import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import {
  Notification,
  NotificationStatus,
  NotificationType,
} from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { TelegramService } from '../telegram/telegram.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    private readonly telegram: TelegramService,
    private readonly usersService: UsersService,
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

    // Push to Telegram in addition to storing in-app (TOR section 16)
    const user = await this.usersService.findById(dto.user_id);
    if (user) {
      const delivered = await this.telegram.sendMessage(
        user.telegram_id,
        `<b>${dto.title}</b>\n${dto.body}`,
      );
      if (delivered) {
        saved.status = NotificationStatus.SENT;
        await this.repo.save(saved);
      }
    }

    this.events.emit('notification.created', saved);
    return saved;
  }

  async markRead(id: string) {
    await this.repo.update(id, { status: NotificationStatus.READ });
    return this.repo.findOne({ where: { id } });
  }

  // --- Auto-generated notifications from domain events ---
  // These listeners turn internal events (emitted by Shifts/Replacement
  // services) into the notification types described in TOR section 16.
  // Recipient resolution (which admins/owners to notify for a shift) is
  // left as a TODO — wire it to the restaurant's staff once that lookup
  // helper exists.

  @OnEvent('shift.emergency')
  async onEmergencyShift(shift: any) {
    // TODO: resolve all employees matching shift.position_id and notify each
    this.events.emit('ws.emergency_shift', shift);
  }

  @OnEvent('replacement.requested')
  async onReplacementRequested(payload: { request: any; shift: any }) {
    // TODO: notify admins + employees of the same position
    this.events.emit('ws.replacement_request', payload);
  }

  @OnEvent('replacement.accepted')
  async onReplacementAccepted(request: any) {
    this.events.emit('ws.replacement_accepted', request);
  }
}
