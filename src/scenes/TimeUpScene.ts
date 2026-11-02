import Phaser from 'phaser';
import { textureKey } from '../data/animals';
import { resetClock } from '../playClock';
import { drawEnclosure } from '../ui/background';
import { roundButton } from '../ui/buttons';
import { openParentGate } from '../ui/parentGate';
import { attachSubtitles } from '../ui/subtitle';
import { FONT, HEIGHT, TEXT_RESOLUTION, WIDTH } from '../ui/theme';
import { voice } from '../voice';

/**
 * Время игры, которое поставил взрослый, вышло: в зоопарке ночь, панда спит.
 * Играть дальше можно только через раздел для взрослых (шестерёнка с примером).
 */
export class TimeUpScene extends Phaser.Scene {
  constructor() {
    super('timeup');
  }

  preload(): void {
    const key = textureKey('panda', 'sleep');
    if (!this.textures.exists(key)) this.load.image(key, 'assets/animals/panda/sleep.webp');
  }

  create(): void {
    drawEnclosure(this, 'asia', { sun: false });
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x1b2a4a, 0.62).setDepth(-5);
    this.add.text(1150, 190, '🌙', { fontFamily: FONT, fontSize: '120px', resolution: TEXT_RESOLUTION }).setOrigin(0.5);
    for (let i = 0; i < 9; i++) {
      const star = this.add.image(Phaser.Math.Between(120, 1480), Phaser.Math.Between(110, 460), 'star').setScale(0.5);
      this.tweens.add({ targets: star, alpha: 0.4, duration: Phaser.Math.Between(700, 1400), yoyo: true, repeat: -1 });
    }
    this.add.image(WIDTH / 2, 560, textureKey('panda', 'sleep')).setScale(0.55);
    attachSubtitles(this);
    void voice.say('keeper.time_up');

    roundButton(this, WIDTH - 90, 90, '⚙️', () =>
      openParentGate(this, {
        onUnlock: () => {
          resetClock();
          this.scene.start('title');
        },
      }),
    { radius: 48 });
  }
}
