import { IsDateString } from 'class-validator';

export class CloseShiftDto {
  @IsDateString()
  actual_start_time: string;

  @IsDateString()
  actual_end_time: string;
}
