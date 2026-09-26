import { PdWasmSynth } from './PdWasmSynth'
import type { Synthesizer } from './Synthesizer'

/** Shared synth instance (like the ViewModel-owned PdAudioEngine on Android). */
export const synth: Synthesizer = new PdWasmSynth()

// Console access for spike debugging: __synth.sendFloat('Freq', 330) etc.
;(window as unknown as { __synth: Synthesizer }).__synth = synth
