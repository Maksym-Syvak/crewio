import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { Position } from '../../positions/entities/position.entity';
import { Shift } from '../../shifts/entities/shift.entity';

export enum RestaurantType {
  RESTAURANT = 'restaurant',
  CAFE = 'cafe',
  BAR = 'bar',
  COFFEE_SHOP = 'coffee_shop',
  FAST_FOOD = 'fast_food',
  PIZZERIA = 'pizzeria',
  SUSHI = 'sushi',
  HOOKAH = 'hookah',
  OTHER = 'other',
}

@Entity('restaurants')
export class Restaurant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  owner_id: string;

  @ManyToOne(() => User, (user) => user.restaurants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column()
  name: string;

  @Column()
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  region: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  website: string;

  @Column({ type: 'int', nullable: true })
  employees_limit: number;

  @Column({ type: 'double precision', nullable: true })
  latitude: number;

  @Column({ type: 'double precision', nullable: true })
  longitude: number;

  @Column({ nullable: true })
  phone: string;

  // e.g. { "mon": "09:00-22:00", "tue": "09:00-22:00", ... }
  @Column({ type: 'jsonb', nullable: true })
  working_hours: Record<string, string>;

  @Column({ type: 'enum', enum: RestaurantType, default: RestaurantType.RESTAURANT })
  type: RestaurantType;

  @Column({ default: 0 })
  staff_count: number;

  @Column({ nullable: true })
  photo_url: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Employee, (employee) => employee.restaurant)
  employees: Employee[];

  @OneToMany(() => Position, (position) => position.restaurant)
  positions: Position[];

  @OneToMany(() => Shift, (shift) => shift.restaurant)
  shifts: Shift[];
}
