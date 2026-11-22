const multiplier = 1_664_525
const increment = 1_013_904_223
const uint32Range = 0x1_0000_0000

export function seededRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * multiplier + increment) >>> 0
    return state / uint32Range
  }
}
