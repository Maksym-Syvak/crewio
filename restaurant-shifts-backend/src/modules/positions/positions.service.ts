import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Position } from './entities/position.entity';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';

export const DEFAULT_POSITION_NAMES = [
  'Офіціант',
  'Бармен',
  'Кухар',
  'Бариста',
  'Адміністратор залу',
  'Кальянщик',
  'Касир',
] as const;

@Injectable()
export class PositionsService {
  constructor(
    @InjectRepository(Position)
    private readonly positionsRepo: Repository<Position>,
  ) {}

  findAll(restaurantId?: string) {
    return this.positionsRepo.find({
      where: restaurantId ? { restaurant_id: restaurantId } : {},
      order: { name: 'ASC' },
    });
  }

  async findByRestaurant(restaurantId: string) {
    return this.positionsRepo.find({
      where: { restaurant_id: restaurantId },
      order: { name: 'ASC' },
    });
  }

  async createDefaultsForRestaurant(restaurantId: string) {
    const existing = await this.positionsRepo.count({
      where: { restaurant_id: restaurantId },
    });
    if (existing > 0) return;

    await this.positionsRepo.save(
      DEFAULT_POSITION_NAMES.map((name) =>
        this.positionsRepo.create({
          restaurant_id: restaurantId,
          name,
          min_employees: 0,
          max_employees: 0,
          hourly_rate: 0,
        }),
      ),
    );
  }

  async findOne(id: string) {
    const position = await this.positionsRepo.findOne({ where: { id } });
    if (!position) throw new NotFoundException('Position not found');
    return position;
  }

  create(dto: CreatePositionDto) {
    return this.positionsRepo.save(this.positionsRepo.create(dto));
  }

  async update(id: string, dto: UpdatePositionDto) {
    await this.positionsRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string) {
    const position = await this.findOne(id);
    await this.positionsRepo.remove(position);
    return { deleted: true };
  }
}
