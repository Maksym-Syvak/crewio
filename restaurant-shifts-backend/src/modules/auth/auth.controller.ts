import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { DevLoginDto } from './dto/dev-login.dto';
import { RefreshDto, LogoutDto } from './dto/refresh.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('check-user')
  checkUser(@Body() dto: LoginDto) {
    return this.authService.checkUser(dto.initData, dto.platform);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.loginWithInitData(dto.initData, dto.platform);
  }

  @Post('register')
  register(@Body() dto: LoginDto) {
    return this.authService.registerWithInitData(dto.initData, dto.platform);
  }

  @Post('restore-account')
  restoreAccount(@Body() dto: LoginDto) {
    return this.authService.restoreAccount(dto.initData, dto.platform);
  }

  @Post('recreate-account')
  recreateAccount(@Body() dto: LoginDto) {
    return this.authService.recreateAccount(dto.initData, dto.platform);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refreshSession(dto.refreshToken);
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
  logout(@Req() req: { user: { sub: string } }, @Body() dto: LogoutDto) {
    return this.authService.logout(req.user.sub, dto?.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me')
  me(@Req() req: any) {
    return req.user;
  }
}
