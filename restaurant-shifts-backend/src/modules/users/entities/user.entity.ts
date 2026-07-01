import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  EMPLOYEE = 'employee',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint', unique: true })
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

  @CreateDateColumn()
  created_at: Date;

  // A user can own multiple restaurants
  @OneToMany(() => Restaurant, (restaurant) => restaurant.owner)
  restaurants: Restaurant[];

  // A user can be staff at multiple restaurants (via Employee join entity)
  @OneToMany(() => Employee, (employee) => employee.user)
  employments: Employee[];
}
