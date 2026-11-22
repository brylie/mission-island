import { saltwindHabitatColors as colors } from '../assets/geometry/saltwind-palette.ts'
import { smoothstep as fade } from '../math/smoothstep.ts'
import { saltwindHabitatBands } from '../worlds/saltwind/layout/scenery.ts'
import { lowerLake, tarn } from './sites.ts'
import { fallsX, riverZ, shoreDistance } from './terrain.ts'

export function habitatAt(x: number, y: number, z: number) {
  const { coast: shoreline, wetland, woodland, slate: outcrops, tarnstepBanks, exposedRidge } = saltwindHabitatBands
  const coast = 1 - fade((shoreDistance(x, z) - shoreline.inner) / shoreline.falloff)
  const riverBank = (1 - fade((Math.abs(z - riverZ(x)) - wetland.inner) / wetland.falloff))
    * fade((wetland.riverEndX - x) / wetland.riverFalloffX)
  const lakeshore = Math.min(
    Math.abs(Math.hypot(x - lowerLake.x, (z - lowerLake.z) * lowerLake.rx / lowerLake.rz) - lowerLake.rx),
    Math.abs(Math.hypot(x - tarn.x, (z - tarn.z) * tarn.rx / tarn.rz) - tarn.rx),
  )
  const marsh = Math.max(riverBank, 1 - fade((lakeshore - wetland.inner) / wetland.falloff)) * (1 - coast)
  const woods = fade((z - woodland.startZ) / woodland.fadeInZ)
    * (1 - fade((x - woodland.endX) / woodland.fadeOutX)) * fade((y - woodland.startHeight) / woodland.heightFade)
  const slate = fade((y - outcrops.startHeight) / outcrops.heightFade) * fade((x - outcrops.startX) / outcrops.fadeInX)
  const falls = fade((z - tarnstepBanks.startZ) / tarnstepBanks.fadeInZ)
    * (1 - fade((z - tarnstepBanks.endZ) / tarnstepBanks.fadeOutZ))
    * (1 - fade((Math.abs(x - fallsX(z)) - tarnstepBanks.innerWidth) / tarnstepBanks.widthFade))
  const bluff = Math.max(slate, fade((y - exposedRidge.startHeight) / exposedRidge.heightFade), falls)
  return { coast, marsh, woods: woods * (1 - marsh) * (1 - bluff), bluff }
}

export function habitatColor(x: number, y: number, z: number) {
  const { coast, marsh, woods, bluff } = habitatAt(x, y, z)
  const blend = (base: number, target: number, amount: number) => base + (target - base) * amount
  return colors.meadow.map((base, channel) => {
    const land = blend(blend(base, colors.woodland[channel], woods), colors.bluff[channel], bluff)
    return blend(blend(land, colors.wetland[channel], marsh), colors.coast[channel], coast)
  })
}
