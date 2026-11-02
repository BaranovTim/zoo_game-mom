import Phaser from 'phaser';
import { animalsIn, textureKey, ZONES, type Animal, type ZoneId } from '../data/animals';
import { timeIsUp } from '../playClock';
import { saveSettings, settings } from '../settings';
import { roundButton } from '../ui/buttons';
import { demoTap } from '../ui/hand';
import { attachSubtitles } from '../ui/subtitle';
import { COLORS, FONT, HEIGHT, TEXT_RESOLUTION, WIDTH } from '../ui/theme';
import { voice } from '../voice';

const PORTRAIT = 66;
const IDLE_MS = 9000;

interface ZoneLook {
  /** Где зона на карте: левый верхний угол, ширина и высота. */
  x: number;
  y: number;
  w: number;
  h: number;
  fill: number;
  icon: string;
}

/** Карта: верхний ряд — саванна, Азия, тропический лес; нижний — наш лес, Север, озеро, Австралия. */
const LOOK: Record<ZoneId, ZoneLook> = {
  savanna: { x: 30, y: 170, w: 620, h: 390, fill: 0xf3dd9a, icon: '☀️' },
  asia: { x: 675, y: 170, w: 470, h: 390, fill: 0xcfe8b9, icon: '🎋' },
  rainforest: { x: 1170, y: 170, w: 400, h: 390, fill: 0x9fcf98, icon: '🌧️' },
  forest: { x: 30, y: 585, w: 560, h: 395, fill: 0xb9d9a3, icon: '🌲' },
  north: { x: 615, y: 585, w: 300, h: 395, fill: 0xe3f2f8, icon: '❄️' },
  lake: { x: 940, y: 585, w: 300, h: 395, fill: 0xbfe0f0, icon: '💧' },
  australia: { x: 1265, y: 585, w: 305, h: 395, fill: 0xf4cba4, icon: '🦘' },
};

/** Где стоят портреты зверей внутри зоны: до трёх в ряд, ряды по центру. */
function portraitSpots(look: ZoneLook, count: number): Phaser.Math.Vector2[] {
  const perRow = look.w < 400 ? 1 : count <= 4 ? 2 : 3;
  const rows = Math.ceil(count / perRow);
  const gapX = Math.min(190, (look.w - 40) / perRow);
  const gapY = Math.min(175, (look.h - 70) / rows);
  const spots: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / perRow);
    const inRow = Math.min(perRow, count - row * perRow);
    const col = i % perRow;
    spots.push(
      new Phaser.Math.Vector2(
        look.x + look.w / 2 + (col - (inRow - 1) / 2) * gapX,
        look.y + 45 + look.h / 2 + (row - (rows - 1) / 2) * gapY,
      ),
    );
  }
  return spots;
}

/**
 * Карта зоопарка: зоны с портретами зверей. Нажал на зверя — идёшь к нему в гости.
 * Нажал на зону — смотритель рассказывает о ней. У зверей, к которым уже приходили, золотая рамка и звёздочка.
 */
export class MapScene extends Phaser.Scene {
  private portraits: Phaser.GameObjects.Container[] = [];
  private idleTimer?: Phaser.Time.TimerEvent;
  private leaving = false;

  constructor() {
    super('map');
  }

