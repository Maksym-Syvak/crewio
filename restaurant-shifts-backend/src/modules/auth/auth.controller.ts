import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { DevLoginDto } from './dto/dev-login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /auth/login — verifies Telegram initData and returns a JWT
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.loginWithInitData(dto.initData);
  }

  @Post('dev-login')
  devLogin(@Body() dto: DevLoginDto) {
    return this.authService.devLogin(dto.telegram_id, dto.first_name);
  }

  // Example of a protected route; returns the decoded JWT payload
  @UseGuards(JwtAuthGuard)
  @Post('complete-profile')
  completeProfile(@Req() req: { user: { sub: string } }, @Body() dto: CompleteProfileDto) {
    return this.authService.completeProfile(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me')
  me(@Req() req: any) {
    return req.user;
  }
}
