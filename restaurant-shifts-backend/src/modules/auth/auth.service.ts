import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { toPublicUser } from '../../common/utils/user-response';
import { normalizeTelegramId } from '../../common/utils/telegram-id.util';
import { classifyTelegramPlatform } from '../../common/utils/telegram-platform.util';
import { RefreshToken } from './entities/refresh-token.entity';

interface TelegramAuthData {
  id: number | string;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokensRepo: Repository<RefreshToken>,
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

  private resolvePlatformLabel(platform?: string): string {
    return classifyTelegramPlatform(platform);
  }

  private logTelegramAuth(
    action: string,
    telegramUser: TelegramAuthData,
    platform: string | undefined,
    userFound: boolean,
    databaseTelegramId: string | null,
  ) {
    const telegramId = normalizeTelegramId(telegramUser.id);
    const platformLabel = this.resolvePlatformLabel(platform);

    this.logger.log(`=== TELEGRAM LOGIN ===
action: ${action}
platform: ${platformLabel}
telegram_id: ${telegramId}
telegram_id_type: ${typeof telegramUser.id}
username: ${telegramUser.username ?? '—'}
first_name: ${telegramUser.first_name}
last_name: ${telegramUser.last_name ?? '—'}
user_found: ${userFound}
database_telegram_id: ${databaseTelegramId ?? '—'}
=====================`);

    this.logger.log(
      `[telegram-auth] ${action} platform=${platformLabel} telegram_id=${telegramId} username=${telegramUser.username ?? '—'} first_name=${telegramUser.first_name} last_name=${telegramUser.last_name ?? '—'} user_found=${userFound}`,
    );
  }

  private async resolveTelegramUser(initData: string, platform?: string) {
    const telegramUser = this.verifyInitData(initData);
    const telegramId = normalizeTelegramId(telegramUser.id);
    const dbUser = await this.usersService.findAnyByTelegramId(telegramId);
    return {
      telegramUser,
      telegramId,
      dbUser,
      databaseTelegramId: dbUser ? normalizeTelegramId(dbUser.telegram_id) : null,
      platform,
    };
  }

