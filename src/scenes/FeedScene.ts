import Phaser from 'phaser';
import { textureKey, type Animal } from '../data/animals';
import { FOOD_SIZE, foodTexture, type FoodId } from '../data/foods';
import { settings, type Level } from '../settings';
import { roundButton } from '../ui/buttons';
import { demoDrag } from '../ui/hand';
import { COLORS, WIDTH } from '../ui/theme';
import { voice } from '../voice';
import { ANIMAL_X, ANIMAL_Y, oops, pad, praise, TRAY_Y, VisitScene, type VisitData } from './VisitScene';

const MOUTH_Y = 470;
const DROP_RADIUS = 290;
const CARD = 176;

type Card = Phaser.GameObjects.Container;

/** Подсказку «возьми еду пальчиком» полностью говорим только в первый раз за игру. */
let explainedDrag = false;

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
 * Когда зверь сыт, визит продолжается другим занятием: мытьём, причёсыванием, уборкой, сном или пазлом.
 */
export class FeedScene extends VisitScene {
  private cards: Card[] = [];
  private slots: Phaser.Math.Vector2[] = [];
  private fed = 0;
  private mistakes = 0;

  constructor() {
    super('feed');
  }

  init(data: VisitData): void {
    super.init(data);
    this.cards = [];
    this.slots = [];
    this.fed = 0;
    this.mistakes = 0;
  }

  create(): void {
    this.setupStage();
    this.makeSlots();
    this.makeAnimal();
    this.makeCards();
    this.setupDrag();
    void this.intro();
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
      // Финал наступает, даже если фразу перебили кнопкой 🔊, но не после ухода со сцены.
      void voice.say(...lines).then(() => {
        if (this.scene.isActive() && !this.finished) this.finish();
      });
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
    if (!(await voice.say(`animal.${id}.this_is`))) return;
    this.showEmotion('happy', 1600);
    this.jump();
    if (!(await voice.say(`animal.${id}.hello`))) return;
    await voice.say(`animal.${id}.feed_ask`, explainedDrag ? 'hint.drag_food_short' : 'hint.drag_food');
    explainedDrag = true;
  }

  protected repeatTask(): void {
    void voice.say(`animal.${this.animal.id}.feed_ask`, 'hint.drag_food_short');
  }

  /** Рука показывает, как тащить подходящую еду к зверю. */
  protected showHint(): void {
    const card = this.cards.find((c) => this.animal.food.includes(c.getData('food') as FoodId));
    if (!card) return;
    demoDrag(this, card, { x: ANIMAL_X, y: MOUTH_Y }, { texture: foodTexture(card.getData('food') as FoodId), scale: 140 / FOOD_SIZE });
  }

  // ---------- Финал ----------

  /** Зверь наелся: благодарит, смотритель рассказывает факт, и визит идёт дальше к другому занятию. */
  private finish(): void {
    this.finished = true;
    this.cards.forEach((card) => this.tweens.add({ targets: card, alpha: 0, y: card.y + 60, duration: 300 }));
    this.showEmotion('celebrate');
    this.jump(60, 2);
    this.confetti();

    const lines = ['feed.full', praise(), `animal.${this.animal.id}.fact`];
    if (settings.stickers.length === 0) lines.push('keeper.safety');
    void voice.say(...lines).then((done) => {
      if (done) this.time.delayedCall(300, () => this.goToActivity());
    });

    // Кому не терпится, может идти дальше, не дослушав факт.
    this.time.delayedCall(1500, () => {
      const next = roundButton(this, WIDTH / 2, TRAY_Y, '▶', () => this.goToActivity(), {
        radius: 84,
        fill: COLORS.green,
        iconSize: 80,
      });
      (next.list[2] as Phaser.GameObjects.Text).setColor('#ffffff').setX(6);
      next.setScale(0).setDepth(90);
      this.tweens.chain({
        targets: next,
        tweens: [
          { scale: 1, duration: 350, ease: 'Back.easeOut' },
          { scale: 1.08, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' },
        ],
      });
    });
  }
}
