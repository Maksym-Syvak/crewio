import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { Employee } from '../employees/entities/employee.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Statistics } from '../statistics/entities/statistics.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';

const BCRYPT_ROUNDS = 10;

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

  findByTelegramId(telegramId: string) {
    return this.usersRepo.findOne({
      where: { telegram_id: telegramId, is_deleted: false },
    });
  }

  findAnyByTelegramId(telegramId: string) {
    return this.usersRepo.findOne({
      where: { telegram_id: telegramId },
      withDeleted: true,
    });
  }

  async getTelegramUserStatus(telegramId: string) {
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

  findByIdWithPassword(id: string) {
    return this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .where('user.id = :id', { id })
      .andWhere('user.is_deleted = false')
      .getOne();
  }

  findByLogin(login: string) {
    const normalized = login.trim();
    return this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .where('user.is_deleted = false')
      .andWhere('(user.phone = :login OR user.username = :login)', {
        login: normalized,
      })
      .getOne();
  }

  async hashPassword(plain: string) {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }

  async verifyPassword(plain: string, hash: string) {
    return bcrypt.compare(plain, hash);
  }

  create(data: Partial<User>) {
    const user = this.usersRepo.create(data);
    return this.usersRepo.save(user);
  }

  update(id: string, data: Partial<User>) {
    return this.usersRepo.update(id, data).then(() => this.findById(id));
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.password !== dto.password_confirm) {
      throw new BadRequestException('Паролі не співпадають');
    }

    const user = await this.findByIdWithPassword(userId);
    if (!user) throw new NotFoundException('User not found');

    if (user.password_hash) {
      if (!dto.current_password) {
        throw new BadRequestException('Вкажіть поточний пароль');
      }
      const ok = await this.verifyPassword(dto.current_password, user.password_hash);
      if (!ok) throw new UnauthorizedException('Невірний поточний пароль');
    }

    const password_hash = await this.hashPassword(dto.password);
    await this.usersRepo.update(userId, { password_hash });
    return this.findById(userId);
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
