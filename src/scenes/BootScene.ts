import Phaser from 'phaser';
import { EMOTIONS, PLAYABLE, textureKey } from '../data/animals';
import { FOOD_IDS, foodTexture } from '../data/foods';
import { COLORS, HEIGHT, WIDTH } from '../ui/theme';
import { voice } from '../voice';

/** Загружает картинки животных и список записанной озвучки, потом открывает главный экран. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    const bar = this.add.rectangle(WIDTH / 2 - 300, HEIGHT / 2, 0, 28, COLORS.green).setOrigin(0, 0.5);
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, 604, 32).setStrokeStyle(4, COLORS.line);
    this.load.on('progress', (value: number) => bar.setSize(600 * value, 28));

    for (const id of PLAYABLE) {
      for (const emotion of EMOTIONS) {
        this.load.image(textureKey(id, emotion), `assets/animals/${id}/${emotion}.webp`);
      }
    }
    for (const food of FOOD_IDS) this.load.image(foodTexture(food), `assets/foods/${food}.webp`);
  }

  create(): void {
    this.makeConfettiTextures();
    voice.loadManifest().finally(() => this.scene.start('title'));
  }

  private makeConfettiTextures(): void {
    const colors = [COLORS.gold, COLORS.green, 0xf28b82, 0x7fb3e6, 0xc39bd3];
    colors.forEach((color, i) => {
      const g = this.make.graphics({}, false);
      g.fillStyle(color, 1);
      g.fillRoundedRect(0, 0, 18, 12, 3);
      g.generateTexture(`confetti-${i}`, 18, 12);
      g.destroy();
    });
  }
}
