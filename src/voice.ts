import { t } from './i18n';
import speakers from './locales/speakers.json';
import { settings } from './settings';

export type Speaker = 'keeper' | 'animal' | 'text';

const SPEAKERS = speakers as Record<string, Speaker>;

function speakerOf(key: string): Speaker {
  return SPEAKERS[key] ?? (key.startsWith('animal.') ? 'animal' : 'keeper');
}

/**
 * Озвучка фраз по ключам из locales.
 * Если записан файл public/audio/<язык>/<ключ>.mp3 (и он есть в audio/manifest.json), играет он.
 * Пока записей нет, фразу читает синтез речи браузера: смотритель обычным голосом, зверь повыше.
 */
class Voice {
  private recorded = new Set<string>();
  private audio: HTMLAudioElement | null = null;
  private finishCurrent: (() => void) | null = null;
  private run = 0;
  private speaking = false;

  /** Показывает текст фразы, пока она звучит (подсказка для взрослых). */
  onSubtitle: (text: string, speaker: Speaker) => void = () => {};

  get isSpeaking(): boolean {
    return this.speaking;
  }

  async loadManifest(): Promise<void> {
    try {
      const res = await fetch('audio/manifest.json', { cache: 'no-cache' });
      if (!res.ok) return;
      for (const path of (await res.json()) as string[]) this.recorded.add(path);
    } catch {
      // Записанной озвучки нет — говорит синтез браузера.
    }
  }

  /** Разрешает звук на iPhone и iPad: вызывать прямо в обработчике касания. */
  unlock(): void {
    if ('speechSynthesis' in window) {
      const silent = new SpeechSynthesisUtterance(' ');
      silent.volume = 0;
      window.speechSynthesis.speak(silent);
    }
  }

  stop(): void {
    this.run++;
    this.speaking = false;
    this.audio?.pause();
    this.audio = null;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    this.finishCurrent?.();
  }

  /** Говорит фразы по очереди. Возвращает false, если её перебила другая фраза. */
  async say(...keys: string[]): Promise<boolean> {
    this.stop();
    const run = this.run;
    this.speaking = true;
    for (const key of keys) {
      if (run !== this.run) return false;
      this.onSubtitle(t(key), speakerOf(key));
      await this.speakOne(key);
    }
    if (run !== this.run) return false;
    this.speaking = false;
    this.onSubtitle('', 'text');
    return true;
  }

  private speakOne(key: string): Promise<void> {
    return new Promise((resolve) => {
      let done = false;
      const end = () => {
        if (done) return;
        done = true;
        this.finishCurrent = null;
        resolve();
      };
      this.finishCurrent = end;

      const path = `${settings.lang}/${key}`;
      if (this.recorded.has(path)) {
        const audio = new Audio(`audio/${path}.mp3`);
        this.audio = audio;
        audio.onended = end;
        audio.onerror = end;
        audio.play().catch(end);
        window.setTimeout(end, 15000);
      } else {
        const text = t(key);
        this.synthesize(text, speakerOf(key), end);
        // Страховка: синтез может молчать (нет голосов), тогда ждём примерно время чтения.
        window.setTimeout(end, 1200 + text.length * 90);
      }
    });
  }

  private synthesize(text: string, speaker: Speaker, end: () => void): void {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text.replace(/[—–]/g, ','));
    utterance.lang = settings.lang === 'ru' ? 'ru-RU' : 'en-US';
    const voice = window.speechSynthesis
      .getVoices()
      .find((v) => v.lang.replace('_', '-').toLowerCase().startsWith(settings.lang));
    if (voice) utterance.voice = voice;
    utterance.pitch = speaker === 'animal' ? 1.6 : 1.05;
    utterance.rate = speaker === 'animal' ? 1.0 : 0.92;
    utterance.onend = end;
    // При ошибке синтеза (нет голоса для языка) фраза не обрывается: её текст висит на экране время чтения.
    window.speechSynthesis.speak(utterance);
  }
}

export const voice = new Voice();
