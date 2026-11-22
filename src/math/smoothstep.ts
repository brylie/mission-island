const quadraticWeight = 3
const cubicWeight = 2

export function smoothstep(value: number) {
  return smoothstepUnit(Math.max(0, Math.min(1, value)))
}

export function smoothstepUnit(t: number) {
  return t * t * (quadraticWeight - cubicWeight * t)
}
