import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

// The Mini App frontend sends the raw `initData` string it receives from
// window.Telegram.WebApp.initData. The backend verifies its signature
// using the bot token before trusting any of the fields inside it.
export class LoginDto {
  @IsString()
  @IsNotEmpty()
  initData: string;

  /** Telegram WebApp platform (tdesktop, android, ios, …) */
  @IsOptional()
  @IsString()
  platform?: string;
}
