import type { PixelSelectionMode } from '../camera/pixelGrid'
import type { MusicState, SynthState, VisualState } from '../state/models'

export interface AndroidPreset {
  name: string
  version: number
  synth: SynthState
  music: MusicState
  acid: {
    enabled: boolean
    hueAmount: number
    sizeAmount: number
    rotationAmount: number
    alphaAmount: number
    animationSpeed: number
    brightnessSizeBoost: number
  }
  acidPatternIndex: number
  selectionMode: string
  useFrontCamera: boolean
  useBlobMode: boolean
  customGridResolution: number | null
  blob?: {
    blobBlend?: number
    blobAlpha?: number
  }
}

export interface PresetState {
  synth: SynthState
  music: MusicState
  visual: VisualState
  selectionMode: PixelSelectionMode
  gridColumns: number
}

const STORAGE_KEY = 'trencadis.presets.v1'
const PATTERNS: VisualState['acidPattern'][] = ['grid', 'wave', 'grad1', 'grad2', 'grad3', 'acid']

function round(value: number): number {
  return Math.round(value * 100) / 100
}

export function encodePreset(name: string, state: PresetState): AndroidPreset {
  return {
    name,
    version: 1,
    synth: Object.fromEntries(Object.entries(state.synth).map(([key, value]) => [key, typeof value === 'number' ? round(value) : value])) as unknown as SynthState,
    music: { ...state.music, tempo: round(state.music.tempo) },
    acid: {
      enabled: state.visual.acidEnabled,
      hueAmount: round(state.visual.acidHue),
      sizeAmount: round(state.visual.acidSize),
      rotationAmount: round(state.visual.acidRotation),
      alphaAmount: round(state.visual.acidAlpha),
      animationSpeed: round(state.visual.acidSpeed),
      brightnessSizeBoost: round(state.visual.brightnessSize),
    },
    acidPatternIndex: PATTERNS.indexOf(state.visual.acidPattern),
    selectionMode: state.selectionMode.toUpperCase(),
    useFrontCamera: false,
    useBlobMode: state.visual.blobBlend > 0,
    customGridResolution: state.gridColumns,
    blob: { blobBlend: round(state.visual.blobBlend) },
  }
}

export function decodePreset(preset: AndroidPreset, fallback: PresetState): PresetState {
  const mode = preset.selectionMode?.toLowerCase()
  const selectionMode: PixelSelectionMode = ['sequence', 'brightest', 'center', 'pointer'].includes(mode)
    ? mode as PixelSelectionMode
    : 'sequence'
  return {
    synth: { ...fallback.synth, ...preset.synth, feedback: Math.min(0.49, preset.synth?.feedback ?? fallback.synth.feedback) },
    music: { ...fallback.music, ...preset.music },
    visual: {
      ...fallback.visual,
      acidEnabled: preset.acid?.enabled ?? fallback.visual.acidEnabled,
      acidHue: preset.acid?.hueAmount ?? fallback.visual.acidHue,
      acidSize: preset.acid?.sizeAmount ?? fallback.visual.acidSize,
      acidRotation: preset.acid?.rotationAmount ?? fallback.visual.acidRotation,
      acidAlpha: preset.acid?.alphaAmount ?? fallback.visual.acidAlpha,
      acidSpeed: preset.acid?.animationSpeed ?? fallback.visual.acidSpeed,
      brightnessSize: preset.acid?.brightnessSizeBoost ?? fallback.visual.brightnessSize,
      acidPattern: PATTERNS[preset.acidPatternIndex] ?? fallback.visual.acidPattern,
      blobBlend: preset.blob?.blobBlend ?? preset.blob?.blobAlpha ?? (preset.useBlobMode ? 1 : 0),
    },
    selectionMode,
    gridColumns: preset.customGridResolution ?? fallback.gridColumns,
  }
}

function readLocal(): AndroidPreset[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as AndroidPreset[]
  } catch {
    return []
  }
}

function writeLocal(presets: AndroidPreset[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
}

export function listPresets(): AndroidPreset[] {
  return readLocal().sort((a, b) => a.name.localeCompare(b.name))
}

export function savePreset(preset: AndroidPreset): void {
  const presets = readLocal().filter((item) => item.name !== preset.name)
  presets.push(preset)
  writeLocal(presets)
}

export function deletePreset(name: string): void {
  writeLocal(readLocal().filter((preset) => preset.name !== name))
}

export function downloadPreset(preset: AndroidPreset): void {
  const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${preset.name.replace(/[^a-z0-9_-]/gi, '_')}.json`
  link.click()
  URL.revokeObjectURL(link.href)
}

export async function parsePresetFile(file: File): Promise<AndroidPreset> {
  const value = JSON.parse(await file.text()) as AndroidPreset
  if (!value.name || !value.synth || !value.music || !value.acid) throw new Error('Invalid Trencadís preset')
  return value
}
