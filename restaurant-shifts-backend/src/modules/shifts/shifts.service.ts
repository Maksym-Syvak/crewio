import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThan, MoreThan, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Shift, ShiftStatus } from './entities/shift.entity';
import { ShiftEmployee } from './entities/shift-employee.entity';
import { Employee } from '../employees/entities/employee.entity';
import {
  ReplacementRequest,
  ReplacementStatus,
} from '../replacement-requests/entities/replacement-request.entity';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { GenerateScheduleDto } from './dto/generate-schedule.dto';
import { generateShiftSlots } from './utils/schedule-generator';

const MAX_WEEKLY_HOURS = 60; // simple guardrail; make this configurable per restaurant later

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private readonly shiftsRepo: Repository<Shift>,
    @InjectRepository(ShiftEmployee)
    private readonly shiftEmployeesRepo: Repository<ShiftEmployee>,
    @InjectRepository(Employee)
    private readonly employeesRepo: Repository<Employee>,
    @InjectRepository(ReplacementRequest)
    private readonly replacementRepo: Repository<ReplacementRequest>,
    private readonly events: EventEmitter2,
  ) {}

  findAll(filters: { restaurantId?: string; employeeId?: string; status?: ShiftStatus }) {
    const where: any = {};
    if (filters.restaurantId) where.restaurant_id = filters.restaurantId;
    if (filters.status) where.status = filters.status;
    // employeeId filtering is handled with a query builder for the join table
    if (filters.employeeId) {
      return this.shiftsRepo
        .createQueryBuilder('shift')
        .leftJoinAndSelect('shift.assignments', 'assignment')
        .leftJoinAndSelect('shift.position', 'position')
        .where('assignment.employee_id = :employeeId', { employeeId: filters.employeeId })
        .getMany();
    }
    return this.shiftsRepo.find({
      where,
      relations: ['position', 'assignments', 'assignments.employee'],
      order: { start_time: 'ASC' },
    });
  }

  async findOne(id: string) {
    const shift = await this.shiftsRepo.findOne({
      where: { id },
      relations: ['position', 'restaurant', 'assignments', 'assignments.employee'],
    });
    if (!shift) throw new NotFoundException('Shift not found');
    return shift;
  }

  async create(dto: CreateShiftDto) {
    const shift = this.shiftsRepo.create({
      ...dto,
      start_time: new Date(dto.start_time),
      end_time: new Date(dto.end_time),
      status: dto.is_urgent ? ShiftStatus.URGENT : ShiftStatus.OPEN,
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
            position_id: dto.position_id,
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
        position_id: dto.position_id,
        start_time: slot.start_time.toISOString(),
        end_time: slot.end_time.toISOString(),
        required_employees: dto.required_employees ?? 1,
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
    await this.shiftsRepo.update(id, {
      ...dto,
      start_time: dto.start_time ? new Date(dto.start_time) : undefined,
      end_time: dto.end_time ? new Date(dto.end_time) : undefined,
    });
    const updated = await this.findOne(id);
    this.events.emit('shift.updated', updated);
    if (!existing.is_urgent && updated.is_urgent) this.events.emit('shift.emergency', updated);
    return updated;
  }

  async remove(id: string) {
    const shift = await this.findOne(id);
    await this.shiftsRepo.remove(shift);
    this.events.emit('shift.deleted', { id });
    return { deleted: true };
  }

  // --- Booking (TOR section 11) ---
  async book(shiftId: string, employeeId: string) {
    const shift = await this.findOne(shiftId);
    const employee = await this.employeesRepo.findOne({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');

    if (employee.position_id && employee.position_id !== shift.position_id) {
      throw new BadRequestException("Employee's position does not match this shift");
    }

    const alreadyAssigned = shift.assignments?.some((a) => a.employee_id === employeeId);
    if (alreadyAssigned) {
      throw new BadRequestException('Employee is already assigned to this shift');
    }

    if (shift.assignments && shift.assignments.length >= shift.required_employees) {
      throw new BadRequestException('Shift is already fully staffed');
    }

    await this.assertNoOverlap(employeeId, shift.start_time, shift.end_time);
    await this.assertWithinWeeklyLimit(employeeId, shift);

    const assignment = this.shiftEmployeesRepo.create({ shift_id: shiftId, employee_id: employeeId });
    await this.shiftEmployeesRepo.save(assignment);

    const updatedShift = await this.findOne(shiftId);
    const filled = updatedShift.assignments.length;
    updatedShift.status =
      filled >= updatedShift.required_employees ? ShiftStatus.FULLY_FILLED : ShiftStatus.PARTIALLY_FILLED;
    await this.shiftsRepo.save(updatedShift);

    this.events.emit('shift.updated', updatedShift);
    this.events.emit('shift.booking_confirmed', { shift: updatedShift, employeeId });
    return updatedShift;
  }

  private async assertNoOverlap(employeeId: string, start: Date, end: Date) {
    const overlapping = await this.shiftsRepo
      .createQueryBuilder('shift')
      .innerJoin('shift.assignments', 'assignment')
      .where('assignment.employee_id = :employeeId', { employeeId })
      .andWhere('shift.start_time < :end AND shift.end_time > :start', { start, end })
      .getCount();
    if (overlapping > 0) {
      throw new BadRequestException('This shift overlaps with another shift already booked');
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
      .innerJoin('shift.assignments', 'assignment')
      .where('assignment.employee_id = :employeeId', { employeeId })
      .andWhere('shift.start_time BETWEEN :weekStart AND :weekEnd', { weekStart, weekEnd })
      .getMany();

    const hoursAlready = weekShifts.reduce(
      (sum, s) => sum + (s.end_time.getTime() - s.start_time.getTime()) / 3_600_000,
      0,
    );
    const newShiftHours = (shift.end_time.getTime() - shift.start_time.getTime()) / 3_600_000;

    if (hoursAlready + newShiftHours > MAX_WEEKLY_HOURS) {
      throw new BadRequestException('Booking this shift would exceed the weekly hour limit');
    }
  }

  // --- "Can't make my shift" (TOR section 12) ---
  async cannotMakeShift(shiftId: string, employeeId: string, reason?: string) {
    const shift = await this.findOne(shiftId);
    const assignment = shift.assignments?.find((a) => a.employee_id === employeeId);
    if (!assignment) {
      throw new BadRequestException('This employee is not assigned to the shift');
    }

    await this.shiftEmployeesRepo.remove(assignment);

    shift.status = ShiftStatus.OPEN;
    await this.shiftsRepo.save(shift);

    const request = this.replacementRepo.create({
      shift_id: shiftId,
      employee_id: employeeId,
      reason,
      status: ReplacementStatus.PENDING,
    });
    const saved = await this.replacementRepo.save(request);

    this.events.emit('shift.updated', shift);
    this.events.emit('replacement.requested', { request: saved, shift });
    return saved;
  }
}
