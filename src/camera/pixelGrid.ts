export interface PixelData {
  gridX: number
  gridY: number
  red: number
  green: number
  blue: number
  brightness: number
  hue: number
  saturation: number
}

export interface PixelGrid {
  cols: number
  rows: number
  pixels: PixelData[]
}

export type PixelSelectionMode = 'sequence' | 'brightest' | 'center' | 'pointer'

export function rgbToPixel(
  gridX: number,
  gridY: number,
  red: number,
  green: number,
  blue: number,
): PixelData {
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min
  let hue = 0

  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta + (green < blue ? 6 : 0)) * 60
    else if (max === green) hue = ((blue - red) / delta + 2) * 60
    else hue = ((red - green) / delta + 4) * 60
  }

  return {
    gridX,
    gridY,
    red,
    green,
    blue,
    brightness: max,
    hue,
    saturation: max === 0 ? 0 : delta / max,
  }
}
