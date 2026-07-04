import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PositionsService } from './positions.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmployeesService } from '../employees/employees.service';

@ApiTags('positions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('positions')
export class PositionsController {
  constructor(
    private readonly positionsService: PositionsService,
    private readonly employeesService: EmployeesService,
  ) {}

  @Get()
  findAll(@Query('restaurantId') restaurantId?: string) {
    return this.positionsService.findAll(restaurantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.positionsService.findOne(id);
  }

  @Post()
  async create(
    @Req() req: { user: { sub: string } },
    @Body() dto: CreatePositionDto,
  ) {
    await this.employeesService.assertCanManageRestaurant(
      req.user.sub,
      dto.restaurant_id,
    );
    return this.positionsService.create(dto);
  }

  @Put(':id')
  async update(
    @Req() req: { user: { sub: string } },
    @Param('id') id: string,
    @Body() dto: UpdatePositionDto,
  ) {
    const position = await this.positionsService.findOne(id);
    await this.employeesService.assertCanManageRestaurant(
      req.user.sub,
      position.restaurant_id,
    );
    return this.positionsService.update(id, dto);
  }

  @Delete(':id')
  async remove(
    @Req() req: { user: { sub: string } },
    @Param('id') id: string,
  ) {
    const position = await this.positionsService.findOne(id);
    await this.employeesService.assertCanManageRestaurant(
      req.user.sub,
      position.restaurant_id,
    );
    return this.positionsService.remove(id);
  }
}
