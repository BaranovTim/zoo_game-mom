/**
 * 22 вида еды, общие для всех животных. Названия и озвучка лежат в locales под ключами food.<id>,
 * картинки — в public/assets/foods/<id>.webp (512 px, прозрачный фон).
 */
export const FOOD_IDS = [
  'meat',
  'fish',
  'bamboo_stem',
  'bamboo_leaves',
  'bamboo_shoots',
  'leaves',
  'branches',
  'grass',
  'hay',
  'banana',
  'fruit',
  'apple',
  'watermelon',
  'carrot',
  'berries',
  'honey',
  'nuts',
  'cone',
  'mushroom',
  'egg',
  'shrimp',
  'acorns',
] as const;

export type FoodId = (typeof FOOD_IDS)[number];

/** Размер картинки еды в пикселях. */
export const FOOD_SIZE = 512;

export function foodTexture(food: FoodId): string {
  return `food-${food}`;
}
