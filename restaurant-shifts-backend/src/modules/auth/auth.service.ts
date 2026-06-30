import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';

interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Validates the `initData` string Telegram Mini Apps provide on launch.
   * See: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
   */
  verifyInitData(initData: string): TelegramAuthData {
    const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new UnauthorizedException('Telegram bot token is not configured');
    }

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) {
      throw new UnauthorizedException('Missing hash in initData');
    }
    params.delete('hash');

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (computedHash !== hash) {
      throw new UnauthorizedException('Invalid Telegram initData signature');
    }

    const authDate = Number(params.get('auth_date') ?? 0);
    const maxAgeSeconds = 24 * 60 * 60;
    if (Date.now() / 1000 - authDate > maxAgeSeconds) {
      throw new UnauthorizedException('initData has expired');
    }

    const userJson = params.get('user');
    if (!userJson) {
      throw new UnauthorizedException('Missing user in initData');
    }
    return JSON.parse(userJson) as TelegramAuthData;
  }

  async loginWithInitData(initData: string) {
    const telegramUser = this.verifyInitData(initData);

    let user = await this.usersService.findByTelegramId(String(telegramUser.id));
    if (!user) {
      // First-time login: default role is employee. Owners typically
      // upgrade their own role when they create a restaurant.
      user = await this.usersService.create({
        telegram_id: String(telegramUser.id),
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        photo_url: telegramUser.photo_url,
        role: UserRole.EMPLOYEE,
      });
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      telegram_id: user.telegram_id,
      role: user.role,
    });

    return { accessToken, user };
  }

  /** Development-only login without Telegram Mini App (NODE_ENV !== production). */
  async devLogin(telegramId: string, firstName = 'Dev User') {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new UnauthorizedException('Dev login is disabled in production');
    }

    let user = await this.usersService.findByTelegramId(telegramId);
    if (!user) {
      user = await this.usersService.create({
        telegram_id: telegramId,
        first_name: firstName,
        role: UserRole.EMPLOYEE,
      });
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      telegram_id: user.telegram_id,
      role: user.role,
    });

    return { accessToken, user };
  }
}
