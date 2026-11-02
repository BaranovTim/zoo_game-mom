import Phaser from 'phaser';
import { ANIMALS, textureKey, type Animal } from '../data/animals';
import { settings } from '../settings';
import { roundButton } from '../ui/buttons';
import { attachSubtitles } from '../ui/subtitle';
import { COLORS, FONT, HEIGHT, INK, TEXT_RESOLUTION, WIDTH } from '../ui/theme';
import { voice } from '../voice';

const PER_ROW = 5;
const RADIUS = 78;
const GAP_X = 270;
const GAP_Y = 196;
const TOP = 270;

/**
 * Альбом наклеек: все 19 зверей. Полученные наклейки цветные, остальные — тени зверей.
 * Нажал на наклейку — зверь здоровается, смотритель рассказывает о нём.
 */
export class AlbumScene extends Phaser.Scene {
  constructor() {
    super('album');
  }

  create(): void {
    const g = this.add.graphics().setDepth(-10);
    g.fillStyle(0xfff4dc, 1);
    g.fillRect(0, 0, WIDTH, HEIGHT);
    g.fillStyle(0xf7e3b8, 1);
    g.fillRoundedRect(60, 170, WIDTH - 120, HEIGHT - 200, 40);
    g.lineStyle(6, 0xe8c98a, 1);
    g.strokeRoundedRect(60, 170, WIDTH - 120, HEIGHT - 200, 40);

    attachSubtitles(this);
    roundButton(this, 90, 90, '🗺️', () => this.scene.start('map'));

    const count = settings.stickers.length;
    this.add
      .text(WIDTH - 90, 90, `⭐ ${count} / ${ANIMALS.length}`, {
        fontFamily: FONT,
        fontSize: '40px',
        fontStyle: 'bold',
        color: INK,
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(1, 0.5);

    ANIMALS.forEach((animal, i) => {
      const row = Math.floor(i / PER_ROW);
      const inRow = Math.min(PER_ROW, ANIMALS.length - row * PER_ROW);
      const col = i % PER_ROW;
      this.makeSticker(animal, WIDTH / 2 + (col - (inRow - 1) / 2) * GAP_X, TOP + row * GAP_Y);
    });

    if (count === 0) void voice.say('keeper.album_open', 'keeper.album_empty');
    else if (count === ANIMALS.length) void voice.say('keeper.album_full');
    else void voice.say('keeper.album_open');
  }

  private makeSticker(animal: Animal, x: number, y: number): void {
    const have = settings.stickers.includes(animal.id);
    const ring = this.add.circle(0, 0, RADIUS, COLORS.white, have ? 1 : 0.5).setStrokeStyle(have ? 8 : 4, have ? COLORS.gold : 0xe8c98a);
    const face = this.add.image(0, 2, textureKey(animal.id, 'thumb')).setScale(((RADIUS - 6) * 2) / 320);
    if (!have) face.setTint(0xc9b48a).setTintMode(Phaser.TintModes.FILL).setAlpha(0.55);
    const sticker = this.add.container(x, y, [ring, face]).setSize(RADIUS * 2, RADIUS * 2);
    if (have) sticker.setAngle(Phaser.Math.Between(-5, 5));
    sticker.setInteractive({ useHandCursor: true });
    sticker.on('pointerup', () => {
      this.tweens.add({ targets: sticker, scale: 1.15, duration: 140, yoyo: true });
      if (have) void voice.say(`animal.${animal.id}.hello`, `animal.${animal.id}.fact`);
      else void voice.say('hint.find_more');
    });
  }
}
