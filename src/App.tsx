import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from './state/store'
import { shouldMirrorCamera, startCamera } from './camera/cameraSource'
import type { PixelData, PixelGrid } from './camera/pixelGrid'
import { armResumeAudioOnInteraction, unlockAudio } from './audio/audioContext'
import { synth } from './audio/engine'
import { playPixel } from './audio/pixelToAudio'
import { calculateFrequency } from './audio/musicConstants'
import { webMidi } from './midi/WebMidi'
import { StartOverlay } from './ui/StartOverlay'
import { CameraCanvas } from './render/CameraCanvas'
import { PhasePanels } from './ui/PhasePanels'

export default function App() {
  const status = useAppStore((s) => s.status)
  const errorMessage = useAppStore((s) => s.errorMessage)
  const isAudioInitialized = useAppStore((s) => s.isAudioInitialized)
  const setStatus = useAppStore((s) => s.setStatus)
  const setAudioUnlocked = useAppStore((s) => s.setAudioUnlocked)
  const setAudioInitialized = useAppStore((s) => s.setAudioInitialized)
  const mode = useAppStore((s) => s.selectionMode)
  const playing = useAppStore((s) => s.isPlaying)
  const columns = useAppStore((s) => s.gridColumns)
  const bpm = useAppStore((s) => s.musicState.tempo)
  const figure = useAppStore((s) => s.musicState.figureIndex)
  const visual = useAppStore((s) => s.visualState)
  const setSelected = useAppStore((s) => s.setSelectedPixel)
  const updateMidi = useAppStore((s) => s.updateMidi)
  const updateMusic = useAppStore((s) => s.updateMusic)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)
  const [mirrorX, setMirrorX] = useState(false)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [frozen, setFrozen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const imageUrl = useRef<string | null>(null)
  const envelope = useRef(0)

  useEffect(() => {
    armResumeAudioOnInteraction()
    synth.setOnEnvelopeReceived((value) => {
      envelope.current = value
    })
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFullscreenChange)
    const unsubscribeMidi = webMidi.subscribe((snapshot) => {
      updateMidi(snapshot)
      const state = useAppStore.getState()
      if (state.midiState.syncSource === 'external' && snapshot.externalClockAvailable && snapshot.externalBpm > 0) {
        updateMusic({ tempo: snapshot.externalBpm })
      }
    })
    return () => {
      synth.setOnEnvelopeReceived(null)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      unsubscribeMidi()
      webMidi.allNotesOff()
    }
  }, [updateMidi, updateMusic])

  const onStep = useCallback((pixel: PixelData, grid: PixelGrid) => {
    const state = useAppStore.getState()
    const midi = state.midiState
    if (midi.outputMode !== 'midi' && synth.isInitialized) {
      playPixel(synth, pixel, grid, state.musicState, state.synthState)
    }
    if (midi.enabled && midi.outputMode !== 'internal') {
      const frequency = calculateFrequency(pixel.hue, state.musicState)
      const note = 69 + 12 * Math.log2(frequency / 440)
      const stepMs = (60000 / state.musicState.tempo) / 2 ** (state.musicState.figureIndex - 2)
      webMidi.noteOn(note, pixel.brightness * 127, midi.channel, stepMs * state.synthState.gateLength)
    }
  }, [])

  const onSelected = useCallback((pixel: PixelData | null) => {
    setSelected(pixel)
    if (!pixel) {
      if (synth.isInitialized) synth.setNoteOn(false)
      webMidi.allNotesOff(useAppStore.getState().midiState.channel)
    }
  }, [setSelected])

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      // Browsers may reject the request silently; keep running without fullscreen.
    }
  }, [])

  const toggleFreeze = useCallback(() => {
    const currentVideo = videoRef.current
    if (!currentVideo) return
    if (frozen) {
      setImage(null)
      if (imageUrl.current) URL.revokeObjectURL(imageUrl.current)
      imageUrl.current = null
      void currentVideo.play()
      setFrozen(false)
    } else {
      currentVideo.pause()
      setFrozen(true)
    }
  }, [frozen])

  const loadImage = useCallback((file: File) => {
    if (imageUrl.current) URL.revokeObjectURL(imageUrl.current)
    const url = URL.createObjectURL(file)
    imageUrl.current = url
    const loaded = new Image()
    loaded.onload = () => {
      videoRef.current?.pause()
      setImage(loaded)
      setFrozen(true)
    }
    loaded.onerror = () => {
      URL.revokeObjectURL(url)
      if (imageUrl.current === url) imageUrl.current = null
    }
    loaded.src = url
  }, [])

  useEffect(() => () => {
    if (imageUrl.current) URL.revokeObjectURL(imageUrl.current)
  }, [])

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
      void document.documentElement.requestFullscreen().catch(() => {})
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
          image={image}
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
      {status === 'running' && <PhasePanels frozen={frozen} onToggleFreeze={toggleFreeze} onLoadImage={loadImage} isFullscreen={isFullscreen} onToggleFullscreen={toggleFullscreen} />}
      {status === 'running' && (
        <div className="debug-hud">
          {isAudioInitialized ? 'camera → tiles → hue notes' : 'audio ✗ (see console)'}
        </div>
      )}
      {status !== 'running' && (
        <StartOverlay status={status} errorMessage={errorMessage} onStart={start} />
      )}
    </div>
  )
}
