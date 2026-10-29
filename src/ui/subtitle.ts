import Phaser from 'phaser';
import { voice } from '../voice';
import { COLORS, FONT, INK, TEXT_RESOLUTION, WIDTH } from './theme';

/** Строка с текстом звучащей фразы вверху экрана: подсказка для взрослых, детям хватает голоса. */
export function attachSubtitles(scene: Phaser.Scene, y = 64): void {
  const label = scene.add
    .text(WIDTH / 2, y, '', {
      fontFamily: FONT,
      fontSize: '30px',
      color: INK,
      align: 'center',
      wordWrap: { width: 980 },
      resolution: TEXT_RESOLUTION,
    })
    .setOrigin(0.5)
    .setDepth(1001);
  const pill = scene.add.graphics().setDepth(1000);

  voice.onSubtitle = (text) => {
    label.setText(text);
    pill.clear();
    if (!text) return;
    const w = label.width + 48;
    const h = label.height + 24;
    pill.fillStyle(COLORS.white, 0.9);
    pill.fillRoundedRect(WIDTH / 2 - w / 2, y - h / 2, w, h, 22);
  };

  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    voice.stop();
    voice.onSubtitle = () => {};
  });
}
