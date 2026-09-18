/**
 * Main background music: loops an mp3 for the whole game. It is started
 * exactly once - death and respawn never touch it, so the track keeps playing
 * straight through.
 *
 * The <audio> element is routed through a Web Audio gain node so duck() and
 * restore() can fade the volume smoothly when a chest or death song plays.
 */
export class MusicPlayer {
  private static readonly VOLUME = 0.35 // raise or lower to taste (0 - 1)
  private static readonly SILENT = 0.0001

  private readonly url: string
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private element: HTMLAudioElement | null = null
  private muted = false

  public constructor(url: string) {
    this.url = url
  }

  public get isMuted(): boolean {
    return this.muted
  }

  /** Safe to call on every input event - it only ever builds the graph once. */
  public start(): void {
    if (this.context) {
      if (this.context.state === 'suspended') void this.context.resume()
      if (this.element?.paused) void this.element.play().catch(() => undefined)
      return
    }

    const AudioContextCtor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) return

    this.context = new AudioContextCtor()
    this.master = this.context.createGain()
    this.master.gain.value = this.muted ? MusicPlayer.SILENT : MusicPlayer.VOLUME
    this.master.connect(this.context.destination)

    const element = new Audio(this.url)
    element.loop = true
    element.preload = 'auto'
    this.element = element

    this.context.createMediaElementSource(element).connect(this.master)

    void element.play().catch((error: unknown) => {
      console.warn('Background music could not start:', error)
    })
  }

  public destroy(): void {
    if (this.element) {
      this.element.pause()
      this.element.removeAttribute('src')
      this.element.load()
    }
    this.element = null
    void this.context?.close()
    this.context = null
    this.master = null
  }

  /** Quickly fades the background music out while another song plays. */
  public duck(): void {
    if (!this.context || !this.master) return

    const now = this.context.currentTime

    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setTargetAtTime(MusicPlayer.SILENT, now, 0.035)
  }

  /** Fades the background music back in once the other song is done. */
  public restore(): void {
    if (!this.context || !this.master) return

    const now = this.context.currentTime
    const targetVolume = this.muted ? MusicPlayer.SILENT : MusicPlayer.VOLUME

    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setTargetAtTime(targetVolume, now, 0.08)
  }
}