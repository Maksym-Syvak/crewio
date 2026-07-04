import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ListEmployeesQueryDto } from './dto/list-employees-query.dto';

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  async findAll(
    @Req() req: { user: { sub: string; role: string } },
    @Query() query: ListEmployeesQueryDto,
  ) {
    await this.employeesService.assertCanViewRestaurantStaff(
      req.user.sub,
      req.user.role,
      query.restaurantId,
    );
    return this.employeesService.findAll(
      query.restaurantId,
      query.page ?? 1,
      query.limit ?? 20,
    );
  }

  @Get('workspaces')
  listWorkspaces(@Req() req: { user: { sub: string } }) {
    return this.employeesService.listWorkspaces(req.user.sub);
  }

  @Get('me')
  findMine(
    @Req() req: { user: { sub: string } },
    @Query('restaurantId') restaurantId?: string,
  ) {
    return this.employeesService.findMembership(req.user.sub, restaurantId);
  }

  @Get(':id/profile')
  async getProfile(
    @Req() req: { user: { sub: string; role: string } },
    @Param('id') id: string,
  ) {
    return this.employeesService.getProfile(id, req.user.sub, req.user.role);
  }

  @Get(':id')
  async findOne(
    @Req() req: { user: { sub: string; role: string } },
    @Param('id') id: string,
  ) {
    const employee = await this.employeesService.findOne(id);
    await this.employeesService.assertCanViewRestaurantStaff(
      req.user.sub,
      req.user.role,
      employee.restaurant_id,
    );
    return employee;
  }

  @Roles('owner', 'admin')
  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Put(':id')
  update(
    @Req() req: { user: { sub: string } },
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeesService.updateManaged(id, req.user.sub, dto);
  }

  @Roles('owner', 'admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }
}
