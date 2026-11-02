import Phaser from 'phaser';
import { AMOUNTS, type Activity } from '../data/activities';
import { textureKey } from '../data/animals';
import { settings } from '../settings';
import { demoDrag, demoRub, demoTap } from '../ui/hand';
import { COLORS, FONT, HEIGHT, TEXT_RESOLUTION, WIDTH } from '../ui/theme';
import { voice } from '../voice';
import { ANIMAL_SCALE, ANIMAL_X, ANIMAL_Y, pad, praise, TRAY_Y, VisitScene, type VisitData } from './VisitScene';

type CareActivity = Exclude<Activity, 'puzzle'>;

const ASK: Record<CareActivity, string> = {
  wash: 'care.wash_ask',
  brush: 'care.brush_ask',
  clean: 'care.clean_ask',
  sleep: 'care.sleep_ask',
};

/** Сколько надо потереть губкой одно пятно и сколько провести щёткой ради одного сердечка, в пикселях. */
const RUB_PER_SPOT = 260;
const BRUSH_PER_HEART = 650;
const TOOL_HOME = { x: WIDTH / 2, y: TRAY_Y };
const BASKET = { x: 1370, y: 790 };
const SUN = { x: 1150, y: 190 };

interface Spot {
  blob: Phaser.GameObjects.Container;
  dirt: number;
}

/**
 * Уход за зверем после кормления. Одна сцена на четыре занятия:
 * помыть губкой (стереть пятна), причесать щёткой (наполнить сердечки),
 * убрать листья в корзину (со счётом) и уложить спать (выключить солнце, зажечь звёзды).
 */
export class CareScene extends VisitScene {
  private activity: CareActivity = 'wash';
  private tool?: Phaser.GameObjects.Image;
  private toolTray?: Phaser.GameObjects.Graphics;
  private spots: Spot[] = [];
  private bubbleTrail = 0;
  private brushed = 0;
  private hearts: Phaser.GameObjects.Image[] = [];
  private filledHearts = 0;
  private leaves: Phaser.GameObjects.Image[] = [];
  private basket?: Phaser.GameObjects.Image;
  private collected = 0;
  private sun?: Phaser.GameObjects.Container;
  private stars: Phaser.GameObjects.Image[] = [];
  private lit = 0;
  private night = false;
  /** Ребёнок уже начал сам: подсказку после вступления не показываем, чтобы не мешать. */
  private started = false;

  constructor() {
    super('care');
  }

  init(data: VisitData & { activity?: Activity }): void {
    super.init(data);
    this.activity = data.activity && data.activity !== 'puzzle' ? data.activity : 'wash';
    this.tool = undefined;
    this.toolTray = undefined;
    this.spots = [];
    this.bubbleTrail = 0;
    this.brushed = 0;
    this.hearts = [];
    this.filledHearts = 0;
    this.leaves = [];
    this.basket = undefined;
    this.collected = 0;
    this.sun = undefined;
    this.stars = [];
    this.lit = 0;
    this.night = false;
    this.started = false;
  }

  create(): void {
    this.setupStage({ sun: this.activity !== 'sleep' });
    this.makeAnimal();
    if (this.activity === 'wash') this.setupWash();
    if (this.activity === 'brush') this.setupBrush();
    if (this.activity === 'clean') this.setupClean();
    if (this.activity === 'sleep') this.setupSleep();
    void this.intro();
  }

  private get amounts() {
    return AMOUNTS[settings.level];
  }

  private async intro(): Promise<void> {
    if (this.activity === 'sleep') {
      this.showEmotion('think');
      if (!(await voice.say(ASK.sleep))) return;
      this.showEmotion('sleep', 1600, 'think');
      if (!(await voice.say('care.sleep_yawn'))) return;
      if (!this.started) this.showHint();
      return;
    }
    if (!(await voice.say(ASK[this.activity]))) return;
    if (!this.started) this.showHint();
  }

