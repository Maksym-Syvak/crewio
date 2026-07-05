import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { normalizeTelegramId } from '../../../common/utils/telegram-id.util';

export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  EMPLOYEE = 'employee',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'bigint',
    unique: true,
    transformer: {
      to: (value: string) => normalizeTelegramId(value),
      from: (value: string | number) => normalizeTelegramId(value),
    },
  })
  telegram_id: string;

  @Column({ nullable: true })
  username: string;

  @Column()
  first_name: string;

  @Column({ nullable: true })
  last_name: string;

  @Column({ length: 30, nullable: true })
  phone: string;

  @Column({ nullable: true })
  photo_url: string;

  @Column({ default: false })
  is_profile_completed: boolean;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.EMPLOYEE })
  role: UserRole;

  @Column({ nullable: true, select: false })
  password_hash: string;

  @Column({ default: false })
  is_deleted: boolean;

  @DeleteDateColumn({ nullable: true })
  deleted_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Restaurant, (restaurant) => restaurant.owner)
  restaurants: Restaurant[];

  @OneToMany(() => Employee, (employee) => employee.user)
  employments: Employee[];
}
