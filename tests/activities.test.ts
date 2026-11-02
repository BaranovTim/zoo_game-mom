import { describe, expect, it } from 'vitest';
import { activitiesFor, AMOUNTS, pickActivity, sceneFor, type Activity } from '../src/data/activities';
import { getAnimal } from '../src/data/animals';

describe('занятия у зверя', () => {
  it('причёсывают только зверей с шерстью', () => {
    expect(activitiesFor(getAnimal('lion'))).toContain('brush');
    expect(activitiesFor(getAnimal('penguin'))).not.toContain('brush');
    expect(activitiesFor(getAnimal('crocodile'))).toEqual(['wash', 'clean', 'sleep', 'puzzle']);
  });

  it('следующее занятие не повторяет прошлое', () => {
    const lion = getAnimal('lion');
    for (const last of activitiesFor(lion)) {
      for (let i = 0; i < 20; i++) expect(pickActivity(lion, last, () => i / 20)).not.toBe(last);
    }
  });

  it('со временем выпадают все занятия', () => {
    const fox = getAnimal('fox');
    const seen = new Set<Activity>();
    for (let i = 0; i < 40; i++) seen.add(pickActivity(fox, null, () => i / 40));
    expect([...seen].sort()).toEqual(activitiesFor(fox).sort());
  });

  it('пазл — своя сцена, остальное — уход', () => {
    expect(sceneFor('puzzle')).toBe('puzzle');
    expect(sceneFor('wash')).toBe('care');
    expect(sceneFor('sleep')).toBe('care');
  });

  it('исследователю больше работы, чем малышу, но не больше десяти (столько чисел озвучено)', () => {
    for (const key of ['spots', 'hearts', 'leaves', 'stars'] as const) {
      expect(AMOUNTS.explorer[key]).toBeGreaterThan(AMOUNTS.little[key]);
    }
    for (const level of [AMOUNTS.little, AMOUNTS.explorer]) {
      expect(level.leaves).toBeLessThanOrEqual(10);
      expect(level.stars).toBeLessThanOrEqual(10);
      expect(level.puzzle[0] * level.puzzle[1]).toBeLessThanOrEqual(10);
    }
  });
});
