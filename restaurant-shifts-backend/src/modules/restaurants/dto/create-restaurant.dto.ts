import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';
import { RestaurantType } from '../entities/restaurant.entity';

export class CreateRestaurantDto {
  @IsString()
  name: string;

  @IsEnum(RestaurantType)
  type: RestaurantType;

  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  open_time?: string;

  @IsOptional()
  @IsString()
  close_time?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  employees_limit?: number;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  working_hours?: Record<string, string>;

  @IsOptional()
  @IsNumber()
  staff_count?: number;
}

export class ImportRestaurantFromGoogleDto {
  @IsString()
  name: string;

  @IsString()
  address: string;
}