  private getAccessExpiresInSeconds(): number {
    const raw = this.config.get<string>('JWT_EXPIRES_IN', '900');
    if (/^\d+$/.test(raw)) return parseInt(raw, 10);
    if (raw.endsWith('d')) return parseInt(raw, 10) * 86_400;
    if (raw.endsWith('h')) return parseInt(raw, 10) * 3_600;
    if (raw.endsWith('m')) return parseInt(raw, 10) * 60;
    return 900;
  }

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const days = parseInt(this.config.get<string>('JWT_REFRESH_EXPIRES_DAYS', '30'), 10);
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + days);

    await this.refreshTokensRepo.save(
      this.refreshTokensRepo.create({
        user_id: userId,
        token_hash: this.hashToken(token),
        expires_at,
      }),
    );

    return token;
  }

  private signToken(user: { id: string; telegram_id: string; role: UserRole }) {
    return this.jwtService.signAsync(
      {
        sub: user.id,
        telegram_id: user.telegram_id,
        role: user.role,
      },
      { expiresIn: this.getAccessExpiresInSeconds() },
    );
  }

  private async buildAuthResponse(user: Awaited<ReturnType<UsersService['findById']>>) {
    if (!user) throw new UnauthorizedException('User not found');
    const accessToken = await this.signToken(user);
    const refreshToken = await this.createRefreshToken(user.id);
    return {
      accessToken,
      refreshToken,
      expiresIn: this.getAccessExpiresInSeconds(),
      user: toPublicUser(user),
    };
  }

  async refreshSession(refreshToken: string) {
    const stored = await this.refreshTokensRepo.findOne({
      where: { token_hash: this.hashToken(refreshToken) },
    });

    if (!stored || stored.revoked_at || stored.expires_at < new Date()) {
      throw new UnauthorizedException('Refresh token недійсний або прострочений');
    }

    await this.refreshTokensRepo.update(stored.id, { revoked_at: new Date() });

    const user = await this.usersService.findById(stored.user_id);
    if (!user) {
      throw new UnauthorizedException('Користувача не знайдено');
    }

    return this.buildAuthResponse(user);
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.refreshTokensRepo.update(
        { user_id: userId, token_hash: this.hashToken(refreshToken) },
        { revoked_at: new Date() },
      );
    } else {
      await this.refreshTokensRepo
        .createQueryBuilder()
        .update(RefreshToken)
        .set({ revoked_at: new Date() })
        .where('user_id = :userId', { userId })
        .andWhere('revoked_at IS NULL')
        .execute();
    }
    return { ok: true };
  }

  async checkUser(initData: string, platform?: string) {
    const { telegramUser, telegramId, dbUser, databaseTelegramId, platform: p } =
      await this.resolveTelegramUser(initData, platform);

    this.logTelegramAuth(
      'check-user',
      telegramUser,
      p,
      Boolean(dbUser && !dbUser.is_deleted),
      databaseTelegramId,
    );

    return this.usersService.getTelegramUserStatus(telegramId);
  }

  async loginWithInitData(initData: string, platform?: string) {
    const { telegramUser, telegramId, dbUser, databaseTelegramId, platform: p } =
      await this.resolveTelegramUser(initData, platform);

    this.logTelegramAuth('login', telegramUser, p, Boolean(dbUser), databaseTelegramId);

    const anyUser = dbUser;
    if (!anyUser) {
      throw new NotFoundException('Акаунт не знайдено. Створіть новий профіль.');
    }
    if (anyUser.is_deleted) {
      throw new UnauthorizedException('Акаунт видалено. Відновіть або створіть новий профіль.');
    }

    await this.usersService.update(anyUser.id, {
      username: telegramUser.username ?? anyUser.username,
      photo_url: telegramUser.photo_url ?? anyUser.photo_url,
    });
    const user = (await this.usersService.findById(anyUser.id))!;

    return this.buildAuthResponse(user);
  }

  async registerWithInitData(initData: string, platform?: string) {
    const { telegramUser, telegramId, dbUser, databaseTelegramId, platform: p } =
      await this.resolveTelegramUser(initData, platform);

    this.logTelegramAuth('register', telegramUser, p, Boolean(dbUser), databaseTelegramId);

    const anyUser = dbUser;
    if (anyUser && !anyUser.is_deleted) {
      this.logger.warn(
        `register: existing user ${telegramId}, performing login instead`,
      );
      return this.loginWithInitData(initData, platform);
    }
    if (anyUser?.is_deleted) {
      throw new ConflictException('Виявлено раніше видалений профіль');
    }

    const user = await this.usersService.create({
      telegram_id: telegramId,
      username: telegramUser.username,
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name,
      photo_url: telegramUser.photo_url,
      role: UserRole.EMPLOYEE,
      is_profile_completed: false,
    });

    return this.buildAuthResponse(user);
  }

  async restoreAccount(initData: string, platform?: string) {
    const { telegramUser, telegramId, dbUser, databaseTelegramId, platform: p } =
      await this.resolveTelegramUser(initData, platform);

    this.logTelegramAuth('restore', telegramUser, p, Boolean(dbUser), databaseTelegramId);

    const anyUser = dbUser;
    if (!anyUser?.is_deleted) {
      throw new BadRequestException('Немає видаленого профілю для відновлення');
    }

    await this.usersService.restoreUser(anyUser.id, {
      username: telegramUser.username ?? anyUser.username,
      photo_url: telegramUser.photo_url ?? anyUser.photo_url,
    });
    const user = (await this.usersService.findById(anyUser.id))!;

    return this.buildAuthResponse(user);
  }

  async recreateAccount(initData: string, platform?: string) {
    const { telegramUser, telegramId, dbUser, databaseTelegramId, platform: p } =
      await this.resolveTelegramUser(initData, platform);

    this.logTelegramAuth('recreate', telegramUser, p, Boolean(dbUser), databaseTelegramId);

    const anyUser = dbUser;
    if (anyUser && !anyUser.is_deleted) {
      throw new ConflictException('Акаунт вже існує. Увійдіть у наявний профіль.');
    }

    if (anyUser?.is_deleted) {
      await this.usersService.hardDeleteUser(anyUser.id);
    }

    const user = await this.usersService.create({
      telegram_id: telegramId,
      username: telegramUser.username,
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name,
      photo_url: telegramUser.photo_url,
      role: UserRole.EMPLOYEE,
      is_profile_completed: false,
    });

    return this.buildAuthResponse(user);
  }

  async devLogin(telegramId: string, firstName = 'Dev User') {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new UnauthorizedException('Dev login is disabled in production');
    }

    const normalizedId = normalizeTelegramId(telegramId);
    let user = await this.usersService.findByTelegramId(normalizedId);
    if (!user) {
      user = await this.usersService.create({
        telegram_id: normalizedId,
        first_name: firstName,
        role: UserRole.EMPLOYEE,
        is_profile_completed: false,
      });
    }

    return this.buildAuthResponse(user);
  }

  async completeProfile(userId: string, dto: CompleteProfileDto) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    await this.usersService.update(userId, {
      first_name: dto.first_name,
      last_name: dto.last_name,
      phone: dto.phone,
      role: dto.role,
      is_profile_completed: true,
    });
    const updated = await this.usersService.findById(userId);
    return this.buildAuthResponse(updated);
  }
}
