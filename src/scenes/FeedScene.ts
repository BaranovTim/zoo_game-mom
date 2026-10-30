import Phaser from 'phaser';
import { getAnimal, textureKey, type Animal, type Emotion } from '../data/animals';
import { FOOD_SIZE, foodTexture, type FoodId } from '../data/foods';
import { saveSettings, settings, type Level } from '../settings';
import { drawEnclosure } from '../ui/background';
import { roundButton } from '../ui/buttons';
import { attachSubtitles } from '../ui/subtitle';
import { COLORS, FONT, TEXT_RESOLUTION, WIDTH } from '../ui/theme';
import { voice } from '../voice';

const ANIMAL_X = WIDTH / 2;
const ANIMAL_Y = 420;
/** Картинка 1024 px, на экране около 560 px. */
const ANIMAL_SCALE = 0.55;
const MOUTH_Y = 470;
const DROP_RADIUS = 290;
const TRAY_Y = 862;
const CARD = 176;
const IDLE_MS = 9000;

type Card = Phaser.GameObjects.Container;

const pad = (n: number) => String(n).padStart(2, '0');
const praise = () => `praise.${pad(Phaser.Math.Between(1, 15))}`;
const oops = () => `oops.${pad(Phaser.Math.Between(1, 5))}`;

/** Сколько карточек еды показать: «Малышу» на одну неверную больше, чем нужно, «Исследователю» на три. */
export function pickOptions(animal: Animal, level: Level): FoodId[] {
  const total = level === 'little' ? Math.max(3, animal.food.length + 1) : Math.min(6, animal.food.length + 3);
  const wrong = Phaser.Utils.Array.Shuffle([...animal.wrong]).slice(0, total - animal.food.length);
  return Phaser.Utils.Array.Shuffle([...animal.food, ...wrong]);
}

/**
 * Уровень «Чем угостим зверя?»: ребёнок перетаскивает еду к животному.
 * Подходящую зверь съедает, от неподходящей отказывается, после второй ошибки звучит подсказка.
 * Читать ничего не нужно: задание, названия еды и похвала звучат голосом.
 */
