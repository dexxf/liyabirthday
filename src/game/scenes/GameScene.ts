import Phaser from 'phaser'
import { Player } from '../entities/Player'
import { Chest } from '../entities/Chest'
import { WORLD_HEIGHT, WORLD_WIDTH } from '../config'
import { Parallax } from '../systems/Parallax'
import { MusicPlayer } from '../systems/MusicPlayer'
import { RewardPopup } from '../ui/RewardPopup'
import { birthdayValley, groundHazards, GROUND_SURFACE_Y } from '../levels/birthdayValley'
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

// ===========================================================================
// CHEST REWARD IMAGES - the two lines below are the only place these live.
// They are compiled straight into the bundle by Vite; there is no path to
// configure at runtime and no empty slot. Swap these two imports for your own
// artwork and the popups pick it up with no other change.
// ===========================================================================
import groundChestImage from '../../assets/background/image.jpg'
import summitChestImage from '../../assets/background/wallpaperdaw.jpg'

// Chest songs. Imported (not plain string paths) so Vite bundles them and gives
// them the correct URL in both dev and production builds.
import renemamaAudio from '../../assets/music/renemama.mp3'
import reneAudio from '../../assets/music/renepagasangpilipinas.mp3'
import bigDreamAudio from '../../assets/music/bigdream.mp3'

// Main background music that loops for the whole game (see MusicPlayer).
import backgroundMusic from '../../assets/music/background.mp3'

const DEATH_SONG_KEY = 'renemama'
const GROUND_CHEST_SONG_KEY = 'renepagasangpilipinas'
const SUMMIT_CHEST_SONG_KEY = 'bigdream'

export class GameScene extends Phaser.Scene {
  private player!: Player
  private platforms!: Phaser.Physics.Arcade.StaticGroup
  private hazards!: Phaser.Physics.Arcade.StaticGroup
  private chests: Chest[] = []
  private interactKey!: Phaser.Input.Keyboard.Key
  private isDying = false
  private chestSound: Phaser.Sound.BaseSound | null = null
  private readonly parallax = new Parallax()
  private readonly popup = new RewardPopup()
  private readonly music = new MusicPlayer(backgroundMusic)

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
    this.load.audio(DEATH_SONG_KEY, renemamaAudio)
    this.load.audio(GROUND_CHEST_SONG_KEY, reneAudio)
    this.load.audio(SUMMIT_CHEST_SONG_KEY, bigDreamAudio)

