import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ANIMALS, EMOTIONS, PLAYABLE } from '../src/data/animals';
import { FOOD_IDS } from '../src/data/foods';
import en from '../src/locales/en.json';
import ru from '../src/locales/ru.json';

const ANIMAL_KEYS = ['word', 'this_is', 'hello', 'fact', 'feed_ask', 'food_hint', 'yum', 'sticker'];
const SHARED_KEYS = [
  'keeper.welcome_first',
  'keeper.safety',
  'feed.not_mine',
  'feed.full',
  'hint.drag_food',
  'hint.drag_food_short',
  'hint.idle_1',
  'hint.idle_2',
  'hint.one_left',
  'reward.sticker',
  'ui.title',
  'ui.parents_gate',
  'ui.parents_title',
  'ui.parents_question',
  'ui.settings_language',
  'ui.settings_level',
  'ui.level_little',
  'ui.level_explorer',
  ...Array.from({ length: 15 }, (_, i) => `praise.${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 5 }, (_, i) => `oops.${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 5 }, (_, i) => `tap.${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 6 }, (_, i) => `count.${String(i + 1).padStart(2, '0')}`),
];

describe('тексты', () => {
  it('в русском и английском одинаковые ключи', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ru).sort());
  });

  it('есть все фразы, которые произносит игра', () => {
    for (const key of SHARED_KEYS) expect(ru, key).toHaveProperty([key]);
  });

  it('у каждого вида еды есть название', () => {
    for (const food of FOOD_IDS) expect(ru, food).toHaveProperty([`food.${food}`]);
  });
});

describe('животные', () => {
  it('19 животных первой версии', () => {
    expect(ANIMALS).toHaveLength(19);
  });

  it.each(ANIMALS.map((a) => [a.id, a] as const))('%s: еда и фразы на месте', (id, animal) => {
    expect(animal.food.length).toBeGreaterThan(0);
    expect(animal.wrong).toHaveLength(4);
    for (const food of [...animal.food, ...animal.wrong]) expect(FOOD_IDS).toContain(food);
    for (const food of animal.wrong) expect(animal.food).not.toContain(food);
    for (const key of ANIMAL_KEYS) expect(ru).toHaveProperty([`animal.${id}.${key}`]);
  });

  it.each(PLAYABLE.map((id) => [id]))('%s: все 7 картинок лежат в public/assets', (id) => {
    for (const emotion of EMOTIONS) {
      expect(existsSync(new URL(`../public/assets/animals/${id}/${emotion}.webp`, import.meta.url))).toBe(true);
    }
  });
});
