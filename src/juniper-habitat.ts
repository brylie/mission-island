import { habitatObstacles } from './biome-navigation.ts'
import { biomeFrame, createBiome, populate } from './biome-model.ts'
import { presets } from './biome-recipe.ts'
import { seededRandom } from './seeded-random.ts'
import { grove } from './terrain.ts'
import { distance, offset, type Point } from './world.ts'
import type { Weather } from './protocol.ts'

export const juniperCenter = { x: grove.x - 5, z: grove.z + 9 }
const recipe = presets['Pine hollow']
export const juniperLayout = populate(recipe)
const random = seededRandom(recipe.seed)
const occupied: (Point & { radius: number })[] = [...juniperLayout.hares, ...juniperLayout.foxes].map(p => ({ ...p, radius: .24 }))
// Leave space between trunks, fallen wood and food in the walkable clearing.
// Leave a sightline from the trail cairn to the feeding ground in the middle.
for (const p of juniperLayout.patches) {
  const radius = { logs: 1.26, trees: 1.12, stones: .9, grass: .3, clover: .26 }[p.kind]
  const blocksView = () => p.kind === 'trees' && (Math.hypot(p.x, p.z) < 4.8 || (p.z < 1 && Math.abs(p.x) < 3.4))
  while (blocksView() || occupied.some(q => distance(p, q) < q.radius + radius + .12)) {
    const a = random() * Math.PI * 2, r = Math.sqrt(random()) * 6.9
    p.x = Math.cos(a) * r
    p.z = Math.sin(a) * r
  }
  occupied.push({ ...p, radius })
}

export const juniperSolids = habitatObstacles(juniperLayout.patches).flatMap(o => {
  const at = { ...o, x: juniperCenter.x + o.x, z: juniperCenter.z + o.z }
  if (o.kind === 'logs') return [-.8, 0, .8].map(x => ({
    ...at, ...offset(at, x, 0), width: .8, depth: .45, height: .42,
  }))
  if (o.kind === 'trees') return [{ ...at, width: .5, depth: .5 }]
  return [{ ...at, width: o.width * .84, depth: o.width * .92 }]
})

export function createJuniperHabitat() {
  // Keep a few feeding bouts long enough to watch from the trail after the crew walks here.
  const biome = createBiome(recipe, juniperLayout, { bite: .009, regrowth: 4 })
  return (time: number, weather: Weather, players: readonly Point[]) => {
    const visitors = players.filter(p => distance(p, juniperCenter) < 14)
      .map(p => ({ x: p.x - juniperCenter.x, z: p.z - juniperCenter.z }))
    return biomeFrame(biome.seek(time, visitors, { hour: weather.hour, rain: weather.rain * 100 }))
  }
}
