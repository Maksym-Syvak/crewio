import { IsOptional, IsString } from 'class-validator';

/** Local development only — bypasses Telegram initData verification. */
export class DevLoginDto {
  @IsString()
  telegram_id: string;

  @IsOptional()
  @IsString()
  first_name?: string;
}
