import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('statistics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly service: StatisticsService) {}

  @Get()
  findAll(@Query('employeeId') employeeId?: string, @Query('month') month?: string) {
    return this.service.findAll({ employeeId, month });
  }

  @Roles('owner', 'admin')
  @UseGuards(RolesGuard)
  @Post('recompute')
  recompute(@Query('employeeId') employeeId: string, @Query('month') month?: string) {
    const m = month ?? new Date().toISOString().slice(0, 7);
    return this.service.recompute(employeeId, m);
  }
}
