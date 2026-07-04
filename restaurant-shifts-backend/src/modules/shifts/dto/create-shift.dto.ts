import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaymentType } from '../entities/shift.entity';

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
  @IsEnum(PaymentType)
  payment_type?: PaymentType;

  /** @deprecated use shift_rate */
  @IsOptional()
  @IsNumber()
  @Min(0)
  payment_rate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shift_rate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hourly_rate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fixed_rate?: number;

  @IsOptional()
  @IsBoolean()
  is_urgent?: boolean;

  /** Internal: suppress per-shift events when bulk-generating schedule */
  @IsOptional()
  @IsBoolean()
  isBulkCreation?: boolean;
}
