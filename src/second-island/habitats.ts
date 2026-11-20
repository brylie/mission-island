import { lowerLake, tarn } from './sites.ts'
import { fallsX, riverZ, shoreDistance } from './terrain.ts'

const habitatColors = {
  coast: [222, 188, 132],
  wetland: [126, 158, 111],
  meadow: [174, 185, 113],
  woodland: [94, 136, 98],
  bluff: [161, 151, 134],
} as const

function fade(value: number) {
  const fraction = Math.max(0, Math.min(1, value))
  return fraction * fraction * (3 - 2 * fraction)
}

export function habitatAt(x: number, y: number, z: number) {
  const coast = 1 - fade((shoreDistance(x, z) - 7) / 25)
  const riverBank = (1 - fade((Math.abs(z - riverZ(x)) - 7) / 27)) * fade((-85 - x) / 16)
  const lakeshore = Math.min(
    Math.abs(Math.hypot(x - lowerLake.x, (z - lowerLake.z) * lowerLake.rx / lowerLake.rz) - lowerLake.rx),
    Math.abs(Math.hypot(x - tarn.x, (z - tarn.z) * tarn.rx / tarn.rz) - tarn.rx),
  )
  const marsh = Math.max(riverBank, 1 - fade((lakeshore - 7) / 27)) * (1 - coast)
  const woods = fade((z - 105) / 100) * (1 - fade((x - 35) / 170)) * fade((y - 17) / 16)
  const slate = fade((y - 33) / 20) * fade((x - 145) / 90)
  const falls = fade((z - 166) / 10) * (1 - fade((z - 189) / 11)) * (1 - fade((Math.abs(x - fallsX(z)) - 6) / 13))
  const bluff = Math.max(slate, fade((y - 52) / 17), falls)
  return { coast, marsh, woods: woods * (1 - marsh) * (1 - bluff), bluff }
}

export function habitatColor(x: number, y: number, z: number) {
  const { coast, marsh, woods, bluff } = habitatAt(x, y, z)
  const blend = (base: number, target: number, amount: number) => base + (target - base) * amount
  return habitatColors.meadow.map((base, channel) => {
    const land = blend(blend(base, habitatColors.woodland[channel], woods), habitatColors.bluff[channel], bluff)
    return blend(blend(land, habitatColors.wetland[channel], marsh), habitatColors.coast[channel], coast)
  })
}
