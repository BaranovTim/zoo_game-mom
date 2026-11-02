import Phaser from 'phaser';
import type { ZoneId } from '../data/animals';
import { COLORS, HEIGHT, WIDTH } from './theme';

const HORIZON = 560;

export interface EnclosureOptions {
  /** Рисовать ли солнце. В игре «уложи спать» солнце отдельное: его выключают нажатием. */
  sun?: boolean;
}

interface Palette {
  skyTop: number;
  skyLow: number;
  ground: number;
  groundDark: number;
}

const PALETTES: Record<ZoneId, Palette> = {
  savanna: { skyTop: 0xcfe8ef, skyLow: 0xfbf1d6, ground: 0xe6cf86, groundDark: 0xcfb468 },
  asia: { skyTop: COLORS.sky, skyLow: COLORS.skyLow, ground: COLORS.grass, groundDark: COLORS.grassDark },
  rainforest: { skyTop: 0xbfdfd8, skyLow: 0xdcefe2, ground: 0x93c486, groundDark: 0x6fa865 },
  forest: { skyTop: COLORS.sky, skyLow: 0xeef6ea, ground: 0xa9cf8f, groundDark: 0x86b671 },
  north: { skyTop: 0xcfe4f2, skyLow: 0xf2f8fc, ground: 0xf4f9fc, groundDark: 0xd6e8f2 },
  lake: { skyTop: COLORS.sky, skyLow: 0xeaf6f4, ground: 0xb7d99f, groundDark: 0x94c27f },
  australia: { skyTop: 0xcde8f2, skyLow: 0xfbeedd, ground: 0xebb98a, groundDark: 0xd99c68 },
};

/** Фон вольера, нарисованный фигурами: у каждой зоны свои цвета и приметы. */
export function drawEnclosure(scene: Phaser.Scene, zone: ZoneId, options: EnclosureOptions = {}): void {
  const p = PALETTES[zone];
  const g = scene.add.graphics().setDepth(-10);

  g.fillGradientStyle(p.skyTop, p.skyTop, p.skyLow, p.skyLow, 1);
  g.fillRect(0, 0, WIDTH, HORIZON);

  if (options.sun !== false) {
    g.fillStyle(COLORS.sun, 0.25);
    g.fillCircle(1150, 190, 110);
    g.fillStyle(COLORS.sun, 1);
    g.fillCircle(1150, 190, 72);
  }

  drawCloud(g, 260, 170, 1);
  drawCloud(g, 820, 110, 0.7);

  if (zone === 'north') {
    g.fillStyle(0xdbe9f3, 1);
    g.fillTriangle(-40, HORIZON, 260, HORIZON - 230, 560, HORIZON);
    g.fillTriangle(1080, HORIZON, 1360, HORIZON - 190, 1660, HORIZON);
    g.fillStyle(COLORS.white, 1);
    g.fillTriangle(200, HORIZON - 175, 260, HORIZON - 230, 320, HORIZON - 175);
    g.fillTriangle(1310, HORIZON - 145, 1360, HORIZON - 190, 1410, HORIZON - 145);
  }

  g.fillStyle(p.ground, 1);
  g.fillRect(0, HORIZON, WIDTH, HEIGHT - HORIZON);
  g.fillStyle(p.groundDark, 0.45);
  g.fillEllipse(WIDTH / 2, HORIZON + 210, 980, 220);

  if (zone === 'asia') {
    drawBamboo(g, 120, HORIZON + 120, 520);
    drawBamboo(g, 200, HORIZON + 140, 430);
    drawBamboo(g, 1420, HORIZON + 120, 500);
    drawBamboo(g, 1500, HORIZON + 140, 410);
  }
  if (zone === 'savanna') {
    drawAcacia(g, 190, HORIZON + 60, 1);
    drawAcacia(g, 1440, HORIZON + 40, 0.8);
  }
  if (zone === 'forest') {
    drawFir(g, 110, HORIZON + 110, 1.1);
    drawFir(g, 250, HORIZON + 70, 0.85);
    drawFir(g, 1380, HORIZON + 90, 1);
    drawFir(g, 1510, HORIZON + 120, 1.15);
    drawMushroom(g, 330, HORIZON + 300);
    drawMushroom(g, 1290, HORIZON + 330);
  }
  if (zone === 'north') {
    g.fillStyle(0xbfe0f0, 1);
    g.fillEllipse(220, HORIZON + 260, 300, 70);
    g.fillEllipse(1380, HORIZON + 300, 340, 80);
  }
  if (zone === 'lake') {
    g.fillStyle(0x8cc6e6, 1);
    g.fillEllipse(220, HORIZON + 150, 420, 130);
    g.fillEllipse(1420, HORIZON + 170, 380, 120);
    g.fillStyle(COLORS.white, 0.6);
    g.fillEllipse(180, HORIZON + 135, 120, 14);
    g.fillEllipse(1450, HORIZON + 155, 110, 12);
    drawReeds(g, 420, HORIZON + 150);
    drawReeds(g, 1210, HORIZON + 170);
  }
  if (zone === 'australia') {
    g.fillStyle(0xc9875a, 1);
    g.fillEllipse(260, HORIZON, 380, 90);
    g.fillEllipse(1380, HORIZON, 320, 70);
    drawAcacia(g, 1450, HORIZON + 50, 0.75);
  }
}

