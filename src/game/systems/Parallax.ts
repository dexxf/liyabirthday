import Phaser from 'phaser'

export type ParallaxLayer = { object: Phaser.GameObjects.GameObject; factor: number }

export class Parallax {
  private readonly layers: ParallaxLayer[] = []

  public add(object: Phaser.GameObjects.GameObject, factor: number): void {
    this.layers.push({ object, factor })
  }

  public update(cameraX: number): void {
    for (const layer of this.layers) {
      const image = layer.object as Phaser.GameObjects.TileSprite
      if ('tilePositionX' in image) image.tilePositionX = cameraX * layer.factor
    }
  }
}