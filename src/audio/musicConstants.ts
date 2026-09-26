import type { MusicState } from '../state/models'

export const SCALE_NAMES = [
  'Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian',
  'Locrian', 'HarmMin', 'Gipsy', 'Hawaiian', 'Blues', 'Japanese',
]

export const KEY_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
export const CHORD_NAMES = ['Maj', 'min', 'dim', 'aug', 'M7', 'm7', '7', 'sus2', 'sus4', 'pwr']
export const FIGURE_SYMBOLS = ['𝅝', '𝅗𝅥', '♩', '♪', '𝅘𝅥𝅯', '𝅘𝅥𝅰', '𝅘𝅥𝅱']

const SCALE_SEMITONES = [
  [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24],
  [0, 2, 3, 5, 7, 9, 10, 12, 14, 15, 17, 19, 21, 22, 24],
  [0, 1, 3, 5, 7, 8, 10, 12, 13, 15, 17, 19, 20, 22, 24],
  [0, 2, 4, 6, 7, 9, 11, 12, 14, 16, 18, 19, 21, 23, 24],
  [0, 2, 4, 5, 7, 9, 10, 12, 14, 16, 17, 19, 21, 22, 24],
  [0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19, 20, 22, 24],
  [0, 1, 3, 5, 6, 8, 10, 12, 13, 15, 17, 18, 20, 22, 24],
  [0, 2, 3, 5, 7, 8, 11, 12, 14, 15, 17, 19, 20, 23, 24],
  [0, 1, 4, 5, 7, 8, 10, 12, 13, 16, 17, 19, 20, 22, 24],
  [0, 2, 3, 5, 7, 9, 11, 12, 14, 15, 17, 19, 21, 23, 24],
  [0, 3, 5, 6, 7, 10, 12, 15, 17, 19, 22, 24],
  [0, 1, 5, 7, 8, 12, 13, 17, 19, 20, 24],
]

const NOTE_COUNTS = [13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 11, 9]
const CHORDS = [
  [0, 4, 7], [0, 3, 7], [0, 3, 6], [0, 4, 8], [0, 4, 7, 11],
  [0, 3, 7, 10], [0, 4, 7, 10], [0, 2, 7], [0, 5, 7], [0, 7],
]

export function rootFrequency(keyIndex: number): number {
  return 440 * 2 ** ((-45 + keyIndex) / 12)
}

export function calculateFrequency(hue: number, music: MusicState): number {
  const root = rootFrequency(music.keyIndex)
  const octave = 2 ** music.octaveIndex
  if (music.useChordMapping) {
    const intervals = CHORDS[music.chordTypeIndex] ?? CHORDS[0]
    const unfolded = [...intervals, ...intervals.map((value) => value + 12), 24]
    const index = Math.min(unfolded.length - 1, Math.round(hue / 360 * (unfolded.length - 1)))
    return root * octave * 2 ** (unfolded[index] / 12)
  }
  const scaleIndex = Math.max(0, Math.min(SCALE_SEMITONES.length - 1, music.scaleIndex))
  const scale = SCALE_SEMITONES[scaleIndex]
  const index = Math.min(scale.length - 1, Math.round(hue / 360 * NOTE_COUNTS[scaleIndex]))
  return root * octave * 2 ** (scale[index] / 12)
}
