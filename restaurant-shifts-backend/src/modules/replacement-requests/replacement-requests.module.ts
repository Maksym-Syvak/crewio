import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReplacementRequest } from './entities/replacement-request.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { ShiftBooking } from '../shifts/entities/shift-booking.entity';
import { ReplacementRequestsService } from './replacement-requests.service';
import { ReplacementRequestsController } from './replacement-requests.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ReplacementRequest, Shift, ShiftBooking])],
  controllers: [ReplacementRequestsController],
  providers: [ReplacementRequestsService],
  exports: [ReplacementRequestsService],
})
export class ReplacementRequestsModule {}
