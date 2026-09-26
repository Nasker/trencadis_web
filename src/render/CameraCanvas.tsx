import { useEffect, useRef } from 'react'
import { rgbToPixel, type PixelData, type PixelGrid } from '../camera/pixelGrid'

interface Props {
  video: HTMLVideoElement
  onStep: (pixel: PixelData, grid: PixelGrid) => void
}

/**
 * Phase 0 placeholder for the CubistCanvas port: draws the camera feed
 * full-screen with a cover-fit center crop (the same crop math the pixel
 * grid sampler will use in Phase 2). Draws in device pixels.
 */
export function CameraCanvas({ video, onStep }: Props) {
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

    const draw = (now = performance.now()) => {
      if (stopped) return
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
        const w = canvas.width
        const h = canvas.height
        const vw = video.videoWidth
        const vh = video.videoHeight
        const cols = 18
        const rows = Math.max(1, Math.round(cols * h / w))
        sampleCanvas.width = cols
        sampleCanvas.height = rows

        const scale = Math.max(cols / vw, rows / vh)
        const sw = cols / scale
        const sh = rows / scale
        const sx = (vw - sw) / 2
        const sy = (vh - sh) / 2
        sampleCtx.drawImage(video, sx, sy, sw, sh, 0, 0, cols, rows)
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

        const grid = { cols, rows, pixels }
        const step = Math.floor(now / 500)
        const selectedIndex = step % pixels.length
        const selected = pixels[selectedIndex]
        if (step !== lastStep) {
          lastStep = step
          onStep(selected, grid)
        }

        const blockWidth = w / cols
        const blockHeight = h / rows
        const baseSize = Math.sqrt(blockWidth * blockHeight)
        ctx.fillStyle = `rgba(${selected.red * 255},${selected.green * 255},${selected.blue * 255},0.22)`
        ctx.fillRect(0, 0, w, h)

        for (const pixel of [...pixels].sort((a, b) => a.brightness - b.brightness)) {
          const x = (pixel.gridX + 0.5) * blockWidth
          const y = (pixel.gridY + 0.5) * blockHeight
          const size = baseSize * (0.5 + pixel.brightness * 1.3)
          ctx.save()
          ctx.translate(x, y)
          ctx.rotate(pixel.hue / 360 * 54 * Math.PI / 180)
          ctx.fillStyle = `rgba(${pixel.red * 255},${pixel.green * 255},${pixel.blue * 255},${0.5 + pixel.brightness * 0.45})`
          ctx.fillRect(-size / 2, -size / 2, size, size)
          ctx.restore()
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.95)'
        ctx.lineWidth = Math.max(2, canvas.width / 500)
        ctx.strokeRect(
          selected.gridX * blockWidth + 2,
          selected.gridY * blockHeight + 2,
          blockWidth - 4,
          blockHeight - 4,
        )
      }
      schedule()
    }

    const schedule = () => {
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
    }
  }, [video, onStep])

  return <canvas ref={canvasRef} className="camera-canvas" />
}
