import { create } from 'zustand'

export type AppStatus = 'idle' | 'starting' | 'running' | 'error'

interface AppState {
  status: AppStatus
  errorMessage: string | null
  audioUnlocked: boolean
  isAudioInitialized: boolean
  setStatus: (status: AppStatus, errorMessage?: string) => void
  setAudioUnlocked: (unlocked: boolean) => void
  setAudioInitialized: (initialized: boolean) => void
}

// Phase 0 store — will grow to mirror TrencadisState 1:1
// (pixelGrid, selectedPixel, selectionMode, synthState, musicState,
// acidModulation, blobModulation, panel visibility flags, ...).
export const useAppStore = create<AppState>((set) => ({
  status: 'idle',
  errorMessage: null,
  audioUnlocked: false,
  isAudioInitialized: false,
  setStatus: (status, errorMessage) => set({ status, errorMessage: errorMessage ?? null }),
  setAudioUnlocked: (audioUnlocked) => set({ audioUnlocked }),
  setAudioInitialized: (isAudioInitialized) => set({ isAudioInitialized }),
}))
