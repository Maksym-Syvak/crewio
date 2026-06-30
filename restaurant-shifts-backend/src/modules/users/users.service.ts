import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  findByTelegramId(telegramId: string) {
    return this.usersRepo.findOne({ where: { telegram_id: telegramId } });
  }

  findById(id: string) {
    return this.usersRepo.findOne({ where: { id } });
  }

  create(data: Partial<User>) {
    const user = this.usersRepo.create(data);
    return this.usersRepo.save(user);
  }

  update(id: string, data: Partial<User>) {
    return this.usersRepo.update(id, data).then(() => this.findById(id));
  }
}
