/**
 * 22 вида еды, общие для всех животных. Названия и озвучка лежат в locales под ключами food.<id>.
 * Эмодзи — временная замена, пока картинки еды не нарисованы в ChatGPT.
 */
export const FOODS = {
  meat: '🥩',
  fish: '🐟',
  bamboo_stem: '🎋',
  bamboo_leaves: '🌿',
  bamboo_shoots: '🌱',
  leaves: '🍃',
  branches: '🌳',
  grass: '🍀',
  hay: '🌾',
  banana: '🍌',
  fruit: '🍐',
  apple: '🍎',
  watermelon: '🍉',
  carrot: '🥕',
  berries: '🍓',
  honey: '🍯',
  nuts: '🥜',
  cone: '🌲',
  mushroom: '🍄',
  egg: '🥚',
  shrimp: '🦐',
  acorns: '🌰',
} as const;

export type FoodId = keyof typeof FOODS;

export const FOOD_IDS = Object.keys(FOODS) as FoodId[];
