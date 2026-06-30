import { AppDataSource } from './data-source';
import { User, UserRole } from '../modules/users/entities/user.entity';
import { Restaurant, RestaurantType } from '../modules/restaurants/entities/restaurant.entity';
import { Position } from '../modules/positions/entities/position.entity';

// Minimal seed for local development: one owner, one restaurant, two
// positions. Run with `npm run seed` after the schema has been created.
async function seed() {
  await AppDataSource.initialize();

  const userRepo = AppDataSource.getRepository(User);
  const restaurantRepo = AppDataSource.getRepository(Restaurant);
  const positionRepo = AppDataSource.getRepository(Position);

  const owner = await userRepo.save(
    userRepo.create({
      telegram_id: '000000001',
      first_name: 'Demo',
      last_name: 'Owner',
      username: 'demo_owner',
      role: UserRole.OWNER,
    }),
  );

  const restaurant = await restaurantRepo.save(
    restaurantRepo.create({
      owner_id: owner.id,
      name: 'Demo Cafe',
      address: 'вул. Хрещатик 1, Київ',
      type: RestaurantType.CAFE,
      staff_count: 0,
    }),
  );

  await positionRepo.save([
    positionRepo.create({
      restaurant_id: restaurant.id,
      name: 'Бариста',
      min_employees: 1,
      max_employees: 2,
      hourly_rate: 120,
    }),
    positionRepo.create({
      restaurant_id: restaurant.id,
      name: 'Офіціант',
      min_employees: 1,
      max_employees: 3,
      hourly_rate: 100,
    }),
  ]);

  // eslint-disable-next-line no-console
  console.log('Seed complete:', { ownerId: owner.id, restaurantId: restaurant.id });
  await AppDataSource.destroy();
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err);
  process.exit(1);
});
