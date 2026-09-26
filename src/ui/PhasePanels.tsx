import { useState } from 'react'
import { KEY_NAMES, SCALE_NAMES } from '../audio/musicConstants'
import { useAppStore } from '../state/store'
import type { AcidPatternType } from '../render/acidPattern'

type Panel = 'music' | 'synth' | 'visual' | null

function Slider({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
}: {
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
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

export function PhasePanels() {
  const [open, setOpen] = useState<Panel>(null)
  const music = useAppStore((state) => state.musicState)
  const synth = useAppStore((state) => state.synthState)
  const visual = useAppStore((state) => state.visualState)
  const updateMusic = useAppStore((state) => state.updateMusic)
  const updateSynth = useAppStore((state) => state.updateSynth)
  const updateVisual = useAppStore((state) => state.updateVisual)

  const toggle = (panel: Exclude<Panel, null>) => setOpen((current) => current === panel ? null : panel)

  return (
    <>
      <div className="edge-hints left">
        <button onClick={() => toggle('music')}>♫</button>
        <button onClick={() => toggle('visual')}>◈</button>
      </div>
      <div className="edge-hints right">
        <button onClick={() => toggle('synth')}>≋</button>
      </div>

      <aside className={`phase-panel music-panel ${open === 'music' ? 'open' : ''}`}>
        <button className="panel-close" onClick={() => setOpen(null)}>×</button>
        <h2>MUSIC</h2>
        <label className="panel-select">Scale
          <select value={music.scaleIndex} onChange={(e) => updateMusic({ scaleIndex: Number(e.target.value), useChordMapping: false })}>
            {SCALE_NAMES.map((name, index) => <option key={name} value={index}>{name}</option>)}
          </select>
        </label>
        <label className="panel-select">Key
          <select value={music.keyIndex} onChange={(e) => updateMusic({ keyIndex: Number(e.target.value) })}>
            {KEY_NAMES.map((name, index) => <option key={name} value={index}>{name}</option>)}
          </select>
        </label>
        <Slider label="Octave" value={music.octaveIndex} min={0} max={6} step={1} onChange={(octaveIndex) => updateMusic({ octaveIndex })} />
        <Slider label="Figure" value={music.figureIndex} min={0} max={6} step={1} onChange={(figureIndex) => updateMusic({ figureIndex })} />
      </aside>

      <aside className={`phase-panel synth-panel ${open === 'synth' ? 'open' : ''}`}>
        <button className="panel-close" onClick={() => setOpen(null)}>×</button>
        <h2>SYNTH</h2>
        <div className="osc-row">
          {([
            ['SUB', 'subOsc'], ['SIN', 'sinOsc'], ['SAW', 'sawOsc'],
            ['SQR', 'sqrOsc'], ['NOI', 'noiseOsc'],
          ] as const).map(([label, key]) => (
            <button key={key} className={synth[key] ? 'active' : ''} onClick={() => updateSynth({ [key]: !synth[key] })}>{label}</button>
          ))}
        </div>
        <Slider label="Cutoff" value={synth.cutoff} onChange={(cutoff) => updateSynth({ cutoff })} />
        <Slider label="Resonance" value={synth.resonance} onChange={(resonance) => updateSynth({ resonance })} />
        <Slider label="Envelope" value={synth.envelope} min={-1} max={1} onChange={(envelope) => updateSynth({ envelope })} />
        <Slider label="Attack" value={synth.attack} onChange={(attack) => updateSynth({ attack })} />
        <Slider label="Release" value={synth.release} onChange={(release) => updateSynth({ release })} />
        <Slider label="Distortion" value={synth.distortion} onChange={(distortion) => updateSynth({ distortion })} />
        <Slider label="FM" value={synth.fm} onChange={(fm) => updateSynth({ fm })} />
        <Slider label="FM amount" value={synth.fmAmount} onChange={(fmAmount) => updateSynth({ fmAmount })} />
        <Slider label="Feedback" value={synth.feedback} min={0} max={0.49} onChange={(feedback) => updateSynth({ feedback })} />
      </aside>

      <aside className={`phase-panel visual-panel ${open === 'visual' ? 'open' : ''}`}>
        <button className="panel-close" onClick={() => setOpen(null)}>×</button>
        <h2>VISUAL</h2>
        <button className={`wide-toggle ${visual.acidEnabled ? 'active' : ''}`} onClick={() => updateVisual({ acidEnabled: !visual.acidEnabled })}>ACID</button>
        <label className="panel-select">Pattern
          <select value={visual.acidPattern} onChange={(e) => updateVisual({ acidPattern: e.target.value as AcidPatternType })}>
            {['grid', 'wave', 'grad1', 'grad2', 'grad3', 'acid'].map((name) => <option key={name} value={name.toLowerCase()}>{name.toUpperCase()}</option>)}
          </select>
        </label>
        <Slider label="Hue" value={visual.acidHue} onChange={(acidHue) => updateVisual({ acidHue })} />
        <Slider label="Size" value={visual.acidSize} onChange={(acidSize) => updateVisual({ acidSize })} />
        <Slider label="Rotation" value={visual.acidRotation} onChange={(acidRotation) => updateVisual({ acidRotation })} />
        <Slider label="Alpha" value={visual.acidAlpha} onChange={(acidAlpha) => updateVisual({ acidAlpha })} />
        <Slider label="Speed" value={visual.acidSpeed} min={0} max={2} onChange={(acidSpeed) => updateVisual({ acidSpeed })} />
        <Slider label="Brightness size" value={visual.brightnessSize} min={0} max={0.3} onChange={(brightnessSize) => updateVisual({ brightnessSize })} />
        <Slider label="Blob blend" value={visual.blobBlend} onChange={(blobBlend) => updateVisual({ blobBlend })} />
      </aside>
      {open && <button className="panel-scrim" aria-label="Close panel" onClick={() => setOpen(null)} />}
    </>
  )
}
