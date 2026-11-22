const quadraticWeight = 3
const cubicWeight = 2

export function smoothstep(value: number) {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (quadraticWeight - cubicWeight * t)
}
