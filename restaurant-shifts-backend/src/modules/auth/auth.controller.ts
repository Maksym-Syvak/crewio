import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { LoginPasswordDto } from './dto/login-password.dto';
import { DevLoginDto } from './dto/dev-login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.loginWithInitData(dto.initData);
  }

  @Post('login-password')
  loginPassword(@Body() dto: LoginPasswordDto) {
    return this.authService.loginWithPassword(dto);
  }

  @Post('dev-login')
  devLogin(@Body() dto: DevLoginDto) {
    return this.authService.devLogin(dto.telegram_id, dto.first_name);
  }

  @UseGuards(JwtAuthGuard)
  @Post('complete-profile')
  completeProfile(@Req() req: { user: { sub: string } }, @Body() dto: CompleteProfileDto) {
    return this.authService.completeProfile(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout() {
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('me')
  me(@Req() req: any) {
    return req.user;
  }
}
