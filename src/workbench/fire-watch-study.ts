import { fireWatchReview } from '../assets/recipes/workbench-place-studies'
import { createFireWatch } from '../assets/fire-watch'
import { createFireStation } from '../assets/fire-station'
import { fireWatch } from '../fire-watch'
import { fireWatchBaseHeight, groundHeight } from '../terrain'
import type { IslandEvents, Wildfire, WildfireSize } from '../wildfire'
import { fireSite, wildfireSizes } from '../wildfire'
import { daySeconds } from '../weather'
import { secondsAtIslandHour } from '../residents/schedule'
import { createWildfireView } from '../wildfire-view'
import { extinguisherStations } from '../world'
import { control, type Entry } from './subject'

const station = extinguisherStations.find(({ id }) => id === 'fire-watch') ?? extinguisherStations[0]
const site = fireSite(fireWatchReview.fireSite)
const scarStages = ['ash', 'shoots', 'established'] as const
type ScarStage = typeof scarStages[number]

// A located fire with every hotspot of the chosen size burning, at a real site in view of the tower.
function testFire(size: WildfireSize): Wildfire {
  const hotspots = site.hotspots.slice(0, wildfireSizes[size].hotspots).map(([dx, dz]) =>
    ({ x: site.x + dx, z: site.z + dz, heat: fireWatchReview.heat, peak: fireWatchReview.heat, caught: true }))
  return { id: 1, site: site.id, size, startedAt: 0, located: true, hotspots }
}

// A brush blaze put out just before the shown visit, so its burnt ground is at the chosen stage.
function burnt(stage: ScarStage, hourSeconds: number) {
  const endedAt = hourSeconds
  const record = { id: 1, site: site.id, size: 'blaze', endedAt, outcome: 'extinguished', burned: site.hotspots.map((_, index) => index) } as const
  return { record: { ...record, burned: [...record.burned] }, islandTime: endedAt + fireWatchReview.scarDawns[stage] * daySeconds }
}

export const fireWatchStudy: Entry = {
  id: 'fire-watch',
  name: 'Fire Watch and wildfire',
  group: 'Starter buildings',
  source: 'src/assets/fire-watch.ts',
  description: 'Climbable lookout tower with its fire station, and a test wildfire to judge flames and the smoke column from the deck.',
  readout: 'Fire Watch',
  duration: fireWatchReview.duration,
  angle: fireWatchReview.angle,
  cameraBeta: fireWatchReview.beta,
  cameraRadius: fireWatchReview.radius,
  cameraFocus: [fireWatch.x, fireWatchBaseHeight() + fireWatchReview.focusHeight, fireWatch.z],
  fieldSite: () => ({ name: 'Fire Watch, Starter Island', offset: { x: 0, y: 0, z: 0 }, replaceFireWatch: true }),
  weather: () => ({ hour: fireWatchReview.hour, rain: 0 }),
  controls: [control('fire', 'Test fire', 'patch', {
    none: 'No fire',
    spot: 'Spot fire',
    patch: 'Grass fire',
    blaze: 'Brush blaze',
    ash: 'Burn scar · just out',
    shoots: 'Burn scar · first dawn',
    established: 'Burn scar · third dawn',
  })],
  create(meshes, _values, _reportError, observe) {
    createFireWatch(meshes, fireWatchBaseHeight())
    createFireStation(meshes, station, groundHeight(station))
    const showFire = createWildfireView(meshes, meshes.scene)
    const fires = new Map<string, Wildfire>()
    const morning = secondsAtIslandHour(fireWatchReview.hour)
    return ({ time }, { fire }) => {
      const scar = scarStages.find((stage) => stage === fire)
      const size = scar || fire === 'none' ? undefined : fire as WildfireSize
      if (size && !fires.has(size)) fires.set(size, testFire(size))
      const visit = scar && burnt(scar, morning)
      const events: IslandEvents = { seed: 0, nextFireAt: null, fire: size ? fires.get(size) ?? null : null, firesOut: 0, ...(visit && { lastFire: visit.record }) }
      showFire({ events, islandTime: visit?.islandTime ?? morning }, time)
      observe(size ? `${wildfireSizes[size].label} · ${wildfireSizes[size].hotspots} hotspots` : scar ? `Burn scar · ${scar}` : 'Tower only')
    }
  },
}
