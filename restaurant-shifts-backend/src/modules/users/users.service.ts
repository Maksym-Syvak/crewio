import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { Employee } from '../employees/entities/employee.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Statistics } from '../statistics/entities/statistics.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { normalizeTelegramId } from '../../common/utils/telegram-id.util';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Employee)
    private readonly employeesRepo: Repository<Employee>,
    @InjectRepository(Notification)
    private readonly notificationsRepo: Repository<Notification>,
    @InjectRepository(Statistics)
    private readonly statisticsRepo: Repository<Statistics>,
    @InjectRepository(Restaurant)
    private readonly restaurantsRepo: Repository<Restaurant>,
  ) {}

  findByTelegramId(telegramId: string | number) {
    const id = normalizeTelegramId(telegramId);
    return this.usersRepo.findOne({
      where: { telegram_id: id, is_deleted: false },
    });
  }

  findAnyByTelegramId(telegramId: string | number) {
    const id = normalizeTelegramId(telegramId);
    return this.usersRepo.findOne({
      where: { telegram_id: id },
      withDeleted: true,
    });
  }

  async getTelegramUserStatus(telegramId: string | number) {
    const user = await this.findAnyByTelegramId(telegramId);
    if (!user) {
      return { exists: false, deleted: false, can_restore: false };
    }
    if (user.is_deleted) {
      return { exists: true, deleted: true, can_restore: true };
    }
    return { exists: true, deleted: false, can_restore: false };
  }

  async restoreUser(id: string, data: Partial<User> = {}) {
    await this.usersRepo.restore(id);
    await this.usersRepo.update(id, { is_deleted: false, ...data });
    return this.findById(id);
  }

  async hardDeleteUser(id: string) {
    await this.usersRepo.delete(id);
  }

  findById(id: string) {
    return this.usersRepo.findOne({ where: { id, is_deleted: false } });
  }

  create(data: Partial<User>) {
    const user = this.usersRepo.create({
      ...data,
      telegram_id: data.telegram_id != null ? normalizeTelegramId(data.telegram_id) : undefined,
    });
    return this.usersRepo.save(user);
  }

  update(id: string, data: Partial<User>) {
    return this.usersRepo.update(id, data).then(() => this.findById(id));
  }

  async deleteAccount(userId: string, dto: DeleteAccountDto) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException(
        'Перед видаленням передайте права іншому адміністратору',
      );
    }

    if (user.role === UserRole.OWNER) {
      if (!dto.confirm_delete_restaurant) {
        throw new BadRequestException(
          'Видалення власника призведе до видалення всього закладу. Підтвердіть дію.',
        );
      }
      const owned = await this.restaurantsRepo.find({
        where: { owner_id: userId },
      });
      for (const restaurant of owned) {
        await this.restaurantsRepo.remove(restaurant);
      }
    }

    if (user.role === UserRole.EMPLOYEE) {
      const employments = await this.employeesRepo.find({
        where: { user_id: userId },
      });
      for (const employment of employments) {
        await this.statisticsRepo.delete({ employee_id: employment.id });
        await this.employeesRepo.remove(employment);
      }
    }

    await this.notificationsRepo.delete({ user_id: userId });
    await this.usersRepo.update(userId, { is_deleted: true });
    await this.usersRepo.softDelete(userId);

    return { deleted: true };
  }
}
