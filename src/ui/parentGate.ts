import Phaser from 'phaser';
import { t } from '../i18n';
import { resetClock } from '../playClock';
import { MINUTES, saveSettings, settings, type Lang, type Level, type Minutes } from '../settings';
import { voice } from '../voice';
import { textButton } from './buttons';
import { COLORS, FONT, HEIGHT, INK, TEXT_RESOLUTION, WIDTH } from './theme';

const PANEL_W = 1000;
const PANEL_H = 840;
const TOP = HEIGHT / 2 - PANEL_H / 2;

export interface ParentGateOptions {
  /** Что сделать после верного ответа вместо показа настроек (например, продолжить игру после «время вышло»). */
  onUnlock?: () => void;
}

/**
 * Раздел для взрослых: сначала простой пример на сложение (ребёнок 3–5 лет его не решит),
 * потом настройки языка, сложности и времени игры. После изменения настроек сцена перезапускается.
 */
export function openParentGate(scene: Phaser.Scene, options: ParentGateOptions = {}): void {
  const layer = scene.add.container(0, 0).setDepth(2000);
  const dim = scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, COLORS.ink, 0.55).setInteractive();
  const panel = scene.add.graphics();
  panel.fillStyle(COLORS.cream, 1);
  panel.fillRoundedRect(WIDTH / 2 - PANEL_W / 2, TOP, PANEL_W, PANEL_H, 36);
  layer.add([dim, panel]);

  const close = () => layer.destroy();
  const closeButton = textButton(scene, WIDTH / 2 + PANEL_W / 2 - 80, TOP + 60, '✕', close);
  layer.add(closeButton);

  voice.say('ui.parents_gate');
  showQuestion();

  function heading(text: string, y: number): Phaser.GameObjects.Text {
    return scene.add
      .text(WIDTH / 2, y, text, { fontFamily: FONT, fontSize: '40px', fontStyle: 'bold', color: INK, resolution: TEXT_RESOLUTION })
      .setOrigin(0.5);
  }

  function showQuestion(): void {
    const a = Phaser.Math.Between(3, 9);
    const b = Phaser.Math.Between(3, 9);
    const answers = Phaser.Utils.Array.Shuffle([a + b, a + b + 1, a + b - 2]);
    const items: Phaser.GameObjects.GameObject[] = [heading(t('ui.parents_title'), TOP + 140)];
    items.push(heading(t('ui.parents_question', { a, b }), TOP + 290));
    answers.forEach((n, i) => {
      items.push(
        textButton(scene, WIDTH / 2 + (i - 1) * 220, TOP + 460, String(n), () => {
          items.forEach((item) => item.destroy());
          if (n !== a + b) close();
          else if (options.onUnlock) {
            close();
            options.onUnlock();
          } else showSettings();
        }),
      );
    });
    layer.add(items);
  }

  function showSettings(): void {
    const apply = (change: () => void) => {
      change();
      saveSettings();
      voice.stop();
      scene.scene.restart();
    };
    const option = (x: number, y: number, label: string, selected: boolean, change: () => void) =>
      textButton(scene, x, y, label, () => apply(change), selected);
    const setLang = (lang: Lang) => () => (settings.lang = lang);
    const setLevel = (level: Level) => () => (settings.level = level);
    const setMinutes = (minutes: Minutes) => () => {
      settings.minutes = minutes;
      resetClock();
    };

    layer.add([
      heading(t('ui.parents_title'), TOP + 60),
      heading(t('ui.settings_language'), TOP + 150),
      option(WIDTH / 2 - 160, TOP + 225, 'Русский', settings.lang === 'ru', setLang('ru')),
      option(WIDTH / 2 + 160, TOP + 225, 'English', settings.lang === 'en', setLang('en')),
      heading(t('ui.settings_level'), TOP + 330),
      option(WIDTH / 2 - 220, TOP + 405, t('ui.level_little'), settings.level === 'little', setLevel('little')),
      option(WIDTH / 2 + 220, TOP + 405, t('ui.level_explorer'), settings.level === 'explorer', setLevel('explorer')),
      heading(t('ui.settings_timer'), TOP + 510),
      ...MINUTES.map((m, i) =>
        option(WIDTH / 2 + (i - 1.5) * 210, TOP + 590, m === 0 ? '∞' : t('ui.minutes', { n: m }), settings.minutes === m, setMinutes(m)),
      ),
      // Проверка голоса: какой голос синтеза выбран для языка. Нажатие произносит фразу.
      textButton(scene, WIDTH / 2, TOP + 730, `🔊 ${voiceName()}`, () => {
        voice.unlock();
        void voice.say('keeper.welcome_back');
      }),
    ]);
  }

  function voiceName(): string {
    const name = voice.describe();
    if (!name) return '—';
    return name.length > 42 ? `${name.slice(0, 40)}…` : name;
  }
}
