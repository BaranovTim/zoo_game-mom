import Phaser from 'phaser';
import { FONT, TEXT_RESOLUTION } from './theme';

interface Point {
  x: number;
  y: number;
}

function makeHand(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Text {
  return scene.add
    .text(x + 30, y + 70, '👆', { fontFamily: FONT, fontSize: '90px', resolution: TEXT_RESOLUTION })
    .setOrigin(0.5)
    .setDepth(961);
}

/** Рука показывает, как перетащить предмет; полупрозрачная копия предмета едет вместе с ней. */
export function demoDrag(scene: Phaser.Scene, from: Point, to: Point, ghost?: { texture: string; scale: number }): void {
  const hand = makeHand(scene, from.x, from.y);
  const targets: Phaser.GameObjects.GameObject[] = [];
  if (ghost) {
    const copy = scene.add.image(from.x, from.y, ghost.texture).setScale(ghost.scale).setAlpha(0.7).setDepth(960);
    scene.tweens.add({
      targets: copy,
      x: to.x,
      y: to.y,
      duration: 1300,
      ease: 'Sine.easeInOut',
      repeat: 1,
      repeatDelay: 250,
      onComplete: () => copy.destroy(),
    });
    targets.push(copy);
  }
  scene.tweens.add({
    targets: hand,
    x: to.x + 30,
    y: to.y + 70,
    duration: 1300,
    ease: 'Sine.easeInOut',
    repeat: 1,
    repeatDelay: 250,
    onComplete: () => hand.destroy(),
  });
}

/** Рука показывает, куда нажать: подлетает и дважды «нажимает». */
export function demoTap(scene: Phaser.Scene, target: Point): void {
  const hand = makeHand(scene, target.x + 160, target.y + 160);
  scene.tweens.chain({
    targets: hand,
    tweens: [
      { x: target.x + 30, y: target.y + 70, duration: 600, ease: 'Sine.easeOut' },
      { scale: 0.85, duration: 160, yoyo: true, repeat: 2 },
      { alpha: 0, duration: 300 },
    ],
    onComplete: () => hand.destroy(),
  });
}

/** Рука проводит туда-обратно по зверю: так показываем, как мыть и причёсывать. */
export function demoRub(scene: Phaser.Scene, center: Point, tool?: { texture: string; scale: number }): void {
  const hand = makeHand(scene, center.x - 120, center.y);
  const items: Phaser.GameObjects.GameObject[] = [hand];
  let copy: Phaser.GameObjects.Image | undefined;
  if (tool) {
    copy = scene.add.image(center.x - 150, center.y - 70, tool.texture).setScale(tool.scale).setAlpha(0.8).setDepth(960);
    items.push(copy);
  }
  scene.tweens.add({
    targets: copy ? [hand, copy] : hand,
    x: '+=240',
    duration: 450,
    yoyo: true,
    repeat: 2,
    ease: 'Sine.easeInOut',
    onComplete: () => items.forEach((item) => item.destroy()),
  });
}
