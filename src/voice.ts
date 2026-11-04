import { t } from './i18n';
import speakers from './locales/speakers.json';
import { settings } from './settings';

export type Speaker = 'keeper' | 'animal' | 'text';

const SPEAKERS = speakers as Record<string, Speaker>;

function speakerOf(key: string): Speaker {
  return SPEAKERS[key] ?? (key.startsWith('animal.') ? 'animal' : 'keeper');
}

type AudioContextCtor = typeof AudioContext;
const AudioCtx: AudioContextCtor | null =
  typeof window !== 'undefined'
    ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext ?? null)
    : null;

const synth: SpeechSynthesis | null = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

/** Встроенные голоса систем, которые звучат лучше остальных. Ищутся по части имени, по порядку. */
const PREFERRED_VOICES: Record<string, string[]> = {
  ru: ['Milena', 'Microsoft Svetlana', 'Microsoft Irina', 'Google русский', 'Yuri'],
  en: ['Samantha', 'Microsoft Aria', 'Microsoft Jenny', 'Microsoft Zira', 'Google US English', 'Karen', 'Daniel'],
};

/**
 * Пауза между cancel() и следующим speak(): Chrome (и иногда Safari) молча теряет фразу,
 * если её отправить сразу после отмены предыдущей.
 */
const AFTER_CANCEL_MS = 150;
/** Если синтез за это время так и не начал говорить, фраза отправляется ещё раз. */
const START_WATCHDOG_MS = 1800;

/**
 * Озвучка фраз по ключам из locales.
 * Если записан файл public/audio/<язык>/<ключ>.mp3 (и он есть в audio/manifest.json), играет он.
 * Пока записей нет, фразу читает синтез речи браузера: смотритель обычным голосом, зверь повыше.
 */
class Voice {
  private recorded = new Set<string>();
  private audio: HTMLAudioElement | null = null;
  /**
   * Записи играют через Web Audio: Safari (и браузеры на iPhone) не дают запустить new Audio().play()
   * не из касания, а фразы в игре звучат после смены сцены или анимации. Контекст разблокируется
   * в unlock() одним касанием, дальше играет когда угодно.
   */
  private ctx: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private finishCurrent: (() => void) | null = null;
  private run = 0;
  private speaking = false;
  private unlocked = false;
  private cancelledAt = -Infinity;
  private voices: SpeechSynthesisVoice[] = [];
  /** Ссылки на звучащие фразы: Chrome теряет события фразы, если её съел сборщик мусора. */
  private live = new Set<SpeechSynthesisUtterance>();

  /** Показывает текст фразы, пока она звучит (подсказка для взрослых). */
  onSubtitle: (text: string, speaker: Speaker) => void = () => {};

  constructor() {
    if (!synth) return;
    // Chrome отдаёт список голосов не сразу, а по событию voiceschanged.
    const load = () => (this.voices = synth.getVoices());
    load();
    synth.addEventListener?.('voiceschanged', load);
  }

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

  /** Разрешает звук на iPhone и iPad: вызывать прямо в обработчике касания. Достаточно одного раза. */
  unlock(): void {
    this.unlockAudio();
    if (!synth || this.unlocked) return;
    this.unlocked = true;
    const silent = new SpeechSynthesisUtterance(' ');
    silent.volume = 0;
    this.track(silent);
    synth.speak(silent);
  }

  private unlockAudio(): void {
    if (!AudioCtx) return;
    try {
      this.ctx ??= new AudioCtx();
      if (this.ctx.state !== 'running') void this.ctx.resume().catch(() => {});
      // Тихий звук прямо в касании: так Safari окончательно разрешает контекст.
      const silent = this.ctx.createBufferSource();
      silent.buffer = this.ctx.createBuffer(1, 1, 22050);
      silent.connect(this.ctx.destination);
      silent.start(0);
    } catch {
      this.ctx = null;
    }
  }

