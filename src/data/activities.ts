import type { Animal } from './animals';

/**
 * Что делаем у зверя после кормления. Каждое занятие озвучено фразами care.* или game.*.
 * wash — помыть губкой, brush — причесать шёрстку, clean — убрать листья в корзину,
 * sleep — уложить спать (выключить солнце и зажечь звёзды), puzzle — собрать картинку.
 */
export type Activity = 'wash' | 'brush' | 'clean' | 'sleep' | 'puzzle';

export const ACTIVITIES: readonly Activity[] = ['wash', 'brush', 'clean', 'sleep', 'puzzle'];

/** Занятия, подходящие зверю: причёсывают только тех, у кого есть шерсть. */
export function activitiesFor(animal: Animal): Activity[] {
  return ACTIVITIES.filter((a) => a !== 'brush' || animal.fur);
}

/** Случайное занятие, не такое, как в прошлый раз, чтобы визиты не повторялись. */
export function pickActivity(animal: Animal, last: Activity | null, random: () => number = Math.random): Activity {
  const options = activitiesFor(animal).filter((a) => a !== last);
  return options[Math.floor(random() * options.length)] ?? 'clean';
}

export function sceneFor(activity: Activity): 'care' | 'puzzle' {
  return activity === 'puzzle' ? 'puzzle' : 'care';
}

/**
 * Сколько всего в занятии для каждой сложности:
 * пятна грязи, сердечки при причёсывании, листья, звёзды и кусочки пазла (столбцы × строки).
 */
export const AMOUNTS = {
  little: { spots: 4, hearts: 3, leaves: 5, stars: 3, puzzle: [2, 2] as const },
  explorer: { spots: 7, hearts: 5, leaves: 8, stars: 5, puzzle: [3, 3] as const },
};
