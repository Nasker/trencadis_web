import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { CHORD_NAMES, FIGURE_SYMBOLS, KEY_NAMES, SCALE_NAMES } from '../audio/musicConstants'
import type { AcidPatternType } from '../render/acidPattern'
import { useAppStore } from '../state/store'
import { webMidi } from '../midi/WebMidi'
import { PresetPanel } from './PresetPanel'

type Panel = 'modes' | 'scales' | 'rhythm' | 'synth' | 'palette' | 'preset' | null

function Slider({ label, value, min = 0, max = 1, step = 0.01, onChange }: {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
}) {
  return (
    <label className="panel-slider">
      <span>{label}<b>{value.toFixed(step < 1 ? 2 : 0)}</b></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  )
}

export function PhasePanels({ frozen, onToggleFreeze, onLoadImage }: {
  frozen: boolean
  onToggleFreeze: () => void
  onLoadImage: (file: File) => void
}) {
  const [open, setOpen] = useState<Panel>(null)
  const [iconsVisible, setIconsVisible] = useState(true)
  const lastTap = useRef(0)
  const music = useAppStore((state) => state.musicState)
  const synth = useAppStore((state) => state.synthState)
  const visual = useAppStore((state) => state.visualState)
  const midi = useAppStore((state) => state.midiState)
  const mode = useAppStore((state) => state.selectionMode)
  const playing = useAppStore((state) => state.isPlaying)
  const columns = useAppStore((state) => state.gridColumns)
  const updateMusic = useAppStore((state) => state.updateMusic)
  const updateSynth = useAppStore((state) => state.updateSynth)
  const updateVisual = useAppStore((state) => state.updateVisual)
  const updateMidi = useAppStore((state) => state.updateMidi)
  const setMode = useAppStore((state) => state.setSelectionMode)
  const setPlaying = useAppStore((state) => state.setPlaying)
  const setColumns = useAppStore((state) => state.setGridColumns)
  const imageInput = useRef<HTMLInputElement>(null)

  const toggle = (panel: Exclude<Panel, null>) => setOpen((current) => current === panel ? null : panel)
  const close = () => setOpen(null)

  useEffect(() => {
    const onDoubleClick = (event: globalThis.MouseEvent) => {
      const target = event.target as HTMLElement
      if (target.closest('.android-panel, .phase-panel, .edge-icon, button, input, select, summary')) return
      event.preventDefault()
      if (open) setOpen(null)
      else setIconsVisible((visible) => !visible)
    }
    document.addEventListener('dblclick', onDoubleClick)
    return () => document.removeEventListener('dblclick', onDoubleClick)
  }, [open])

  const setRhythm = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(0.999, (event.clientX - bounds.left) / bounds.width))
    const y = Math.max(0, Math.min(0.999, (event.clientY - bounds.top) / bounds.height))
    updateMusic({ figureIndex: Math.floor(x * 7), octaveIndex: Math.floor((1 - y) * 7) })
  }

  const tapTempo = () => {
    const now = performance.now()
    const period = now - lastTap.current
    lastTap.current = now
    if (period >= 200 && period <= 2000) updateMusic({ tempo: Math.round(60000 / period) })
  }

  const toggleMidi = async () => {
    if (midi.enabled) {
      webMidi.disable()
      updateMidi({ enabled: false, outputMode: 'internal' })
    } else {
      const enabled = await webMidi.enable()
      updateMidi({ enabled })
    }
  }

  return (
    <>
      <div className={`android-edge-hints ${iconsVisible ? '' : 'hidden'}`}>
        <button className="edge-icon modes-icon" onClick={() => toggle('modes')}>📷</button>
        <button className="edge-icon palette-icon" onClick={() => toggle('palette')}>🎨</button>
        <button className="edge-icon scales-icon" onClick={() => toggle('scales')}>𝄞</button>
        <button className="edge-icon rhythm-icon" onClick={() => toggle('rhythm')}>♪</button>
        <button className="edge-icon synth-icon" onClick={() => toggle('synth')}>∿</button>
        <button className="edge-icon preset-icon" onClick={() => toggle('preset')}>💾</button>
      </div>

      <aside className={`android-panel modes-panel ${open === 'modes' ? 'open' : ''}`}>
        <h2>MODE</h2>
        <div className="mode-stack">
          {([['sequence', 'SEQ'], ['brightest', 'BRI'], ['center', 'CNT'], ['pointer', 'PTR']] as const).map(([value, label]) => (
            <button key={value} className={mode === value ? 'active' : ''} onClick={() => setMode(value)}>{label}</button>
          ))}
        </div>
        <h2>CAM</h2>
        <button className="camera-mode">BACK</button>
        <button className={`camera-action ${frozen ? 'frozen' : ''}`} onClick={onToggleFreeze}>{frozen ? '▶ LIVE' : '📸 FREEZE'}</button>
        <button className="camera-action" onClick={() => imageInput.current?.click()}>🖼 LOAD</button>
        <input ref={imageInput} hidden type="file" accept="image/*" onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onLoadImage(file)
          event.target.value = ''
        }} />
        <details>
          <summary>ADVANCED</summary>
          <Slider label="GRID" value={columns} min={20} max={160} step={1} onChange={setColumns} />
        </details>
      </aside>

      <aside className={`android-panel scales-panel ${open === 'scales' ? 'open' : ''}`}>
        <h2>SCALE</h2>
        <div className="horizontal-buttons scale-row">
          {SCALE_NAMES.map((name, index) => <button key={name} className={!music.useChordMapping && music.scaleIndex === index ? 'active' : ''} onClick={() => updateMusic({ scaleIndex: index, useChordMapping: false })}>{name.slice(0, 4)}</button>)}
        </div>
        <h2>KEY</h2>
        <div className="piano-keyboard">
          {KEY_NAMES.map((name, index) => <button key={name} className={`${name.includes('#') ? 'black-key' : 'white-key'} ${music.keyIndex === index ? 'active' : ''}`} onClick={() => updateMusic({ keyIndex: index })}>{name}</button>)}
        </div>
        <h2>CHORD</h2>
        <div className="horizontal-buttons chord-row">
          {CHORD_NAMES.map((name, index) => <button key={name} className={music.useChordMapping && music.chordTypeIndex === index ? 'active' : ''} onClick={() => updateMusic({ chordTypeIndex: index, useChordMapping: true })}>{name}</button>)}
        </div>
      </aside>

      <aside className={`android-panel rhythm-panel ${open === 'rhythm' ? 'open' : ''}`}>
        <h2>RHYTHM</h2>
        <div className="rhythm-body">
          <div className="octave-labels">{[6, 5, 4, 3, 2, 1, 0].map((value) => <span key={value} className={music.octaveIndex === value ? 'active' : ''}>x{value + 1}</span>)}</div>
          <div className="rhythm-center">
            <div className="rhythm-grid" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setRhythm(event) }} onPointerMove={(event) => { if (event.buttons) setRhythm(event) }}>
              {Array.from({ length: 49 }, (_, index) => {
                const row = Math.floor(index / 7)
                const col = index % 7
                const active = 6 - row === music.octaveIndex && col === music.figureIndex
                return <span key={index} className={active ? 'active' : ''}>{active && <i />}</span>
              })}
            </div>
            <div className="figure-symbols">{FIGURE_SYMBOLS.map((symbol, index) => <span key={index} className={music.figureIndex === index ? 'active' : ''}>{symbol}</span>)}</div>
          </div>
          <div className="rhythm-actions">
            <button className={`transport-toggle ${playing ? 'playing' : ''}`} onClick={() => setPlaying(!playing)}>{playing ? '■' : '▶'}</button>
            <button className="tap-tempo" onClick={tapTempo}>TAP</button>
            <div className="sync-buttons">
              <button className={midi.syncSource === 'internal' ? 'active' : ''} onClick={() => updateMidi({ syncSource: 'internal' })}>INT</button>
              <button className={midi.syncSource === 'external' ? 'active clock' : ''} disabled={!midi.externalClockAvailable} onClick={() => updateMidi({ syncSource: 'external' })}>EXT</button>
            </div>
            <span>{music.tempo} BPM{midi.syncSource === 'external' && midi.externalClockAvailable ? ' • EXT' : ''}</span>
          </div>
        </div>
      </aside>

      <aside className={`android-panel synth-panel ${open === 'synth' ? 'open' : ''}`}>
        <h2>SYNTH</h2>
        <small>Oscillators</small>
        <div className="osc-row">
          {([['SUB', 'subOsc'], ['SIN', 'sinOsc'], ['SAW', 'sawOsc'], ['SQR', 'sqrOsc'], ['NOI', 'noiseOsc']] as const).map(([label, key]) => <button key={key} className={synth[key] ? 'active' : ''} onClick={() => updateSynth({ [key]: !synth[key] })}>{label}</button>)}
        </div>
        <small>Filter</small>
        <Slider label="Cutoff" value={synth.cutoff} onChange={(cutoff) => updateSynth({ cutoff })} />
        <Slider label="Resonance" value={synth.resonance} onChange={(resonance) => updateSynth({ resonance })} />
        <Slider label="Envelope" value={synth.envelope} min={-1} max={1} onChange={(envelope) => updateSynth({ envelope })} />
        <small>Amp</small>
        <Slider label="Attack" value={synth.attack} onChange={(attack) => updateSynth({ attack })} />
        <Slider label="Release" value={synth.release} onChange={(release) => updateSynth({ release })} />
        <Slider label="Gate" value={synth.gateLength} onChange={(gateLength) => updateSynth({ gateLength })} />
        <Slider label="Distortion" value={synth.distortion} onChange={(distortion) => updateSynth({ distortion })} />
        <small>Effects</small>
        <Slider label="FM" value={synth.fm} onChange={(fm) => updateSynth({ fm })} />
        <Slider label="FM Amt" value={synth.fmAmount} onChange={(fmAmount) => updateSynth({ fmAmount })} />
        <Slider label="Chorus F" value={synth.chorusFreq} onChange={(chorusFreq) => updateSynth({ chorusFreq })} />
        <Slider label="Chorus M" value={synth.chorusMod} onChange={(chorusMod) => updateSynth({ chorusMod })} />
        <Slider label="Delay" value={synth.delayFigure} min={-2} max={4} onChange={(delayFigure) => updateSynth({ delayFigure })} />
        <Slider label="Feedback" value={synth.feedback} max={0.49} onChange={(feedback) => updateSynth({ feedback })} />
        <small>MIDI</small>
        <label className="midi-enable"><span>{midi.supported ? 'Enable' : 'Unavailable'}</span><input type="checkbox" checked={midi.enabled} disabled={!midi.supported} onChange={() => void toggleMidi()} /></label>
        {midi.enabled && <div className="midi-controls">
          <span>Output</span>
          <div className="midi-mode-row">
            {([['internal', 'Pd'], ['midi', 'MIDI'], ['both', 'Both']] as const).map(([value, label]) => <button key={value} className={midi.outputMode === value ? 'active' : ''} onClick={() => { webMidi.allNotesOff(midi.channel); updateMidi({ outputMode: value }) }}>{label}</button>)}
          </div>
          {midi.outputNames.length > 0 && <select value={midi.deviceName} onChange={(event) => { webMidi.selectOutput(event.target.value); updateMidi({ deviceName: event.target.value }) }}>{midi.outputNames.map((name) => <option key={name}>{name}</option>)}</select>}
          <span>Channel</span>
          <div className="midi-channel-row">{Array.from({ length: 16 }, (_, index) => index + 1).map((channel) => <button key={channel} className={midi.channel === channel ? 'active' : ''} onClick={() => { webMidi.allNotesOff(midi.channel); updateMidi({ channel }) }}>{channel}</button>)}</div>
          <span className={midi.externalClockAvailable ? 'midi-clock active' : 'midi-clock'}>{midi.externalClockAvailable ? `CLOCK ${midi.externalBpm.toFixed(1)} BPM` : 'NO CLOCK'}</span>
        </div>}
      </aside>

      <aside className={`android-panel palette-panel ${open === 'palette' ? 'open' : ''}`}>
        <div className="palette-header"><h2>🌀 ACID</h2><button className={visual.acidEnabled ? 'active' : ''} onClick={() => updateVisual({ acidEnabled: !visual.acidEnabled })}>{visual.acidEnabled ? 'ON' : 'OFF'}</button></div>
        <small>PATTERN</small>
        <div className="horizontal-buttons pattern-row">{(['grid', 'wave', 'grad1', 'grad2', 'grad3', 'acid'] as AcidPatternType[]).map((pattern) => <button key={pattern} className={visual.acidPattern === pattern ? 'active' : ''} onClick={() => updateVisual({ acidPattern: pattern })}>{pattern.toUpperCase()}</button>)}</div>
        <Slider label="HUE" value={visual.acidHue} onChange={(acidHue) => updateVisual({ acidHue })} />
        <Slider label="SIZE" value={visual.acidSize} onChange={(acidSize) => updateVisual({ acidSize })} />
        <Slider label="ROTATE" value={visual.acidRotation} onChange={(acidRotation) => updateVisual({ acidRotation })} />
        <Slider label="ALPHA" value={visual.acidAlpha} onChange={(acidAlpha) => updateVisual({ acidAlpha })} />
        <Slider label="SPEED" value={visual.acidSpeed} min={0} max={0.5} onChange={(acidSpeed) => updateVisual({ acidSpeed })} />
        <Slider label="BRI SIZE" value={visual.brightnessSize} min={0} max={1.5} onChange={(brightnessSize) => updateVisual({ brightnessSize })} />
        <Slider label="BLOB" value={visual.blobBlend} onChange={(blobBlend) => updateVisual({ blobBlend })} />
      </aside>

      <PresetPanel open={open === 'preset'} onClose={close} />
      {open && <button className="panel-scrim" aria-label="Close panel" onDoubleClick={close} />}
    </>
  )
}
