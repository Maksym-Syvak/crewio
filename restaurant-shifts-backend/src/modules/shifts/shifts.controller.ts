import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { GenerateScheduleDto } from './dto/generate-schedule.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { BookShiftDto, CannotMakeShiftDto } from './dto/book-shift.dto';
import { ShiftStatus } from './entities/shift.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('shifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get()
  findAll(
    @Query('restaurantId') restaurantId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: ShiftStatus,
  ) {
    return this.shiftsService.findAll({ restaurantId, employeeId, status });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shiftsService.findOne(id);
  }

  @Roles('owner', 'admin')
  @Post('generate')
  generate(@Body() dto: GenerateScheduleDto) {
    return this.shiftsService.generateSchedule(dto);
  }

  @Roles('owner', 'admin')
  @Post()
  create(@Body() dto: CreateShiftDto) {
    return this.shiftsService.create(dto);
  }

  @Roles('owner', 'admin')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateShiftDto) {
    return this.shiftsService.update(id, dto);
  }

  @Roles('owner', 'admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.shiftsService.remove(id);
  }

  @Roles('owner', 'admin')
  @Post(':id/close')
  close(@Param('id') id: string, @Body() dto: CloseShiftDto) {
    return this.shiftsService.closeShift(id, dto);
  }

  // Employee books an open shift (TOR section 11)
  @Post(':id/book')
  book(@Param('id') id: string, @Body() dto: BookShiftDto) {
    return this.shiftsService.book(id, dto.employee_id);
  }

  // Employee says "I can't make my shift" (TOR section 12)
  @Post(':id/cannot-make-it')
  cannotMakeShift(@Param('id') id: string, @Body() dto: CannotMakeShiftDto) {
    return this.shiftsService.cannotMakeShift(id, dto.employee_id);
  }
}
