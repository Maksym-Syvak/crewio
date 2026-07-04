import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';

// One row per employee per month — recalculated/upserted as shifts complete.
@Entity('statistics')
export class Statistics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  employee_id: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  // Stored as the first day of the month, e.g. 2026-06-01
  @Column({ type: 'date' })
  month: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  worked_hours: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  planned_hours: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  actual_hours: number;

  @Column({ default: 0 })
  worked_shifts: number;

  @Column({ default: 0 })
  booked_shifts: number;

  @Column({ default: 0 })
  night_shifts: number;

  @Column({ default: 0 })
  absences: number;

  @Column({ default: 0 })
  replacements: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  expected_salary: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  planned_salary: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  actual_salary: number;
}
