import Phaser from 'phaser';
import { AMOUNTS } from '../data/activities';
import { textureKey } from '../data/animals';
import { settings } from '../settings';
import { demoDrag } from '../ui/hand';
import { COLORS } from '../ui/theme';
import { voice } from '../voice';
import { pad, VisitScene, type VisitData } from './VisitScene';

const BOARD = { x: 560, y: 560, size: 600 };
const TRAY = { x: 1230, y: 560 };
const TRAY_SCALE = 0.72;
const SNAP = 95;

type Piece = Phaser.GameObjects.Image;

/**
 * «Собери картинку»: радостный зверь на фоне неба и травы разрезан на кусочки
 * (2×2 у «Малыша», 3×3 у «Исследователя»). Кусочки тащат на доску, где видна бледная подсказка.
 * Собранная картинка превращается в живого зверя, и визит заканчивается наклейкой.
 */
export class PuzzleScene extends VisitScene {
  private pieces: Piece[] = [];
  private placed = 0;
  private board?: Phaser.GameObjects.Container;

  constructor() {
    super('puzzle');
  }

  init(data: VisitData): void {
    super.init(data);
    this.pieces = [];
    this.placed = 0;
    this.board = undefined;
  }

  create(): void {
    this.setupStage();
    const [cols, rows] = AMOUNTS[settings.level].puzzle;
    const picture = this.paintPicture();
    this.makeBoard(picture, cols, rows);
    this.makePieces(picture, cols, rows);
    void voice.say('game.puzzle').then((done) => {
      if (done && this.placed === 0) this.showHint();
    });
  }

  protected repeatTask(): void {
    void voice.say('game.puzzle');
    this.showHint();
  }

  protected showHint(): void {
    const piece = this.pieces.find((p) => !p.getData('placed'));
    if (!piece) return;
    demoDrag(this, piece, { x: piece.getData('cellX') as number, y: piece.getData('cellY') as number }, { texture: piece.texture.key, scale: TRAY_SCALE });
  }

  /** Рисует картинку пазла: небо, трава и радостный зверь, обрезанный по своим границам. */
  private paintPicture(): HTMLCanvasElement {
    const size = BOARD.size;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const sky = ctx.createLinearGradient(0, 0, 0, size * 0.62);
    sky.addColorStop(0, '#bfe4ee');
    sky.addColorStop(1, '#e8f5e9');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, size, size * 0.62);
    ctx.fillStyle = '#b4d79b';
    ctx.fillRect(0, size * 0.62, size, size * 0.38);
    ctx.fillStyle = 'rgba(255, 220, 125, 0.9)';
    ctx.beginPath();
    ctx.arc(size * 0.84, size * 0.14, size * 0.07, 0, Math.PI * 2);
    ctx.fill();

