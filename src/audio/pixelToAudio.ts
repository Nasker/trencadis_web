import type { PixelData, PixelGrid } from '../camera/pixelGrid'
import type { Synthesizer } from './Synthesizer'

const IONIAN_STEPS = [
  1, 1.1225, 1.2599, 1.3348, 1.4983, 1.6818, 1.8877,
  2, 2.2449, 2.5198, 2.6697, 2.9966, 3.3636, 3.7755, 4,
]

function frequencyFromHue(hue: number): number {
  const rootC2 = 440 * 2 ** (-45 / 12)
  const step = Math.min(IONIAN_STEPS.length - 1, Math.round(hue / 360 * 13))
  return rootC2 * 4 * IONIAN_STEPS[step]
}

export function playPixel(synth: Synthesizer, pixel: PixelData, grid: PixelGrid): void {
  const frequency = frequencyFromHue(pixel.hue)
  const x = pixel.gridX / grid.cols * 40 - 20
  const y = pixel.gridY / grid.rows * 40 - 20
  const cutoff = frequency / 2 + 16000 * 0.5 ** 4

  synth.setX(x)
  synth.setY(y + 0.1)
  synth.setFrequency(frequency)
  synth.setGain(pixel.brightness * 0.5)
  synth.setCutoff(cutoff)
  synth.setResonance(1)
  synth.setEnvelope(0)
  synth.setAttack(5)
  synth.setRelease(300)
  synth.setDistortion(0)
  synth.setFM(0)
  synth.setAmountFM(0)
  synth.setChorusFreq(0)
  synth.setChorusMod(0)
  synth.setDelayTime(250)
  synth.setFeedback(0)
  synth.setReverbSend(0)
  synth.setBPDFreq(523.25)
  synth.setSequencerOn(true)
  synth.setNoteOn(false)
  synth.setNoteOn(true)
  synth.triggerBang()
}
