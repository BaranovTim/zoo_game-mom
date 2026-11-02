import Phaser from 'phaser';
import { pickActivity, sceneFor, type Activity } from '../data/activities';
import { ANIMALS, EMOTIONS, getAnimal, textureKey, textureUrl, type Animal, type Emotion } from '../data/animals';
import { saveSettings, settings } from '../settings';
import { drawEnclosure, type EnclosureOptions } from '../ui/background';
import { roundButton } from '../ui/buttons';
import { attachSubtitles } from '../ui/subtitle';
import { COLORS, FONT, TEXT_RESOLUTION, WIDTH } from '../ui/theme';
import { voice } from '../voice';

export const ANIMAL_X = WIDTH / 2;
export const ANIMAL_Y = 420;
/** Картинка 1024 px, на экране около 560 px. */
export const ANIMAL_SCALE = 0.55;
/** Где внизу экрана лежат предметы: еда, губка, кнопки финала. */
export const TRAY_Y = 862;
const IDLE_MS = 9000;

export const pad = (n: number) => String(n).padStart(2, '0');
export const praise = () => `praise.${pad(Phaser.Math.Between(1, 15))}`;
export const oops = () => `oops.${pad(Phaser.Math.Between(1, 5))}`;

/** Прошлое занятие: следующий визит предложит другое. */
let lastActivity: Activity | null = null;

export interface VisitData {
  animal?: string;
}

/**
 * Общая основа экранов визита к зверю: кормление, уход и пазл.
 * Здесь картинка зверя с эмоциями, кнопки «на карту» и «послушать ещё раз»,
 * подсказка рукой, если ребёнок долго ничего не делает, и финал с наклейкой.
 */
export abstract class VisitScene extends Phaser.Scene {
  protected animal!: Animal;
  protected animalBox!: Phaser.GameObjects.Container;
  protected animalImage!: Phaser.GameObjects.Image;
  protected busy = false;
  protected finished = false;
  private hints = 0;
  private idleTimer?: Phaser.Time.TimerEvent;
  private emotionTimer?: Phaser.Time.TimerEvent;

  init(data: VisitData): void {
    this.animal = getAnimal(data.animal ?? 'panda');
    this.busy = false;
    this.finished = false;
    this.hints = 0;
  }

  /** Картинки зверя грузятся, когда к нему впервые приходят, а не все сразу при запуске. */
  preload(): void {
    for (const emotion of EMOTIONS) {
      const key = textureKey(this.animal.id, emotion);
      if (!this.textures.exists(key)) this.load.image(key, textureUrl(this.animal.id, emotion));
    }
  }

  /** Сказать, что нужно сделать (кнопка 🔊). */
  protected abstract repeatTask(): void;
  /** Показать рукой, что нужно сделать. */
  protected abstract showHint(): void;
  /** Убрать предметы занятия перед финалом. */
  protected clearStage(): void {}

  protected setupStage(options: EnclosureOptions = {}): void {
    drawEnclosure(this, this.animal.zone, options);
    attachSubtitles(this);
    roundButton(this, 90, 90, '🗺️', () => this.scene.start('map', { from: 'visit' }));
    roundButton(this, 210, 90, '🔊', () => {
      if (!this.finished) this.repeatTask();
    });
    this.input.on('pointerdown', () => this.resetIdle());
    this.resetIdle();
  }

  // ---------- Зверь ----------

