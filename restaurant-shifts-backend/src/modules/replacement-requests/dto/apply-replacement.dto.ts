import { IsString } from 'class-validator';

export class ApplyReplacementDto {
  @IsString()
  employee_id: string;
}

export class ApproveReplacementDto {
  @IsString()
  candidate_employee_id: string;
}
