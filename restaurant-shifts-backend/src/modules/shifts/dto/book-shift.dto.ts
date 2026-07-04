import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { BookingType } from '../entities/shift-booking.entity';

export class BookShiftDto {
  @IsString()
  employee_id: string;

  @IsOptional()
  @IsEnum(BookingType)
  booking_type?: BookingType;

  @IsOptional()
  @IsDateString()
  booked_start_time?: string;

  @IsOptional()
  @IsDateString()
  booked_end_time?: string;
}

export class CannotMakeShiftDto {
  @IsString()
  employee_id: string;
}
