import { settings } from './settings';

/**
 * Часы игры для ограничения, которое ставит взрослый.
 * Отсчёт идёт с первого нажатия «Играть». Время проверяется только на карте зоопарка,
 * чтобы ребёнок спокойно закончил визит к зверю, а не терял его на середине.
 */
let startedAt: number | null = null;

export function startClock(now = Date.now()): void {
  if (startedAt === null) startedAt = now;
}

export function resetClock(): void {
  startedAt = null;
}

export function timeIsUp(now = Date.now()): boolean {
  if (!settings.minutes || startedAt === null) return false;
  return now - startedAt >= settings.minutes * 60_000;
}
