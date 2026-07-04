import type { Restaurant } from '@/types';

type RestaurantProfileFields = Pick<
  Restaurant,
  'name' | 'city' | 'region' | 'country' | 'working_hours' | 'employees_limit' | 'staff_count'
>;

export function isRestaurantProfileComplete(
  restaurant: RestaurantProfileFields | null | undefined,
): boolean {
  if (!restaurant) return false;
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
