/**
 * Mirrors the method surface of the Android PdAudioEngine 1:1 so the rest of
 * the app doesn't care whether the implementation is libpd-WASM or a
 * Web-Audio fallback.
 */
export interface Synthesizer {
  readonly isInitialized: boolean
  initialize(context: AudioContext): Promise<boolean>
  release(): void

  /** Called for every `BANG` message sent by the patch (sequencer step). */
  setOnBangReceived(cb: (() => void) | null): void
  /** Called for every `ENVF` float sent by the patch (envelope follower). */
  setOnEnvelopeReceived(cb: ((x: number) => void) | null): void
  sendFloat(receiver: string, value: number): void
  sendBang(receiver: string): void

  setFrequency(freq: number): void
  setGain(gain: number): void
  setX(x: number): void
  setY(y: number): void
  setCutoff(cutoff: number): void
  setResonance(resonance: number): void
  setEnvelope(envelope: number): void
  setAttack(attack: number): void
  setRelease(release: number): void
  setDistortion(dist: number): void
  setFM(fm: number): void
  setAmountFM(amount: number): void
  setChorusFreq(freq: number): void
  setChorusMod(mod: number): void
  setDelayTime(time: number): void
  setFeedback(feedback: number): void
  setReverbSend(send: number): void
  setOscillatorSub(on: boolean): void
  setOscillatorSin(on: boolean): void
  setOscillatorSaw(on: boolean): void
  setOscillatorSqr(on: boolean): void
  setOscillatorNoise(on: boolean): void
  setSequencerOn(on: boolean): void
  setMetroOn(on: boolean): void
  setSequencerPeriod(period: number): void
  setBPDFreq(freq: number): void
  setNoteOn(on: boolean): void
  triggerBang(): void
}
