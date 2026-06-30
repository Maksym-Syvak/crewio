import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ReplacementRequest,
  ReplacementStatus,
} from './entities/replacement-request.entity';
import { Shift, ShiftStatus } from '../shifts/entities/shift.entity';
import { ShiftEmployee } from '../shifts/entities/shift-employee.entity';

@Injectable()
export class ReplacementRequestsService {
  constructor(
    @InjectRepository(ReplacementRequest)
    private readonly repo: Repository<ReplacementRequest>,
    @InjectRepository(Shift)
    private readonly shiftsRepo: Repository<Shift>,
    @InjectRepository(ShiftEmployee)
    private readonly shiftEmployeesRepo: Repository<ShiftEmployee>,
    private readonly events: EventEmitter2,
  ) {}

  findAll(shiftId?: string) {
    return this.repo.find({
      where: shiftId ? { shift_id: shiftId } : {},
      relations: ['shift', 'employee', 'candidateEmployee'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string) {
    const request = await this.repo.findOne({
      where: { id },
      relations: ['shift', 'employee', 'candidateEmployee'],
    });
    if (!request) throw new NotFoundException('Replacement request not found');
    return request;
  }

  // A coworker volunteers to take the open shift (TOR section 12)
  async apply(id: string, employeeId: string) {
    const request = await this.findOne(id);
    if (request.status === ReplacementStatus.APPROVED) {
      throw new BadRequestException('This replacement request is already resolved');
    }
    // MVP: keep the first applicant as the recorded candidate. A future
    // version could store multiple candidates in a separate table and let
    // the admin pick among them.
    if (!request.candidate_employee_id) {
      request.candidate_employee_id = employeeId;
      request.status = ReplacementStatus.HAS_CANDIDATES;
      await this.repo.save(request);
      this.events.emit('replacement.candidate_applied', request);
    }
    return request;
  }

  // Admin confirms the replacement (TOR section 12)
  async approve(id: string, candidateEmployeeId: string) {
    const request = await this.findOne(id);
    if (request.status === ReplacementStatus.APPROVED) {
      throw new BadRequestException('This replacement request is already approved');
    }

    const shift = await this.shiftsRepo.findOne({
      where: { id: request.shift_id },
      relations: ['assignments'],
    });
    if (!shift) throw new NotFoundException('Shift not found');

    const assignment = this.shiftEmployeesRepo.create({
      shift_id: shift.id,
      employee_id: candidateEmployeeId,
    });
    await this.shiftEmployeesRepo.save(assignment);

    request.candidate_employee_id = candidateEmployeeId;
    request.status = ReplacementStatus.APPROVED;
    await this.repo.save(request);

    const refreshedShift = await this.shiftsRepo.findOne({
      where: { id: shift.id },
      relations: ['assignments'],
    });
    if (!refreshedShift) throw new NotFoundException('Shift not found');
    refreshedShift.status =
      refreshedShift.assignments.length >= refreshedShift.required_employees
        ? ShiftStatus.FULLY_FILLED
        : ShiftStatus.PARTIALLY_FILLED;
    await this.shiftsRepo.save(refreshedShift);

    this.events.emit('replacement.accepted', request);
    this.events.emit('shift.updated', refreshedShift);
    return request;
  }

  async cancel(id: string) {
    const request = await this.findOne(id);
    request.status = ReplacementStatus.CANCELLED;
    return this.repo.save(request);
  }
}
