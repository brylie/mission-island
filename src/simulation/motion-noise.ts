// A mean-reverting Brownian process (Ornstein–Uhlenbeck). Correlation time is in
// seconds. The stationary standard deviation uses the same units as the output.
export function createWander(random: () => number, dt: number, correlationTime: number, deviation: number) {
  const decay = Math.exp(-dt / correlationTime)
  const step = deviation * Math.sqrt(1 - decay ** 2)
  return (previous: number) => {
    const normal = Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random())
    return previous * decay + step * normal
  }
}