  protected makeAnimal(x = ANIMAL_X, y = ANIMAL_Y, scale = ANIMAL_SCALE): void {
    this.animalBox = this.add.container(x, y);
    this.animalImage = this.add.image(0, 0, textureKey(this.animal.id, 'base')).setScale(scale);
    this.animalBox.add(this.animalImage);
    this.animalBox.setData({ homeX: x, homeY: y });
    this.tweens.add({
      targets: this.animalImage,
      scaleY: scale * 1.015,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.animalImage.setInteractive({ pixelPerfect: true, alphaTolerance: 10, useHandCursor: true });
    this.animalImage.on('pointerup', () => this.tapAnimal());
  }

  protected setEmotion(emotion: Emotion): void {
    this.animalImage.setTexture(textureKey(this.animal.id, emotion));
  }

  /** Показывает эмоцию; с временем — потом возвращает спокойную картинку. */
  protected showEmotion(emotion: Emotion, ms?: number, after: Emotion = 'base'): void {
    this.emotionTimer?.remove();
    this.setEmotion(emotion);
    if (ms) this.emotionTimer = this.time.delayedCall(ms, () => this.setEmotion(after));
  }

  protected resetPose(): void {
    this.tweens.killTweensOf(this.animalBox);
    this.animalBox.setPosition(this.animalBox.getData('homeX') as number, this.animalBox.getData('homeY') as number);
    this.animalBox.setAngle(0).setScale(1);
  }

  protected jump(height = 40, times = 0): void {
    this.resetPose();
    const y = this.animalBox.y;
    this.tweens.add({ targets: this.animalBox, y: y - height, duration: 180, yoyo: true, repeat: times, ease: 'Quad.easeOut' });
  }

  protected shake(): void {
    this.resetPose();
    this.tweens.add({
      targets: this.animalBox,
      angle: { from: -5, to: 5 },
      duration: 120,
      yoyo: true,
      repeat: 2,
      onComplete: () => this.animalBox.setAngle(0),
    });
  }

  protected chew(): void {
    this.resetPose();
    this.tweens.add({ targets: this.animalBox, scaleY: 0.97, scaleX: 1.02, duration: 150, yoyo: true, repeat: 3 });
  }

  protected tapAnimal(): void {
    if (this.finished || this.busy) return;
    this.showEmotion('happy', 1800);
    this.jump();
    if (!voice.isSpeaking) void voice.say(`tap.${pad(Phaser.Math.Between(1, 5))}`);
  }

  /** Точка на зверя в координатах экрана непрозрачна, то есть попадает в самого зверя, а не в пустое поле картинки. */
  protected isOnAnimal(x: number, y: number): boolean {
    const image = this.animalImage;
    const matrix = image.getWorldTransformMatrix();
    const local = matrix.applyInverse(x, y);
    const tx = local.x + image.width / 2;
    const ty = local.y + image.height / 2;
    if (tx < 0 || ty < 0 || tx >= image.width || ty >= image.height) return false;
    return this.textures.getPixelAlpha(Math.floor(tx), Math.floor(ty), image.texture.key) > 200;
  }

  // ---------- Подсказки ----------

  protected resetIdle(): void {
    this.idleTimer?.remove();
    if (this.finished) return;
    this.idleTimer = this.time.delayedCall(IDLE_MS, () => this.idleHint());
  }

  private idleHint(): void {
    if (this.finished) return;
    if (this.busy || voice.isSpeaking) {
      // Ребёнок слушает — подсказка подождёт, пока фраза закончится.
      this.idleTimer = this.time.delayedCall(2000, () => this.idleHint());
      return;
    }
    this.hints++;
    void voice.say(this.hints === 1 ? 'hint.idle_1' : 'hint.idle_2');
    this.showHint();
    this.resetIdle();
  }

  // ---------- Переходы ----------

  /** После кормления — другое занятие с этим же зверем. */
  protected goToActivity(): void {
    if (!this.scene.isActive()) return;
    const activity = pickActivity(this.animal, lastActivity);
    lastActivity = activity;
    this.scene.start(sceneFor(activity), { animal: this.animal.id, activity });
  }

  // ---------- Финал ----------

  /**
   * Конец визита: зверь радуется, наклейка улетает в альбом, появляются кнопки «на карту» и «ещё раз».
   * quiet — для укладывания спать: без прыжков и конфетти, чтобы не разбудить зверя.
   */
  protected completeVisit(options: { quiet?: boolean; lines?: string[] } = {}): void {
    if (this.finished) return;
    this.finished = true;
    this.idleTimer?.remove();
    this.clearStage();
    const id = this.animal.id;

    if (options.quiet) {
      this.twinkle();
    } else {
      this.showEmotion('celebrate');
      this.jump(60, 2);
      this.confetti();
    }

    const isNew = !settings.stickers.includes(id);
    if (isNew) {
      settings.stickers.push(id);
      saveSettings();
    }
    const lines = [...(options.lines ?? []), isNew ? `animal.${id}.sticker` : praise()];
    if (isNew) lines.push('reward.sticker');
    if (isNew && settings.stickers.length === ANIMALS.length) lines.push('keeper.album_full');
    void voice.say(...lines);

    this.time.delayedCall(600, () => this.showSticker());
    this.time.delayedCall(1500, () => this.showEndButtons());
  }

  protected confetti(x = ANIMAL_X, y = ANIMAL_Y + 80): void {
    for (let i = 0; i < 5; i++) {
      const emitter = this.add.particles(0, 0, `confetti-${i}`, {
        speed: { min: 350, max: 750 },
        angle: { min: 200, max: 340 },
        gravityY: 900,
        lifespan: 2000,
        rotate: { start: 0, end: 540 },
        scale: { min: 0.8, max: 1.5 },
        emitting: false,
      });
      emitter.setDepth(70);
      emitter.explode(24, x, y);
    }
  }

  /** Тихий финал: вокруг спящего зверя мерцают звёздочки. */
  private twinkle(): void {
    const emitter = this.add.particles(0, 0, 'star', {
      x: { min: ANIMAL_X - 320, max: ANIMAL_X + 320 },
      y: { min: 120, max: 520 },
      lifespan: 1400,
      scale: { start: 0, end: 0.5, ease: 'Sine.easeOut' },
      alpha: { start: 1, end: 0 },
      frequency: 140,
      quantity: 1,
    });
    emitter.setDepth(70);
    this.time.delayedCall(4000, () => emitter.stop());
  }

  private showSticker(): void {
    const ring = this.add.circle(0, 0, 110, COLORS.white).setStrokeStyle(10, COLORS.gold);
    const face = this.add.image(0, 4, textureKey(this.animal.id, 'thumb')).setScale(200 / 320);
    const star = this.add.text(78, -78, '⭐', { fontFamily: FONT, fontSize: '64px', resolution: TEXT_RESOLUTION }).setOrigin(0.5);
    const sticker = this.add.container(ANIMAL_X + 380, ANIMAL_Y, [ring, face, star]).setDepth(80).setScale(0);
    this.tweens.chain({
      targets: sticker,
      tweens: [
        { scale: 1, duration: 450, ease: 'Back.easeOut' },
        { scale: 0.55, x: WIDTH - 110, y: 230, duration: 650, delay: 1600, ease: 'Sine.easeInOut' },
      ],
    });
  }

  private showEndButtons(): void {
    const map = roundButton(this, WIDTH / 2 - 130, TRAY_Y, '🗺️', () => this.scene.start('map', { from: 'visit' }), {
      radius: 84,
      fill: COLORS.green,
      iconSize: 80,
    });
    const again = roundButton(this, WIDTH / 2 + 130, TRAY_Y, '↻', () => this.scene.start('feed', { animal: this.animal.id }), {
      radius: 84,
      iconSize: 90,
    });
    [map, again].forEach((button, i) => {
      button.setScale(0).setDepth(90);
      this.tweens.add({ targets: button, scale: 1, duration: 350, delay: i * 120, ease: 'Back.easeOut' });
    });
    this.tweens.add({ targets: map, scale: 1.08, duration: 700, delay: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}