function drawCloud(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number): void {
  g.fillStyle(COLORS.white, 0.85);
  g.fillCircle(x, y, 46 * s);
  g.fillCircle(x + 50 * s, y - 18 * s, 56 * s);
  g.fillCircle(x + 110 * s, y, 44 * s);
  g.fillRoundedRect(x - 40 * s, y, 190 * s, 44 * s, 22 * s);
}

function drawBamboo(g: Phaser.GameObjects.Graphics, x: number, bottom: number, height: number): void {
  const segment = 86;
  for (let y = bottom; y > bottom - height; y -= segment) {
    g.fillStyle(COLORS.bamboo, 1);
    g.fillRoundedRect(x - 14, y - segment + 6, 28, segment - 6, 10);
    g.fillStyle(COLORS.bambooDark, 1);
    g.fillRect(x - 16, y - 6, 32, 8);
  }
  g.fillStyle(COLORS.bambooDark, 0.9);
  const top = bottom - height;
  g.fillEllipse(x + 46, top + 40, 90, 26);
  g.fillEllipse(x - 44, top + 90, 86, 24);
  g.fillEllipse(x + 40, top + 170, 80, 22);
}

/** Зонтичная акация саванны. */
function drawAcacia(g: Phaser.GameObjects.Graphics, x: number, bottom: number, s: number): void {
  g.fillStyle(0x8a6a3c, 1);
  g.fillRect(x - 10 * s, bottom - 260 * s, 20 * s, 260 * s);
  g.fillTriangle(x, bottom - 200 * s, x - 70 * s, bottom - 290 * s, x - 50 * s, bottom - 300 * s);
  g.fillStyle(0x7fae5a, 1);
  g.fillEllipse(x, bottom - 300 * s, 300 * s, 70 * s);
  g.fillEllipse(x - 70 * s, bottom - 320 * s, 160 * s, 50 * s);
  g.fillEllipse(x + 80 * s, bottom - 318 * s, 170 * s, 50 * s);
}

function drawFir(g: Phaser.GameObjects.Graphics, x: number, bottom: number, s: number): void {
  g.fillStyle(0x7a5a3a, 1);
  g.fillRect(x - 12 * s, bottom - 50 * s, 24 * s, 50 * s);
  g.fillStyle(0x4d8a52, 1);
  for (let i = 0; i < 3; i++) {
    const base = bottom - 40 * s - i * 95 * s;
    const half = (120 - i * 28) * s;
    g.fillTriangle(x - half, base, x + half, base, x, base - 150 * s);
  }
}

function drawMushroom(g: Phaser.GameObjects.Graphics, x: number, bottom: number): void {
  g.fillStyle(0xf6ead2, 1);
  g.fillRoundedRect(x - 12, bottom - 40, 24, 40, 8);
  g.fillStyle(0xa0522d, 1);
  g.fillEllipse(x, bottom - 42, 70, 36);
}

function drawReeds(g: Phaser.GameObjects.Graphics, x: number, bottom: number): void {
  g.fillStyle(0x6f9a4f, 1);
  for (let i = 0; i < 4; i++) g.fillRect(x + i * 16, bottom - 120 - (i % 2) * 30, 6, 120 + (i % 2) * 30);
  g.fillStyle(0x7a5230, 1);
  for (let i = 0; i < 4; i++) g.fillEllipse(x + 3 + i * 16, bottom - 120 - (i % 2) * 30, 14, 40);
}
