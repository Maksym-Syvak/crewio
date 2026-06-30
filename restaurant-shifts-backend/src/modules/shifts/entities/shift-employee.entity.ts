import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Shift } from './shift.entity';
import { Employee } from '../../employees/entities/employee.entity';

// Join table: which employees are assigned to which shift.
// A shift can have several employees if required_employees > 1.
@Entity('shift_employees')
export class ShiftEmployee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  shift_id: string;

  @ManyToOne(() => Shift, (shift) => shift.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @Column()
  employee_id: string;

  @ManyToOne(() => Employee, (employee) => employee.shiftAssignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @CreateDateColumn()
  assigned_at: Date;
}
