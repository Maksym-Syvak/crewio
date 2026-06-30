import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from './entities/restaurant.entity';
import { CreateRestaurantDto, ImportRestaurantFromGoogleDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { GooglePlacesService } from './google-places.service';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantsRepo: Repository<Restaurant>,
    private readonly googlePlaces: GooglePlacesService,
  ) {}

  findAll(ownerId?: string) {
    return this.restaurantsRepo.find({
      where: ownerId ? { owner_id: ownerId } : {},
      relations: ['positions'],
    });
  }

  async findOne(id: string) {
    const restaurant = await this.restaurantsRepo.findOne({
      where: { id },
      relations: ['positions', 'employees'],
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return restaurant;
  }

  create(ownerId: string, dto: CreateRestaurantDto) {
    const restaurant = this.restaurantsRepo.create({ ...dto, owner_id: ownerId });
    return this.restaurantsRepo.save(restaurant);
  }

  // Variant 2: pull details from Google Places instead of manual entry
  async createFromGoogle(ownerId: string, dto: ImportRestaurantFromGoogleDto) {
    const details = await this.googlePlaces.findPlaceDetails(dto.name, dto.address);
    const restaurant = this.restaurantsRepo.create({
      owner_id: ownerId,
      name: details.name ?? dto.name,
      address: details.address ?? dto.address,
      phone: details.phone,
      latitude: details.latitude,
      longitude: details.longitude,
      working_hours: details.workingHours,
      photo_url: details.photoUrl,
    });
    return this.restaurantsRepo.save(restaurant);
  }

  async update(id: string, dto: UpdateRestaurantDto) {
    await this.restaurantsRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string) {
    const restaurant = await this.findOne(id);
    await this.restaurantsRepo.remove(restaurant);
    return { deleted: true };
  }
}
