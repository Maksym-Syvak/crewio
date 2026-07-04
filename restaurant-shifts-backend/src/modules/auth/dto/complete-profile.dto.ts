import { IsEnum, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../users/entities/user.entity';

export class CompleteProfileDto {
  @IsString()
  @MinLength(1)
  first_name: string;

  @IsString()
  @MinLength(1)
  last_name: string;

  @IsString()
  @MinLength(6)
  phone: string;

  @IsEnum(UserRole)
  role: UserRole;
}
