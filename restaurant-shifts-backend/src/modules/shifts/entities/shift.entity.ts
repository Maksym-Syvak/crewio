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
import { Position } from '../../positions/entities/position.entity';
import { ShiftEmployee } from './shift-employee.entity';
import { ReplacementRequest } from '../../replacement-requests/entities/replacement-request.entity';

export enum ShiftStatus {
  OPEN = 'open',
  PARTIALLY_FILLED = 'partially_filled',
  FULLY_FILLED = 'fully_filled',
  URGENT = 'urgent',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('shifts')
export class Shift {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  restaurant_id: string;

  @ManyToOne(() => Restaurant, (restaurant) => restaurant.shifts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column()
  position_id: string;

  @ManyToOne(() => Position, (position) => position.shifts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'position_id' })
  position: Position;

  @Column({ type: 'timestamptz' })
  start_time: Date;

  @Column({ type: 'timestamptz' })
  end_time: Date;

  @Column({ default: 1 })
  required_employees: number;

  @Column({ type: 'enum', enum: ShiftStatus, default: ShiftStatus.OPEN })
  status: ShiftStatus;

  @Column({ default: false })
  is_urgent: boolean;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => ShiftEmployee, (shiftEmployee) => shiftEmployee.shift, {
    cascade: true,
  })
  assignments: ShiftEmployee[];

  @OneToMany(() => ReplacementRequest, (request) => request.shift)
  replacementRequests: ReplacementRequest[];
}
