import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginPasswordDto {
  @IsString()
  @MinLength(1)
  login: string;

  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password: string;
}
