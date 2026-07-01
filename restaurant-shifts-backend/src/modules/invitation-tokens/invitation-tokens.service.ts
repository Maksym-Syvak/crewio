import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvitationToken } from './entities/invitation-token.entity';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { EmployeesService } from '../employees/employees.service';
import { UsersService } from '../users/users.service';
import { EmployeeStatus } from '../employees/entities/employee.entity';

const TOKEN_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

@Injectable()
export class InvitationTokensService {
  constructor(
    @InjectRepository(InvitationToken)
    private readonly tokensRepo: Repository<InvitationToken>,
    private readonly restaurantsService: RestaurantsService,
    private readonly employeesService: EmployeesService,
    private readonly usersService: UsersService,
  ) {}

  private generateCode(): string {
    let suffix = '';
    for (let i = 0; i < 6; i++) {
      suffix += TOKEN_CHARS[Math.floor(Math.random() * TOKEN_CHARS.length)];
    }
    return `CREWIO-${suffix}`;
  }

  private normalizeToken(raw: string): string {
    return raw.trim().toUpperCase();
  }

  async createForRestaurant(restaurantId: string, createdBy: string) {
    await this.restaurantsService.findOne(restaurantId);

    await this.tokensRepo.update(
      { restaurant_id: restaurantId, is_active: true },
      { is_active: false },
    );

    let token = this.generateCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const exists = await this.tokensRepo.findOne({ where: { token } });
      if (!exists) break;
      token = this.generateCode();
    }

    return this.tokensRepo.save(
      this.tokensRepo.create({
        restaurant_id: restaurantId,
        created_by: createdBy,
        token,
        is_active: true,
      }),
    );
  }

  async getActiveForRestaurant(restaurantId: string) {
    const tokens = await this.tokensRepo.find({
      where: { restaurant_id: restaurantId, is_active: true },
      order: { created_at: 'DESC' },
      take: 1,
    });
    return tokens[0] ?? null;
  }

  async validateToken(rawToken: string) {
    const token = this.normalizeToken(rawToken);
    const invite = await this.tokensRepo.findOne({
      where: { token, is_active: true },
      relations: ['restaurant'],
    });

    if (!invite) {
      throw new NotFoundException('Код запрошення не знайдено або неактивний');
    }

    if (invite.expires_at && invite.expires_at < new Date()) {
      throw new BadRequestException('Термін дії коду запрошення минув');
    }

    return invite;
  }

  async preview(rawToken: string) {
    const invite = await this.validateToken(rawToken);
    const restaurant = invite.restaurant;
    return {
      token: invite.token,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        address: restaurant.address,
        city: restaurant.city,
        type: restaurant.type,
      },
    };
  }

  async join(rawToken: string, userId: string) {
    const invite = await this.validateToken(rawToken);
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const existing = (await this.employeesService.findAll(invite.restaurant_id)).find(
      (e) => e.user_id === userId,
    );
    if (existing) {
      throw new BadRequestException('Ви вже приєднані до цього закладу');
    }

    const employee = await this.employeesService.create({
      restaurant_id: invite.restaurant_id,
      user_id: userId,
      phone: user.phone,
      status: EmployeeStatus.ACTIVE,
    });

    return {
      employee,
      restaurant: invite.restaurant,
    };
  }

  async regenerate(restaurantId: string, userId: string, userRole: string) {
    const restaurant = await this.restaurantsService.findOne(restaurantId);
    const isOwner = restaurant.owner_id === userId;
    const isAdmin = userRole === 'admin' || userRole === 'owner';
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Немає прав для генерації коду');
    }
    return this.createForRestaurant(restaurantId, userId);
  }
}
