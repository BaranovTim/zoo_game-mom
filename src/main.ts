import Phaser from 'phaser';
import { AlbumScene } from './scenes/AlbumScene';
import { BootScene } from './scenes/BootScene';
import { CareScene } from './scenes/CareScene';
import { FeedScene } from './scenes/FeedScene';
import { MapScene } from './scenes/MapScene';
import { PuzzleScene } from './scenes/PuzzleScene';
import { TimeUpScene } from './scenes/TimeUpScene';
import { TitleScene } from './scenes/TitleScene';
import { HEIGHT, WIDTH } from './ui/theme';

declare global {
  interface Window {
    /** Только в режиме разработки: доступ к игре для автотестов в браузере. */
    zooGame?: Phaser.Game;
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#e8f5e9',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: WIDTH,
    height: HEIGHT,
  },
  input: { activePointers: 2 },
  // Одна текстура на пакет отрисовки. С пакетами на несколько текстур повёрнутые листья, сердечки
  // и кусочки пазла рисовались с дырами (проверено в Chromium с программным WebGL).
  // Объектов на экране мало, лишние вызовы отрисовки незаметны даже на слабом планшете.
  render: { maxTextures: 1 },
  scene: [BootScene, TitleScene, MapScene, AlbumScene, FeedScene, CareScene, PuzzleScene, TimeUpScene],
});

if (import.meta.env.DEV) window.zooGame = game;
