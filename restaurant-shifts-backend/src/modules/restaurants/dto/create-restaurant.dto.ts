import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { RestaurantType } from '../entities/restaurant.entity';

export class CreateRestaurantDto {
  @IsString()
  name: string;

  @IsEnum(RestaurantType)
  type: RestaurantType;

  @IsOptional()
  @IsString()
  address?: string;

  @IsString()
  city: string;

  @IsString()
  region: string;

  @IsString()
  country: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== '' && value != null)
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
