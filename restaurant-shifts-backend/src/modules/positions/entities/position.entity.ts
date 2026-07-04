import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { Shift } from '../../shifts/entities/shift.entity';

@Entity('positions')
export class Position {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  restaurant_id: string;

  @ManyToOne(() => Restaurant, (restaurant) => restaurant.positions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column()
  name: string;

  @Column({ default: 0 })
  min_employees: number;

  @Column({ default: 1 })
  max_employees: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  hourly_rate: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  shift_rate: number;

  @OneToMany(() => Employee, (employee) => employee.position)
  employees: Employee[];

  @OneToMany(() => Shift, (shift) => shift.position)
  shifts: Shift[];
}
