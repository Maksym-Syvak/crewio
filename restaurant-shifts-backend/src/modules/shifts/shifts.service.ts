import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Shift, ShiftStatus, PaymentType } from './entities/shift.entity';
import {
  ShiftBooking,
  ShiftBookingStatus,
  BookingType,
} from './entities/shift-booking.entity';
import { Employee } from '../employees/entities/employee.entity';
import {
  ReplacementRequest,
  ReplacementStatus,
} from '../replacement-requests/entities/replacement-request.entity';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { GenerateScheduleDto } from './dto/generate-schedule.dto';
import { BookShiftDto } from './dto/book-shift.dto';
import { generateShiftSlots } from './utils/schedule-generator';
import { calculateBookingSalary } from './utils/payment-calculator';
import { EmployeesService } from '../employees/employees.service';

const MAX_WEEKLY_HOURS = 60;
const URGENT_HOURS_BEFORE = 24;
export const URGENT_REMINDER_THRESHOLDS = [24, 12, 6, 2] as const;

@Injectable()
export class ShiftsService {
  private readonly logger = new Logger(ShiftsService.name);

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
    private readonly employeesService: EmployeesService,
  ) {}

  private toShiftDate(start: Date): string {
    return start.toISOString().slice(0, 10);
  }

  hoursUntilStart(shift: Shift, now = new Date()): number {
    return (new Date(shift.start_time).getTime() - now.getTime()) / 3_600_000;
  }

  isUnderstaffed(shift: Shift): boolean {
    return this.activeBookingsCount(shift) < shift.required_employees;
  }

  computeFillStatus(shift: Shift, booked: number, now = new Date()): ShiftStatus {
    if (shift.status === ShiftStatus.CANCELLED) return ShiftStatus.CANCELLED;
    if (shift.status === ShiftStatus.COMPLETED) return ShiftStatus.COMPLETED;
    if (shift.status === ShiftStatus.ACTIVE) return ShiftStatus.ACTIVE;

    const hoursUntil = this.hoursUntilStart(shift, now);
    if (hoursUntil < URGENT_HOURS_BEFORE && booked < shift.required_employees) {
      return ShiftStatus.URGENT;
    }
    if (booked >= shift.required_employees) return ShiftStatus.FULLY_FILLED;
    if (booked > 0) return ShiftStatus.PARTIALLY_FILLED;
    return ShiftStatus.OPEN;
  }

  syncShiftStatus(shift: Shift, booked: number, now = new Date()) {
    shift.booked_employees = booked;
    if ([ShiftStatus.CANCELLED, ShiftStatus.COMPLETED, ShiftStatus.ACTIVE].includes(shift.status)) {
      shift.is_urgent = shift.status === ShiftStatus.URGENT;
      return shift;
    }
    shift.status = this.computeFillStatus(shift, booked, now);
    shift.is_urgent = shift.status === ShiftStatus.URGENT;
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

  private resolvePaymentFields(dto: CreateShiftDto) {
    const paymentType = dto.payment_type ?? PaymentType.SHIFT;
    const legacyRate = dto.payment_rate ?? null;

    return {
      payment_type: paymentType,
      shift_rate:
        dto.shift_rate ??
        (paymentType === PaymentType.SHIFT ? legacyRate : null),
      hourly_rate:
        dto.hourly_rate ??
        (paymentType === PaymentType.HOURLY ? legacyRate : null),
      fixed_rate:
        dto.fixed_rate ??
        (paymentType === PaymentType.FIXED ? legacyRate : null),
      payment_rate: legacyRate,
    };
  }

  async create(dto: CreateShiftDto) {
    const start = new Date(dto.start_time);
    const end = new Date(dto.end_time);
    const payment = this.resolvePaymentFields(dto);
    const isBulk = dto.isBulkCreation === true;

    const shift = this.shiftsRepo.create({
      restaurant_id: dto.restaurant_id,
      shift_date: this.toShiftDate(start),
      start_time: start,
      end_time: end,
      required_employees: dto.required_employees ?? 1,
      booked_employees: 0,
      shift_type: dto.shift_type ?? null,
      ...payment,
      status: ShiftStatus.OPEN,
      is_urgent: false,
      urgent_notified_at: [],
    });
    this.syncShiftStatus(shift, 0);
    const saved = await this.shiftsRepo.save(shift);

    if (!isBulk) {
      this.events.emit('shift.created', saved);
    }
    return saved;
  }

  async generateSchedule(dto: GenerateScheduleDto) {
    const slots = generateShiftSlots(dto);
    const created: Shift[] = [];
    let skipped = 0;

    const payment = this.resolvePaymentFields(dto as CreateShiftDto);

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
        payment_type: payment.payment_type ?? undefined,
        shift_rate: payment.shift_rate ?? undefined,
        hourly_rate: payment.hourly_rate ?? undefined,
        fixed_rate: payment.fixed_rate ?? undefined,
        payment_rate: payment.payment_rate ?? undefined,
        is_urgent: false,
        isBulkCreation: true,
      });
      created.push(shift);
    }

    if (created.length > 0) {
      this.events.emit('schedule.generated', {
        restaurant_id: dto.restaurant_id,
        count: created.length,
        date_from: dto.date_from,
        date_to: dto.date_to,
        shifts: created,
      });
    }

    return {
      created: created.length,
      skipped,
      total: slots.length,
      shifts: created,
    };
  }

  async autoOpenDueShifts(now = new Date()) {
    const shifts = await this.shiftsRepo
      .createQueryBuilder('shift')
      .where('shift.start_time <= :now', { now })
      .andWhere('shift.end_time > :now', { now })
      .andWhere('shift.status NOT IN (:...statuses)', {
        statuses: [ShiftStatus.ACTIVE, ShiftStatus.COMPLETED, ShiftStatus.CANCELLED],
      })
      .getMany();

    for (const shift of shifts) {
      shift.status = ShiftStatus.ACTIVE;
      shift.is_urgent = false;
      await this.shiftsRepo.save(shift);
      this.events.emit('shift.started', shift);
    }
    return shifts.length;
  }

  async autoCloseDueShifts(now = new Date()) {
    const shifts = await this.shiftsRepo
      .createQueryBuilder('shift')
      .where('shift.end_time <= :now', { now })
      .andWhere('shift.status = :active', { active: ShiftStatus.ACTIVE })
      .getMany();

    for (const shift of shifts) {
      await this.finalizeShift(shift.id);
    }
    return shifts.length;
  }

  async finalizeShift(id: string) {
    const shift = await this.findOne(id);
    if (shift.status === ShiftStatus.COMPLETED) return shift;

    shift.status = ShiftStatus.COMPLETED;
    shift.is_urgent = false;
    await this.shiftsRepo.save(shift);

    const bookings =
      shift.bookings?.filter((b) => b.status === ShiftBookingStatus.CONFIRMED) ?? [];

    for (const booking of bookings) {
      const salary = calculateBookingSalary(shift, booking);
      booking.planned_salary = salary;
      booking.actual_salary = salary;
      await this.bookingsRepo.save(booking);
    }

    this.events.emit('shift.completed', {
      shift,
      employeeIds: bookings.map((b) => b.employee_id),
    });
    return this.findOne(id);
  }

  async refreshUpcomingStatuses(now = new Date()) {
    const shifts = await this.shiftsRepo.find({
      where: {
        status: Not(In([ShiftStatus.COMPLETED, ShiftStatus.CANCELLED, ShiftStatus.ACTIVE])),
      },
      relations: ['bookings'],
    });

    let updated = 0;
    for (const shift of shifts) {
      if (new Date(shift.start_time) <= now) continue;
      const booked = this.activeBookingsCount(shift);
      const prev = shift.status;
      this.syncShiftStatus(shift, booked, now);
      if (shift.status !== prev) {
        await this.shiftsRepo.save(shift);
        updated++;
        if (shift.status === ShiftStatus.URGENT && prev !== ShiftStatus.URGENT) {
          const full = await this.findOne(shift.id);
          this.events.emit('shift.emergency', full);
        }
      }
    }
    return updated;
  }

  async processUrgentReminders(now = new Date()) {
    const shifts = await this.shiftsRepo.find({
      where: {
        status: In([
          ShiftStatus.OPEN,
          ShiftStatus.PARTIALLY_FILLED,
          ShiftStatus.URGENT,
          ShiftStatus.FULLY_FILLED,
        ]),
      },
      relations: ['restaurant', 'bookings'],
    });

    let sent = 0;
    for (const shift of shifts) {
      if (new Date(shift.start_time) <= now) continue;
      if (!this.isUnderstaffed(shift)) continue;

      const hoursLeft = this.hoursUntilStart(shift, now);
      if (hoursLeft > URGENT_HOURS_BEFORE) continue;

      const notified = shift.urgent_notified_at ?? [];
      let changed = false;

      for (const threshold of URGENT_REMINDER_THRESHOLDS) {
        if (hoursLeft <= threshold && !notified.includes(threshold)) {
          notified.push(threshold);
          changed = true;
          this.events.emit('shift.urgent_reminder', { shift, threshold });
          sent++;
        }
      }

      if (changed) {
        shift.urgent_notified_at = notified;
        this.syncShiftStatus(shift, this.activeBookingsCount(shift), now);
        await this.shiftsRepo.save(shift);
      }
    }
    return sent;
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
    return updated;
  }

  async remove(id: string) {
    const shift = await this.findOne(id);
    await this.shiftsRepo.remove(shift);
    this.events.emit('shift.deleted', { id });
    return { deleted: true };
  }

  async book(shiftId: string, dto: BookShiftDto, userId: string) {
    const shift = await this.findOne(shiftId);

    if ([ShiftStatus.ACTIVE, ShiftStatus.COMPLETED, ShiftStatus.CANCELLED].includes(shift.status)) {
      throw new BadRequestException('Зміну вже не можна забронювати');
    }

    const employee = await this.employeesService.resolveForBooking(
      userId,
      shift.restaurant_id,
      dto.employee_id,
    );
    const employeeId = employee.id;

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

    const bookingType = dto.booking_type ?? BookingType.FULL;
    let bookedStart = new Date(shift.start_time);
    let bookedEnd = new Date(shift.end_time);

    if (bookingType === BookingType.PARTIAL) {
      if (!dto.booked_start_time || !dto.booked_end_time) {
        throw new BadRequestException('Вкажіть час часткової зміни');
      }
      bookedStart = new Date(dto.booked_start_time);
      bookedEnd = new Date(dto.booked_end_time);

      if (bookedEnd <= bookedStart) {
        throw new BadRequestException('Кінець має бути після початку');
      }
      if (bookedStart < new Date(shift.start_time) || bookedEnd > new Date(shift.end_time)) {
        throw new BadRequestException('Час має бути в межах зміни');
      }
    }

    await this.assertNoOverlap(employeeId, bookedStart, bookedEnd);
    await this.assertWithinWeeklyLimit(employeeId, bookedStart, bookedEnd);

    const booking = this.bookingsRepo.create({
      shift_id: shiftId,
      employee_id: employeeId,
      booking_type: bookingType,
      booked_start_time: bookingType === BookingType.PARTIAL ? bookedStart : null,
      booked_end_time: bookingType === BookingType.PARTIAL ? bookedEnd : null,
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
    const bookings = await this.bookingsRepo
      .createQueryBuilder('booking')
      .innerJoinAndSelect('booking.shift', 'shift')
      .where('booking.employee_id = :employeeId', { employeeId })
      .andWhere('booking.status = :confirmed', {
        confirmed: ShiftBookingStatus.CONFIRMED,
      })
      .andWhere('shift.status NOT IN (:...closed)', {
        closed: [ShiftStatus.COMPLETED, ShiftStatus.CANCELLED],
      })
      .getMany();

    for (const b of bookings) {
      const bStart =
        b.booking_type === BookingType.PARTIAL && b.booked_start_time
          ? b.booked_start_time
          : b.shift.start_time;
      const bEnd =
        b.booking_type === BookingType.PARTIAL && b.booked_end_time
          ? b.booked_end_time
          : b.shift.end_time;

      if (bStart < end && bEnd > start) {
        throw new BadRequestException('Зміна перетинається з іншою вашою бронню');
      }
    }
  }

  private async assertWithinWeeklyLimit(employeeId: string, start: Date, end: Date) {
    const weekStart = new Date(start);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const bookings = await this.bookingsRepo
      .createQueryBuilder('booking')
      .innerJoinAndSelect('booking.shift', 'shift')
      .where('booking.employee_id = :employeeId', { employeeId })
      .andWhere('booking.status = :confirmed', {
        confirmed: ShiftBookingStatus.CONFIRMED,
      })
      .andWhere('shift.start_time BETWEEN :weekStart AND :weekEnd', { weekStart, weekEnd })
      .getMany();

    const hoursAlready = bookings.reduce((sum, b) => {
      const bStart =
        b.booking_type === BookingType.PARTIAL && b.booked_start_time
          ? b.booked_start_time
          : b.shift.start_time;
      const bEnd =
        b.booking_type === BookingType.PARTIAL && b.booked_end_time
          ? b.booked_end_time
          : b.shift.end_time;
      return sum + (bEnd.getTime() - bStart.getTime()) / 3_600_000;
    }, 0);

    const newHours = (end.getTime() - start.getTime()) / 3_600_000;

    if (hoursAlready + newHours > MAX_WEEKLY_HOURS) {
      throw new BadRequestException('Перевищено тижневий ліміт годин');
    }
  }

  async repairBookingIntegrity(restaurantId: string) {
    const bookings = await this.bookingsRepo
      .createQueryBuilder('booking')
      .innerJoinAndSelect('booking.shift', 'shift')
      .leftJoinAndSelect('booking.employee', 'employee')
      .where('shift.restaurant_id = :restaurantId', { restaurantId })
      .andWhere('booking.status = :status', {
        status: ShiftBookingStatus.CONFIRMED,
      })
      .getMany();

    const issues: string[] = [];

    for (const booking of bookings) {
      if (!booking.employee) {
        const msg = `Booking ${booking.id} references missing employee ${booking.employee_id}`;
        this.logger.error(msg);
        issues.push(msg);
        continue;
      }
      if (booking.employee.restaurant_id !== restaurantId) {
        const msg = `Booking ${booking.id} employee ${booking.employee_id} belongs to another restaurant`;
        this.logger.error(msg);
        issues.push(msg);
      }
    }

    return { issues: issues.length, details: issues };
  }

  async cannotMakeShift(
    shiftId: string,
    employeeId: string,
    userId: string,
    reason?: string,
  ) {
    const shift = await this.findOne(shiftId);
    const employee = await this.employeesService.resolveForBooking(
      userId,
      shift.restaurant_id,
      employeeId,
    );
    const booking = shift.bookings?.find(
      (b) =>
        b.employee_id === employee.id && b.status === ShiftBookingStatus.CONFIRMED,
    );
    if (!booking) {
      throw new BadRequestException('Ви не забронювали цю зміну');
    }

    booking.status = ShiftBookingStatus.CANCELLED;
    await this.bookingsRepo.save(booking);

    const updatedShift = await this.findOne(shiftId);
    const newCount = this.activeBookingsCount(updatedShift);
    this.syncShiftStatus(updatedShift, newCount);
    await this.shiftsRepo.save(updatedShift);

    const request = this.replacementRepo.create({
      shift_id: shiftId,
      employee_id: employee.id,
      reason,
      status: ReplacementStatus.PENDING,
    });
    const saved = await this.replacementRepo.save(request);

    this.events.emit('shift.updated', updatedShift);
    if (updatedShift.status === ShiftStatus.URGENT) {
      this.events.emit('shift.emergency', updatedShift);
    }
    this.events.emit('replacement.requested', { request: saved, shift: updatedShift });
    return saved;
  }
}
