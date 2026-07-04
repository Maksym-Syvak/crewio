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
import { ShiftBooking } from './shift-booking.entity';
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

  @Column({ type: 'date', nullable: true })
  shift_date: string | null;

  @Column({ type: 'timestamptz' })
  start_time: Date;

  @Column({ type: 'timestamptz' })
  end_time: Date;

  @Column({ default: 1 })
  required_employees: number;

  @Column({ default: 0 })
  booked_employees: number;

  @Column({ type: 'varchar', nullable: true })
  shift_type: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  payment_rate: number | null;

  @Column({ type: 'enum', enum: ShiftStatus, default: ShiftStatus.OPEN })
  status: ShiftStatus;

  @Column({ default: false })
  is_urgent: boolean;

  /** @deprecated Shifts are open pool — no position required */
  @Column({ type: 'uuid', nullable: true })
  position_id: string | null;

  @ManyToOne(() => Position, (position) => position.shifts, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'position_id' })
  position: Position | null;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => ShiftBooking, (booking) => booking.shift, { cascade: true })
  bookings: ShiftBooking[];

  @OneToMany(() => ReplacementRequest, (request) => request.shift)
  replacementRequests: ReplacementRequest[];
}
