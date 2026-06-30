import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const typeOrmConfig = (config: ConfigService): TypeOrmModuleOptions => {
  const isProd = config.get<string>('NODE_ENV') === 'production';
  const databaseUrl = config.get<string>('DATABASE_URL');
  // MVP: no migrations yet — set DB_SYNCHRONIZE=true on Render to create schema.
  // Turn off once you switch to migrations and have real data.
  const synchronize =
    config.get<string>('DB_SYNCHRONIZE') === 'true' || !isProd;

  const common: Partial<TypeOrmModuleOptions> = {
    autoLoadEntities: true,
    synchronize,
    logging: !isProd,
  };

  if (databaseUrl) {
    return {
      type: 'postgres',
      url: databaseUrl,
      ssl: isProd ? { rejectUnauthorized: false } : false,
      ...common,
    } as TypeOrmModuleOptions;
  }

  return {
    type: 'postgres',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: config.get<number>('DB_PORT', 5432),
    username: config.get<string>('DB_USERNAME', 'postgres'),
    password: config.get<string>('DB_PASSWORD', 'postgres'),
    database: config.get<string>('DB_NAME', 'restaurant_shifts'),
    ...common,
  } as TypeOrmModuleOptions;
};
