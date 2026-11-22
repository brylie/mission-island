import { juniperSupport } from './assets/geometry/biome-vegetation.ts'
import { juniperClearing } from './worlds/starter/layout/sites.ts'
import { habitatObstacles } from './biome-navigation.ts'
import { biomeFrame, createBiome, populate } from './biome-model.ts'
import { presets } from './biome-recipe.ts'
import { seededRandom } from './seeded-random.ts'
import { grove } from './terrain.ts'
import { distance, offset, type Point } from './world.ts'
import type { Weather } from './protocol.ts'

const fullTurn = Math.PI + Math.PI
const bitePerUpdate = 0.009
const regrowthRate = 4
const visitorRadius = 14
const percentScale = 100
const { groveOffset, footprint, sightline, spacing, radius: clearingRadius } = juniperClearing

export const juniperCenter = { x: grove.x + groveOffset.x, z: grove.z + groveOffset.z }
const recipe = presets['Pine hollow']
export const juniperLayout = populate(recipe)
const random = seededRandom(recipe.seed)
const occupied: (Point & { radius: number })[] = [...juniperLayout.hares, ...juniperLayout.foxes].map((p) => ({ ...p, radius: footprint.animal }))
// Leave space between trunks, fallen wood and food in the walkable clearing.
// Leave a sightline from the trail cairn to the feeding ground in the middle.
for (const p of juniperLayout.patches) {
  const radius = footprint[p.kind]
  const blocksView = () => p.kind === 'trees' && (Math.hypot(p.x, p.z) < sightline.centreRadius || (p.z < sightline.nearTrailZ && Math.abs(p.x) < sightline.halfWidth))
  while (blocksView() || occupied.some((q) => distance(p, q) < q.radius + radius + spacing)) {
    const a = random() * fullTurn, r = Math.sqrt(random()) * clearingRadius
    p.x = Math.cos(a) * r
    p.z = Math.sin(a) * r
  }
  occupied.push({ ...p, radius })
}

export const juniperSolids = habitatObstacles(juniperLayout.patches).flatMap((o) => {
  const at = { ...o, x: juniperCenter.x + o.x, z: juniperCenter.z + o.z }
  if (o.kind === 'logs') return juniperSupport.logs.offsets.map((x) => ({
    ...at,
    ...offset(at, x, 0),
    width: juniperSupport.logs.width,
    depth: juniperSupport.logs.depth,
    height: juniperSupport.logs.height,
  }))
  if (o.kind === 'trees') return [{ ...at, ...juniperSupport.trees }]
  return [{ ...at, width: o.width * juniperSupport.stones.widthRatio, depth: o.width * juniperSupport.stones.depthRatio }]
})

export function createJuniperHabitat() {
  // Keep a few feeding bouts long enough to watch from the trail after the crew walks here.
  const biome = createBiome(recipe, juniperLayout, { bite: bitePerUpdate, regrowth: regrowthRate })
  return (time: number, weather: Weather, players: readonly Point[]) => {
    const visitors = players.filter((p) => distance(p, juniperCenter) < visitorRadius)
      .map((p) => ({ x: p.x - juniperCenter.x, z: p.z - juniperCenter.z }))
    return biomeFrame(biome.seek(time, visitors, { hour: weather.hour, rain: weather.rain * percentScale }))
  }
}
