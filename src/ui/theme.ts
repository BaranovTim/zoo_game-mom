/** Размер сцены: всё рисуется в этих координатах, Phaser вписывает их в экран. */
export const WIDTH = 1600;
export const HEIGHT = 1000;

export const COLORS = {
  ink: 0x263b35,
  green: 0x477b61,
  greenDark: 0x315a43,
  greenLight: 0xe5f2e6,
  cream: 0xfff9eb,
  peach: 0xffe4d5,
  gold: 0xf5cf68,
  line: 0xdce6d8,
  white: 0xffffff,
  sky: 0xc9e9ef,
  skyLow: 0xe8f5e9,
  grass: 0xb4d79b,
  grassDark: 0x8fbf7a,
  sun: 0xffdc7d,
  bamboo: 0x6fae5b,
  bambooDark: 0x4f8d45,
};

export const FONT = '"Trebuchet MS", "Arial Rounded MT Bold", system-ui, -apple-system, sans-serif';

export const INK = '#263b35';

/** Чёткий текст на экранах с высокой плотностью пикселей. */
export const TEXT_RESOLUTION = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
