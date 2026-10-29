import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { FeedScene } from './scenes/FeedScene';
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
  scene: [BootScene, TitleScene, FeedScene],
});

if (import.meta.env.DEV) window.zooGame = game;
