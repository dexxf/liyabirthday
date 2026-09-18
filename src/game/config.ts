import Phaser from 'phaser'
import { GameScene } from './scenes/GameScene'

export const WORLD_WIDTH = 4800
export const WORLD_HEIGHT = 900

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  backgroundColor: '#86c7df',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 1250 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  scene: [GameScene],
}