  protected repeatTask(): void {
    void voice.say(this.night ? 'hint.look' : ASK[this.activity]);
    this.showHint();
  }

  protected showHint(): void {
    if (this.finished) return;
    if (this.activity === 'wash' || this.activity === 'brush') {
      const spot = this.spots.find((s) => s.dirt > 0);
      const target = spot ? { x: this.animalBox.x + spot.blob.x, y: this.animalBox.y + spot.blob.y } : { x: ANIMAL_X, y: ANIMAL_Y };
      demoRub(this, target, { texture: this.activity === 'wash' ? 'sponge' : 'brush', scale: 0.8 });
    }
    if (this.activity === 'clean') {
      const leaf = this.leaves[0];
      if (leaf) demoDrag(this, leaf, BASKET, { texture: leaf.texture.key, scale: leaf.scale });
    }
    if (this.activity === 'sleep') {
      if (!this.night && this.sun) demoTap(this, this.sun);
      const star = this.stars.find((s) => !s.getData('lit'));
      if (this.night && star) demoTap(this, star);
    }
  }

  protected clearStage(): void {
    const items = [this.tool, this.basket, ...this.hearts].filter(Boolean) as Phaser.GameObjects.Image[];
    items.forEach((item) => {
      item.disableInteractive();
      this.tweens.add({ targets: item, alpha: 0, duration: 400 });
    });
    if (this.toolTray) this.tweens.add({ targets: this.toolTray, alpha: 0, duration: 400 });
  }

  // ---------- Губка и щётка ----------

  private makeTool(texture: string, onMove: (x: number, y: number, moved: number) => void): void {
    const tray = this.add.graphics();
    tray.fillStyle(COLORS.white, 0.55);
    tray.fillRoundedRect(TOOL_HOME.x - 130, TOOL_HOME.y - 100, 260, 200, 40);
    this.toolTray = tray;

    const tool = this.add.image(TOOL_HOME.x, TOOL_HOME.y, texture).setDepth(40);
    tool.setInteractive({ draggable: true, useHandCursor: true });
    this.tween(tool, { scale: 1.08, duration: 700, yoyo: true, repeat: -1 });
    this.tool = tool;

    this.input.dragDistanceThreshold = 4;
    tool.on('dragstart', () => {
      this.started = true;
      this.tweens.killTweensOf(tool);
      tool.setScale(1.1);
    });
    tool.on('drag', (_p: Phaser.Input.Pointer, x: number, y: number) => {
      if (this.finished) return;
      const moved = Phaser.Math.Distance.Between(tool.x, tool.y, x, y);
      tool.setPosition(x, y);
      onMove(x, y, moved);
    });
    tool.on('dragend', () => {
      if (this.finished) return;
      this.tweens.add({ targets: tool, x: TOOL_HOME.x, y: TOOL_HOME.y, scale: 1, duration: 300, ease: 'Back.easeOut' });
    });
  }

  private tween(target: Phaser.GameObjects.GameObject, config: Omit<Phaser.Types.Tweens.TweenBuilderConfig, 'targets'>): void {
    this.tweens.add({ targets: target, ease: 'Sine.easeInOut', ...config });
  }

  /** Случайные точки внутри зверя (по непрозрачным пикселям картинки), не слишком близко друг к другу. */
  private pointsOnAnimal(count: number, minDistance: number): Phaser.Math.Vector2[] {
    const key = textureKey(this.animal.id, 'base');
    const size = this.animalImage.width;
    const solid = (x: number, y: number) =>
      x >= 0 && y >= 0 && x < size && y < size && this.textures.getPixelAlpha(Math.floor(x), Math.floor(y), key) > 230;
    const points: Phaser.Math.Vector2[] = [];
    for (let attempt = 0; attempt < 3000 && points.length < count; attempt++) {
      const x = Phaser.Math.Between(size * 0.12, size * 0.88);
      const y = Phaser.Math.Between(size * 0.12, size * 0.92);
      const inside = solid(x, y) && solid(x - 50, y) && solid(x + 50, y) && solid(x, y - 50) && solid(x, y + 50);
      const local = new Phaser.Math.Vector2((x - size / 2) * ANIMAL_SCALE, (y - size / 2) * ANIMAL_SCALE);
      if (inside && points.every((p) => p.distance(local) >= minDistance)) points.push(local);
    }
    return points;
  }

