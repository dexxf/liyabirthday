import Phaser from 'phaser'
import { Player } from '../entities/Player'
import { WORLD_HEIGHT, WORLD_WIDTH } from '../config'
import { Parallax } from '../systems/Parallax'
import { birthdayValley } from '../levels/birthdayValley'
import idleSheet from '../../assets/idle-removebg-preview.png'
import walkingSheet from '../../assets/walking-removebg-preview.png'
import jumpSheet from '../../assets/jump-removebg-preview.png'
import doubleJumpSheet from '../../assets/double_jump-removebg-preview.png'
import frontJumpSheet from '../../assets/e19521a4-6bfb-49af-89a1-2d776b9d2c5d-removebg-preview.png'
import cloudImage from '../../assets/background/cloud_transparent-removebg-preview.png'
import mainBackgroundImage from '../../assets/background/mainbackground.png'
import dirtLeftImage from '../../assets/background/tile-left.png'
import dirtMiddleImage from '../../assets/background/tile-middle.png'
import dirtRightImage from '../../assets/background/tile-right.png'

export class GameScene extends Phaser.Scene {
  private player!: Player
  private platforms!: Phaser.Physics.Arcade.StaticGroup
  private collectibles!: Phaser.Physics.Arcade.StaticGroup
  private score = 0
  private scoreText!: Phaser.GameObjects.Text
  private readonly parallax = new Parallax()

  public constructor() { super('GameScene') }

  public preload(): void {
    this.load.spritesheet('player-idle', idleSheet, { frameWidth: 133, frameHeight: 375 })
    this.load.spritesheet('player-walk', walkingSheet, { frameWidth: 150, frameHeight: 333 })
    this.load.spritesheet('player-jump', jumpSheet, { frameWidth: 165, frameHeight: 302 })
    this.load.spritesheet('player-double-jump', doubleJumpSheet, { frameWidth: 141, frameHeight: 353 })
    this.load.spritesheet('player-front-jump', frontJumpSheet, { frameWidth: 122, frameHeight: 408 })
    this.load.image('background-cloud', cloudImage)
    this.load.image('main-background', mainBackgroundImage)
    this.load.image('platform-block-left', dirtLeftImage)
    this.load.image('platform-block-middle', dirtMiddleImage)
    this.load.image('platform-block-right', dirtRightImage)
  }

  public create(): void {
    this.createTextures()
    this.createPlayerAnimations()
    this.createBackground()
    this.createLevel()
    this.createCollectibles()

    this.player = new Player(this, birthdayValley.playerSpawn.x, birthdayValley.playerSpawn.y)
    this.physics.add.collider(this.player, this.platforms)
    this.physics.add.overlap(this.player, this.collectibles, this.collectCollectible, undefined, this)
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08)
    this.cameras.main.setDeadzone(300, 160)
    this.scoreText = this.add.text(1110, 32, 'STARS 0 / 8', { fontFamily: 'Trebuchet MS', fontSize: '18px', color: '#fff8df' }).setScrollFactor(0).setOrigin(1, 0)
  }

  public update(): void {
    this.player.update()
    if (this.player.y > WORLD_HEIGHT + 100) this.respawnPlayer()
    this.parallax.update(this.cameras.main.scrollX)
  }

