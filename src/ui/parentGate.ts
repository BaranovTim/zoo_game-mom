import Phaser from 'phaser';
import { t } from '../i18n';
import { saveSettings, settings, type Lang, type Level } from '../settings';
import { voice } from '../voice';
import { textButton } from './buttons';
import { COLORS, FONT, HEIGHT, INK, TEXT_RESOLUTION, WIDTH } from './theme';

/**
 * Раздел для взрослых: сначала простой пример на сложение (ребёнок 3–5 лет его не решит),
 * потом настройки языка и сложности. После изменения настроек сцена перезапускается.
 */
export function openParentGate(scene: Phaser.Scene): void {
  const layer = scene.add.container(0, 0).setDepth(2000);
  const dim = scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, COLORS.ink, 0.55).setInteractive();
  const panel = scene.add.graphics();
  panel.fillStyle(COLORS.cream, 1);
  panel.fillRoundedRect(WIDTH / 2 - 480, HEIGHT / 2 - 300, 960, 600, 36);
  layer.add([dim, panel]);

  const close = () => layer.destroy();
  const closeButton = textButton(scene, WIDTH / 2 + 400, HEIGHT / 2 - 240, '✕', close);
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
    const items: Phaser.GameObjects.GameObject[] = [heading(t('ui.parents_title'), HEIGHT / 2 - 190)];
    items.push(heading(t('ui.parents_question', { a, b }), HEIGHT / 2 - 60));
    answers.forEach((n, i) => {
      items.push(
        textButton(scene, WIDTH / 2 + (i - 1) * 220, HEIGHT / 2 + 110, String(n), () => {
          items.forEach((item) => item.destroy());
          if (n === a + b) showSettings();
          else close();
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

    layer.add([
      heading(t('ui.parents_title'), HEIGHT / 2 - 230),
      heading(t('ui.settings_language'), HEIGHT / 2 - 130),
      option(WIDTH / 2 - 160, HEIGHT / 2 - 50, 'Русский', settings.lang === 'ru', setLang('ru')),
      option(WIDTH / 2 + 160, HEIGHT / 2 - 50, 'English', settings.lang === 'en', setLang('en')),
      heading(t('ui.settings_level'), HEIGHT / 2 + 60),
      option(WIDTH / 2 - 210, HEIGHT / 2 + 150, t('ui.level_little'), settings.level === 'little', setLevel('little')),
      option(WIDTH / 2 + 210, HEIGHT / 2 + 150, t('ui.level_explorer'), settings.level === 'explorer', setLevel('explorer')),
    ]);
  }
}
