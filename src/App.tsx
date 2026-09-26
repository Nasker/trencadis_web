import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from './state/store'
import { startCamera } from './camera/cameraSource'
import type { PixelData, PixelGrid } from './camera/pixelGrid'
import { armResumeAudioOnInteraction, unlockAudio } from './audio/audioContext'
import { synth } from './audio/engine'
import { playPixel } from './audio/pixelToAudio'
import { StartOverlay } from './ui/StartOverlay'
import { CameraCanvas } from './render/CameraCanvas'

export default function App() {
  const status = useAppStore((s) => s.status)
  const errorMessage = useAppStore((s) => s.errorMessage)
  const isAudioInitialized = useAppStore((s) => s.isAudioInitialized)
  const setStatus = useAppStore((s) => s.setStatus)
  const setAudioUnlocked = useAppStore((s) => s.setAudioUnlocked)
  const setAudioInitialized = useAppStore((s) => s.setAudioInitialized)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)

  useEffect(() => {
    armResumeAudioOnInteraction()
  }, [])

  const onStep = useCallback((pixel: PixelData, grid: PixelGrid) => {
    if (synth.isInitialized) playPixel(synth, pixel, grid)
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

      await startCamera(v, 'environment')

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
      {video && <CameraCanvas video={video} onStep={onStep} />}
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
