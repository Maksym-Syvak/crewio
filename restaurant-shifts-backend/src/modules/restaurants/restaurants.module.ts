import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Restaurant } from './entities/restaurant.entity';
import { RestaurantsService } from './restaurants.service';
import { RestaurantsController } from './restaurants.controller';
import { GooglePlacesService } from './google-places.service';
import { InvitationTokensModule } from '../invitation-tokens/invitation-tokens.module';
import { ShiftsModule } from '../shifts/shifts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Restaurant]),
    forwardRef(() => InvitationTokensModule),
    forwardRef(() => ShiftsModule),
  ],
  controllers: [RestaurantsController],
  providers: [RestaurantsService, GooglePlacesService],
  exports: [RestaurantsService],
})
export class RestaurantsModule {}
