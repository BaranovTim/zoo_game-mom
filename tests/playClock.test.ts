import { afterEach, describe, expect, it } from 'vitest';
import { resetClock, startClock, timeIsUp } from '../src/playClock';
import { settings } from '../src/settings';

describe('ограничение времени игры', () => {
  afterEach(() => {
    settings.minutes = 0;
    resetClock();
  });

  it('без ограничения время не кончается', () => {
    startClock(0);
    expect(timeIsUp(5 * 60 * 60_000)).toBe(false);
  });

  it('до нажатия «Играть» отсчёт не идёт', () => {
    settings.minutes = 10;
    expect(timeIsUp(60 * 60_000)).toBe(false);
  });

  it('время кончается ровно через заданные минуты', () => {
    settings.minutes = 10;
    startClock(1000);
    expect(timeIsUp(1000 + 10 * 60_000 - 1)).toBe(false);
    expect(timeIsUp(1000 + 10 * 60_000)).toBe(true);
  });

  it('повторное «Играть» не сдвигает начало, а сброс взрослым — сдвигает', () => {
    settings.minutes = 10;
    startClock(0);
    startClock(9 * 60_000);
    expect(timeIsUp(10 * 60_000)).toBe(true);
    resetClock();
    startClock(10 * 60_000);
    expect(timeIsUp(15 * 60_000)).toBe(false);
  });
});
