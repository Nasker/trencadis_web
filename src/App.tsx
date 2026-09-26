import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from './state/store'
import { shouldMirrorCamera, startCamera } from './camera/cameraSource'
import type { PixelData, PixelGrid } from './camera/pixelGrid'
import { armResumeAudioOnInteraction, unlockAudio } from './audio/audioContext'
import { synth } from './audio/engine'
import { playPixel } from './audio/pixelToAudio'
import { StartOverlay } from './ui/StartOverlay'
import { CameraCanvas } from './render/CameraCanvas'
import { TransportControls } from './ui/TransportControls'
import { PhasePanels } from './ui/PhasePanels'

export default function App() {
  const status = useAppStore((s) => s.status)
  const errorMessage = useAppStore((s) => s.errorMessage)
  const isAudioInitialized = useAppStore((s) => s.isAudioInitialized)
  const setStatus = useAppStore((s) => s.setStatus)
  const setAudioUnlocked = useAppStore((s) => s.setAudioUnlocked)
  const setAudioInitialized = useAppStore((s) => s.setAudioInitialized)
  const mode = useAppStore((s) => s.selectionMode)
  const selected = useAppStore((s) => s.selectedPixel)
  const playing = useAppStore((s) => s.isPlaying)
  const columns = useAppStore((s) => s.gridColumns)
  const bpm = useAppStore((s) => s.musicState.tempo)
  const figure = useAppStore((s) => s.musicState.figureIndex)
  const visual = useAppStore((s) => s.visualState)
  const setMode = useAppStore((s) => s.setSelectionMode)
  const setSelected = useAppStore((s) => s.setSelectedPixel)
  const setPlaying = useAppStore((s) => s.setPlaying)
  const setColumns = useAppStore((s) => s.setGridColumns)
  const updateMusic = useAppStore((s) => s.updateMusic)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)
  const [mirrorX, setMirrorX] = useState(false)
  const envelope = useRef(0)

  useEffect(() => {
    armResumeAudioOnInteraction()
    synth.setOnEnvelopeReceived((value) => {
      envelope.current = value
    })
    return () => synth.setOnEnvelopeReceived(null)
  }, [])

  const onStep = useCallback((pixel: PixelData, grid: PixelGrid) => {
    if (!synth.isInitialized) return
    const state = useAppStore.getState()
    playPixel(synth, pixel, grid, state.musicState, state.synthState)
  }, [])

  const onSelected = useCallback((pixel: PixelData | null) => {
    setSelected(pixel)
    if (!pixel && synth.isInitialized) synth.setNoteOn(false)
  }, [])

  const changePlaying = useCallback((next: boolean) => {
    setPlaying(next)
    if (!next && synth.isInitialized) synth.setNoteOn(false)
  }, [setPlaying])

  const start = useCallback(async () => {
    const v = videoRef.current
    if (!v) return
    setStatus('starting')
    try {
      // Audio unlock first, synchronously inside the tap gesture — the
      // camera-permission await below would consume transient activation.
      const ctx = unlockAudio()
      setAudioUnlocked(true)

      const stream = await startCamera(v, 'environment')
      setMirrorX(shouldMirrorCamera(stream, 'environment'))

      // Phase 1 spike: init libpd-WASM engine and drive it the way the
      // Android ViewModel does — NoteOn on + a JS-triggered bang per step
      // (the in-patch metro is kept on too, like sequencer modes).
      const ok = await synth.initialize(ctx)
      setAudioInitialized(ok)
      if (ok) synth.setMetroOn(false)

      setVideo(v)
      setStatus('running')
    } catch (e) {
      setStatus('error', e instanceof Error ? e.message : String(e))
    }
  }, [setStatus, setAudioUnlocked, setAudioInitialized])

  return (
    <div className="app">
      {/* Hidden source video — mirrors the Android off-screen preview at x=-10000dp */}
      <video ref={videoRef} className="hidden-video" playsInline muted />
      {video && (
        <CameraCanvas
          video={video}
          mode={mode}
          playing={playing}
          periodMs={(60000 / bpm) / 2 ** (figure - 2)}
          columns={columns}
          mirrorX={mirrorX}
          visual={visual}
          envelope={envelope}
          onStep={onStep}
          onSelected={onSelected}
        />
      )}
      {status === 'running' && <PhasePanels />}
      {status === 'running' && (
        <div className="debug-hud">
          {isAudioInitialized ? 'camera → tiles → hue notes' : 'audio ✗ (see console)'}
        </div>
      )}
      {status === 'running' && (
        <TransportControls
          mode={mode}
          playing={playing}
          bpm={bpm}
          columns={columns}
          selected={selected}
          onMode={setMode}
          onPlaying={changePlaying}
          onBpm={(tempo) => updateMusic({ tempo })}
          onColumns={setColumns}
        />
      )}
      {status !== 'running' && (
        <StartOverlay status={status} errorMessage={errorMessage} onStart={start} />
      )}
    </div>
  )
}
