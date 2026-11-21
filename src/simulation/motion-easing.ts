export function smoothRange(start: number, end: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)))
  return t * t * (3 - 2 * t)
}

export function exponentialBlend(response: number, seconds: number) {
  return 1 - Math.exp(-seconds * response)
}
