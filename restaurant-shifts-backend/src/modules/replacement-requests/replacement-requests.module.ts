import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReplacementRequest } from './entities/replacement-request.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { ShiftEmployee } from '../shifts/entities/shift-employee.entity';
import { ReplacementRequestsService } from './replacement-requests.service';
import { ReplacementRequestsController } from './replacement-requests.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ReplacementRequest, Shift, ShiftEmployee])],
  controllers: [ReplacementRequestsController],
  providers: [ReplacementRequestsService],
  exports: [ReplacementRequestsService],
})
export class ReplacementRequestsModule {}