  create(data: { from?: string }): void {
    if (timeIsUp()) {
      this.scene.start('timeup');
      return;
    }
    this.portraits = [];
    this.leaving = false;

    this.drawGround();
    attachSubtitles(this);
    for (const zone of ZONES) this.drawZone(zone);

    roundButton(this, 90, 90, '🏠', () => this.scene.start('title'));
    const album = roundButton(this, WIDTH - 90, 90, '📖', () => this.scene.start('album'));
    this.add
      .text(WIDTH - 170, 90, `${settings.stickers.length}`, {
        fontFamily: FONT,
        fontSize: '40px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#477b61',
        strokeThickness: 8,
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(1, 0.5);
    if (data.from === 'visit' && settings.stickers.length > 0) {
      this.tweens.add({ targets: album, scale: 1.15, duration: 300, yoyo: true, repeat: 2 });
    }

    this.input.on('pointerdown', () => this.resetIdle());
    this.resetIdle();
    void this.greet(data.from);
  }

  private async greet(from?: string): Promise<void> {
    if (from === 'visit') {
      await voice.say('keeper.visit_end');
      return;
    }
    if (!settings.welcomed) {
      settings.welcomed = true;
      saveSettings();
      if (!(await voice.say('keeper.welcome_first'))) return;
    } else if (!(await voice.say('keeper.welcome_back'))) {
      return;
    }
    await voice.say('keeper.map_choose');
  }

  private drawGround(): void {
    const g = this.add.graphics().setDepth(-10);
    g.fillStyle(0xe7f3df, 1);
    g.fillRect(0, 0, WIDTH, HEIGHT);
    // Дорожки между зонами.
    g.fillStyle(0xf7ecd4, 1);
    g.fillRect(0, 556, WIDTH, 34);
    g.fillRect(645, 150, 34, 420);
    g.fillRect(1140, 150, 34, 420);
    g.fillRect(586, 570, 34, HEIGHT - 570);
    g.fillRect(910, 570, 34, HEIGHT - 570);
    g.fillRect(1236, 570, 34, HEIGHT - 570);
  }

  private drawZone(zone: ZoneId): void {
    const look = LOOK[zone];
    const animals = animalsIn(zone);
    const locked = animals.length === 0;

    const g = this.add.graphics();
    g.fillStyle(COLORS.ink, 0.08);
    g.fillRoundedRect(look.x, look.y + 6, look.w, look.h, 36);
    g.fillStyle(look.fill, 1);
    g.fillRoundedRect(look.x, look.y, look.w, look.h, 36);
    g.lineStyle(4, COLORS.white, 0.8);
    g.strokeRoundedRect(look.x, look.y, look.w, look.h, 36);
    this.decorate(g, zone, look);

    const area = this.add.zone(look.x + look.w / 2, look.y + look.h / 2, look.w, look.h).setInteractive();
    area.on('pointerup', () => {
      if (this.leaving) return;
      void voice.say(locked ? 'keeper.map_locked' : `zone.${zone}`);
    });

    this.add.text(look.x + 44, look.y + 42, look.icon, { fontFamily: FONT, fontSize: '46px', resolution: TEXT_RESOLUTION }).setOrigin(0.5);

    if (locked) {
      this.add.rectangle(look.x + look.w / 2, look.y + look.h / 2, look.w, look.h, COLORS.white, 0.35);
      this.add
        .text(look.x + look.w / 2, look.y + look.h / 2 + 10, '🔒', { fontFamily: FONT, fontSize: '96px', resolution: TEXT_RESOLUTION })
        .setOrigin(0.5)
        .setAlpha(0.8);
      return;
    }

    portraitSpots(look, animals.length).forEach((spot, i) => this.makePortrait(animals[i], spot.x, spot.y));
  }

  /** Немного примет зоны, чтобы её узнавали без подписей. */
  private decorate(g: Phaser.GameObjects.Graphics, zone: ZoneId, look: ZoneLook): void {
    const right = look.x + look.w;
    const bottom = look.y + look.h;
    if (zone === 'savanna') {
      g.fillStyle(0x8a6a3c, 1);
      g.fillRect(right - 70, look.y + 60, 12, 70);
      g.fillStyle(0x7fae5a, 1);
      g.fillEllipse(right - 64, look.y + 55, 130, 40);
    }
    if (zone === 'asia' || zone === 'rainforest') {
      g.fillStyle(zone === 'asia' ? COLORS.bamboo : 0x4f9a5a, 0.8);
      for (let i = 0; i < 3; i++) g.fillRoundedRect(right - 50 - i * 26, look.y + 30 + i * 18, 14, look.h - 70 - i * 18, 7);
    }
    if (zone === 'forest') {
      g.fillStyle(0x4d8a52, 0.85);
      for (let i = 0; i < 3; i++) {
        const x = right - 50 - i * 40;
        g.fillTriangle(x, look.y + 28 + i * 6, x - 26, look.y + 92 + i * 6, x + 26, look.y + 92 + i * 6);
      }
    }
    if (zone === 'north') {
      g.fillStyle(COLORS.white, 1);
      g.fillEllipse(look.x + look.w / 2, bottom - 40, look.w - 60, 40);
    }
    if (zone === 'lake') {
      g.fillStyle(0x8cc6e6, 1);
      g.fillEllipse(look.x + look.w / 2, bottom - 45, look.w - 50, 50);
    }
    if (zone === 'australia') {
      g.fillStyle(0xe2a46e, 1);
      g.fillEllipse(look.x + look.w / 2, bottom - 40, look.w - 60, 36);
    }
  }

  private makePortrait(animal: Animal, x: number, y: number): void {
    const visited = settings.stickers.includes(animal.id);
    const shadow = this.add.circle(0, 6, PORTRAIT, COLORS.ink, 0.12);
    const ring = this.add.circle(0, 0, PORTRAIT, COLORS.white).setStrokeStyle(visited ? 8 : 5, visited ? COLORS.gold : COLORS.line);
    const face = this.add.image(0, 2, textureKey(animal.id, 'thumb')).setScale(((PORTRAIT - 6) * 2) / 320);
    const items: Phaser.GameObjects.GameObject[] = [shadow, ring, face];
    if (visited) {
      items.push(this.add.text(PORTRAIT - 14, -PORTRAIT + 14, '⭐', { fontFamily: FONT, fontSize: '36px', resolution: TEXT_RESOLUTION }).setOrigin(0.5));
    }
    const portrait = this.add.container(x, y, items).setSize(PORTRAIT * 2, PORTRAIT * 2).setDepth(5);
    portrait.setData('animal', animal.id);
    portrait.setInteractive({ useHandCursor: true });
    portrait.on('pointerdown', () => portrait.setScale(0.92));
    portrait.on('pointerout', () => portrait.setScale(1));
    portrait.on('pointerup', () => this.visit(portrait, animal));
    this.portraits.push(portrait);
  }

  private visit(portrait: Phaser.GameObjects.Container, animal: Animal): void {
    if (this.leaving) return;
    this.leaving = true;
    voice.unlock();
    voice.stop();
    this.tweens.add({
      targets: portrait,
      scale: 1.3,
      duration: 220,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => this.scene.start('feed', { animal: animal.id }),
    });
  }

  private resetIdle(): void {
    this.idleTimer?.remove();
    this.idleTimer = this.time.delayedCall(IDLE_MS, () => {
      if (this.leaving) return;
      if (voice.isSpeaking) {
        this.resetIdle();
        return;
      }
      // Подсказываем того зверя, у которого ещё нет наклейки.
      const target = this.portraits.find((p) => !settings.stickers.includes(p.getData('animal') as string)) ?? this.portraits[0];
      void voice.say('keeper.map_choose');
      if (target) {
        demoTap(this, target);
        this.tweens.add({ targets: target, scale: 1.12, duration: 300, yoyo: true, repeat: 3 });
      }
      this.resetIdle();
    });
  }
}
