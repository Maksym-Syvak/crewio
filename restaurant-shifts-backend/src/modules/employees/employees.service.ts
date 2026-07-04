import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee, EmployeeStatus } from './entities/employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { toPaginatedResult } from '../../common/dto/pagination-query.dto';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeesRepo: Repository<Employee>,
  ) {}

  async findByUserAndRestaurant(userId: string, restaurantId: string) {
    return this.employeesRepo.findOne({
      where: { user_id: userId, restaurant_id: restaurantId },
    });
  }

  findAll(restaurantId?: string, page = 1, limit = 20) {
    const qb = this.employeesRepo
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.user', 'user')
      .leftJoinAndSelect('employee.position', 'position')
      .orderBy('employee.created_at', 'DESC');

    if (restaurantId) {
      qb.where('employee.restaurant_id = :restaurantId', { restaurantId });
    }

    return qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount()
      .then(([data, total]) => toPaginatedResult(data, total, page, limit));
  }

  async findOne(id: string) {
    const employee = await this.employeesRepo.findOne({
      where: { id },
      relations: ['user', 'position', 'restaurant'],
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async findMembership(userId: string) {
    const employee = await this.employeesRepo.findOne({
      where: { user_id: userId },
      relations: ['user', 'position', 'restaurant'],
    });
    if (!employee) {
      return { employee: null, restaurant: null };
    }
    return { employee, restaurant: employee.restaurant ?? null };
  }

  async findActiveByRestaurant(restaurantId: string) {
    return this.employeesRepo.find({
      where: { restaurant_id: restaurantId, status: EmployeeStatus.ACTIVE },
      relations: ['user'],
    });
  }

  create(dto: CreateEmployeeDto) {
    return this.employeesRepo.save(this.employeesRepo.create(dto));
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    await this.employeesRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string) {
    const employee = await this.findOne(id);
    await this.employeesRepo.remove(employee);
    return { deleted: true };
  }
}