export class FeedScene extends Phaser.Scene {
  private animal!: Animal;
  private animalBox!: Phaser.GameObjects.Container;
  private animalImage!: Phaser.GameObjects.Image;
  private cards: Card[] = [];
  private slots: Phaser.Math.Vector2[] = [];
  private fed = 0;
  private mistakes = 0;
  private hints = 0;
  private busy = false;
  private finished = false;
  private idleTimer?: Phaser.Time.TimerEvent;
  private emotionTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super('feed');
  }

  create(data: { animal?: string }): void {
    this.animal = getAnimal(data.animal ?? 'panda');
    this.cards = [];
    this.slots = [];
    this.fed = 0;
    this.mistakes = 0;
    this.hints = 0;
    this.busy = false;
    this.finished = false;

    drawEnclosure(this, this.animal.zone);
    attachSubtitles(this);
    roundButton(this, 90, 90, '🏠', () => this.scene.start('title'));
    roundButton(this, 210, 90, '🔊', () => this.repeatTask());

    this.makeSlots();
    this.makeAnimal();
    this.makeCards();
    this.setupDrag();

    this.input.on('pointerdown', () => this.resetIdle());
    this.resetIdle();
    void this.intro();
  }

  // ---------- Зверь ----------

  private makeAnimal(): void {
    this.animalBox = this.add.container(ANIMAL_X, ANIMAL_Y);
    this.animalImage = this.add.image(0, 0, textureKey(this.animal.id, 'base')).setScale(ANIMAL_SCALE);
    this.animalBox.add(this.animalImage);
    this.tweens.add({
      targets: this.animalImage,
      scaleY: ANIMAL_SCALE * 1.015,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.animalImage.setInteractive({ pixelPerfect: true, alphaTolerance: 10, useHandCursor: true });
    this.animalImage.on('pointerup', () => this.tapAnimal());
  }

  private setEmotion(emotion: Emotion): void {
    this.animalImage.setTexture(textureKey(this.animal.id, emotion));
  }

  /** Показывает эмоцию; с временем — потом возвращает спокойную картинку. */
  private showEmotion(emotion: Emotion, ms?: number): void {
    this.emotionTimer?.remove();
    this.setEmotion(emotion);
    if (ms) this.emotionTimer = this.time.delayedCall(ms, () => this.setEmotion('base'));
  }

  private resetPose(): void {
    this.tweens.killTweensOf(this.animalBox);
    this.animalBox.setPosition(ANIMAL_X, ANIMAL_Y).setAngle(0).setScale(1);
  }

  private jump(height = 40, times = 0): void {
    this.resetPose();
    this.tweens.add({ targets: this.animalBox, y: ANIMAL_Y - height, duration: 180, yoyo: true, repeat: times, ease: 'Quad.easeOut' });
  }

  private shake(): void {
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

  private chew(): void {
    this.resetPose();
    this.tweens.add({ targets: this.animalBox, scaleY: 0.97, scaleX: 1.02, duration: 150, yoyo: true, repeat: 3 });
  }

  private tapAnimal(): void {
    if (this.finished || this.busy) return;
    this.showEmotion('happy', 1800);
    this.jump();
    if (!voice.isSpeaking) void voice.say(`tap.${pad(Phaser.Math.Between(1, 5))}`);
  }

  // ---------- Еда ----------

  private makeCards(): void {
    const options = pickOptions(this.animal, settings.level);
    const n = options.length;
    const spacing = Math.min(240, 1300 / n);
    const x0 = WIDTH / 2 - ((n - 1) * spacing) / 2;
    const trayWidth = (n - 1) * spacing + CARD + 80;

    const tray = this.add.graphics();
    tray.fillStyle(COLORS.white, 0.55);
    tray.fillRoundedRect(WIDTH / 2 - trayWidth / 2, TRAY_Y - CARD / 2 - 30, trayWidth, CARD + 60, 40);

    options.forEach((food, i) => this.cards.push(this.makeCard(food, x0 + i * spacing, TRAY_Y)));
  }

  private makeCard(food: FoodId, x: number, y: number): Card {
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.ink, 0.1);
    bg.fillRoundedRect(-CARD / 2, -CARD / 2 + 6, CARD, CARD, 30);
    bg.fillStyle(COLORS.white, 1);
    bg.fillRoundedRect(-CARD / 2, -CARD / 2, CARD, CARD, 30);
    bg.lineStyle(4, COLORS.line, 1);
    bg.strokeRoundedRect(-CARD / 2, -CARD / 2, CARD, CARD, 30);
    const icon = this.add.image(0, 0, foodTexture(food)).setScale(150 / FOOD_SIZE);

    const card = this.add.container(x, y, [bg, icon]).setSize(CARD, CARD).setDepth(10);
    card.setData({ food, homeX: x, homeY: y, dragged: false });
    card.setInteractive({ draggable: true, useHandCursor: true });
    card.on('pointerdown', () => card.setData('dragged', false));
    card.on('pointerup', () => {
      if (!card.getData('dragged') && !this.busy && !this.finished) this.sayFood(card);
    });
    return card;
  }

  private sayFood(card: Card): void {
    this.tweens.add({ targets: card, scale: 1.1, duration: 110, yoyo: true });
    void voice.say(`food.${card.getData('food') as FoodId}`);
  }

  private setupDrag(): void {
    this.input.dragDistanceThreshold = 12;
    this.input.on('dragstart', (_p: Phaser.Input.Pointer, card: Card) => {
      if (this.finished) return;
      card.setData('dragged', true);
      card.setDepth(50);
      this.tweens.add({ targets: card, scale: 1.12, duration: 120 });
    });
    this.input.on('drag', (_p: Phaser.Input.Pointer, card: Card, x: number, y: number) => {
      if (card.getData('dragged')) card.setPosition(x, y);
    });
    this.input.on('dragend', (_p: Phaser.Input.Pointer, card: Card) => {
      if (!card.getData('dragged')) return;
      const distance = Phaser.Math.Distance.Between(card.x, card.y, ANIMAL_X, ANIMAL_Y + 20);
      if (distance < DROP_RADIUS && !this.busy && !this.finished) this.offer(card);
      else this.sendHome(card);
    });
  }

  private sendHome(card: Card): void {
    this.tweens.add({
      targets: card,
      x: card.getData('homeX') as number,
      y: card.getData('homeY') as number,
      scale: 1,
      duration: 280,
      ease: 'Back.easeOut',
      onComplete: () => card.setDepth(10),
    });
  }

  private offer(card: Card): void {
    const food = card.getData('food') as FoodId;
    if (this.animal.food.includes(food)) this.eat(card, food);
    else this.refuse(card);
  }

  private eat(card: Card, food: FoodId): void {
    this.busy = true;
    card.disableInteractive();
    this.cards = this.cards.filter((c) => c !== card);
    this.tweens.add({
      targets: card,
      x: ANIMAL_X,
      y: MOUTH_Y,
      scale: 0.25,
      alpha: 0,
      duration: 320,
      ease: 'Quad.easeIn',
      onComplete: () => card.destroy(),
    });

    this.fed++;
    this.fillSlot(this.fed - 1, food);
    this.showEmotion('chew');
    this.chew();

    const left = this.animal.food.length - this.fed;
    const lines = [`count.${pad(this.fed)}`, this.fed === 1 ? `animal.${this.animal.id}.yum` : praise()];
    if (left === 1) lines.push('hint.one_left');

    if (left === 0) {
      void voice.say(...lines).then(() => this.finish());
      return;
    }
    void voice.say(...lines);
    this.time.delayedCall(450, () => (this.busy = false));
    this.time.delayedCall(1000, () => {
      if (this.animalImage.texture.key === textureKey(this.animal.id, 'chew')) this.showEmotion('like', 1500);
    });
  }

  private refuse(card: Card): void {
    this.busy = true;
    this.mistakes++;
    this.showEmotion('think', 1800);
    this.shake();
    this.sendHome(card);

    const hint = this.mistakes >= 2;
    void voice.say('feed.not_mine', hint ? `animal.${this.animal.id}.food_hint` : oops());
    this.time.delayedCall(500, () => {
      this.busy = false;
      if (hint) this.pulseCorrect();
    });
  }

  private pulseCorrect(): void {
    const card = this.cards.find((c) => this.animal.food.includes(c.getData('food') as FoodId));
    if (card) this.tweens.add({ targets: card, scale: 1.15, duration: 260, yoyo: true, repeat: 3 });
  }

  // ---------- Сколько съедено ----------

  private makeSlots(): void {
    const need = this.animal.food.length;
    for (let i = 0; i < need; i++) {
      const x = WIDTH - 80 - (need - 1 - i) * 100;
      this.add.circle(x, 90, 42, COLORS.white, 0.75).setStrokeStyle(4, COLORS.line);
      this.slots.push(new Phaser.Math.Vector2(x, 90));
    }
  }

  private fillSlot(index: number, food: FoodId): void {
    const slot = this.slots[index];
    if (!slot) return;
    const icon = this.add.image(slot.x, slot.y, foodTexture(food)).setScale(0);
    this.tweens.add({ targets: icon, scale: 74 / FOOD_SIZE, duration: 300, ease: 'Back.easeOut' });
  }

  // ---------- Подсказки ----------

  private async intro(): Promise<void> {
    const id = this.animal.id;
    if (!settings.welcomed) {
      settings.welcomed = true;
      saveSettings();
      if (!(await voice.say('keeper.welcome_first'))) return;
    }
    if (!(await voice.say(`animal.${id}.this_is`))) return;
    this.showEmotion('happy', 1600);
    this.jump();
    if (!(await voice.say(`animal.${id}.hello`))) return;
    await voice.say(`animal.${id}.feed_ask`, settings.stickers.length === 0 ? 'hint.drag_food' : 'hint.drag_food_short');
  }

  private repeatTask(): void {
    if (this.finished) return;
    void voice.say(`animal.${this.animal.id}.feed_ask`, 'hint.drag_food_short');
  }

  private resetIdle(): void {
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
    this.showHand();
    this.resetIdle();
  }

  /** Рука показывает, как тащить подходящую еду к зверю. */
  private showHand(): void {
    const card = this.cards.find((c) => this.animal.food.includes(c.getData('food') as FoodId));
    if (!card) return;
    const ghost = this.add
      .image(card.x, card.y, foodTexture(card.getData('food') as FoodId))
      .setScale(140 / FOOD_SIZE)
      .setAlpha(0.7)
      .setDepth(60);
    const hand = this.add
      .text(card.x + 30, card.y + 70, '👆', { fontFamily: FONT, fontSize: '90px', resolution: TEXT_RESOLUTION })
      .setOrigin(0.5)
      .setDepth(61);
    this.tweens.add({
      targets: ghost,
      x: ANIMAL_X,
      y: MOUTH_Y,
      duration: 1300,
      ease: 'Sine.easeInOut',
      repeat: 1,
      repeatDelay: 250,
      onComplete: () => ghost.destroy(),
    });
    this.tweens.add({
      targets: hand,
      x: ANIMAL_X + 30,
      y: MOUTH_Y + 70,
      duration: 1300,
      ease: 'Sine.easeInOut',
      repeat: 1,
      repeatDelay: 250,
      onComplete: () => hand.destroy(),
    });
  }

  // ---------- Финал ----------

  private finish(): void {
    this.finished = true;
    this.idleTimer?.remove();
    const id = this.animal.id;

    this.cards.forEach((card) => this.tweens.add({ targets: card, alpha: 0, y: card.y + 60, duration: 300 }));
    this.showEmotion('celebrate');
    this.jump(60, 2);
    this.confetti();

    const firstSticker = !settings.stickers.includes(id);
    if (firstSticker) {
      settings.stickers.push(id);
      saveSettings();
    }
    const lines = ['feed.full', praise(), `animal.${id}.fact`, 'reward.sticker'];
    if (firstSticker && settings.stickers.length === 1) lines.push('keeper.safety');
    void voice.say(...lines);

    this.time.delayedCall(700, () => this.showSticker());
    this.time.delayedCall(1600, () => this.showEndButtons());
  }

  private confetti(): void {
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
      emitter.explode(24, ANIMAL_X, ANIMAL_Y + 80);
    }
  }

  private showSticker(): void {
    const ring = this.add.circle(0, 0, 110, COLORS.white).setStrokeStyle(10, COLORS.gold);
    const face = this.add.image(0, 6, textureKey(this.animal.id, 'happy')).setScale(0.2);
    const star = this.add.text(78, -78, '⭐', { fontFamily: FONT, fontSize: '64px', resolution: TEXT_RESOLUTION }).setOrigin(0.5);
    const sticker = this.add.container(ANIMAL_X + 360, ANIMAL_Y, [ring, face, star]).setDepth(80).setScale(0);
    this.tweens.chain({
      targets: sticker,
      tweens: [
        { scale: 1, duration: 450, ease: 'Back.easeOut' },
        { scale: 0.55, x: WIDTH - 110, y: 230, duration: 650, delay: 1600, ease: 'Sine.easeInOut' },
      ],
    });
  }

  private showEndButtons(): void {
    const again = roundButton(this, WIDTH / 2 - 130, TRAY_Y, '↻', () => this.scene.restart({ animal: this.animal.id }), {
      radius: 84,
      fill: COLORS.green,
      iconSize: 90,
    });
    (again.list[2] as Phaser.GameObjects.Text).setColor('#ffffff');
    const home = roundButton(this, WIDTH / 2 + 130, TRAY_Y, '🏠', () => this.scene.start('title'), { radius: 84 });
    [again, home].forEach((button, i) => {
      button.setScale(0).setDepth(90);
      this.tweens.add({ targets: button, scale: 1, duration: 350, delay: i * 120, ease: 'Back.easeOut' });
    });
  }
}