    // If a song can't be fetched or decoded, say so in the console instead of
    // failing silently.
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.error(`Could not load "${file.key}" from ${String(file.url)}`)
    })
  }

  public create(): void {
    this.createTextures()
    this.createPlayerAnimations()
    this.createBackground()
    this.createLevel()
    this.createHazards()

    this.player = new Player(this, birthdayValley.playerSpawn.x, birthdayValley.playerSpawn.y)
    this.physics.add.collider(this.player, this.platforms, undefined, this.canLandOnPlatform, this)
    this.physics.add.overlap(this.player, this.hazards, this.handleDeath, undefined, this)
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08)
    this.cameras.main.setDeadzone(300, 160)

    this.createChests()
    this.startMusicOnFirstInput()

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.sound.stopByKey(DEATH_SONG_KEY)
      this.sound.stopByKey(GROUND_CHEST_SONG_KEY)
      this.sound.stopByKey(SUMMIT_CHEST_SONG_KEY)
      this.popup.close()
      this.music.destroy()
    })
  }

  public update(): void {
    this.player.update()
    if (!this.isDying && this.player.y > WORLD_HEIGHT + 100) this.handleDeath()
    this.parallax.update(this.cameras.main.scrollX)
    this.updateChestInteraction()
  }

  private createTextures(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 })
    graphics.generateTexture('player-body', 100, 160)
    graphics.destroy()
    this.createChestTextures()
    this.createStarTexture()
    this.createHazardTexture()
  }

  // Chests, spikes and stars are drawn in code with the same chunky outlines
  // and warm dirt palette as the existing tiles, so nothing needs new art.
  private createChestTextures(): void {
    const dark = 0x4a2c12
    const wood = 0x8b5a2b
    const woodLight = 0xa9702f
    const gold = 0xe0b53a
    const goldDark = 0x9c7a1a

    const closed = this.make.graphics({ x: 0, y: 0 })
    closed.fillStyle(dark).fillRect(2, 8, 48, 36)
    closed.fillStyle(woodLight).fillRect(5, 11, 42, 11)
    closed.fillStyle(wood).fillRect(5, 25, 42, 16)
    closed.fillStyle(dark).fillRect(5, 22, 42, 3)
    closed.fillStyle(gold).fillRect(22, 11, 8, 30)
    closed.fillStyle(goldDark).fillRect(20, 27, 12, 9)
    closed.fillStyle(dark).fillRect(24, 30, 4, 4)
    closed.generateTexture('chest-closed', 52, 46)
    closed.destroy()

    const open = this.make.graphics({ x: 0, y: 0 })
    open.fillStyle(dark).fillRect(2, 0, 48, 15)
    open.fillStyle(woodLight).fillRect(5, 3, 42, 10)
    open.fillStyle(gold).fillRect(22, 3, 8, 10)
    open.fillStyle(0x2a1708).fillRect(4, 17, 44, 12)
    open.fillStyle(0xfff3b0).fillRect(8, 19, 36, 9)
    open.fillStyle(0xffffff).fillRect(13, 21, 26, 4)
    open.fillStyle(dark).fillRect(2, 26, 48, 26)
    open.fillStyle(wood).fillRect(5, 29, 42, 20)
    open.fillStyle(gold).fillRect(22, 29, 8, 20)
    open.fillStyle(goldDark).fillRect(20, 33, 12, 9)
    open.generateTexture('chest-open', 52, 52)
    open.destroy()
  }

  // The sparks that burst out of a chest (see Chest.open) use this texture.
  private createStarTexture(): void {
    const buildPoints = (radiusScale: number): Phaser.Math.Vector2[] => {
      const centre = 16
      const outer = 15 * radiusScale
      const inner = 6.5 * radiusScale
      const points: Phaser.Math.Vector2[] = []
      for (let index = 0; index < 10; index += 1) {
        const radius = index % 2 === 0 ? outer : inner
        const angle = -Math.PI / 2 + (index * Math.PI) / 5
        points.push(new Phaser.Math.Vector2(centre + Math.cos(angle) * radius, centre + Math.sin(angle) * radius))
      }
      return points
    }

    const star = this.make.graphics({ x: 0, y: 0 })
    star.fillStyle(0x4a2c12).fillPoints(buildPoints(1), true)
    star.fillStyle(0xffe680).fillPoints(buildPoints(0.72), true)
    star.generateTexture('star', 32, 32)
    star.destroy()
  }

  private createHazardTexture(): void {
    const spike = this.make.graphics({ x: 0, y: 0 })

    const tip = new Phaser.Math.Vector2(16, 0)

    spike.fillStyle(0x3a3f47)

    spike.fillPoints([
      new Phaser.Math.Vector2(0, 28),
      tip,
      new Phaser.Math.Vector2(32, 28),
    ], true)

    spike.fillStyle(0x8a94a3)

    spike.fillPoints([
      tip,
      new Phaser.Math.Vector2(7, 28),
      new Phaser.Math.Vector2(16, 28),
    ], true)

    spike.fillStyle(0xd7dee8)

    spike.fillPoints([
      tip,
      new Phaser.Math.Vector2(12, 28),
      new Phaser.Math.Vector2(16, 28),
    ], true)

    spike.fillStyle(0x4a2c12).fillRect(0, 26, 32, 4)

    spike.generateTexture('spike', 32, 30)
    spike.destroy()
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
    for (const [x, y, width, height] of rest) {
      const largerWidth = width * 1.1
      const largerHeight = height * 1.1
      this.addPlatform(x - (largerWidth - width) / 2, y + (largerHeight - height) / 2, largerWidth, largerHeight)
    }
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    // Left, right and top stay solid. The bottom is left open: the player has
    // setCollideWorldBounds(true), which would otherwise clamp them at the floor
    // of the world and stop update() from ever seeing them fall past it.
    this.physics.world.setBoundsCollision(true, true, true, false)
  }

  // Spikes follow the same pattern as the platforms: a drawn image for looks
  // plus a smaller invisible body, so clipping the outer edge of a spike does
  // not read as an unfair kill.
  private createHazards(): void {
    this.hazards = this.physics.add.staticGroup()
    const spikeWidth = 32
    for (const { x, count } of groundHazards) {
      for (let index = 0; index < count; index += 1) {
        const spikeX = x + index * spikeWidth + spikeWidth / 2
        this.add.image(spikeX, GROUND_SURFACE_Y + 2, 'spike').setOrigin(0.5, 1).setDepth(1)
        const hitbox = this.hazards.create(spikeX, GROUND_SURFACE_Y - 9, 'spike') as Phaser.Physics.Arcade.Image
        hitbox.setDisplaySize(20, 18).refreshBody()
        hitbox.setVisible(false)
      }
    }
  }

  private createChests(): void {
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E)

    this.chests = [
      new Chest(
        this,
        birthdayValley.groundChest.x,
        birthdayValley.groundChest.surfaceY,
        {
          title: 'tinulugan ako walangya',
          imageUrl: groundChestImage,
          caption: '',
          music: GROUND_CHEST_SONG_KEY,
        },
      ),

      new Chest(
        this,
        birthdayValley.summitChest.x,
        birthdayValley.summitChest.surfaceY,
        {
          title: 'wallpaper rene baterbonia',
          imageUrl: summitChestImage,
          caption: 'gift for u :),,,, welcome!',
          music: SUMMIT_CHEST_SONG_KEY,
        },
      ),
    ]
  }

  private startMusicOnFirstInput(): void {
    const begin = (): void => this.music.start()
    this.input.keyboard!.once('keydown', begin)
    this.input.once('pointerdown', begin)
  }

  private updateChestInteraction(): void {
    const interactPressed = Phaser.Input.Keyboard.JustDown(this.interactKey)
    const canInteract = !this.popup.isOpen && !this.isDying

    let target: Chest | null = null

    for (const chest of this.chests) {
      const inRange =
        canInteract &&
        !chest.isOpened &&
        chest.isPlayerInRange(this.player.x, this.player.y)

      chest.setPromptVisible(inRange)

      if (inRange && !target) {
        target = chest
      }
    }

    if (!target || !interactPressed) return

    target.open()

    if (target.reward.music) {
      this.playSong(target.reward.music)
    }

    this.player.setFrozen(true)

    this.popup.open(target.reward, () => {
      if (!this.isDying) {
        this.player.setFrozen(false)
      }
    })
  }

  // Plays a song on top of the synthesised background loop (used by chests and
  // by death). The loop is ducked while the song plays and eased back in when
  // the song finishes.
  private playSong(key: string): void {
    if (!this.cache.audio.exists(key)) {
      console.warn(`Song "${key}" was not loaded.`)
      return
    }

    // If another song is still playing (or the same one, e.g. dying twice in a
    // row), cut it off so songs never stack on top of each other.
    if (this.chestSound) {
      this.chestSound.stop()
      this.chestSound.destroy()
      this.chestSound = null
    }

    if (this.sound.locked) {
      console.warn(`Audio is still locked by the browser, "${key}" will start after the next click or key press.`)
    }

    this.music.duck()

    const sound = this.sound.add(key)
    this.chestSound = sound
    sound.once(Phaser.Sound.Events.COMPLETE, () => {
      this.music.restore()
      sound.destroy()
      if (this.chestSound === sound) this.chestSound = null
    })
    sound.play()
  }

  // Death never reloads anything: the player is frozen, played out, moved back
  // to spawn and handed control again. Music, stars and opened chests persist.
  private handleDeath(): void {
    if (this.isDying || this.popup.isOpen) return
    this.isDying = true
    this.player.setFrozen(true)
    this.playSong(DEATH_SONG_KEY)
    this.cameras.main.shake(170, 0.008)
    this.cameras.main.flash(130, 255, 110, 90)

    const visual = this.player.visualSprite
    this.tweens.add({
      targets: visual,
      alpha: 0,
      angle: 160,
      duration: 260,
      ease: 'Quad.easeIn',
      onComplete: () => this.respawnPlayer(),
    })
  }

  private respawnPlayer(): void {
    // respawnAt clears velocity and gravity, and the spawn runway is kept free
    // of spikes, so the player can never come back inside a hazard.
    this.player.respawnAt(birthdayValley.playerSpawn.x, birthdayValley.playerSpawn.y)
    const visual = this.player.visualSprite
    visual.setAlpha(0)
    this.cameras.main.flash(120, 255, 255, 255)
    this.tweens.add({
      targets: visual,
      alpha: 1,
      duration: 220,
      onComplete: () => {
        this.isDying = false
        if (!this.popup.isOpen) this.player.setFrozen(false)
      },
    })
  }

  private canLandOnPlatform(
    playerObject: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
    platformObject: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
  ): boolean {
    const playerBody = this.getArcadeBody(playerObject) as Phaser.Physics.Arcade.Body
    const platformBody = this.getArcadeBody(platformObject) as Phaser.Physics.Arcade.StaticBody

    // Only resolve the collision when the player's feet crossed the platform's
    // top while moving downward. This prevents side and underside catches.
    if (playerBody.velocity.y < 0) return false

    const previousBottom = playerBody.prev.y + playerBody.height
    return previousBottom <= platformBody.top + 1 && playerBody.bottom >= platformBody.top
  }

  private getArcadeBody(
    object: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
  ): Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody {
    if (object instanceof Phaser.Physics.Arcade.Body || object instanceof Phaser.Physics.Arcade.StaticBody) return object
    if ('body' in object) return object.body as Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody
    throw new Error('Arcade collision callback received an object without a physics body')
  }

  private addPlatform(x: number, y: number, width: number, height: number, visible = true): void {
    const blockHeight = 32
    const blockWidth = 28
    const columns = Math.max(2, Math.round(width / blockWidth))
    // Use whole, evenly sized rows so a slightly enlarged platform does not
    // end with a clipped sliver of a tile.
    const rows = Math.max(1, Math.round(height / blockHeight))

    if (visible) {
      const currentWidth = width / columns
      const currentHeight = height / rows
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const textureKey =
            column === 0 ? 'platform-block-left' : column === columns - 1 ? 'platform-block-right' : 'platform-block-middle'
          this.add.image(
            x + column * currentWidth + currentWidth / 2,
            y - height / 2 + row * currentHeight + currentHeight / 2,
            textureKey,
          ).setDisplaySize(currentWidth, currentHeight)
        }
      }
    }

    const collisionTopOffset = 4 // small nudge below the grass-tip gaps; was 20, way overcorrected
    const collisionWidth = visible ? width * 0.9 : width
    const collision = this.platforms.create(x + width / 2, y - height / 2 + collisionTopOffset + 4, 'platform-block-middle') as Phaser.Physics.Arcade.Image
    collision.setDisplaySize(collisionWidth, 8).refreshBody()
    collision.setVisible(false)
  }
}