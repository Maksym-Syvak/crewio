import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { User } from '../../users/entities/user.entity';
import { Position } from '../../positions/entities/position.entity';
import { ShiftEmployee } from '../../shifts/entities/shift-employee.entity';

export enum EmployeeStatus {
  ACTIVE = 'active',
  ON_LEAVE = 'on_leave',
  TERMINATED = 'terminated',
  TEMPORARILY_UNAVAILABLE = 'temporarily_unavailable',
}

// "employees" is the join entity between a restaurant, a user (their
// Telegram account) and a position — a single Telegram user can be an
// employee at several restaurants, each as a separate Employee row.
@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  restaurant_id: string;

  @ManyToOne(() => Restaurant, (restaurant) => restaurant.employees, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column()
  user_id: string;

  @ManyToOne(() => User, (user) => user.employments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true })
  position_id: string;

  @ManyToOne(() => Position, (position) => position.employees, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'position_id' })
  position: Position;

  @Column({ nullable: true })
  phone: string;

  // Per-shift rate; falls back to the position's shift_rate if not set
  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  salary_rate: number;

  // Per-hour rate; falls back to the position's hourly_rate if not set
  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  hourly_rate: number;

  @Column({ default: 0 })
  desired_shifts_per_month: number;

  @Column({ type: 'enum', enum: EmployeeStatus, default: EmployeeStatus.ACTIVE })
  status: EmployeeStatus;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => ShiftEmployee, (shiftEmployee) => shiftEmployee.employee)
  shiftAssignments: ShiftEmployee[];
}
