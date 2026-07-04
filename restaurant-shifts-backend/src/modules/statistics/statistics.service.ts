import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { Statistics } from './entities/statistics.entity';
import { Employee } from '../employees/entities/employee.entity';
import { ShiftBooking, ShiftBookingStatus } from '../shifts/entities/shift-booking.entity';
import { ShiftStatus } from '../shifts/entities/shift.entity';
import {
  calculateActualSalary,
  calculatePlannedSalary,
  getActualHours,
  getPlannedHours,
} from '../shifts/utils/payment-calculator';

function normalizeMonth(month?: string) {
  if (!month) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(month)) return month.slice(0, 7);
  if (/^\d{4}-\d{2}$/.test(month)) return month;
  return month;
}

function monthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Statistics)
    private readonly statsRepo: Repository<Statistics>,
    @InjectRepository(Employee)
    private readonly employeesRepo: Repository<Employee>,
    @InjectRepository(ShiftBooking)
    private readonly bookingsRepo: Repository<ShiftBooking>,
  ) {}

  async findAll(filters: { employeeId?: string; month?: string }) {
    const where: Record<string, string> = {};

    if (filters.employeeId) {
      const month = normalizeMonth(filters.month) ?? new Date().toISOString().slice(0, 7);
      await this.recompute(filters.employeeId, month);
      where.employee_id = filters.employeeId;
      where.month = `${month}-01`;
    } else {
      const month = normalizeMonth(filters.month);
      if (month) where.month = `${month}-01`;
    }

    return this.statsRepo.find({ where });
  }

  async recompute(employeeId: string, month: string) {
    const normalized = normalizeMonth(month) ?? month;
    const monthStart = new Date(`${normalized}-01T00:00:00Z`);
    const monthEnd = new Date(monthStart);
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);

    const bookings = await this.bookingsRepo
      .createQueryBuilder('booking')
      .innerJoinAndSelect('booking.shift', 'shift')
      .where('booking.employee_id = :employeeId', { employeeId })
      .andWhere('booking.status = :confirmed', {
        confirmed: ShiftBookingStatus.CONFIRMED,
      })
      .andWhere('shift.start_time >= :monthStart AND shift.start_time < :monthEnd', {
        monthStart,
        monthEnd,
      })
      .getMany();

    let plannedHours = 0;
    let actualHours = 0;
    let plannedSalary = 0;
    let actualSalary = 0;
    let nightShifts = 0;

    for (const b of bookings) {
      const shift = b.shift;
      const planned = getPlannedHours(shift);
      const actual = shift.status === ShiftStatus.COMPLETED ? getActualHours(shift) : planned;

      plannedHours += planned;
      actualHours += actual;

      const plannedPay = b.planned_salary != null ? Number(b.planned_salary) : calculatePlannedSalary(shift);
      const actualPay =
        b.actual_salary != null
          ? Number(b.actual_salary)
          : shift.status === ShiftStatus.COMPLETED
            ? calculateActualSalary(shift)
            : plannedPay;

      plannedSalary += plannedPay;
      actualSalary += actualPay;

      if (shift.start_time.getHours() >= 22 || shift.start_time.getHours() < 6) {
        nightShifts += 1;
      }
    }

    const monthDate = `${normalized}-01`;
    let row = await this.statsRepo.findOne({
      where: { employee_id: employeeId, month: monthDate },
    });
    if (!row) {
      row = this.statsRepo.create({ employee_id: employeeId, month: monthDate });
    }

    row.planned_hours = plannedHours;
    row.actual_hours = actualHours;
    row.worked_hours = actualHours;
    row.worked_shifts = bookings.length;
    row.night_shifts = nightShifts;
    row.planned_salary = plannedSalary;
    row.actual_salary = actualSalary;
    row.expected_salary = actualSalary;

    return this.statsRepo.save(row);
  }

  @OnEvent('shift.completed')
  async onShiftCompleted(payload: { shift: { start_time: Date }; employeeIds: string[] }) {
    const month = monthKey(new Date(payload.shift.start_time));
    const unique = [...new Set(payload.employeeIds)];
    for (const employeeId of unique) {
      await this.recompute(employeeId, month);
    }
  }
}
