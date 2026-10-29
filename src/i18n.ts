import en from './locales/en.json';
import ru from './locales/ru.json';
import { settings, type Lang } from './settings';

/**
 * Тексты игры. Источник — build_voice.py в папке voice/ файлов проекта:
 * ru.json и en.json копируются оттуда без правок, ключи совпадают с именами аудиофайлов.
 */
const TABLES: Record<Lang, Record<string, string>> = { ru, en };

export function hasText(key: string): boolean {
  return key in TABLES.ru;
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const text = TABLES[settings.lang][key] ?? TABLES.ru[key] ?? key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ''));
}
