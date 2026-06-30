import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shift } from './entities/shift.entity';
import { ShiftEmployee } from './entities/shift-employee.entity';
import { Employee } from '../employees/entities/employee.entity';
import { ReplacementRequest } from '../replacement-requests/entities/replacement-request.entity';
import { ShiftsService } from './shifts.service';
import { ShiftsController } from './shifts.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shift, ShiftEmployee, Employee, ReplacementRequest]),
  ],
  controllers: [ShiftsController],
  providers: [ShiftsService],
  exports: [ShiftsService],
})
export class ShiftsModule {}
