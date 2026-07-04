import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { EmployeeStatus, MemberRole } from '../entities/employee.entity';

export class CreateEmployeeDto {
  @IsString()
  restaurant_id: string;

  @IsString()
  user_id: string;

  @IsOptional()
  @IsString()
  position_id?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumber()
  salary_rate?: number;

  @IsOptional()
  @IsNumber()
  hourly_rate?: number;

  @IsOptional()
  @IsNumber()
  desired_shifts_per_month?: number;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @IsOptional()
  @IsEnum(MemberRole)
  member_role?: MemberRole;
}
