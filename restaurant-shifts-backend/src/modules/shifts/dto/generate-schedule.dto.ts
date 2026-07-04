import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { PaymentType } from '../entities/shift.entity';

export enum ScheduleMode {
  WEEKLY = 'weekly',
  ROTATION = 'rotation',
  CUSTOM_CYCLE = 'custom_cycle',
}

export enum RotationPreset {
  OFFICE_5_2 = '5_2',
  TWO_TWO = '2_2',
  THREE_THREE = '3_3',
  CUSTOM = 'custom',
}

export class GenerateScheduleDto {
  @IsString()
  restaurant_id: string;

  @IsEnum(ScheduleMode)
  mode: ScheduleMode;

  @IsDateString()
  date_from: string;

  @IsDateString()
  date_to: string;

  @Matches(/^\d{2}:\d{2}$/)
  start_time: string;

  @Matches(/^\d{2}:\d{2}$/)
  end_time: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  required_employees?: number;

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
  @IsString()
  shift_type?: string;

  /** Weekly mode: 0=Mon … 6=Sun */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  weekdays?: number[];

  /** Rotation / custom cycle preset */
  @IsOptional()
  @IsEnum(RotationPreset)
  preset?: RotationPreset;

  @IsOptional()
  @IsInt()
  @Min(1)
  work_days?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  rest_days?: number;

  /** Skip dates that already have a shift for this position at the same time */
  @IsOptional()
  skip_existing?: boolean;
}
