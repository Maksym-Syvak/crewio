import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
  SENT = 'sent',
  FAILED = 'failed',
}

export enum NotificationType {
  SHIFT_TOMORROW = 'shift_tomorrow',
  SHIFT_IN_ONE_HOUR = 'shift_in_one_hour',
  NEW_SHIFT_AVAILABLE = 'new_shift_available',
  SCHEDULE_PUBLISHED = 'schedule_published',
  URGENT_REPLACEMENT = 'urgent_replacement',
  BOOKING_CONFIRMED = 'booking_confirmed',
  UNFILLED_SHIFT = 'unfilled_shift',
  REPLACEMENT_REQUEST = 'replacement_request',
  SHIFT_CANCELLED = 'shift_cancelled',
  STAFF_SHORTAGE = 'staff_shortage',
  WEEKLY_STATISTICS = 'weekly_statistics',
  SCHEDULE_ISSUE = 'schedule_issue',
  GENERAL = 'general',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: NotificationType, default: NotificationType.GENERAL })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.UNREAD })
  status: NotificationStatus;

  // Optional reference to the entity that triggered this notification
  @Column({ nullable: true })
  related_shift_id: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  created_at: Date;
}
