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

export enum ShiftBookingStatus {
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

@Entity('shift_bookings')
export class ShiftBooking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  shift_id: string;

  @ManyToOne(() => Shift, (shift) => shift.bookings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @Column()
  employee_id: string;

  @ManyToOne(() => Employee, (employee) => employee.shiftBookings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({
    type: 'enum',
    enum: ShiftBookingStatus,
    default: ShiftBookingStatus.CONFIRMED,
  })
  status: ShiftBookingStatus;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  planned_salary: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  actual_salary: number | null;

  @CreateDateColumn()
  created_at: Date;
}
