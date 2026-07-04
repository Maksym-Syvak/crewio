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
import { InvitationTokensService } from '../invitation-tokens/invitation-tokens.service';
import { ShiftsService } from '../shifts/shifts.service';

@ApiTags('restaurants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants')
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly invitationTokensService: InvitationTokensService,
    private readonly shiftsService: ShiftsService,
  ) {}

  @Get()
  findAll(@Query('ownerId') ownerId?: string) {
    return this.restaurantsService.findAll(ownerId);
  }

  @Get('mine')
  findMine(@Req() req: { user: { sub: string } }) {
    return this.restaurantsService.findAll(req.user.sub);
  }

  @Roles('owner', 'admin')
  @Post('integrity-check')
  integrityCheck(
    @Query('restaurantId') restaurantId: string,
    @Req() req: { user: { sub: string; role: string } },
  ) {
    return this.restaurantsService.runIntegrityCheck(
      restaurantId,
      req.user.sub,
      req.user.role,
      (id) => this.shiftsService.repairBookingIntegrity(id),
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.restaurantsService.findOne(id);
  }

  @Roles('owner', 'admin')
  @Post()
  async create(@Req() req: { user: { sub: string } }, @Body() dto: CreateRestaurantDto) {
    const restaurant = await this.restaurantsService.create(req.user.sub, dto);
    const invitation = await this.invitationTokensService.createForRestaurant(
      restaurant.id,
      req.user.sub,
    );
    return { restaurant, invitation };
  }

  @Roles('owner')
  @Post('import-from-google')
  importFromGoogle(@Req() req: any, @Body() dto: ImportRestaurantFromGoogleDto) {
    return this.restaurantsService.createFromGoogle(req.user.sub, dto);
  }

  @Roles('owner', 'admin')
  @Post(':id/invite')
  regenerateInvite(
    @Param('id') id: string,
    @Req() req: { user: { sub: string; role: string } },
  ) {
    return this.invitationTokensService.regenerate(id, req.user.sub, req.user.role);
  }

  @Roles('owner', 'admin')
  @Get(':id/invite')
  getInvite(@Param('id') id: string) {
    return this.invitationTokensService.getActiveForRestaurant(id);
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