private createTextures(): void {
  const graphics = this.make.graphics({ x: 0, y: 0 })
  graphics.generateTexture('player-body', 100, 160)
  graphics.clear().fillStyle(0xffd05b).fillTriangle(16, 0, 32, 16, 16, 32).fillTriangle(0, 16, 16, 0, 16, 32)
  graphics.generateTexture('star', 32, 32)
  graphics.destroy()
}

  private createPlayerAnimations(): void {
    this.anims.create({ key: 'idle', frames: this.anims.generateFrameNumbers('player-idle', { start: 0, end: 4 }), frameRate: 5, repeat: -1 })
    this.anims.create({ key: 'walk', frames: this.anims.generateFrameNumbers('player-walk', { start: 0, end: 4 }), frameRate: 9, repeat: -1 })
    this.anims.create({ key: 'jump-rise', frames: this.anims.generateFrameNumbers('player-jump', { start: 0, end: 2 }), frameRate: 8, repeat: 0 })
    this.anims.create({ key: 'jump-fall', frames: this.anims.generateFrameNumbers('player-jump', { start: 3, end: 4 }), frameRate: 8, repeat: 0 })
    this.anims.create({ key: 'double-jump-rise', frames: this.anims.generateFrameNumbers('player-double-jump', { start: 0, end: 2 }), frameRate: 8, repeat: 0 })
    this.anims.create({ key: 'double-jump-fall', frames: this.anims.generateFrameNumbers('player-double-jump', { start: 3, end: 4 }), frameRate: 8, repeat: 0 })
    this.anims.create({ key: 'front-jump-rise', frames: this.anims.generateFrameNumbers('player-front-jump', { start: 0, end: 2 }), frameRate: 8, repeat: 0 })
    this.anims.create({ key: 'side-jump-rise-from-2', frames: this.anims.generateFrameNumbers('player-jump', { start: 1, end: 2 }), frameRate: 8, repeat: 0 })
    this.anims.create({ key: 'side-jump-fall-from-4', frames: this.anims.generateFrameNumbers('player-jump', { start: 3, end: 4 }), frameRate: 8, repeat: 0 })
    this.anims.create({ key: 'side-double-jump-rise-from-2', frames: this.anims.generateFrameNumbers('player-double-jump', { start: 1, end: 2 }), frameRate: 8, repeat: 0 })
    this.anims.create({ key: 'side-double-jump-fall-from-4', frames: this.anims.generateFrameNumbers('player-double-jump', { start: 3, end: 4 }), frameRate: 8, repeat: 0 })
  }

  private createBackground(): void {
    const panelWidth = 1350
    const backgroundShift = this.add.container(0, 0).setDepth(-11)
    for (let index = 0; index < Math.ceil(WORLD_WIDTH / panelWidth) + 1; index += 1) {
      const panel = this.add.image(index * panelWidth + panelWidth / 2, WORLD_HEIGHT / 2, 'main-background')
        .setDisplaySize(panelWidth, WORLD_HEIGHT)
        .setFlipX(index % 2 === 1)
      backgroundShift.add(panel)
    }

    for (let index = 0; index < 7; index += 1) {
      const x = Phaser.Math.Between(220, WORLD_WIDTH - 220)
      const y = Phaser.Math.Between(90, 290)
      const scale = Phaser.Math.FloatBetween(0.264, 0.6)
      const drift = Phaser.Math.Between(100, 260)
      const duration = Phaser.Math.Between(22000, 42000)
      const cloud = this.add.image(x, y, 'background-cloud')
        .setScale(scale)
        .setAlpha(Phaser.Math.FloatBetween(0.52, 0.92))
      this.tweens.add({
        targets: cloud,
        x: x + drift,
        duration,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
        delay: index * 1900,
      })
    }
  }

  private createLevel(): void {
    this.platforms = this.physics.add.staticGroup()
    const [ground, ...rest] = birthdayValley.platforms
    this.addPlatform(...ground, false)
    for (const [x, y, width, height] of rest) this.addPlatform(x, y, width, height)
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
  }

  private createCollectibles(): void {
    this.collectibles = this.physics.add.staticGroup()
    for (const { x, y } of birthdayValley.collectibles) {
      const star = this.collectibles.create(x, y, 'star') as Phaser.Physics.Arcade.Image
      star.setSize(26, 26).setOffset(3, 3)
      this.tweens.add({ targets: star, angle: 360, duration: 1800, repeat: -1, ease: 'Linear' })
    }
  }

  private collectCollectible(
    _player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
    collectible: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
  ): void {
    if ('destroy' in collectible && typeof collectible.destroy === 'function') collectible.destroy()
    this.score += 1
    this.scoreText.setText(`STARS ${this.score} / ${birthdayValley.collectibles.length}`)
  }

  private respawnPlayer(): void {
    this.player.setPosition(birthdayValley.playerSpawn.x, birthdayValley.playerSpawn.y)
    this.player.setVelocity(0, 0)
  }

private addPlatform(x: number, y: number, width: number, height: number, visible = true): void {
  const blockHeight = 32
  const blockWidth = 28 
  const columns = Math.max(2, Math.round(width / blockWidth))
  const rows = Math.ceil(height / blockHeight)

  if (visible) {
    const currentWidth = width / columns
    for (let row = 0; row < rows; row += 1) {
      const currentHeight = Math.min(blockHeight, height - row * blockHeight)
      for (let column = 0; column < columns; column += 1) {
        const textureKey =
          column === 0 ? 'platform-block-left' : column === columns - 1 ? 'platform-block-right' : 'platform-block-middle'
        this.add.image(
          x + column * currentWidth + currentWidth / 2,
          y - height / 2 + row * blockHeight + currentHeight / 2,
          textureKey,
        ).setDisplaySize(currentWidth, currentHeight)
      }
    }
  }

  const collisionTopOffset = 4 // small nudge below the grass-tip gaps; was 20, way overcorrected
  const collision = this.platforms.create(x + width / 2, y - height / 2 + collisionTopOffset + 4, 'platform-block-middle') as Phaser.Physics.Arcade.Image
  collision.setDisplaySize(width, 8).refreshBody()
  collision.setVisible(false)
}
}