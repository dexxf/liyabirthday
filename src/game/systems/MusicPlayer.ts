/**
 * Background music, synthesised with the Web Audio API so the game ships no
 * extra binary asset. The loop is driven by a lookahead scheduler that is
 * started exactly once - death and respawn never touch it, so the track keeps
 * playing straight through.
 */
export class MusicPlayer {
  private static readonly VOLUME = 0.15
  private static readonly STEP_SECONDS = 60 / 132 / 2 // eighth notes at 132 BPM

  // Bright I-V-vi-IV in C, pentatonic lead. 0 is a rest.
  private static readonly LEAD = [
    72, 0, 69, 67, 69, 72, 76, 72,
    74, 0, 71, 67, 71, 74, 79, 74,
    72, 0, 69, 64, 69, 72, 76, 72,
    69, 72, 77, 76, 72, 69, 67, 0,
  ]
  private static readonly BASS = [48, 48, 55, 48, 43, 43, 50, 43, 45, 45, 52, 45, 41, 41, 48, 41]

  private context: AudioContext | null = null
  private master: GainNode | null = null
  private scheduler: number | null = null
  private nextStepTime = 0
  private step = 0
  private muted = false

  public get isMuted(): boolean {
    return this.muted
  }

  /** Safe to call on every input event - it only ever builds the graph once. */
  public start(): void {
    if (this.context) {
      if (this.context.state === 'suspended') void this.context.resume()
      return
    }

    const AudioContextCtor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) return

    this.context = new AudioContextCtor()
    this.master = this.context.createGain()
    this.master.gain.value = this.muted ? 0.0001 : MusicPlayer.VOLUME
    this.master.connect(this.context.destination)
    this.nextStepTime = this.context.currentTime + 0.12
    this.scheduler = window.setInterval(() => this.schedule(), 25)
  }


  public destroy(): void {
    if (this.scheduler !== null) window.clearInterval(this.scheduler)
    this.scheduler = null
    void this.context?.close()
    this.context = null
    this.master = null
  }

  private schedule(): void {
    if (!this.context) return
    while (this.nextStepTime < this.context.currentTime + 0.15) {
      const index = this.step % MusicPlayer.LEAD.length
      const lead = MusicPlayer.LEAD[index]
      if (lead) this.playNote(lead, this.nextStepTime, MusicPlayer.STEP_SECONDS * 0.88, 'square', 0.14)
      if (index % 2 === 0) {
        this.playNote(
          MusicPlayer.BASS[(index / 2) % MusicPlayer.BASS.length],
          this.nextStepTime,
          MusicPlayer.STEP_SECONDS * 1.7,
          'triangle',
          0.26,
        )
      }
      this.nextStepTime += MusicPlayer.STEP_SECONDS
      this.step += 1
    }
  }

  private playNote(midi: number, time: number, duration: number, type: OscillatorType, peak: number): void {
    const context = this.context
    const master = this.master
    if (!context || !master) return

    const oscillator = context.createOscillator()
    const envelope = context.createGain()
    oscillator.type = type
    oscillator.frequency.value = 440 * Math.pow(2, (midi - 69) / 12)
    envelope.gain.setValueAtTime(0.0001, time)
    envelope.gain.exponentialRampToValueAtTime(peak, time + 0.014)
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration)
    oscillator.connect(envelope)
    envelope.connect(master)
    oscillator.start(time)
    oscillator.stop(time + duration + 0.02)
  }

  // MusicPlayer.ts
// Add these two public methods to your existing MusicPlayer class.

public duck(): void {
  if (!this.context || !this.master) return

  const now = this.context.currentTime

  this.master.gain.cancelScheduledValues(now)
  this.master.gain.setTargetAtTime(
    0.0001,
    now,
    0.035,
  )
}

public restore(): void {
  if (!this.context || !this.master) return

  const now = this.context.currentTime
  const targetVolume = this.isMuted ? 0.0001 : MusicPlayer.VOLUME

  this.master.gain.cancelScheduledValues(now)
  this.master.gain.setTargetAtTime(
    targetVolume,
    now,
    0.08,
  )
}
}