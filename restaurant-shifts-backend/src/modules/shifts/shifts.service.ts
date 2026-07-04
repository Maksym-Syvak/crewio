import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Shift, ShiftStatus } from './entities/shift.entity';
import {
  ShiftBooking,
  ShiftBookingStatus,
} from './entities/shift-booking.entity';
import { Employee } from '../employees/entities/employee.entity';
import {
  ReplacementRequest,
  ReplacementStatus,
} from '../replacement-requests/entities/replacement-request.entity';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { GenerateScheduleDto } from './dto/generate-schedule.dto';
import { generateShiftSlots } from './utils/schedule-generator';

const MAX_WEEKLY_HOURS = 60;

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private readonly shiftsRepo: Repository<Shift>,
    @InjectRepository(ShiftBooking)
    private readonly bookingsRepo: Repository<ShiftBooking>,
    @InjectRepository(Employee)
    private readonly employeesRepo: Repository<Employee>,
    @InjectRepository(ReplacementRequest)
    private readonly replacementRepo: Repository<ReplacementRequest>,
    private readonly events: EventEmitter2,
  ) {}

  private toShiftDate(start: Date): string {
    return start.toISOString().slice(0, 10);
  }

  private syncShiftStatus(shift: Shift, booked: number) {
    shift.booked_employees = booked;
    if (shift.status === ShiftStatus.CANCELLED) return shift;

    if (shift.is_urgent && booked < shift.required_employees) {
      shift.status = ShiftStatus.URGENT;
    } else if (booked >= shift.required_employees) {
      shift.status = ShiftStatus.FULLY_FILLED;
    } else if (booked > 0) {
      shift.status = ShiftStatus.PARTIALLY_FILLED;
    } else {
      shift.status = ShiftStatus.OPEN;
    }
    return shift;
  }

  private activeBookingsCount(shift: Shift) {
    return (
      shift.bookings?.filter((b) => b.status === ShiftBookingStatus.CONFIRMED)
        .length ?? shift.booked_employees
    );
  }

  findAll(filters: { restaurantId?: string; employeeId?: string; status?: ShiftStatus }) {
    const where: Record<string, unknown> = {};
    if (filters.restaurantId) where.restaurant_id = filters.restaurantId;
    if (filters.status) where.status = filters.status;

    if (filters.employeeId) {
      return this.shiftsRepo
        .createQueryBuilder('shift')
        .leftJoinAndSelect('shift.bookings', 'booking')
        .leftJoinAndSelect('booking.employee', 'employee')
        .leftJoinAndSelect('employee.user', 'user')
        .where('booking.employee_id = :employeeId', { employeeId: filters.employeeId })
        .andWhere('booking.status = :confirmed', {
          confirmed: ShiftBookingStatus.CONFIRMED,
        })
        .orderBy('shift.start_time', 'ASC')
        .getMany();
    }

    return this.shiftsRepo.find({
      where,
      relations: ['bookings', 'bookings.employee', 'bookings.employee.user', 'restaurant'],
      order: { start_time: 'ASC' },
    });
  }

  async findOne(id: string) {
    const shift = await this.shiftsRepo.findOne({
      where: { id },
      relations: [
        'restaurant',
        'bookings',
        'bookings.employee',
        'bookings.employee.user',
      ],
    });
    if (!shift) throw new NotFoundException('Shift not found');
    return shift;
  }

  async create(dto: CreateShiftDto) {
    const start = new Date(dto.start_time);
    const end = new Date(dto.end_time);
    const shift = this.shiftsRepo.create({
      restaurant_id: dto.restaurant_id,
      shift_date: this.toShiftDate(start),
      start_time: start,
      end_time: end,
      required_employees: dto.required_employees ?? 1,
      booked_employees: 0,
      shift_type: dto.shift_type ?? null,
      payment_rate: dto.payment_rate ?? null,
      status: dto.is_urgent ? ShiftStatus.URGENT : ShiftStatus.OPEN,
      is_urgent: dto.is_urgent ?? false,
    });
    const saved = await this.shiftsRepo.save(shift);
    this.events.emit('shift.created', saved);
    if (saved.is_urgent) this.events.emit('shift.emergency', saved);
    return saved;
  }

  async generateSchedule(dto: GenerateScheduleDto) {
    const slots = generateShiftSlots(dto);
    const created: Shift[] = [];
    let skipped = 0;

    for (const slot of slots) {
      if (dto.skip_existing !== false) {
        const exists = await this.shiftsRepo.count({
          where: {
            restaurant_id: dto.restaurant_id,
            start_time: slot.start_time,
          },
        });
        if (exists > 0) {
          skipped++;
          continue;
        }
      }

      const shift = await this.create({
        restaurant_id: dto.restaurant_id,
        start_time: slot.start_time.toISOString(),
        end_time: slot.end_time.toISOString(),
        required_employees: dto.required_employees ?? 1,
        shift_type: dto.shift_type,
        payment_rate: dto.payment_rate,
        is_urgent: false,
      });
      created.push(shift);
    }

    return {
      created: created.length,
      skipped,
      total: slots.length,
      shifts: created,
    };
  }

  async update(id: string, dto: UpdateShiftDto) {
    const existing = await this.findOne(id);
    const patch: Record<string, unknown> = { ...dto };

    if (dto.start_time) {
      patch.start_time = new Date(dto.start_time);
      patch.shift_date = this.toShiftDate(patch.start_time as Date);
    }
    if (dto.end_time) patch.end_time = new Date(dto.end_time);

    if (dto.required_employees !== undefined) {
      const booked = this.activeBookingsCount(existing);
      if (dto.required_employees < booked) {
        throw new BadRequestException(
          'Не можна встановити менше місць, ніж уже заброньовано',
        );
      }
    }

    await this.shiftsRepo.update(id, patch);
    let updated = await this.findOne(id);
    updated = this.syncShiftStatus(updated, this.activeBookingsCount(updated));
    await this.shiftsRepo.save(updated);

    this.events.emit('shift.updated', updated);
    if (!existing.is_urgent && updated.is_urgent) {
      this.events.emit('shift.emergency', updated);
    }
    return updated;
  }

  async remove(id: string) {
    const shift = await this.findOne(id);
    await this.shiftsRepo.remove(shift);
    this.events.emit('shift.deleted', { id });
    return { deleted: true };
  }

  async book(shiftId: string, employeeId: string) {
    const shift = await this.findOne(shiftId);
    const employee = await this.employeesRepo.findOne({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');

    if (employee.restaurant_id !== shift.restaurant_id) {
      throw new BadRequestException('Працівник не належить до цього закладу');
    }

    const booked = this.activeBookingsCount(shift);
    if (booked >= shift.required_employees) {
      throw new BadRequestException('Зміна вже заповнена');
    }

    const alreadyBooked = shift.bookings?.some(
      (b) =>
        b.employee_id === employeeId && b.status === ShiftBookingStatus.CONFIRMED,
    );
    if (alreadyBooked) {
      throw new BadRequestException('Ви вже забронювали цю зміну');
    }

    await this.assertNoOverlap(employeeId, shift.start_time, shift.end_time);
    await this.assertWithinWeeklyLimit(employeeId, shift);

    const booking = this.bookingsRepo.create({
      shift_id: shiftId,
      employee_id: employeeId,
      status: ShiftBookingStatus.CONFIRMED,
    });
    await this.bookingsRepo.save(booking);

    const updatedShift = await this.findOne(shiftId);
    const newCount = this.activeBookingsCount(updatedShift);
    this.syncShiftStatus(updatedShift, newCount);
    await this.shiftsRepo.save(updatedShift);

    this.events.emit('shift.updated', updatedShift);
    this.events.emit('shift.booking_confirmed', { shift: updatedShift, employeeId });
    return updatedShift;
  }

  private async assertNoOverlap(employeeId: string, start: Date, end: Date) {
    const overlapping = await this.shiftsRepo
      .createQueryBuilder('shift')
      .innerJoin('shift.bookings', 'booking')
      .where('booking.employee_id = :employeeId', { employeeId })
      .andWhere('booking.status = :confirmed', {
        confirmed: ShiftBookingStatus.CONFIRMED,
      })
      .andWhere('shift.start_time < :end AND shift.end_time > :start', { start, end })
      .getCount();
    if (overlapping > 0) {
      throw new BadRequestException('Зміна перетинається з іншою вашою бронню');
    }
  }

  private async assertWithinWeeklyLimit(employeeId: string, shift: Shift) {
    const weekStart = new Date(shift.start_time);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekShifts = await this.shiftsRepo
      .createQueryBuilder('shift')
      .innerJoin('shift.bookings', 'booking')
      .where('booking.employee_id = :employeeId', { employeeId })
      .andWhere('booking.status = :confirmed', {
        confirmed: ShiftBookingStatus.CONFIRMED,
      })
      .andWhere('shift.start_time BETWEEN :weekStart AND :weekEnd', { weekStart, weekEnd })
      .getMany();

    const hoursAlready = weekShifts.reduce(
      (sum, s) => sum + (s.end_time.getTime() - s.start_time.getTime()) / 3_600_000,
      0,
    );
    const newShiftHours =
      (shift.end_time.getTime() - shift.start_time.getTime()) / 3_600_000;

    if (hoursAlready + newShiftHours > MAX_WEEKLY_HOURS) {
      throw new BadRequestException('Перевищено тижневий ліміт годин');
    }
  }

  async cannotMakeShift(shiftId: string, employeeId: string, reason?: string) {
    const shift = await this.findOne(shiftId);
    const booking = shift.bookings?.find(
      (b) =>
        b.employee_id === employeeId && b.status === ShiftBookingStatus.CONFIRMED,
    );
    if (!booking) {
      throw new BadRequestException('Ви не забронювали цю зміну');
    }

    booking.status = ShiftBookingStatus.CANCELLED;
    await this.bookingsRepo.save(booking);

    const updatedShift = await this.findOne(shiftId);
    const newCount = this.activeBookingsCount(updatedShift);
    updatedShift.is_urgent = true;
    this.syncShiftStatus(updatedShift, newCount);
    await this.shiftsRepo.save(updatedShift);

    const request = this.replacementRepo.create({
      shift_id: shiftId,
      employee_id: employeeId,
      reason,
      status: ReplacementStatus.PENDING,
    });
    const saved = await this.replacementRepo.save(request);

    this.events.emit('shift.updated', updatedShift);
    this.events.emit('shift.emergency', updatedShift);
    this.events.emit('replacement.requested', { request: saved, shift: updatedShift });
    return saved;
  }
}
