import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ANIMALS, EMOTIONS, ZONES, animalsIn } from '../src/data/animals';
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
  'ui.settings_timer',
  'ui.minutes',
  'keeper.welcome_back',
  'keeper.map_choose',
  'keeper.map_locked',
  'keeper.visit_end',
  'keeper.album_open',
  'keeper.album_empty',
  'keeper.album_full',
  'keeper.time_up',
  'hint.look',
  'hint.find_more',
  'game.puzzle',
  'game.puzzle_done',
  ...['wash', 'brush', 'clean', 'sleep'].flatMap((a) => [`care.${a}_ask`, `care.${a}_done`]),
  'care.sleep_yawn',
  ...ZONES.map((zone) => `zone.${zone}`),
  ...Array.from({ length: 15 }, (_, i) => `praise.${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 5 }, (_, i) => `oops.${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 5 }, (_, i) => `tap.${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 10 }, (_, i) => `count.${String(i + 1).padStart(2, '0')}`),
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

  it('у каждого вида еды есть картинка', () => {
    for (const food of FOOD_IDS) {
      expect(existsSync(new URL(`../public/assets/foods/${food}.webp`, import.meta.url)), food).toBe(true);
    }
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

  it.each(ANIMALS.map((a) => [a.id]))('%s: 7 картинок и портрет лежат в public/assets', (id) => {
    for (const picture of [...EMOTIONS, 'thumb']) {
      expect(existsSync(new URL(`../public/assets/animals/${id}/${picture}.webp`, import.meta.url)), picture).toBe(true);
    }
  });

  it('каждый зверь стоит в одной из зон карты', () => {
    for (const animal of ANIMALS) expect(ZONES).toContain(animal.zone);
    expect(ZONES.reduce((n, zone) => n + animalsIn(zone).length, 0)).toBe(ANIMALS.length);
  });
});
