export type AcidPatternType =
  | 'grid'
  | 'wave'
  | 'grad1'
  | 'grad2'
  | 'grad3'
  | 'acid'

export interface AcidModulation {
  enabled: boolean
  pattern: AcidPatternType
  hueAmount: number
  sizeAmount: number
  rotationAmount: number
  alphaAmount: number
  animationSpeed: number
  brightnessSizeBoost: number
}

export const DEFAULT_ACID: AcidModulation = {
  enabled: true,
  pattern: 'acid',
  hueAmount: 0.18,
  sizeAmount: 0.12,
  rotationAmount: 0.2,
  alphaAmount: 0.08,
  animationSpeed: 0.5,
  brightnessSizeBoost: 0.08,
}

export class AcidPattern {
  private angle = 0

  tick(increment: number): void {
    this.angle += increment
  }

  animatedAngle(x: number, y: number, pattern: AcidPatternType, speed: number): number {
    let base = 0
    if (pattern === 'grid') base = x * y
    else if (pattern === 'wave') base = Math.sin(x + y) + y
    else if (pattern === 'grad1') base = x - y
    else if (pattern === 'grad2') base = y - x
    else if (pattern === 'grad3') base = x + y
    else base = Math.sin(Math.tan(x + y) + Math.tan(x - y) - 1)
    return base + this.angle * speed
  }

  hue(angle: number): number {
    return (127 + 127 * Math.sin(angle)) / 254 * 360
  }

  size(angle: number, amount: number): number {
    return 1 + Math.sin(angle) * amount
  }

  rotation(angle: number, maxDegrees: number): number {
    return Math.sin(angle) * maxDegrees
  }

  alpha(angle: number, min: number, max: number): number {
    return min + (Math.sin(angle) + 1) / 2 * (max - min)
  }
}
