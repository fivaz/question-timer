import type { Trend } from '../types'

function mixRgb(
  green: { r: number; g: number; b: number },
  yellow: { r: number; g: number; b: number },
  red: { r: number; g: number; b: number },
  t: number,
) {
  const from = t < 0.5 ? green : yellow
  const to = t < 0.5 ? yellow : red
  const local = t < 0.5 ? t * 2 : (t - 0.5) * 2
  const r = Math.round(from.r + (to.r - from.r) * local)
  const g = Math.round(from.g + (to.g - from.g) * local)
  const b = Math.round(from.b + (to.b - from.b) * local)
  return `rgb(${r}, ${g}, ${b})`
}

export function getTrend(currentAvg: number, previousAvg: number | null): Trend {
  if (previousAvg === null || previousAvg === 0) {
    return { color: '#ca8a04', arrow: 'flat', label: 'baseline' }
  }

  const deltaRatio = (currentAvg - previousAvg) / previousAvg

  // Maps relative change onto a red → yellow → green scale.
  // Negative delta (faster) → green; positive (slower) → red.
  const clamped = Math.max(-0.35, Math.min(0.35, deltaRatio))
  const t = (clamped + 0.35) / 0.7 // 0 = green, 0.5 = yellow, 1 = red

  const color = mixRgb(
    { r: 22, g: 163, b: 74 }, // green
    { r: 202, g: 138, b: 4 }, // yellow
    { r: 220, g: 38, b: 38 }, // red
    t,
  )

  if (Math.abs(deltaRatio) < 0.04) {
    return { color, arrow: 'flat', label: 'steady' }
  }
  if (deltaRatio > 0) {
    return { color, arrow: 'up', label: 'slower' }
  }
  return { color, arrow: 'down', label: 'faster' }
}
