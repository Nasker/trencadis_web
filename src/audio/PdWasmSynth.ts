import { createPd, type Pd } from 'libpd-wasm'
import workletUrl from 'libpd-wasm/assets/libpd-worklet.js?url'
import type { Synthesizer } from './Synthesizer'

// The live runtime chain of STEPPEDPIX.pd (abstractions resolved as files
// from the same virtual-FS directory): e_chorus, e_lop2 → e_beequad,
// u_lowpassq, c_adsr, c_ead, tapedelaysimple.
const PATCH_FILES = [
  'STEPPEDPIX.pd',
  'c_adsr.pd',
  'c_ead.pd',
  'e_chorus.pd',
  'e_lop2.pd',
  'e_beequad.pd',
  'u_lowpassq.pd',
  'tapedelaysimple.pd',
]

const ENTRY = 'patches/STEPPEDPIX.pd'

export class PdWasmSynth implements Synthesizer {
  private pd: Pd | null = null
  private onBang: (() => void) | null = null
  private onEnvelope: ((x: number) => void) | null = null

  get isInitialized(): boolean {
    return this.pd !== null
  }

  async initialize(context: AudioContext): Promise<boolean> {
    if (this.pd) return true
    try {
      // ?testpatch=1 loads a bare osc~ → dac~ tone to isolate the
      // worklet output path from the STEPPEDPIX patch behavior.
      const testMode = new URLSearchParams(window.location.search).has('testpatch')

      const files: Record<string, string> = {}
      await Promise.all(
        (testMode ? ['testtone.pd'] : PATCH_FILES).map(async (name) => {
          const res = await fetch(`${import.meta.env.BASE_URL}patches/${name}`)
          if (!res.ok) throw new Error(`Failed to load patch ${name}: ${res.status}`)
          files[`patches/${name}`] = await res.text()
        }),
      )
      const entry = testMode ? 'patches/testtone.pd' : ENTRY

      const pd = await createPd({
        packages: ['vanilla'],
        files,
        entry,
        audioContext: context,
        workletUrl,
        onPrint: (text) => console.log('[pd]', text),
        onError: (err) => console.error('[pd]', err),
      })

      pd.subscribe('BANG', () => this.onBang?.())
      pd.subscribe('ENVF', (msg) => {
        const v = msg.values[0]
        if (typeof v === 'number') this.onEnvelope?.(v)
      })

      pd.connect()

      if (testMode) {
        this.pd = pd
        return true
      }

      // Defaults mirrored from PdAudioEngine.initialize()
      pd.sendFloat('onSEQ', 1)
      pd.sendFloat('periodSEQ', 500)
      pd.sendFloat('Sub', 1)
      pd.sendFloat('Sin', 1)
      pd.sendFloat('Saw', 0)
      pd.sendFloat('Sqr', 0)
      pd.sendFloat('Noi', 0)
      pd.sendFloat('Rsend', 0.2)

      this.pd = pd
      return true
    } catch (e) {
      console.error('[PdWasmSynth] init failed', e)
      return false
    }
  }

  release(): void {
    const pd = this.pd
    this.pd = null
    if (pd) {
      pd.disconnect()
      void pd.close()
    }
  }

  setOnBangReceived(cb: (() => void) | null): void {
    this.onBang = cb
  }

  setOnEnvelopeReceived(cb: ((x: number) => void) | null): void {
    this.onEnvelope = cb
  }

  private f(receiver: string, value: number): void {
    this.pd?.sendFloat(receiver, value)
  }

  sendFloat(receiver: string, value: number): void {
    this.f(receiver, value)
  }

  sendBang(receiver: string): void {
    this.pd?.sendBang(receiver)
  }

  setFrequency = (freq: number) => this.f('Freq', freq)
  setGain = (gain: number) => this.f('Gain', gain)
  setX = (x: number) => this.f('X', x)
  setY = (y: number) => this.f('Y', y)
  setCutoff = (cutoff: number) => this.f('Cutoff', cutoff)
  setResonance = (resonance: number) => this.f('Resonance', resonance)
  setEnvelope = (envelope: number) => this.f('Envelope', envelope)
  setAttack = (attack: number) => this.f('Attack', attack)
  setRelease = (release: number) => this.f('Release', release)
  setDistortion = (dist: number) => this.f('Dist', dist)
  setFM = (fm: number) => this.f('FM', fm)
  setAmountFM = (amount: number) => this.f('amountFM', amount)
  setChorusFreq = (freq: number) => this.f('freqChor', freq)
  setChorusMod = (mod: number) => this.f('modChor', mod)
  setDelayTime = (time: number) => this.f('Tdelay', time)
  setFeedback = (feedback: number) => this.f('Lfeedback', feedback)
  setReverbSend = (send: number) => this.f('Rsend', send)
  setOscillatorSub = (on: boolean) => this.f('Sub', on ? 1 : 0)
  setOscillatorSin = (on: boolean) => this.f('Sin', on ? 1 : 0)
  setOscillatorSaw = (on: boolean) => this.f('Saw', on ? 1 : 0)
  setOscillatorSqr = (on: boolean) => this.f('Sqr', on ? 1 : 0)
  setOscillatorNoise = (on: boolean) => this.f('Noi', on ? 1 : 0)
  setSequencerOn = (on: boolean) => this.f('onSEQ', on ? 1 : 0)
  setMetroOn = (on: boolean) => this.f('metroSEQ', on ? 1 : 0)
  setSequencerPeriod = (period: number) => this.f('periodSEQ', period)
  setBPDFreq = (freq: number) => this.f('BPDFreq', freq)
  setNoteOn = (on: boolean) => this.f('NoteOn', on ? 1 : 0)
  triggerBang = () => this.sendBang('BANG')
}
