// Sound generation using Web Audio API
class SoundManager {
  private audioContext: AudioContext | null = null

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
    }
    return this.audioContext
  }

  private playTone(frequency: number, duration: number, volume: number, waveType: OscillatorType = 'sine') {
    const ctx = this.getContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.value = frequency
    oscillator.type = waveType

    gainNode.gain.setValueAtTime(volume, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  }

  playMove(volume: number = 0.5) {
    this.playTone(440, 0.08, volume * 0.3, 'sine')
  }

  playCapture(volume: number = 0.5) {
    this.playTone(330, 0.12, volume * 0.4, 'triangle')
  }

  playCheck(volume: number = 0.5) {
    this.playTone(660, 0.15, volume * 0.5, 'square')
  }

  playIllegal(volume: number = 0.5) {
    this.playTone(200, 0.1, volume * 0.3, 'sawtooth')
  }

  playCastle(volume: number = 0.5) {
    this.playTone(523, 0.1, volume * 0.3, 'sine')
    setTimeout(() => {
      this.playTone(587, 0.1, volume * 0.3, 'sine')
    }, 80)
  }

  playGameEnd(volume: number = 0.5) {
    this.playTone(440, 0.15, volume * 0.4, 'sine')
    setTimeout(() => {
      this.playTone(523, 0.15, volume * 0.4, 'sine')
    }, 150)
    setTimeout(() => {
      this.playTone(659, 0.3, volume * 0.4, 'sine')
    }, 300)
  }
}

export const soundManager = new SoundManager()

export function playMoveSound(isCapture: boolean, isCheck: boolean, isCastle: boolean, volume: number) {
  if (isCastle) {
    soundManager.playCastle(volume)
  } else if (isCheck) {
    soundManager.playCheck(volume)
  } else if (isCapture) {
    soundManager.playCapture(volume)
  } else {
    soundManager.playMove(volume)
  }
}
