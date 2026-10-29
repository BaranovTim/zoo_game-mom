import Phaser from 'phaser';
import { textureKey } from '../data/animals';
import { t } from '../i18n';
import { drawEnclosure } from '../ui/background';
import { roundButton } from '../ui/buttons';
import { openParentGate } from '../ui/parentGate';
import { attachSubtitles } from '../ui/subtitle';
import { COLORS, FONT, INK, TEXT_RESOLUTION, WIDTH } from '../ui/theme';
import { voice } from '../voice';

/** Главный экран: панда и большая кнопка «Играть». Шестерёнка ведёт в раздел для взрослых. */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create(): void {
    drawEnclosure(this, 'asia');
    attachSubtitles(this, 150);

    this.add
      .text(WIDTH / 2, 70, t('ui.title'), {
        fontFamily: FONT,
        fontSize: '64px',
        fontStyle: 'bold',
        color: INK,
        stroke: '#ffffff',
        strokeThickness: 10,
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(0.5);

    const panda = this.add.image(WIDTH / 2, 520, textureKey('panda', 'happy')).setScale(0.5);
    this.tweens.add({ targets: panda, scaleY: 0.51, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    panda.setInteractive({ useHandCursor: true, pixelPerfect: true, alphaTolerance: 10 });
    panda.on('pointerup', () => {
      voice.unlock();
      this.tweens.add({ targets: panda, y: 480, duration: 160, yoyo: true, ease: 'Quad.easeOut' });
      if (!voice.isSpeaking) voice.say('animal.panda.hello');
    });

    const play = roundButton(this, WIDTH / 2, 870, '▶', () => this.startGame(), {
      radius: 92,
      fill: COLORS.green,
      iconSize: 84,
    });
    (play.list[2] as Phaser.GameObjects.Text).setColor('#ffffff').setX(8);
    this.tweens.add({ targets: play, scale: 1.08, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    roundButton(this, WIDTH - 90, 90, '⚙️', () => openParentGate(this), { radius: 48 });
  }

  private startGame(): void {
    voice.unlock();
    voice.stop();
    this.scene.start('feed', { animal: 'panda' });
  }
}
