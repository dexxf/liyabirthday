// Chest.ts

import Phaser from 'phaser'

export type ChestReward = {
  title: string
  imageUrl: string
  caption: string
  music?: string
}

/**
 * A chest is decoration plus a proximity test - it has no physics body at all,
 * so it can never push the player around or interfere with platform collision.
 * The only way it opens is GameScene calling open() after an E keypress while
 * isPlayerInRange() is true.
 */
export class Chest {
  private static readonly HORIZONTAL_RANGE = 115
  private static readonly RANGE_ABOVE = 185
  private static readonly RANGE_BELOW = 35

  private readonly scene: Phaser.Scene
  private readonly sprite: Phaser.GameObjects.Image
  private readonly prompt: Phaser.GameObjects.Container

  private opened = false

  public readonly reward: ChestReward

  public constructor(
    scene: Phaser.Scene,
    x: number,
    surfaceY: number,
    reward: ChestReward,
  ) {
    this.scene = scene
    this.reward = reward

    this.sprite = scene.add
      .image(x, surfaceY + 2, 'chest-closed')
      .setOrigin(0.5, 1)
      .setDepth(3)

    this.prompt = this.buildPrompt(x, surfaceY - 74)
  }

  public get x(): number {
    return this.sprite.x
  }

  public get surfaceY(): number {
    return this.sprite.y - 2
  }

  public get isOpened(): boolean {
    return this.opened
  }

  public isPlayerInRange(playerX: number, playerY: number): boolean {
    if (Math.abs(playerX - this.x) > Chest.HORIZONTAL_RANGE) {
      return false
    }

    return (
      playerY >= this.surfaceY - Chest.RANGE_ABOVE &&
      playerY <= this.surfaceY + Chest.RANGE_BELOW
    )
  }

  public setPromptVisible(visible: boolean): void {
    this.prompt.setVisible(visible)
  }

  public open(): void {
    if (this.opened) return

    this.opened = true
    this.setPromptVisible(false)
    this.sprite.setTexture('chest-open')

    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.12,
      scaleY: 0.9,
      duration: 110,
      yoyo: true,
      ease: 'Quad.easeOut',
    })

    for (let index = 0; index < 6; index += 1) {
      const spark = this.scene.add
        .image(this.x, this.surfaceY - 34, 'star')
        .setScale(0.5)
        .setDepth(6)

      this.scene.tweens.add({
        targets: spark,
        x: this.x + Phaser.Math.Between(-70, 70),
        y: this.surfaceY - Phaser.Math.Between(70, 130),
        alpha: 0,
        scale: 0.1,
        angle: Phaser.Math.Between(-220, 220),
        duration: Phaser.Math.Between(420, 700),
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy(),
      })
    }
  }

  private buildPrompt(
    x: number,
    y: number,
  ): Phaser.GameObjects.Container {
    const label = this.scene.add
      .text(0, 0, 'Press E to open', {
        fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
        fontSize: '19px',
        color: '#fff6da',
      })
      .setOrigin(0.5)

    const width = label.width + 28
    const height = 34

    const plate = this.scene.add.graphics()

    plate
      .fillStyle(0x3b2412, 0.92)
      .fillRoundedRect(
        -width / 2,
        -height / 2,
        width,
        height,
        10,
      )

    plate
      .lineStyle(3, 0xe0b53a, 1)
      .strokeRoundedRect(
        -width / 2,
        -height / 2,
        width,
        height,
        10,
      )

    const container = this.scene.add
      .container(x, y, [plate, label])
      .setDepth(20)
      .setVisible(false)

    this.scene.tweens.add({
      targets: container,
      y: y - 7,
      duration: 950,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    return container
  }
}