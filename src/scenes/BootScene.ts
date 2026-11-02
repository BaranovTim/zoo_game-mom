import Phaser from 'phaser';
import { ANIMALS, textureKey, textureUrl } from '../data/animals';
import { FOOD_IDS, foodTexture } from '../data/foods';
import { COLORS, HEIGHT, WIDTH } from '../ui/theme';
import { voice } from '../voice';

type Point = Phaser.Math.Vector2;
const P = (x: number, y: number): Point => new Phaser.Math.Vector2(x, y);

/**
 * Загружает то, что нужно сразу: портреты всех зверей для карты и альбома, панду для главного экрана,
 * еду и список записанной озвучки. Картинки эмоций зверя грузятся, когда к нему приходят в гости.
 * Губку, щётку, листья и прочие мелочи рисует кодом, чтобы не возить лишние файлы.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    const bar = this.add.rectangle(WIDTH / 2 - 300, HEIGHT / 2, 0, 28, COLORS.green).setOrigin(0, 0.5);
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, 604, 32).setStrokeStyle(4, COLORS.line);
    this.load.on('progress', (value: number) => bar.setSize(600 * value, 28));

    for (const animal of ANIMALS) this.load.image(textureKey(animal.id, 'thumb'), textureUrl(animal.id, 'thumb'));
    this.load.image(textureKey('panda', 'happy'), textureUrl('panda', 'happy'));
    for (const food of FOOD_IDS) this.load.image(foodTexture(food), `assets/foods/${food}.webp`);
  }

  create(): void {
    this.makeConfetti();
    this.makeTexture('star', 100, 100, (g) => this.drawStar(g));
    this.makeTexture('bubble', 64, 64, (g) => this.drawBubble(g));
    this.makeTexture('sponge', 160, 120, (g) => this.drawSponge(g));
    this.makeTexture('brush', 170, 170, (g) => this.drawBrush(g));
    this.makeTexture('basket', 240, 210, (g) => this.drawBasket(g));
    this.makeTexture('heart-empty', 84, 80, (g) => this.drawHeart(g, 0xe9a3b3, 0xfff4f6));
    this.makeTexture('heart-full', 84, 80, (g) => this.drawHeart(g, 0xe5536f, 0xf47f95));
    [0xf08a3c, 0xf2c641, 0xb8743a].forEach((color, i) => this.makeTexture(`leaf-${i}`, 120, 120, (g) => this.drawLeaf(g, color)));
    voice.loadManifest().finally(() => this.scene.start('title'));
  }

  private makeTexture(key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void): void {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({}, false);
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeConfetti(): void {
    const colors = [COLORS.gold, COLORS.green, 0xf28b82, 0x7fb3e6, 0xc39bd3];
    colors.forEach((color, i) =>
      this.makeTexture(`confetti-${i}`, 18, 12, (g) => {
        g.fillStyle(color, 1);
        g.fillRoundedRect(0, 0, 18, 12, 3);
      }),
    );
  }

  private drawStar(g: Phaser.GameObjects.Graphics): void {
    const points: Point[] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 46 : 20;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      points.push(P(50 + r * Math.cos(a), 52 + r * Math.sin(a)));
    }
    g.fillStyle(0xf0b429, 1);
    g.fillPoints(points, true);
    g.fillStyle(0xffd96a, 1);
    g.fillPoints(
      points.map((p) => P(50 + (p.x - 50) * 0.78, 52 + (p.y - 52) * 0.78)),
      true,
    );
  }

  private drawBubble(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(COLORS.white, 0.35);
    g.fillCircle(32, 32, 28);
    g.lineStyle(3, 0x9fd3f0, 1);
    g.strokeCircle(32, 32, 28);
    g.fillStyle(COLORS.white, 0.9);
    g.fillCircle(22, 22, 7);
  }

  private drawSponge(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0xe0b12e, 1);
    g.fillRoundedRect(4, 10, 152, 106, 28);
    g.fillStyle(0xffd84d, 1);
    g.fillRoundedRect(4, 4, 152, 100, 28);
    g.fillStyle(0xe8bd3a, 1);
    const holes = [
      [36, 30, 9],
      [74, 22, 6],
      [112, 34, 10],
      [52, 64, 7],
      [92, 70, 11],
      [130, 74, 6],
      [28, 82, 5],
    ];
    for (const [x, y, r] of holes) g.fillEllipse(x, y, r * 2.2, r * 1.8);
  }

  /** Круглая щётка-«массажка», вид сверху: ручка вверх-вправо, щетинки внизу слева (там и причёсывает). */
  private drawBrush(g: Phaser.GameObjects.Graphics): void {
    g.lineStyle(26, 0x9b6a3c, 1);
    g.lineBetween(84, 86, 150, 20);
    g.fillStyle(0x9b6a3c, 1);
    g.fillCircle(150, 20, 13);
    g.fillCircle(58, 112, 52);
    g.fillStyle(0xf6d6a8, 1);
    g.fillCircle(58, 112, 42);
    g.fillStyle(0x6b4a2b, 1);
    for (let dx = -30; dx <= 30; dx += 15) {
      for (let dy = -30; dy <= 30; dy += 15) {
        if (dx * dx + dy * dy <= 34 * 34) g.fillCircle(58 + dx, 112 + dy, 4);
      }
    }
  }

  private drawBasket(g: Phaser.GameObjects.Graphics): void {
    // Ручка.
    g.lineStyle(14, 0xa8743f, 1);
    g.beginPath();
    g.arc(120, 96, 82, Math.PI, 0);
    g.strokePath();
    // Корпус — трапеция, шире сверху.
    g.fillStyle(0xc58b4c, 1);
    g.fillPoints(
      [
        P(14, 96),
        P(226, 96),
        P(196, 204),
        P(44, 204),
      ],
      true,
    );
    // Плетение.
    g.lineStyle(5, 0xa8743f, 1);
    for (let y = 122; y < 204; y += 24) {
      const inset = 14 + ((y - 96) / 108) * 30;
      g.lineBetween(inset, y, 240 - inset, y);
    }
    for (let x = 50; x <= 190; x += 35) g.lineBetween(x + (x - 120) * 0.14, 100, x, 202);
    // Край.
    g.fillStyle(0xdba467, 1);
    g.fillRoundedRect(6, 84, 228, 26, 13);
  }

  private drawHeart(g: Phaser.GameObjects.Graphics, outer: number, inner: number): void {
    const heart = (scale: number, cy: number): Point[] => {
      const points: Point[] = [];
      for (let i = 0; i < 48; i++) {
        const t = (i / 48) * Math.PI * 2;
        const x = 16 * Math.sin(t) ** 3;
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        points.push(P(42 + x * scale, cy + y * scale));
      }
      return points;
    };
    g.fillStyle(outer, 1);
    g.fillPoints(heart(2.45, 38), true);
    g.fillStyle(inner, 1);
    g.fillPoints(heart(1.75, 37), true);
    g.fillStyle(COLORS.white, 0.7);
    g.fillEllipse(28, 26, 14, 10);
  }

  /** Лист-«лодочка» по диагонали с черешком и прожилкой. */
  private drawLeaf(g: Phaser.GameObjects.Graphics, color: number): void {
    const a = -Math.PI / 4;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const at = (u: number, v: number): Point => P(60 + u * cos - v * sin, 60 + u * sin + v * cos);
    const len = 92;
    const width = 30;
    const outline: Point[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      outline.push(at(-len / 2 + t * len, width * Math.sin(Math.PI * t)));
    }
    // Нижний край без концов: повторные точки на кончиках ломают заливку многоугольника.
    for (let i = 23; i >= 1; i--) {
      const t = i / 24;
      outline.push(at(-len / 2 + t * len, -width * Math.sin(Math.PI * t)));
    }
    g.fillStyle(color, 1);
    g.fillPoints(outline, true);
    const vein = Phaser.Display.Color.ValueToColor(color).darken(25).color;
    g.lineStyle(4, vein, 1);
    const stemEnd = at(-len / 2 - 14, 0);
    const tip = at(len / 2 - 10, 0);
    g.lineBetween(stemEnd.x, stemEnd.y, tip.x, tip.y);
    for (const u of [-18, 6, 28]) {
      const from = at(u, 0);
      const up = at(u + 14, 16);
      const down = at(u + 14, -16);
      g.lineStyle(3, vein, 1);
      g.lineBetween(from.x, from.y, up.x, up.y);
      g.lineBetween(from.x, from.y, down.x, down.y);
    }
  }
}
