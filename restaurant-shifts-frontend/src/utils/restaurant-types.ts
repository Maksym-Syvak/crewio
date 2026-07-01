import type { RestaurantType } from '@/types';

export const RESTAURANT_TYPE_LABELS: Record<RestaurantType, string> = {
  restaurant: 'Ресторан',
  cafe: 'Кафе',
  coffee_shop: "Кав'ярня",
  bar: 'Бар',
  fast_food: 'Фастфуд',
  pizzeria: 'Піцерія',
  sushi: 'Суші',
  hookah: 'Кальянна',
  other: 'Інше',
};

export const RESTAURANT_TYPES = Object.keys(
  RESTAURANT_TYPE_LABELS,
) as RestaurantType[];
