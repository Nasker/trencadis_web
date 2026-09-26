import type { PixelData, PixelGrid } from './pixelGrid'

export interface Point {
  x: number
  y: number
}

export interface PixelBlob {
  id: number
  hull: Point[]
  center: Point
  averageColor: PixelData
}

function colorClass(pixel: PixelData, buckets: number): number {
  const hue = Math.floor(pixel.hue / 360 * buckets) % buckets
  return hue * 4 + (pixel.saturation > 0.4 ? 2 : 0) + (pixel.brightness > 0.4 ? 1 : 0)
}

function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
}

function convexHull(points: Point[]): Point[] {
  if (points.length <= 3) return points
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
  const lower: Point[] = []
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower.at(-2)!, lower.at(-1)!, point) <= 0) lower.pop()
    lower.push(point)
  }
  const upper: Point[] = []
  for (let i = sorted.length - 1; i >= 0; i--) {
    const point = sorted[i]
    while (upper.length >= 2 && cross(upper.at(-2)!, upper.at(-1)!, point) <= 0) upper.pop()
    upper.push(point)
  }
  lower.pop()
  upper.pop()
  return lower.concat(upper)
}

export function detectBlobs(grid: PixelGrid): PixelBlob[] {
  const { cols, rows, pixels } = grid
  const classes = pixels.map((pixel) => colorClass(pixel, 12))
  const visited = new Uint8Array(pixels.length)
  const blobs: PixelBlob[] = []

  for (let start = 0; start < pixels.length && blobs.length < 120; start++) {
    if (visited[start]) continue
    const target = classes[start]
    const stack = [start]
    const component: number[] = []
    visited[start] = 1

    while (stack.length && component.length < 240) {
      const index = stack.pop()!
      component.push(index)
      const x = index % cols
      const y = Math.floor(index / cols)
      const neighbors = [
        x > 0 ? index - 1 : -1,
        x < cols - 1 ? index + 1 : -1,
        y > 0 ? index - cols : -1,
        y < rows - 1 ? index + cols : -1,
      ]
      for (const neighbor of neighbors) {
        if (neighbor >= 0 && !visited[neighbor] && classes[neighbor] === target) {
          visited[neighbor] = 1
          stack.push(neighbor)
        }
      }
    }

    if (component.length < 4) continue
    let red = 0
    let green = 0
    let blue = 0
    let brightness = 0
    let hue = 0
    let saturation = 0
    let centerX = 0
    let centerY = 0
    const points: Point[] = []
    for (const index of component) {
      const pixel = pixels[index]
      red += pixel.red
      green += pixel.green
      blue += pixel.blue
      brightness += pixel.brightness
      hue += pixel.hue
      saturation += pixel.saturation
      centerX += pixel.gridX
      centerY += pixel.gridY
      points.push({ x: pixel.gridX + 0.5, y: pixel.gridY + 0.5 })
    }
    const n = component.length
    blobs.push({
      id: blobs.length,
      hull: convexHull(points),
      center: { x: centerX / n, y: centerY / n },
      averageColor: {
        gridX: Math.round(centerX / n),
        gridY: Math.round(centerY / n),
        red: red / n,
        green: green / n,
        blue: blue / n,
        brightness: brightness / n,
        hue: hue / n,
        saturation: saturation / n,
      },
    })
  }

  return blobs
}
