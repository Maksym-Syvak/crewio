import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shift } from './entities/shift.entity';
import { ShiftBooking } from './entities/shift-booking.entity';
import { Employee } from '../employees/entities/employee.entity';
import { ReplacementRequest } from '../replacement-requests/entities/replacement-request.entity';
import { ShiftsService } from './shifts.service';
import { ShiftsController } from './shifts.controller';
import { ShiftsScheduler } from './shifts.scheduler';
import { EmployeesModule } from '../employees/employees.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shift, ShiftBooking, Employee, ReplacementRequest]),
    EmployeesModule,
  ],
  controllers: [ShiftsController],
  providers: [ShiftsService, ShiftsScheduler],
  exports: [ShiftsService],
})
export class ShiftsModule {}
