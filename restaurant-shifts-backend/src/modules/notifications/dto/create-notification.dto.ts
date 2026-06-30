import { IsEnum, IsOptional, IsString } from 'class-validator';
import { NotificationType } from '../entities/notification.entity';

export class CreateNotificationDto {
  @IsString()
  user_id: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  related_shift_id?: string;
}
