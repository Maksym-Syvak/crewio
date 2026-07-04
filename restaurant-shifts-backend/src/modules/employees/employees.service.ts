import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Employee, EmployeeStatus } from './entities/employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { toPaginatedResult } from '../../common/dto/pagination-query.dto';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { StatisticsService } from '../statistics/statistics.service';
import { ShiftBooking, ShiftBookingStatus } from '../shifts/entities/shift-booking.entity';
import { Statistics } from '../statistics/entities/statistics.entity';

export interface EmployeeSummary {
  next_shift_start: string | null;
  next_shift_end: string | null;
  booked_shifts_month: number;
  planned_salary: number;
}

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeesRepo: Repository<Employee>,
    @InjectRepository(ShiftBooking)
    private readonly bookingsRepo: Repository<ShiftBooking>,
    @InjectRepository(Statistics)
    private readonly statsRepo: Repository<Statistics>,
    private readonly restaurantsService: RestaurantsService,
    private readonly statisticsService: StatisticsService,
  ) {}

  async findByUserAndRestaurant(userId: string, restaurantId: string) {
    return this.employeesRepo.findOne({
      where: { user_id: userId, restaurant_id: restaurantId },
      relations: ['user', 'position', 'restaurant'],
    });
  }

  async ensureForUserAndRestaurant(
    userId: string,
    restaurantId: string,
    phone?: string,
  ) {
    const existing = await this.findByUserAndRestaurant(userId, restaurantId);
    if (existing) return existing;

    return this.create({
      restaurant_id: restaurantId,
      user_id: userId,
      phone,
      status: EmployeeStatus.ACTIVE,
    });
  }

  async resolveForBooking(
    userId: string,
    restaurantId: string,
    requestedEmployeeId?: string,
    phone?: string,
  ) {
    const employee = await this.ensureForUserAndRestaurant(
      userId,
      restaurantId,
      phone,
    );

    if (requestedEmployeeId && requestedEmployeeId !== employee.id) {
      throw new BadRequestException(
        'Невірний ідентифікатор працівника для цього акаунта',
      );
    }

    return employee;
  }

  async assertCanViewRestaurantStaff(
    userId: string,
    userRole: string,
    restaurantId: string,
  ) {
    if (userRole === 'admin') return;

    if (userRole === 'owner') {
      const owned = await this.restaurantsService.findAll(userId);
      if (owned.some((r) => r.id === restaurantId)) return;
      throw new ForbiddenException('Немає доступу до персоналу цього закладу');
    }

    const membership = await this.findByUserAndRestaurant(userId, restaurantId);
    if (!membership) {
      throw new ForbiddenException('Немає доступу до персоналу цього закладу');
    }
  }

  private currentMonthKey() {
    return `${new Date().toISOString().slice(0, 7)}-01`;
  }

  private async buildSummariesMap(employeeIds: string[]) {
    const map = new Map<string, EmployeeSummary>();
    if (!employeeIds.length) return map;

    const monthDate = this.currentMonthKey();
    const stats = await this.statsRepo.find({
      where: { employee_id: In(employeeIds), month: monthDate },
    });
    for (const row of stats) {
      map.set(row.employee_id, {
        next_shift_start: null,
        next_shift_end: null,
        booked_shifts_month: row.booked_shifts ?? row.worked_shifts ?? 0,
        planned_salary: Number(row.planned_salary ?? 0),
      });
    }

    const now = new Date();
    const nextBookings = await this.bookingsRepo
      .createQueryBuilder('booking')
      .innerJoinAndSelect('booking.shift', 'shift')
      .where('booking.employee_id IN (:...ids)', { ids: employeeIds })
      .andWhere('booking.status = :confirmed', {
        confirmed: ShiftBookingStatus.CONFIRMED,
      })
      .andWhere('shift.start_time > :now', { now })
      .orderBy('shift.start_time', 'ASC')
      .getMany();

    const nextByEmployee = new Map<string, ShiftBooking>();
    for (const booking of nextBookings) {
      if (!nextByEmployee.has(booking.employee_id)) {
        nextByEmployee.set(booking.employee_id, booking);
      }
    }

    for (const id of employeeIds) {
      const existing = map.get(id) ?? {
        next_shift_start: null,
        next_shift_end: null,
        booked_shifts_month: 0,
        planned_salary: 0,
      };
      const next = nextByEmployee.get(id);
      if (next?.shift) {
        existing.next_shift_start = new Date(next.shift.start_time).toISOString();
        existing.next_shift_end = new Date(next.shift.end_time).toISOString();
      }
      map.set(id, existing);
    }

    return map;
  }

  private attachSummaries(
    employees: Employee[],
    summaries: Map<string, EmployeeSummary>,
  ) {
    return employees.map((employee) => ({
      ...employee,
      summary: summaries.get(employee.id) ?? {
        next_shift_start: null,
        next_shift_end: null,
        booked_shifts_month: 0,
        planned_salary: 0,
      },
    }));
  }

  async findAll(restaurantId?: string, page = 1, limit = 20) {
    const qb = this.employeesRepo
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.user', 'user')
      .leftJoinAndSelect('employee.position', 'position')
      .orderBy('employee.created_at', 'DESC');

    if (restaurantId) {
      qb.where('employee.restaurant_id = :restaurantId', { restaurantId });
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const summaries = await this.buildSummariesMap(data.map((e) => e.id));
    const enriched = this.attachSummaries(data, summaries);

    return toPaginatedResult(enriched, total, page, limit);
  }

  async findOne(id: string) {
    const employee = await this.employeesRepo.findOne({
      where: { id },
      relations: ['user', 'position', 'restaurant'],
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async getProfile(
    id: string,
    requestUserId: string,
    requestUserRole: string,
  ) {
    const employee = await this.findOne(id);
    await this.assertCanViewRestaurantStaff(
      requestUserId,
      requestUserRole,
      employee.restaurant_id,
    );

    const month = new Date().toISOString().slice(0, 7);
    const stats = await this.statisticsService.recompute(id, month);

    const nextBooking = await this.bookingsRepo
      .createQueryBuilder('booking')
      .innerJoinAndSelect('booking.shift', 'shift')
      .where('booking.employee_id = :id', { id })
      .andWhere('booking.status = :confirmed', {
        confirmed: ShiftBookingStatus.CONFIRMED,
      })
      .andWhere('shift.start_time > :now', { now: new Date() })
      .orderBy('shift.start_time', 'ASC')
      .getOne();

    return {
      employee,
      stats,
      next_shift: nextBooking
        ? {
            id: nextBooking.shift.id,
            start_time: nextBooking.shift.start_time,
            end_time: nextBooking.shift.end_time,
          }
        : null,
    };
  }

  async findMembership(userId: string) {
    const employees = await this.employeesRepo.find({
      where: { user_id: userId },
      relations: ['user', 'position', 'restaurant'],
      order: { created_at: 'DESC' },
      take: 1,
    });
    const employee = employees[0] ?? null;
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
