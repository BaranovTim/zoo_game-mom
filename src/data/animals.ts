import type { FoodId } from './foods';

export type ZoneId = 'savanna' | 'asia' | 'rainforest' | 'australia' | 'forest' | 'north' | 'lake';

export interface Animal {
  id: string;
  zone: ZoneId;
  /** Еда, которой зверя можно угостить. */
  food: FoodId[];
  /** Неверные варианты: зверь это не ест. */
  wrong: FoodId[];
}

/** Эмоции: у каждого животного 7 картинок в одной позе и одной рамке. */
export const EMOTIONS = ['base', 'happy', 'like', 'chew', 'think', 'celebrate', 'sleep'] as const;
export type Emotion = (typeof EMOTIONS)[number];

/**
 * 19 животных первой версии.
 * Правильная еда — из voice/locales/meta.json, неверная — из таблицы
 * «Еда для животных — неверные варианты.xlsx» (по 4 варианта на зверя).
 */
export const ANIMALS: Animal[] = [
  { id: 'lion', zone: 'savanna', food: ['meat'], wrong: ['grass', 'banana', 'carrot', 'bamboo_stem'] },
  { id: 'giraffe', zone: 'savanna', food: ['leaves', 'branches'], wrong: ['meat', 'fish', 'egg', 'nuts'] },
  { id: 'zebra', zone: 'savanna', food: ['grass', 'hay'], wrong: ['meat', 'fish', 'banana', 'honey'] },
  { id: 'elephant', zone: 'savanna', food: ['grass', 'branches', 'banana'], wrong: ['meat', 'fish', 'egg', 'shrimp'] },
  { id: 'hippo', zone: 'savanna', food: ['grass', 'watermelon'], wrong: ['fish', 'egg', 'nuts', 'honey'] },
  { id: 'panda', zone: 'asia', food: ['bamboo_stem', 'bamboo_leaves', 'bamboo_shoots'], wrong: ['meat', 'fish', 'hay', 'shrimp'] },
  { id: 'tiger', zone: 'asia', food: ['meat'], wrong: ['hay', 'watermelon', 'carrot', 'leaves'] },
  { id: 'orangutan', zone: 'asia', food: ['fruit', 'banana', 'leaves'], wrong: ['meat', 'fish', 'hay', 'shrimp'] },
  { id: 'kangaroo', zone: 'australia', food: ['grass', 'leaves'], wrong: ['meat', 'fish', 'egg', 'honey'] },
  { id: 'bear', zone: 'forest', food: ['berries', 'fish', 'honey'], wrong: ['hay', 'bamboo_stem', 'branches', 'cone'] },
  { id: 'wolf', zone: 'forest', food: ['meat'], wrong: ['grass', 'banana', 'cone', 'carrot'] },
  { id: 'fox', zone: 'forest', food: ['meat', 'berries', 'egg'], wrong: ['hay', 'bamboo_stem', 'banana', 'cone'] },
  { id: 'moose', zone: 'forest', food: ['branches', 'leaves'], wrong: ['meat', 'fish', 'egg', 'honey'] },
  { id: 'deer', zone: 'forest', food: ['grass', 'leaves', 'acorns'], wrong: ['meat', 'fish', 'honey', 'shrimp'] },
  { id: 'squirrel', zone: 'forest', food: ['nuts', 'cone', 'mushroom'], wrong: ['meat', 'fish', 'hay', 'shrimp'] },
  { id: 'polar_bear', zone: 'north', food: ['fish'], wrong: ['grass', 'hay', 'banana', 'bamboo_stem'] },
  { id: 'penguin', zone: 'north', food: ['fish'], wrong: ['grass', 'hay', 'banana', 'carrot'] },
  { id: 'crocodile', zone: 'lake', food: ['fish', 'meat'], wrong: ['grass', 'hay', 'banana', 'carrot'] },
  { id: 'flamingo', zone: 'lake', food: ['shrimp'], wrong: ['meat', 'hay', 'banana', 'nuts'] },
];

/** Животные, чьи картинки уже лежат в public/assets/animals/<id>/. */
export const PLAYABLE: readonly string[] = ['panda'];

export function getAnimal(id: string): Animal {
  const animal = ANIMALS.find((a) => a.id === id);
  if (!animal) throw new Error(`Неизвестное животное: ${id}`);
  return animal;
}

export function textureKey(animalId: string, emotion: Emotion): string {
  return `${animalId}-${emotion}`;
}
