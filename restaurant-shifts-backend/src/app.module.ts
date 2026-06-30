import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

import { typeOrmConfig } from './config/typeorm.config';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RestaurantsModule } from './modules/restaurants/restaurants.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { PositionsModule } from './modules/positions/positions.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { ReplacementRequestsModule } from './modules/replacement-requests/replacement-requests.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { EventsModule } from './modules/events/events.module';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: typeOrmConfig,
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    RestaurantsModule,
    EmployeesModule,
    PositionsModule,
    ShiftsModule,
    ReplacementRequestsModule,
    NotificationsModule,
    StatisticsModule,
    TelegramModule,
    EventsModule,
  ],
})
export class AppModule {}