  private setupWash(): void {
    for (const point of this.pointsOnAnimal(this.amounts.spots, 95)) {
      const blob = this.add.container(point.x, point.y);
      for (let i = 0; i < 4; i++) {
        const r = Phaser.Math.Between(18, 30);
        blob.add(this.add.circle(Phaser.Math.Between(-20, 20), Phaser.Math.Between(-16, 16), r, 0x7a5230, 0.9));
      }
      this.animalBox.add(blob);
      this.spots.push({ blob, dirt: 1 });
    }
    this.makeTool('sponge', (x, y, moved) => this.rub(x, y, moved));
  }

  private rub(x: number, y: number, moved: number): void {
    let touching = false;
    for (const spot of this.spots) {
      if (spot.dirt <= 0) continue;
      const sx = this.animalBox.x + spot.blob.x;
      const sy = this.animalBox.y + spot.blob.y;
      if (Phaser.Math.Distance.Between(x, y, sx, sy) > 80) continue;
      touching = true;
      spot.dirt -= moved / RUB_PER_SPOT;
      spot.blob.setAlpha(Math.max(0, spot.dirt));
      if (spot.dirt <= 0) this.spotCleaned(spot, sx, sy);
    }
    if (touching || this.isOnAnimal(x, y)) {
      this.bubbleTrail += moved;
      if (this.bubbleTrail > 35) {
        this.bubbleTrail = 0;
        this.bubble(x, y);
      }
    }
  }

  private bubble(x: number, y: number): void {
    const b = this.add
      .image(x + Phaser.Math.Between(-40, 40), y + Phaser.Math.Between(-30, 30), 'bubble')
      .setScale(Phaser.Math.FloatBetween(0.4, 1))
      .setDepth(45);
    this.tweens.add({ targets: b, y: b.y - 120, alpha: 0, duration: 1100, ease: 'Sine.easeOut', onComplete: () => b.destroy() });
  }

  private spotCleaned(spot: Spot, x: number, y: number): void {
    spot.blob.destroy();
    for (let i = 0; i < 4; i++) this.bubble(x, y);
    this.showEmotion('happy', 900);
    const left = this.spots.filter((s) => s.dirt > 0).length;
    if (left === 0) {
      this.time.delayedCall(400, () => this.completeVisit({ lines: ['care.wash_done', praise()] }));
    } else if (left === 1 && !voice.isSpeaking) {
      void voice.say('hint.one_left');
    }
  }

  private setupBrush(): void {
    const n = this.amounts.hearts;
    for (let i = 0; i < n; i++) {
      const x = WIDTH - 80 - (n - 1 - i) * 92;
      this.hearts.push(this.add.image(x, 90, 'heart-empty').setScale(0.9));
    }
    this.makeTool('brush', (x, y, moved) => this.brush(x, y, moved));
  }

  private brush(x: number, y: number, moved: number): void {
    // Щетина — левый нижний край щётки: проверяем, что она идёт по шерсти.
    if (!this.isOnAnimal(x - 30, y + 30) && !this.isOnAnimal(x, y)) return;
    this.brushed += moved;
    this.bubbleTrail += moved;
    if (this.bubbleTrail > 45) {
      this.bubbleTrail = 0;
      this.sparkle(x - 30, y + 30);
    }
    if (this.brushed >= BRUSH_PER_HEART * (this.filledHearts + 1)) this.fillHeart();
  }

