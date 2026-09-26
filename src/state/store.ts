import { create } from 'zustand'
import type { PixelData, PixelSelectionMode } from '../camera/pixelGrid'
import { DEFAULT_MUSIC, DEFAULT_SYNTH, DEFAULT_VISUAL, type MusicState, type SynthState, type VisualState } from './models'

export type AppStatus = 'idle' | 'starting' | 'running' | 'error'

interface AppState {
  status: AppStatus
  errorMessage: string | null
  audioUnlocked: boolean
  isAudioInitialized: boolean
  selectionMode: PixelSelectionMode
  selectedPixel: PixelData | null
  isPlaying: boolean
  gridColumns: number
  musicState: MusicState
  synthState: SynthState
  visualState: VisualState
  setStatus: (status: AppStatus, errorMessage?: string) => void
  setAudioUnlocked: (unlocked: boolean) => void
  setAudioInitialized: (initialized: boolean) => void
  setSelectionMode: (mode: PixelSelectionMode) => void
  setSelectedPixel: (pixel: PixelData | null) => void
  setPlaying: (playing: boolean) => void
  setGridColumns: (columns: number) => void
  updateMusic: (update: Partial<MusicState>) => void
  updateSynth: (update: Partial<SynthState>) => void
  updateVisual: (update: Partial<VisualState>) => void
}

// Phase 0 store — will grow to mirror TrencadisState 1:1
// (pixelGrid, selectedPixel, selectionMode, synthState, musicState,
// acidModulation, blobModulation, panel visibility flags, ...).
export const useAppStore = create<AppState>((set) => ({
  status: 'idle',
  errorMessage: null,
  audioUnlocked: false,
  isAudioInitialized: false,
  selectionMode: 'sequence',
  selectedPixel: null,
  isPlaying: true,
  gridColumns: 18,
  musicState: DEFAULT_MUSIC,
  synthState: DEFAULT_SYNTH,
  visualState: DEFAULT_VISUAL,
  setStatus: (status, errorMessage) => set({ status, errorMessage: errorMessage ?? null }),
  setAudioUnlocked: (audioUnlocked) => set({ audioUnlocked }),
  setAudioInitialized: (isAudioInitialized) => set({ isAudioInitialized }),
  setSelectionMode: (selectionMode) => set({ selectionMode }),
  setSelectedPixel: (selectedPixel) => set({ selectedPixel }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setGridColumns: (gridColumns) => set({ gridColumns }),
  updateMusic: (update) => set((state) => ({ musicState: { ...state.musicState, ...update } })),
  updateSynth: (update) => set((state) => ({ synthState: { ...state.synthState, ...update } })),
  updateVisual: (update) => set((state) => ({ visualState: { ...state.visualState, ...update } })),
}))
