import { Restaurant } from './entities/restaurant.entity';

export function isRestaurantProfileComplete(restaurant: Restaurant): boolean {
  if (!restaurant.name?.trim()) return false;
  if (!restaurant.city?.trim()) return false;
  if (!restaurant.region?.trim()) return false;
  if (!restaurant.country?.trim()) return false;

  const hasHours =
    Boolean(restaurant.working_hours) &&
    Object.keys(restaurant.working_hours ?? {}).length > 0;
  if (!hasHours) return false;

  const staffCount = restaurant.employees_limit ?? restaurant.staff_count;
  return typeof staffCount === 'number' && staffCount > 0;
}
