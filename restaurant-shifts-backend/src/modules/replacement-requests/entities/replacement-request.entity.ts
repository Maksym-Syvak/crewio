import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Shift } from '../../shifts/entities/shift.entity';
import { Employee } from '../../employees/entities/employee.entity';

export enum ReplacementStatus {
  PENDING = 'pending', // waiting for candidates
  HAS_CANDIDATES = 'has_candidates', // at least one applicant
  APPROVED = 'approved', // admin confirmed a replacement
  CANCELLED = 'cancelled',
}

// Created when an employee marks "Can't make my shift". Other employees of
// the same position can apply as a candidate; the admin approves one.
@Entity('replacement_requests')
export class ReplacementRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  shift_id: string;

  @ManyToOne(() => Shift, (shift) => shift.replacementRequests, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  // The employee who can no longer work the shift
  @Column()
  employee_id: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  // The employee approved by the admin to take over (nullable until approved)
  @Column({ nullable: true })
  candidate_employee_id: string;

  @ManyToOne(() => Employee, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'candidate_employee_id' })
  candidateEmployee: Employee;

  @Column({ type: 'enum', enum: ReplacementStatus, default: ReplacementStatus.PENDING })
  status: ReplacementStatus;

  @Column({ nullable: true })
  reason: string;

  @CreateDateColumn()
  created_at: Date;
}
