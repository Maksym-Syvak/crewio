import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReplacementRequestsService } from './replacement-requests.service';
import { ApplyReplacementDto, ApproveReplacementDto } from './dto/apply-replacement.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('replacement-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('replacement')
export class ReplacementRequestsController {
  constructor(private readonly service: ReplacementRequestsService) {}

  @Get()
  findAll(@Query('shiftId') shiftId?: string) {
    return this.service.findAll(shiftId);
  }

  // A coworker applies to take over the shift
  @Post(':id/apply')
  apply(@Param('id') id: string, @Body() dto: ApplyReplacementDto) {
    return this.service.apply(id, dto.employee_id);
  }

  // Admin approves a specific candidate
  @Roles('owner', 'admin')
  @Put(':id')
  approve(@Param('id') id: string, @Body() dto: ApproveReplacementDto) {
    return this.service.approve(id, dto.candidate_employee_id);
  }
}