  private loadBuffer(path: string): Promise<AudioBuffer | null> {
    const ctx = this.ctx;
    if (!ctx) return Promise.resolve(null);
    let buffer = this.buffers.get(path);
    if (!buffer) {
      buffer = fetch(`audio/${path}.mp3`)
        .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(String(res.status)))))
        .then((data) => new Promise<AudioBuffer>((resolve, reject) => ctx.decodeAudioData(data, resolve, reject)))
        .catch((error) => {
          console.warn('Не удалось загрузить запись', path, error);
          this.buffers.delete(path);
          return null;
        });
      this.buffers.set(path, buffer);
    }
    return buffer;
  }

  /** Какой голос синтеза сейчас говорит: для раздела взрослых. Пустая строка — голоса для языка нет. */
  describe(): string {
    const voice = this.pickVoice();
    return voice ? `${voice.name} (${voice.lang})` : '';
  }

  stop(): void {
    this.run++;
    this.speaking = false;
    this.audio?.pause();
    this.audio = null;
    if (this.source) {
      this.source.onended = null;
      try {
        this.source.stop();
      } catch {
        // Уже остановлен.
      }
      this.source = null;
    }
    if (synth && (synth.speaking || synth.pending)) {
      synth.cancel();
      this.cancelledAt = performance.now();
    }
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
      await this.speakOne(key, run);
    }
    if (run !== this.run) return false;
    this.speaking = false;
    this.onSubtitle('', 'text');
    return true;
  }

  private speakOne(key: string, run: number): Promise<void> {
    return new Promise((resolve) => {
      let done = false;
      let timer = 0;
      const end = () => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        this.finishCurrent = null;
        resolve();
      };
      /** Страховочный таймер: фраза закончится не позже, чем через ms. */
      const endAfter = (ms: number) => {
        window.clearTimeout(timer);
        timer = window.setTimeout(end, ms);
      };
      this.finishCurrent = end;

      const path = `${settings.lang}/${key}`;
      if (this.recorded.has(path) && this.ctx) {
        endAfter(15000);
        void this.loadBuffer(path).then((buffer) => {
          if (done || run !== this.run) return;
          if (!buffer || !this.ctx) {
            this.speakSynth(key, run, end, endAfter);
            return;
          }
          if (this.ctx.state !== 'running') void this.ctx.resume().catch(() => {});
          const source = this.ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(this.ctx.destination);
          source.onended = () => {
            if (this.source === source) this.source = null;
            end();
          };
          this.source = source;
          source.start(0);
          endAfter(buffer.duration * 1000 + 3000);
        });
        return;
      }
      if (this.recorded.has(path)) {
        const audio = new Audio(`audio/${path}.mp3`);
        this.audio = audio;
        audio.onended = end;
        audio.onerror = end;
        audio.play().catch(end);
        endAfter(15000);
        return;
      }
      this.speakSynth(key, run, end, endAfter);
    });
  }

  /** Фраза без записи (или запись не загрузилась): читает синтез речи браузера. */
  private speakSynth(key: string, run: number, end: () => void, endAfter: (ms: number) => void): void {
    const text = t(key);
    // Примерное время чтения: столько текст висит на экране, если синтез молчит.
    const readMs = 1200 + text.length * 90;
    if (!synth) {
      endAfter(readMs);
      return;
    }
    endAfter(readMs + START_WATCHDOG_MS + 1000);
    this.synthesize(text, speakerOf(key), run, {
      started: () => endAfter(readMs * 2 + 3000),
      ended: end,
      failed: () => endAfter(readMs),
    });
  }

  private synthesize(
    text: string,
    speaker: Speaker,
    run: number,
    on: { started: () => void; ended: () => void; failed: () => void },
    attempt = 0,
  ): void {
    if (!synth) return;
    const utterance = new SpeechSynthesisUtterance(text.replace(/[—–]/g, ','));
    utterance.lang = settings.lang === 'ru' ? 'ru-RU' : 'en-US';
    const voice = this.pickVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
    utterance.pitch = speaker === 'animal' ? 1.6 : 1.05;
    utterance.rate = speaker === 'animal' ? 1.0 : 0.92;

    let started = false;
    let retried = false;
    /** Фраза пропала без звука (так бывает в Chrome после отмены предыдущей): отправляем её ещё раз, один раз. */
    const retry = () => {
      if (retried || attempt > 0 || run !== this.run) return;
      retried = true;
      this.live.delete(utterance);
      if (synth.speaking || synth.pending) {
        synth.cancel();
        this.cancelledAt = performance.now();
      }
      this.synthesize(text, speaker, run, on, attempt + 1);
    };
    utterance.onstart = () => {
      started = true;
      on.started();
    };
    utterance.onend = () => {
      this.live.delete(utterance);
      if (started || attempt > 0) on.ended();
      else retry();
    };
    utterance.onerror = (event) => {
      this.live.delete(utterance);
      if (event.error === 'interrupted' || event.error === 'canceled') return;
      console.warn('Синтез речи не смог сказать фразу:', event.error);
      // Нет голоса для языка или синтез сломался: текст фразы висит на экране время чтения.
      on.failed();
    };

    const speak = () => {
      if (run !== this.run) return; // Пока ждали, фразу перебила другая.
      this.track(utterance);
      synth.resume(); // Chrome иногда оставляет синтез на паузе после сворачивания вкладки.
      synth.speak(utterance);
      window.setTimeout(() => {
        // Ни звука, ни ошибки, и синтез ничего не говорит: фраза потерялась.
        if (!started && this.live.has(utterance) && !synth.speaking) retry();
      }, START_WATCHDOG_MS);
    };
    const wait = this.cancelledAt + AFTER_CANCEL_MS - performance.now();
    if (wait > 0) window.setTimeout(speak, wait);
    else speak();
  }

  private track(utterance: SpeechSynthesisUtterance): void {
    this.live.add(utterance);
    // Не копим ссылки бесконечно, если какой-то браузер не пришлёт ни end, ни error.
    if (this.live.size > 20) this.live.delete(this.live.values().next().value!);
  }

  /** Голос для текущего языка: сначала известные хорошие встроенные голоса, потом любые с нужным языком. */
  private pickVoice(): SpeechSynthesisVoice | undefined {
    if (!synth) return undefined;
    if (this.voices.length === 0) this.voices = synth.getVoices();
    const lang = settings.lang;
    const matching = this.voices.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith(lang));
    for (const name of PREFERRED_VOICES[lang] ?? []) {
      const found = matching.find((v) => v.name.includes(name));
      if (found) return found;
    }
    return matching.find((v) => v.localService) ?? matching[0];
  }
}

export const voice = new Voice();
