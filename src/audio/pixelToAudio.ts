import type { PixelData, PixelGrid } from '../camera/pixelGrid'
import type { MusicState, SynthState } from '../state/models'
import { calculateFrequency, rootFrequency } from './musicConstants'
import type { Synthesizer } from './Synthesizer'

export function playPixel(
  synth: Synthesizer,
  pixel: PixelData,
  grid: PixelGrid,
  music: MusicState,
  state: SynthState,
): void {
  const frequency = calculateFrequency(pixel.hue, music)
  const x = pixel.gridX / grid.cols * 40 - 20
  const y = pixel.gridY / grid.rows * 40 - 20
  const cutoff = frequency / 2 + 16000 * state.cutoff ** 4
  const envelope = cutoff * 2 ** (4 * state.envelope) - cutoff
  const period = 60000 / music.tempo

  synth.setX(x)
  synth.setY(y + 0.1)
  synth.setFrequency(frequency)
  synth.setGain(pixel.brightness * 0.5)
  synth.setCutoff(cutoff)
  synth.setResonance(1 + 100 * state.resonance ** 3)
  synth.setEnvelope(envelope)
  synth.setAttack(5 + state.attack * 500)
  synth.setRelease(state.release * 5000)
  synth.setDistortion(state.distortion)
  synth.setFM(8000 * state.fm ** 2)
  synth.setAmountFM(state.fmAmount)
  synth.setChorusFreq(10 * state.chorusFreq ** 2)
  synth.setChorusMod(100 * state.chorusMod ** 3)
  synth.setDelayTime(period / 2 ** Math.round(state.delayFigure))
  synth.setFeedback(2.5 * state.feedback)
  synth.setReverbSend(state.feedback / 5)
  synth.setBPDFreq(rootFrequency(music.keyIndex) * 32)
  synth.setOscillatorSub(state.subOsc)
  synth.setOscillatorSin(state.sinOsc)
  synth.setOscillatorSaw(state.sawOsc)
  synth.setOscillatorSqr(state.sqrOsc)
  synth.setOscillatorNoise(state.noiseOsc)
  synth.setSequencerOn(true)
  synth.setNoteOn(false)
  synth.setNoteOn(true)
  synth.triggerBang()
}
