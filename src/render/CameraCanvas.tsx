import { useEffect, useRef, type MutableRefObject } from 'react'
import { detectBlobs, type PixelBlob } from '../camera/blobDetector'
import { rgbToPixel, type PixelData, type PixelGrid, type PixelSelectionMode } from '../camera/pixelGrid'
import { AcidPattern } from './acidPattern'
import type { VisualState } from '../state/models'

interface Props {
  video: HTMLVideoElement
  image: HTMLImageElement | null
  mode: PixelSelectionMode
  playing: boolean
  periodMs: number
  columns: number
  mirrorX: boolean
  visual: VisualState
  envelope: MutableRefObject<number>
  onStep: (pixel: PixelData, grid: PixelGrid) => void
  onSelected: (pixel: PixelData | null) => void
}

/**
 * Phase 0 placeholder for the CubistCanvas port: draws the camera feed
 * full-screen with a cover-fit center crop (the same crop math the pixel
 * grid sampler will use in Phase 2). Draws in device pixels.
 */
export function CameraCanvas({
  video,
  image,
  mode,
  playing,
  periodMs,
  columns,
  mirrorX,
  visual,
  envelope,
  onStep,
  onSelected,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let stopped = false
    let raf = 0
    let previousColors: Float32Array | null = null
    let lastStep = -1
    let lastPointerCell = -1
    let frameCount = 0
    let smoothedSize: Float32Array | null = null
    let smoothedRotation: Float32Array | null = null
    const envelopeTrail: number[] = []
    let currentPixels: PixelData[] = []
    let currentGrid: PixelGrid = { cols: 0, rows: 0, pixels: [] }
    let currentBlobs: PixelBlob[] = []
    let lastSampleTime = 0
    const SAMPLE_INTERVAL_MS = 1000 / 30
    const acid = new AcidPattern()
    const pointer = { x: 0, y: 0, down: false }
    const sampleCanvas = document.createElement('canvas')
    const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true })
    if (!sampleCtx) return

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(window.innerWidth * dpr)
      canvas.height = Math.round(window.innerHeight * dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    const updatePointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointer.x = (event.clientX - rect.left) / rect.width
      pointer.y = (event.clientY - rect.top) / rect.height
    }
    const pointerDown = (event: PointerEvent) => {
      pointer.down = true
      updatePointer(event)
      canvas.setPointerCapture(event.pointerId)
    }
    const pointerMove = (event: PointerEvent) => updatePointer(event)
    const pointerUp = () => {
      pointer.down = false
      lastPointerCell = -1
      onSelected(null)
    }
    canvas.addEventListener('pointerdown', pointerDown)
    canvas.addEventListener('pointermove', pointerMove)
    canvas.addEventListener('pointerup', pointerUp)
    canvas.addEventListener('pointercancel', pointerUp)

    const drawBlobs = (blobs: PixelBlob[], blockWidth: number, blockHeight: number, selected: PixelData | null) => {
      for (const blob of [...blobs].sort((a, b) => a.averageColor.brightness - b.averageColor.brightness)) {
        if (blob.hull.length < 3) continue
        const cx = blob.center.x * blockWidth
        const cy = blob.center.y * blockHeight
        let rippleScale = 1
        let rippleRotation = 0
        if (selected && envelopeTrail.length) {
          const dx = blob.center.x - selected.gridX
          const dy = blob.center.y - selected.gridY
          const distance = Math.sqrt(dx * dx + dy * dy)
          const trailIndex = Math.floor(distance / 2.5)
          const value = envelopeTrail[trailIndex] ?? 0
          // Blobs get half the tile swell so neighbouring shards stay readable.
          rippleScale += 0.8 * value / (1 + distance * 0.05)
          rippleRotation = 35 * value / (1 + distance * 0.08)
        }
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(rippleRotation * Math.PI / 180)
        ctx.scale(rippleScale, rippleScale)
        ctx.translate(-cx, -cy)
        ctx.beginPath()
        ctx.moveTo(blob.hull[0].x * blockWidth, blob.hull[0].y * blockHeight)
        for (let i = 1; i < blob.hull.length; i++) {
          ctx.lineTo(blob.hull[i].x * blockWidth, blob.hull[i].y * blockHeight)
        }
        ctx.closePath()
        const color = blob.averageColor
        ctx.fillStyle = `rgba(${color.red * 255},${color.green * 255},${color.blue * 255},${visual.blobBlend})`
        ctx.fill()
        ctx.restore()
      }
    }

    const draw = (now = performance.now()) => {
      if (stopped) return
      const source = image ?? video
      const sourceReady = image
        ? image.complete && image.naturalWidth > 0
        : video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0
      const w = canvas.width
      const h = canvas.height
      const cols = columns
      const rows = Math.max(1, Math.round(cols * h / w))
      const gridChanged = currentGrid.cols !== cols || currentGrid.rows !== rows
      if (sourceReady && (now - lastSampleTime >= SAMPLE_INTERVAL_MS || gridChanged)) {
        lastSampleTime = now
        const vw = image?.naturalWidth ?? video.videoWidth
        const vh = image?.naturalHeight ?? video.videoHeight
        sampleCanvas.width = cols
        sampleCanvas.height = rows

        const scale = Math.max(cols / vw, rows / vh)
        const sw = cols / scale
        const sh = rows / scale
        const sx = (vw - sw) / 2
        const sy = (vh - sh) / 2
        sampleCtx.setTransform(mirrorX && !image ? -1 : 1, 0, 0, 1, mirrorX && !image ? cols : 0, 0)
        sampleCtx.drawImage(source, sx, sy, sw, sh, 0, 0, cols, rows)
        sampleCtx.resetTransform()
        const rgba = sampleCtx.getImageData(0, 0, cols, rows).data
        if (!previousColors || previousColors.length !== cols * rows * 3) {
          previousColors = new Float32Array(cols * rows * 3)
        }

        const pixels: PixelData[] = []
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const pixelIndex = row * cols + col
            const rgbaIndex = pixelIndex * 4
            const colorIndex = pixelIndex * 3
            const red = previousColors[colorIndex] * 0.6 + rgba[rgbaIndex] / 255 * 0.4
            const green = previousColors[colorIndex + 1] * 0.6 + rgba[rgbaIndex + 1] / 255 * 0.4
            const blue = previousColors[colorIndex + 2] * 0.6 + rgba[rgbaIndex + 2] / 255 * 0.4
            previousColors[colorIndex] = red
            previousColors[colorIndex + 1] = green
            previousColors[colorIndex + 2] = blue
            pixels.push(rgbToPixel(col, row, red, green, blue))
          }
        }

        currentGrid = { cols, rows, pixels }
        currentPixels = pixels
        frameCount++
        if (frameCount % 2 === 0) currentBlobs = detectBlobs(currentGrid)
      }

      if (currentPixels.length > 0) {
        acid.tick(visual.acidEnabled ? visual.acidSpeed * 0.025 : 0)
        const envValue = Math.max(0, envelope.current)
        const quiet = envValue <= 0.001 && envelopeTrail.length >= 24 && envelopeTrail.every((v) => v <= 0.001)
        if (!quiet) {
          envelopeTrail.unshift(envValue)
          while (envelopeTrail.length > 24) envelopeTrail.pop()
        }

        const grid = currentGrid
        const pixels = currentPixels
        let selected: PixelData | null = null
        let selectionKey = -1

        const step = Math.floor(now / periodMs)
        if (mode === 'sequence') {
          selected = pixels[step % pixels.length]
          selectionKey = step
        } else if (mode === 'brightest') {
          selected = pixels.reduce((best, pixel) =>
            pixel.brightness > best.brightness ? pixel : best,
          )
          selectionKey = step
        } else if (mode === 'center') {
          selected = pixels[Math.floor(grid.cols / 2) + Math.floor(grid.rows / 2) * grid.cols]
          selectionKey = step % pixels.length
        } else if (pointer.down) {
          const col = Math.max(0, Math.min(grid.cols - 1, Math.floor(pointer.x * grid.cols)))
          const row = Math.max(0, Math.min(grid.rows - 1, Math.floor(pointer.y * grid.rows)))
          selectionKey = row * grid.cols + col
          selected = pixels[selectionKey]
        }

        if (selected && playing && selectionKey !== (mode === 'pointer' ? lastPointerCell : lastStep)) {
          if (mode === 'pointer') lastPointerCell = selectionKey
          else lastStep = selectionKey
          onStep(selected, grid)
        }
        onSelected(selected)

        const blockWidth = w / grid.cols
        const blockHeight = h / grid.rows
        const baseSize = Math.sqrt(blockWidth * blockHeight)
        ctx.fillStyle = selected
          ? `rgba(${selected.red * 255},${selected.green * 255},${selected.blue * 255},0.22)`
          : '#000'
        ctx.fillRect(0, 0, w, h)

        if (!smoothedSize || !smoothedRotation || smoothedSize.length !== pixels.length) {
          smoothedSize = new Float32Array(pixels.length)
          smoothedRotation = new Float32Array(pixels.length)
        }

        for (const pixel of [...pixels].sort((a, b) => a.brightness - b.brightness)) {
          const x = (pixel.gridX + 0.5) * blockWidth
          const y = (pixel.gridY + 0.5) * blockHeight
          const angle = acid.animatedAngle(
            pixel.gridX,
            pixel.gridY,
            visual.acidPattern,
            visual.acidSpeed,
          )
          const acidHue = acid.hue(angle)
          const hue = visual.acidEnabled
            ? pixel.hue * (1 - visual.acidHue) + acidHue * visual.acidHue
            : pixel.hue
          const pixelIndex = pixel.gridY * grid.cols + pixel.gridX
          let rippleScale = 1
          let rippleRotation = 0
          if (selected && envelopeTrail.length) {
            const dx = pixel.gridX - selected.gridX
            const dy = pixel.gridY - selected.gridY
            const distance = Math.sqrt(dx * dx + dy * dy)
            const trailIndex = Math.floor(distance / 2.5)
            const value = envelopeTrail[trailIndex] ?? 0
            const attenuation = 1 / (1 + distance * 0.05)
            rippleScale += 1.6 * value * attenuation
            rippleRotation = 70 * value / (1 + distance * 0.08)
          }
          const targetSize = baseSize
            * (0.5 + pixel.brightness * 10 * visual.brightnessSize)
            * (visual.acidEnabled ? acid.size(angle, visual.acidSize) : 1)
            * rippleScale
          const targetRotation = pixel.hue / 360 * 54
            + (visual.acidEnabled ? acid.rotation(angle, 90 * visual.acidRotation) : 0)
            + rippleRotation
          const prevSize = smoothedSize[pixelIndex]
          const prevRotation = smoothedRotation[pixelIndex]
          const size = prevSize === 0 ? targetSize : prevSize * 0.6 + targetSize * 0.4
          const rotation = prevRotation === 0 ? targetRotation : prevRotation * 0.6 + targetRotation * 0.4
          smoothedSize[pixelIndex] = size
          smoothedRotation[pixelIndex] = rotation
          const baseAlpha = 0.5 + pixel.brightness * 0.45
          const alpha = baseAlpha * (
            (1 - (visual.acidEnabled ? visual.acidAlpha : 0))
            + acid.alpha(angle, 0.3, 1) * (visual.acidEnabled ? visual.acidAlpha : 0)
          )
          ctx.save()
          ctx.translate(x, y)
          ctx.rotate(rotation * Math.PI / 180)
          ctx.fillStyle = `hsla(${hue},${Math.min(100, pixel.saturation * 160)}%,${Math.min(70, pixel.brightness * 58)}%,${alpha})`
          ctx.fillRect(-size / 2, -size / 2, size, size)
          ctx.restore()
        }

        drawBlobs(currentBlobs, blockWidth, blockHeight, selected)

        if (selected) {
          ctx.beginPath()
          ctx.arc(
            (selected.gridX + 0.5) * blockWidth,
            (selected.gridY + 0.5) * blockHeight,
            Math.max(2.5, baseSize * 0.07),
            0,
            Math.PI * 2,
          )
          ctx.fillStyle = 'rgba(255,255,255,0.82)'
          ctx.fill()
        }
      }
      schedule()
    }

    const schedule = () => {
      if (image || video.paused) {
        raf = requestAnimationFrame(draw)
        return
      }
      const v = video as HTMLVideoElement & {
        requestVideoFrameCallback?: (cb: () => void) => number
      }
      if (v.requestVideoFrameCallback) {
        v.requestVideoFrameCallback(draw)
      } else {
        raf = requestAnimationFrame(draw)
      }
    }
    schedule()

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointerdown', pointerDown)
      canvas.removeEventListener('pointermove', pointerMove)
      canvas.removeEventListener('pointerup', pointerUp)
      canvas.removeEventListener('pointercancel', pointerUp)
    }
  }, [video, image, mode, playing, periodMs, columns, mirrorX, visual, onStep, onSelected])

  return <canvas ref={canvasRef} className="camera-canvas" />
}
