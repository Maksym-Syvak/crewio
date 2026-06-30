import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePositionDto {
  @IsString()
  restaurant_id: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  min_employees?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  max_employees?: number;

  @IsOptional()
  @IsNumber()
  hourly_rate?: number;

  @IsOptional()
  @IsNumber()
  shift_rate?: number;
}
