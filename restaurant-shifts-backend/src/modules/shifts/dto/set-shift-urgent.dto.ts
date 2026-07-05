import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetShiftUrgentDto {
  @ApiProperty({ description: 'Mark shift as manually urgent' })
  @IsBoolean()
  urgent: boolean;
}
