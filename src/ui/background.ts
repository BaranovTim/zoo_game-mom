import Phaser from 'phaser';
import type { ZoneId } from '../data/animals';
import { COLORS, HEIGHT, WIDTH } from './theme';

const HORIZON = 560;

/** Фон вольера, нарисованный фигурами. Пока у всех зон общий, у Азии — бамбук. */
export function drawEnclosure(scene: Phaser.Scene, zone: ZoneId): void {
  const g = scene.add.graphics().setDepth(-10);

  g.fillGradientStyle(COLORS.sky, COLORS.sky, COLORS.skyLow, COLORS.skyLow, 1);
  g.fillRect(0, 0, WIDTH, HORIZON);

  g.fillStyle(COLORS.sun, 0.25);
  g.fillCircle(1150, 190, 110);
  g.fillStyle(COLORS.sun, 1);
  g.fillCircle(1150, 190, 72);

  drawCloud(g, 260, 170, 1);
  drawCloud(g, 820, 110, 0.7);

  g.fillStyle(COLORS.grass, 1);
  g.fillRect(0, HORIZON, WIDTH, HEIGHT - HORIZON);
  g.fillStyle(COLORS.grassDark, 0.45);
  g.fillEllipse(WIDTH / 2, HORIZON + 210, 980, 220);

  if (zone === 'asia') {
    drawBamboo(g, 120, HORIZON + 120, 520);
    drawBamboo(g, 200, HORIZON + 140, 430);
    drawBamboo(g, 1420, HORIZON + 120, 500);
    drawBamboo(g, 1500, HORIZON + 140, 410);
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
