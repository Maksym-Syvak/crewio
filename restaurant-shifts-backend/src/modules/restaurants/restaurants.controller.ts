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
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto, ImportRestaurantFromGoogleDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('restaurants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get()
  findAll(@Query('ownerId') ownerId?: string) {
    return this.restaurantsService.findAll(ownerId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.restaurantsService.findOne(id);
  }

  // Manual creation — TOR section 6, variant 1
  @Roles('owner')
  @Post()
  create(@Req() req: any, @Body() dto: CreateRestaurantDto) {
    return this.restaurantsService.create(req.user.sub, dto);
  }

  // Import from Google Maps — TOR section 6, variant 2
  @Roles('owner')
  @Post('import-from-google')
  importFromGoogle(@Req() req: any, @Body() dto: ImportRestaurantFromGoogleDto) {
    return this.restaurantsService.createFromGoogle(req.user.sub, dto);
  }

  @Roles('owner')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRestaurantDto) {
    return this.restaurantsService.update(id, dto);
  }

  @Roles('owner')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.restaurantsService.remove(id);
  }
}
