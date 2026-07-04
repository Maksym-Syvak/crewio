import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateShiftDto {
  @IsString()
  restaurant_id: string;

  @IsDateString()
  start_time: string;

  @IsDateString()
  end_time: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  required_employees?: number;

  @IsOptional()
  @IsString()
  shift_type?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  payment_rate?: number;

  @IsOptional()
  @IsBoolean()
  is_urgent?: boolean;
}
