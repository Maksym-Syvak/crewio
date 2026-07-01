import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { LoginPasswordDto } from './dto/login-password.dto';
import { toPublicUser } from '../../common/utils/user-response';

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

  private signToken(user: { id: string; telegram_id: string; role: UserRole }) {
    return this.jwtService.signAsync({
      sub: user.id,
      telegram_id: user.telegram_id,
      role: user.role,
    });
  }

  private async buildAuthResponse(user: Awaited<ReturnType<UsersService['findById']>>) {
    if (!user) throw new UnauthorizedException('User not found');
    const accessToken = await this.signToken(user);
    const withPassword = await this.usersService.findByIdWithPassword(user.id);
    return {
      accessToken,
      user: toPublicUser(user, withPassword?.password_hash),
    };
  }

  async loginWithInitData(initData: string) {
    const telegramUser = this.verifyInitData(initData);

    let user = await this.usersService.findByTelegramId(String(telegramUser.id));
    if (!user) {
      user = await this.usersService.create({
        telegram_id: String(telegramUser.id),
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        photo_url: telegramUser.photo_url,
        role: UserRole.EMPLOYEE,
        is_profile_completed: false,
      });
    } else {
      await this.usersService.update(user.id, {
        username: telegramUser.username ?? user.username,
        photo_url: telegramUser.photo_url ?? user.photo_url,
      });
      user = (await this.usersService.findById(user.id))!;
    }

    return this.buildAuthResponse(user);
  }

  async loginWithPassword(dto: LoginPasswordDto) {
    const user = await this.usersService.findByLogin(dto.login);
    if (!user?.password_hash) {
      throw new UnauthorizedException('Невірний логін або пароль');
    }

    const valid = await this.usersService.verifyPassword(dto.password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedException('Невірний логін або пароль');
    }

    return this.buildAuthResponse(user);
  }

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
        is_profile_completed: false,
      });
    }

    return this.buildAuthResponse(user);
  }

  async completeProfile(userId: string, dto: CompleteProfileDto) {
    const user = await this.usersService.findByIdWithPassword(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const needsPassword = !user.password_hash;
    if (needsPassword) {
      if (!dto.password || !dto.password_confirm) {
        throw new BadRequestException('Створіть пароль для входу');
      }
      if (dto.password !== dto.password_confirm) {
        throw new BadRequestException('Паролі не співпадають');
      }
    }

    const update: Partial<typeof user> = {
      first_name: dto.first_name,
      last_name: dto.last_name,
      phone: dto.phone,
      role: dto.role,
      is_profile_completed: true,
    };

    if (dto.password) {
      update.password_hash = await this.usersService.hashPassword(dto.password);
    }

    await this.usersService.update(userId, update);
    const updated = await this.usersService.findById(userId);
    return this.buildAuthResponse(updated);
  }
}
