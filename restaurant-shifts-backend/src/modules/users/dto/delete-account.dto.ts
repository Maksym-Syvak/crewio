import { IsBoolean, IsOptional } from 'class-validator';

export class DeleteAccountDto {
  @IsOptional()
  @IsBoolean()
  confirm_delete_restaurant?: boolean;
}
