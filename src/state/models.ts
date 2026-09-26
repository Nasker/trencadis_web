import type { PixelData, PixelSelectionMode } from '../camera/pixelGrid'

export interface SynthState {
  subOsc: boolean
  sinOsc: boolean
  sawOsc: boolean
  sqrOsc: boolean
  noiseOsc: boolean
  cutoff: number
  resonance: number
  envelope: number
  attack: number
  release: number
  distortion: number
  fm: number
  fmAmount: number
  chorusFreq: number
  chorusMod: number
  delayFigure: number
  feedback: number
  gateLength: number
}

export interface MusicState {
  scaleIndex: number
  keyIndex: number
  octaveIndex: number
  figureIndex: number
  chordTypeIndex: number
  useChordMapping: boolean
  tempo: number
}

export interface VisualState {
  acidEnabled: boolean
  acidPattern: 'grid' | 'wave' | 'grad1' | 'grad2' | 'grad3' | 'acid'
  acidHue: number
  acidSize: number
  acidRotation: number
  acidAlpha: number
  acidSpeed: number
  brightnessSize: number
  blobBlend: number
}

export const DEFAULT_SYNTH: SynthState = {
  subOsc: true,
  sinOsc: true,
  sawOsc: false,
  sqrOsc: false,
  noiseOsc: false,
  cutoff: 1,
  resonance: 0,
  envelope: 0,
  attack: 0,
  release: 0.2,
  distortion: 0,
  fm: 0,
  fmAmount: 0,
  chorusFreq: 0,
  chorusMod: 0,
  delayFigure: 1,
  feedback: 0.4,
  gateLength: 1,
}

export const DEFAULT_MUSIC: MusicState = {
  scaleIndex: 8,
  keyIndex: 0,
  octaveIndex: 2,
  figureIndex: 2,
  chordTypeIndex: 0,
  useChordMapping: false,
  tempo: 120,
}

export const DEFAULT_VISUAL: VisualState = {
  acidEnabled: true,
  acidPattern: 'acid',
  acidHue: 0.18,
  acidSize: 0.12,
  acidRotation: 0.2,
  acidAlpha: 0.08,
  acidSpeed: 0.5,
  brightnessSize: 0.08,
  blobBlend: 0.28,
}

export interface PerformanceState {
  selectionMode: PixelSelectionMode
  selectedPixel: PixelData | null
  isPlaying: boolean
  gridColumns: number
}
