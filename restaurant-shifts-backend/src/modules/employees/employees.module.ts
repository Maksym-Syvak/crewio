import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from './entities/employee.entity';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { StatisticsModule } from '../statistics/statistics.module';
import { PositionsModule } from '../positions/positions.module';
import { ShiftBooking } from '../shifts/entities/shift-booking.entity';
import { Statistics } from '../statistics/entities/statistics.entity';
import { Position } from '../positions/entities/position.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, ShiftBooking, Statistics, Position]),
    forwardRef(() => RestaurantsModule),
    forwardRef(() => PositionsModule),
    forwardRef(() => StatisticsModule),
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
