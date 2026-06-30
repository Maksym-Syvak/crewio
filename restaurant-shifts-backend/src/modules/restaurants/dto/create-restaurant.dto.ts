import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { RestaurantType } from '../entities/restaurant.entity';

export class CreateRestaurantDto {
  @IsString()
  name: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsEnum(RestaurantType)
  type?: RestaurantType;

  @IsOptional()
  working_hours?: Record<string, string>;

  @IsOptional()
  @IsNumber()
  staff_count?: number;
}

// Variant 2 from the TOR: import a restaurant from Google Maps/Places by
// name + address instead of filling the form manually.
export class ImportRestaurantFromGoogleDto {
  @IsString()
  name: string;

  @IsString()
  address: string;
}