  private sparkle(x: number, y: number): void {
    const s = this.add.image(x + Phaser.Math.Between(-30, 30), y + Phaser.Math.Between(-30, 30), 'star').setScale(0).setDepth(45);
    this.tweens.add({ targets: s, scale: 0.35, alpha: 0, angle: 90, duration: 700, onComplete: () => s.destroy() });
  }

  private fillHeart(): void {
    const heart = this.hearts[this.filledHearts];
    if (!heart) return;
    this.filledHearts++;
    heart.setTexture('heart-full').setScale(0.3);
    this.tweens.add({ targets: heart, scale: 0.9, duration: 350, ease: 'Back.easeOut' });
    this.showEmotion('like', 1200);
    if (this.filledHearts === this.hearts.length) {
      this.time.delayedCall(300, () => this.completeVisit({ lines: ['care.brush_done', praise()] }));
    }
  }

  // ---------- Уборка листьев ----------

  private setupClean(): void {
    this.basket = this.add.image(BASKET.x, BASKET.y, 'basket').setDepth(15);
    // Небольшой порог: нажатие без движения — это «тап», лист сам летит в корзину.
    this.input.dragDistanceThreshold = 12;
    const spots: Phaser.Math.Vector2[] = [];
    const n = this.amounts.leaves;
    for (let attempt = 0; attempt < 2000 && spots.length < n; attempt++) {
      const p = new Phaser.Math.Vector2(Phaser.Math.Between(170, 1180), Phaser.Math.Between(650, HEIGHT - 70));
      const nearAnimal = Math.abs(p.x - ANIMAL_X) < 170 && p.y < 720;
      if (!nearAnimal && spots.every((q) => q.distance(p) > 125)) spots.push(p);
    }
    spots.forEach((p, i) => {
      const leaf = this.add
        .image(p.x, p.y, `leaf-${i % 3}`)
        .setAngle(Phaser.Math.Between(-60, 60))
        .setDepth(20);
      leaf.setInteractive({ draggable: true, useHandCursor: true });
      leaf.setData({ dragged: false });
      leaf.on('pointerdown', () => leaf.setData('dragged', false));
      leaf.on('dragstart', () => {
        this.started = true;
        leaf.setData('dragged', true);
        leaf.setDepth(30).setScale(1.15);
      });
      leaf.on('drag', (_p: Phaser.Input.Pointer, x: number, y: number) => leaf.setPosition(x, y));
      leaf.on('dragend', () => {
        leaf.setDepth(20).setScale(1);
        if (Phaser.Math.Distance.Between(leaf.x, leaf.y, BASKET.x, BASKET.y) < 170) this.collect(leaf);
      });
      // Малышам тащить трудно: лист, на который просто нажали, сам летит в корзину.
      leaf.on('pointerup', () => {
        if (!leaf.getData('dragged')) this.collect(leaf);
      });
      this.leaves.push(leaf);
    });
  }

  private collect(leaf: Phaser.GameObjects.Image): void {
    if (this.finished || !this.leaves.includes(leaf)) return;
    this.started = true;
    this.leaves = this.leaves.filter((l) => l !== leaf);
    leaf.disableInteractive();
    this.collected++;
    this.tweens.add({
      targets: leaf,
      x: BASKET.x,
      y: BASKET.y - 30,
      scale: 0.45,
      duration: 380,
      ease: 'Quad.easeIn',
      onComplete: () => {
        leaf.destroy();
        if (this.basket) this.tweens.add({ targets: this.basket, angle: { from: -6, to: 6 }, duration: 90, yoyo: true, repeat: 1 });
      },
    });
    void voice.say(`count.${pad(this.collected)}`);
    if (this.leaves.length === 0) {
      this.time.delayedCall(700, () => this.completeVisit({ lines: ['care.clean_done', praise()] }));
    }
  }

  // ---------- Сон ----------