    const source = this.textures.get(textureKey(this.animal.id, 'happy')).getSourceImage() as HTMLImageElement;
    const box = opaqueBounds(source);
    const fit = Math.min((size * 0.9) / box.w, (size * 0.9) / box.h);
    const w = box.w * fit;
    const h = box.h * fit;
    ctx.drawImage(source, box.x, box.y, box.w, box.h, (size - w) / 2, size - h - size * 0.04, w, h);
    return canvas;
  }

  private makeBoard(picture: HTMLCanvasElement, cols: number, rows: number): void {
    const key = `puzzle-guide-${this.animal.id}`;
    if (this.textures.exists(key)) this.textures.remove(key);
    this.textures.addCanvas(key, picture);

    const half = BOARD.size / 2;
    const frame = this.add.graphics();
    frame.fillStyle(COLORS.ink, 0.1);
    frame.fillRoundedRect(-half - 16, -half - 10, BOARD.size + 32, BOARD.size + 32, 28);
    frame.fillStyle(COLORS.white, 1);
    frame.fillRoundedRect(-half - 16, -half - 16, BOARD.size + 32, BOARD.size + 32, 28);
    const guide = this.add.image(0, 0, key).setAlpha(settings.level === 'little' ? 0.28 : 0.16);
    const lines = this.add.graphics();
    lines.lineStyle(3, COLORS.line, 1);
    for (let c = 1; c < cols; c++) lines.lineBetween(-half + (c * BOARD.size) / cols, -half, -half + (c * BOARD.size) / cols, half);
    for (let r = 1; r < rows; r++) lines.lineBetween(-half, -half + (r * BOARD.size) / rows, half, -half + (r * BOARD.size) / rows);
    lines.strokeRect(-half, -half, BOARD.size, BOARD.size);
    this.board = this.add.container(BOARD.x, BOARD.y, [frame, guide, lines]);
  }

  private makePieces(picture: HTMLCanvasElement, cols: number, rows: number): void {
    const cw = BOARD.size / cols;
    const ch = BOARD.size / rows;
    const count = cols * rows;
    // Места в лотке справа: сетка, перемешанная, чтобы кусочки лежали не по порядку.
    const trayCols = cols;
    const gapX = cw * TRAY_SCALE + 22;
    const gapY = ch * TRAY_SCALE + 22;
    const trayRows = Math.ceil(count / trayCols);
    const spots = Phaser.Utils.Array.Shuffle(
      Array.from({ length: count }, (_, i) => ({
        x: TRAY.x + ((i % trayCols) - (trayCols - 1) / 2) * gapX,
        y: TRAY.y + (Math.floor(i / trayCols) - (trayRows - 1) / 2) * gapY,
      })),
    );

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const key = `puzzle-${this.animal.id}-${cols}x${rows}-${i}`;
        if (this.textures.exists(key)) this.textures.remove(key);
        this.textures.addCanvas(key, cutPiece(picture, c * cw, r * ch, cw, ch));

        const cellX = BOARD.x - BOARD.size / 2 + c * cw + cw / 2;
        const cellY = BOARD.y - BOARD.size / 2 + r * ch + ch / 2;
        const spot = spots[i];
        const piece = this.add.image(spot.x, spot.y, key).setScale(TRAY_SCALE).setDepth(20);
        piece.setAngle(Phaser.Math.Between(-6, 6));
        piece.setData({ cellX, cellY, homeX: spot.x, homeY: spot.y, placed: false });
        piece.setInteractive({ draggable: true, useHandCursor: true });
        this.pieces.push(piece);
      }
    }

    this.input.dragDistanceThreshold = 6;
    this.input.on('dragstart', (_p: Phaser.Input.Pointer, piece: Piece) => {
      if (this.finished) return;
      this.tweens.killTweensOf(piece);
      piece.setDepth(50).setAngle(0);
      this.tweens.add({ targets: piece, scale: 1, duration: 120 });
    });
    this.input.on('drag', (_p: Phaser.Input.Pointer, piece: Piece, x: number, y: number) => piece.setPosition(x, y));
    this.input.on('dragend', (_p: Phaser.Input.Pointer, piece: Piece) => this.drop(piece));
  }

  private drop(piece: Piece): void {
    const cellX = piece.getData('cellX') as number;
    const cellY = piece.getData('cellY') as number;
    if (Phaser.Math.Distance.Between(piece.x, piece.y, cellX, cellY) < SNAP) {
      piece.setData('placed', true);
      piece.disableInteractive();
      piece.setDepth(10);
      this.tweens.add({ targets: piece, x: cellX, y: cellY, scale: 1, duration: 180, ease: 'Back.easeOut' });
      this.placed++;
      void voice.say(`count.${pad(this.placed)}`);
      if (this.placed === this.pieces.length) this.time.delayedCall(500, () => this.solved());
      return;
    }
    this.tweens.add({
      targets: piece,
      x: piece.getData('homeX') as number,
      y: piece.getData('homeY') as number,
      scale: TRAY_SCALE,
      duration: 280,
      ease: 'Back.easeOut',
      onComplete: () => piece.setDepth(20),
    });
  }

  /** Картинка собрана: доска уезжает, на её месте появляется живой зверь и радуется. */
  private solved(): void {
    const parts: Phaser.GameObjects.GameObject[] = [...this.pieces];
    if (this.board) parts.push(this.board);
    this.tweens.add({ targets: parts, alpha: 0, duration: 500, onComplete: () => parts.forEach((p) => p.destroy()) });
    this.makeAnimal();
    this.animalBox.setScale(0);
    this.tweens.add({ targets: this.animalBox, scale: 1, duration: 450, ease: 'Back.easeOut' });
    this.completeVisit({ lines: ['game.puzzle_done'] });
  }
}

/** Границы непрозрачной части картинки, чтобы зверь занимал весь пазл, а не плавал в пустом поле. */
function opaqueBounds(image: HTMLImageElement): { x: number; y: number; w: number; h: number } {
  const scan = 256;
  const canvas = document.createElement('canvas');
  canvas.width = scan;
  canvas.height = scan;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0, scan, scan);
  const data = ctx.getImageData(0, 0, scan, scan).data;
  let minX = scan;
  let minY = scan;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < scan; y++) {
    for (let x = 0; x < scan; x++) {
      if (data[(y * scan + x) * 4 + 3] > 20) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  const k = image.width / scan;
  if (maxX <= minX) return { x: 0, y: 0, w: image.width, h: image.height };
  return { x: minX * k, y: minY * k, w: (maxX - minX + 1) * k, h: (maxY - minY + 1) * k };
}

/** Кусочек пазла со скруглёнными углами и белой каймой. */
function cutPiece(picture: HTMLCanvasElement, x: number, y: number, w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  roundedPath(ctx, 2, 2, w - 4, h - 4, 18);
  ctx.save();
  ctx.clip();
  ctx.drawImage(picture, x, y, w, h, 0, 0, w, h);
  ctx.restore();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  return canvas;
}

/** Скруглённый прямоугольник вручную: ctx.roundRect нет в Safari старше 16-й версии. */
function roundedPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
