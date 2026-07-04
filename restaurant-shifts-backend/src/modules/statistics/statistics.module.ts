import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Statistics } from './entities/statistics.entity';
import { ShiftBooking } from '../shifts/entities/shift-booking.entity';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';
import { EmployeesModule } from '../employees/employees.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Statistics, ShiftBooking]),
    forwardRef(() => EmployeesModule),
  ],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
