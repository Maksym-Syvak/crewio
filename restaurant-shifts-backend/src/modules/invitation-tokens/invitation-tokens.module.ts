import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvitationToken } from './entities/invitation-token.entity';
import { InvitationTokensService } from './invitation-tokens.service';
import { InvitationTokensController } from './invitation-tokens.controller';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { EmployeesModule } from '../employees/employees.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InvitationToken]),
    forwardRef(() => RestaurantsModule),
    EmployeesModule,
    UsersModule,
  ],
  controllers: [InvitationTokensController],
  providers: [InvitationTokensService],
  exports: [InvitationTokensService],
})
export class InvitationTokensModule {}