  private setupSleep(): void {
    const glow = this.add.circle(0, 0, 110, COLORS.sun, 0.3);
    const disc = this.add.circle(0, 0, 72, COLORS.sun);
    const sun = this.add.container(SUN.x, SUN.y, [glow, disc]).setSize(220, 220).setDepth(-6);
    sun.setInteractive({ useHandCursor: true });
    this.tween(glow, { scale: 1.15, duration: 900, yoyo: true, repeat: -1 });
    sun.on('pointerup', () => this.nightFalls());
    this.sun = sun;
  }

  private nightFalls(): void {
    if (this.night || !this.sun) return;
    this.night = true;
    this.started = true;
    this.sun.disableInteractive();
    this.tweens.add({ targets: this.sun, y: SUN.y + 340, alpha: 0, duration: 1200, ease: 'Sine.easeIn' });

    const sky = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x1b2a4a, 0).setDepth(-5);
    this.tweens.add({ targets: sky, fillAlpha: 0.62, duration: 1400 });
    const moon = this.add
      .text(SUN.x, SUN.y, '🌙', { fontFamily: FONT, fontSize: '120px', resolution: TEXT_RESOLUTION })
      .setOrigin(0.5)
      .setDepth(-4)
      .setAlpha(0);
    this.tweens.add({ targets: moon, alpha: 1, delay: 900, duration: 800 });

    this.showEmotion('think');
    this.time.delayedCall(1300, () => this.makeStars());
  }

  private makeStars(): void {
    const n = this.amounts.stars;
    const places: Phaser.Math.Vector2[] = [];
    for (let attempt = 0; attempt < 2000 && places.length < n; attempt++) {
      const p = new Phaser.Math.Vector2(Phaser.Math.Between(330, 1480), Phaser.Math.Between(130, 470));
      const onAnimal = Math.abs(p.x - ANIMAL_X) < 260;
      const onMoon = p.distance(new Phaser.Math.Vector2(SUN.x, SUN.y)) < 150;
      if (!onAnimal && !onMoon && places.every((q) => q.distance(p) > 170)) places.push(p);
    }
    places.forEach((p, i) => {
      const star = this.add.image(p.x, p.y, 'star').setScale(0).setAlpha(0.45).setDepth(5);
      star.setData('lit', false);
      star.setInteractive({ useHandCursor: true });
      star.input!.hitArea.setTo(-40, -40, star.width + 80, star.height + 80);
      this.tweens.chain({
        targets: star,
        tweens: [
          { scale: 0.75, duration: 400, delay: i * 150, ease: 'Back.easeOut' },
          { scale: 0.65, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' },
        ],
      });
      star.on('pointerup', () => this.lightStar(star));
      this.stars.push(star);
    });
    void voice.say('hint.look').then((done) => {
      if (done && this.lit === 0) this.showHint();
    });
  }

  private lightStar(star: Phaser.GameObjects.Image): void {
    if (this.finished || star.getData('lit')) return;
    star.setData('lit', true);
    star.disableInteractive();
    this.tweens.killTweensOf(star);
    star.setAlpha(1);
    this.tweens.add({ targets: star, scale: 1.1, duration: 300, ease: 'Back.easeOut' });
    this.lit++;
    void voice.say(`count.${pad(this.lit)}`);
    if (this.lit === this.stars.length) this.time.delayedCall(700, () => this.fallAsleep());
  }

  private fallAsleep(): void {
    this.showEmotion('sleep');
    for (let i = 0; i < 3; i++) {
      const z = this.add
        .text(ANIMAL_X + 150 + i * 40, ANIMAL_Y - 180 - i * 50, 'Z', {
          fontFamily: FONT,
          fontSize: `${44 + i * 12}px`,
          fontStyle: 'bold',
          color: '#ffffff',
          resolution: TEXT_RESOLUTION,
        })
        .setOrigin(0.5)
        .setAlpha(0)
        .setDepth(60);
      this.tweens.add({ targets: z, alpha: 1, y: z.y - 40, duration: 1200, delay: i * 500, yoyo: true, repeat: -1 });
    }
    this.completeVisit({ quiet: true, lines: ['care.sleep_done'] });
  }
}
