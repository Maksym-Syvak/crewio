import { IsString } from 'class-validator';

export class BookShiftDto {
  @IsString()
  employee_id: string;
}

export class CannotMakeShiftDto {
  @IsString()
  employee_id: string;
}
