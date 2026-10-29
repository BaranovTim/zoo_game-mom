import Phaser from 'phaser';
import { COLORS, FONT, INK, TEXT_RESOLUTION } from './theme';

export interface RoundButtonOptions {
  radius?: number;
  fill?: number;
  iconSize?: number;
}

/** Круглая кнопка с картинкой-эмодзи: ребёнку не нужно читать. */
export function roundButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  icon: string,
  onTap: () => void,
  options: RoundButtonOptions = {},
): Phaser.GameObjects.Container {
  const radius = options.radius ?? 56;
  const fill = options.fill ?? COLORS.white;
  const shadow = scene.add.circle(0, 6, radius, COLORS.ink, 0.12);
  const circle = scene.add.circle(0, 0, radius, fill).setStrokeStyle(4, COLORS.line);
  const label = scene.add
    .text(0, 2, icon, { fontFamily: FONT, fontSize: `${options.iconSize ?? Math.round(radius * 0.95)}px`, color: INK, resolution: TEXT_RESOLUTION })
    .setOrigin(0.5);
  const button = scene.add.container(x, y, [shadow, circle, label]);
  button.setSize(radius * 2, radius * 2);
  button.setInteractive({ useHandCursor: true });
  button.on('pointerdown', () => button.setScale(0.92));
  button.on('pointerout', () => button.setScale(1));
  button.on('pointerup', () => {
    button.setScale(1);
    onTap();
  });
  return button;
}

/** Кнопка с надписью — только для экранов взрослых. */
export function textButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  onTap: () => void,
  selected = false,
): Phaser.GameObjects.Container {
  const label = scene.add
    .text(0, 0, text, {
      fontFamily: FONT,
      fontSize: '34px',
      fontStyle: 'bold',
      color: selected ? '#ffffff' : INK,
      resolution: TEXT_RESOLUTION,
    })
    .setOrigin(0.5);
  const width = Math.max(140, label.width + 56);
  const box = scene.add.graphics();
  box.fillStyle(selected ? COLORS.green : COLORS.white, 1);
  box.fillRoundedRect(-width / 2, -40, width, 80, 22);
  box.lineStyle(3, selected ? COLORS.greenDark : COLORS.line, 1);
  box.strokeRoundedRect(-width / 2, -40, width, 80, 22);
  const button = scene.add.container(x, y, [box, label]);
  button.setSize(width, 80);
  button.setInteractive({ useHandCursor: true });
  button.on('pointerup', onTap);
  return button;
}
