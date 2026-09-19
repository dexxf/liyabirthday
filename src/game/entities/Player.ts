import Phaser from 'phaser'

export class Player extends Phaser.Physics.Arcade.Sprite {
  private readonly normalVisualScale = 0.5
  private readonly idleVisualScale = 0.44
  private readonly sideJumpVisualScale = 0.6184
  private readonly frontJumpVisualScale = 0.6084
  private readonly moveSpeed = 345
  private readonly jumpVelocity = -610
  private jumpsUsed = 0
  private currentAnimation = 'idle'
  private frozen = false
  private readonly visual: Phaser.GameObjects.Sprite
  private readonly controls: Phaser.Types.Input.Keyboard.CursorKeys
  private readonly wasd: Record<'up' | 'left' | 'down' | 'right', Phaser.Input.Keyboard.Key>

  public constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player-body')
    scene.add.existing(this)
    scene.physics.add.existing(this)
    this.controls = scene.input.keyboard!.createCursorKeys()
    this.wasd = scene.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<'up' | 'left' | 'down' | 'right', Phaser.Input.Keyboard.Key>
    // World bounds double as the invisible ceiling and side walls.
    this.setCollideWorldBounds(true)
    this.setVisible(false)
    const body = this.body as Phaser.Physics.Arcade.Body
    body.setSize(65, 150, true)
    this.visual = scene.add.sprite(x, y + 20, 'player-idle', 0).setScale(this.idleVisualScale).setDepth(4)
    this.visual.play(this.currentAnimation)
  }

  /** The animated sprite the scene tweens for the death effect. */
  public get visualSprite(): Phaser.GameObjects.Sprite {
    return this.visual
  }

  /** Locks out input without tearing down physics, so the player still rests on the ground. */
  public setFrozen(frozen: boolean): void {
    this.frozen = frozen
    if (!frozen) return
    const body = this.body as Phaser.Physics.Arcade.Body
    body.setVelocityX(0)
  }

  public get isFrozen(): boolean {
    return this.frozen
  }

  /** Puts the player back at a known-good spot with every bit of motion state cleared. */
  public respawnAt(x: number, y: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body
    this.setPosition(x, y)
    this.setVelocity(0, 0)
    body.setGravityY(0)
    this.jumpsUsed = 0
    this.visual.setFlipX(false).setAngle(0).setPosition(x, y + 20)
    this.currentAnimation = ''
    this.setAnimation('idle')
  }

  public update(): void {
    const body = this.body as Phaser.Physics.Arcade.Body

    // JustDown is read every frame even while frozen, so a key pressed during a
    // popup is consumed there instead of firing the instant control returns.
    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.controls.up) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.up) ||
      Phaser.Input.Keyboard.JustDown(this.controls.space!)

    const direction = this.frozen
      ? 0
      : Number(this.controls.right.isDown || this.wasd.right.isDown) -
        Number(this.controls.left.isDown || this.wasd.left.isDown)
    body.setVelocityX(direction * this.moveSpeed)

    if (direction !== 0) this.visual.setFlipX(direction < 0)
    if (body.blocked.down && body.velocity.y >= 0) this.jumpsUsed = 0

    if (!this.frozen && jumpPressed && (body.blocked.down || this.jumpsUsed < 2)) {
      body.setVelocityY(this.jumpVelocity)
      this.jumpsUsed += 1
    }

    body.setGravityY(body.velocity.y > 0 ? 340 : 0)
    this.visual.setPosition(this.x, this.y + 20)
    this.updateAnimation(body, direction)
  }

  private updateAnimation(body: Phaser.Physics.Arcade.Body, direction: number): void {
    if (!body.blocked.down) {
      const jumpType = this.jumpsUsed > 1 ? 'double-jump' : 'jump'
      if (direction === 0) {
        this.visual.setFlipX(false)
        this.setAnimation('front-jump-rise')
        return
      }

      this.setAnimation(`side-${jumpType}-${body.velocity.y > 0 ? 'fall' : 'rise'}-from-${body.velocity.y > 0 ? '4' : '2'}`)
      return
    }

    if (direction === 0) {
      this.visual.setFlipX(false)
      this.setAnimation('idle')
      return
    }
    this.setAnimation('walk')
  }

  private setAnimation(animation: string): void {
    if (this.currentAnimation === animation) return
    this.currentAnimation = animation
    const isSideJump = animation !== 'idle' && animation !== 'walk' && animation !== 'front-jump-rise'
    this.visual.setScale(
      animation === 'idle'
        ? this.idleVisualScale
        : animation === 'front-jump-rise'
          ? this.frontJumpVisualScale
          : isSideJump
            ? this.sideJumpVisualScale
            : this.normalVisualScale,
    )
    this.visual.play(animation)
  }
}