export type Lang = 'ru' | 'en';
export type Level = 'little' | 'explorer';

export interface Settings {
  lang: Lang;
  /** «Малыш» (3–4 года) или «Исследователь» (5–7 лет). */
  level: Level;
  /** Ребёнок уже слышал приветствие смотрителя. */
  welcomed: boolean;
  /** Животные, чьи наклейки уже в альбоме. */
  stickers: string[];
}

const KEY = 'zoo-game.settings.v1';

function defaults(): Settings {
  const browserLang = typeof navigator !== 'undefined' ? navigator.language : 'ru';
  return { lang: browserLang.startsWith('en') ? 'en' : 'ru', level: 'little', welcomed: false, stickers: [] };
}

function load(): Settings {
  const base = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw) as Partial<Settings>;
    return {
      lang: saved.lang === 'en' || saved.lang === 'ru' ? saved.lang : base.lang,
      level: saved.level === 'explorer' ? 'explorer' : 'little',
      welcomed: saved.welcomed === true,
      stickers: Array.isArray(saved.stickers) ? saved.stickers.filter((s) => typeof s === 'string') : [],
    };
  } catch {
    // Хранилище недоступно (приватный режим) — играем с настройками по умолчанию.
    return base;
  }
}

export const settings: Settings = load();

export function saveSettings(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Не сохранилось — не страшно, настройки живут до перезагрузки.
  }
}
