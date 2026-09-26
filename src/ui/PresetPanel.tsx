import { useEffect, useRef, useState } from 'react'
import {
  decodePreset,
  deletePreset,
  downloadPreset,
  encodePreset,
  listPresets,
  parsePresetFile,
  savePreset,
  type AndroidPreset,
} from '../preset/presetManager'
import { useAppStore } from '../state/store'

const BUNDLED = [
  'Acid_Tangle', 'Acid_Trip', 'Ambient_Pad', 'Bassment', 'Blob_Noise',
  'Chord_Mosaic', 'Cubist_Dawn', 'Deep_Meditation', 'Front_Pixel', 'Gipsy_Dream',
  'Glass_Blend', 'Glitch_Tape', 'Kaleidoscope', 'MIDI_Grid', 'MIDI_Sequencer',
  'Noise_Garden', 'Pixel_Storm', 'Stained_Glass', 'face_melting', 'ringingtrip', 'typicalseq',
]

interface Props {
  open: boolean
  onClose: () => void
}

export function PresetPanel({ open, onClose }: Props) {
  const [name, setName] = useState('')
  const [presets, setPresets] = useState<AndroidPreset[]>([])
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const applyPresetState = useAppStore((state) => state.applyPresetState)

  const refresh = () => setPresets(listPresets())

  useEffect(() => {
    const existing = new Set(listPresets().map((preset) => preset.name))
    Promise.all(BUNDLED.map(async (fileName) => {
      if (existing.has(fileName.replaceAll('_', ' '))) return
      const response = await fetch(`${import.meta.env.BASE_URL}presets/${fileName}.json`)
      if (response.ok) savePreset(await response.json() as AndroidPreset)
    })).finally(refresh)
  }, [])

  const currentState = () => {
    const state = useAppStore.getState()
    return {
      synth: state.synthState,
      music: state.musicState,
      visual: state.visualState,
      selectionMode: state.selectionMode,
      gridColumns: state.gridColumns,
    }
  }

  const load = (preset: AndroidPreset) => {
    applyPresetState(decodePreset(preset, currentState()))
    onClose()
  }

  const save = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    savePreset(encodePreset(trimmed, currentState()))
    setName('')
    refresh()
  }

  const importFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const preset = await parsePresetFile(file)
      savePreset(preset)
      refresh()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <aside className={`phase-panel preset-panel ${open ? 'open' : ''}`}>
      <button className="panel-close" onClick={onClose}>×</button>
      <h2>💾 PRESETS</h2>
      <span className="preset-section-label">SAVE NEW</span>
      <div className="preset-save-row">
        <input value={name} maxLength={30} placeholder="Enter name..." onChange={(event) => setName(event.target.value)} />
        <button disabled={!name.trim()} onClick={save}>SAVE</button>
      </div>
      <div className="preset-tools">
        <button onClick={() => inputRef.current?.click()}>IMPORT</button>
        <input ref={inputRef} hidden type="file" accept="application/json,.json" onChange={(event) => importFile(event.target.files?.[0])} />
      </div>
      <span className="preset-section-label">LOAD PRESET</span>
      <div className="preset-list">
        {presets.map((preset) => confirmDelete === preset.name ? (
          <div className="preset-delete" key={preset.name}>
            <span>Delete?</span>
            <button onClick={() => { deletePreset(preset.name); setConfirmDelete(null); refresh() }}>YES</button>
            <button onClick={() => setConfirmDelete(null)}>NO</button>
          </div>
        ) : (
          <div className="preset-item" key={preset.name}>
            <button className="preset-name" onClick={() => load(preset)}>{preset.name}</button>
            <button className="preset-export" onClick={() => downloadPreset(preset)}>↗</button>
            <button className="preset-remove" onClick={() => setConfirmDelete(preset.name)}>×</button>
          </div>
        ))}
      </div>
    </aside>
  )
}
