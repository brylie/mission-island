import { dispatchBay, marketBay, schoolBay } from '../ore-contracts.ts'
import {
  biomes,
  falls,
  lowerLake,
  picnicLedge,
  siteLayouts,
  surveyLandmarks,
  viaductWalk,
  villages,
  waterfront,
} from '../worlds/saltwind/layout/sites.ts'
import type { MapPoint, SiteLayout } from '../worlds/saltwind/layout/sites.ts'
import { apiary } from './long-acre.ts'

export type { MapPoint }
export { biomes, lowerLake, picnicLedge, villages, waterfront }
export { arrival, helipad, islandName, landBounds, pavedYards, roundYards, runway, tarn, waterBounds } from '../worlds/saltwind/layout/sites.ts'

export const seaLevel = 0
export const wadeDepth = 0.84

export const discoveryWalks = [
  { ...viaductWalk, view: falls, detail: 'Follow the west-bank gravel spur to the lichen-covered survey stone. Its bronze line points upstream to the upper cascades.' },
  { ...picnicLedge, view: lowerLake, detail: 'Turn off the south shoulder onto the slate lip. Look past the picnic basket toward the lake and its morning mist.' },
]

interface Site extends Omit<SiteLayout, 'stop'> {
  stop: MapPoint
}

const freightStops = { market: marketBay, school: schoolBay, dispatch: dispatchBay }

export const sites: readonly Site[] = siteLayouts.map(({ stop, heading, ...site }) => ({
  ...site,
  stop: typeof stop === 'string' ? freightStops[stop] : stop,
  heading,
}))

const fallsMarkerRadius = 47
const fishingPierMarkerRadius = 28
const rescueSlipMarkerRadius = 32
const apiaryMarkerRadius = 10
const siteMarkerRadius = 34
const villageMarkerRadius = 62

export const landmarks: readonly (MapPoint & { id: string, name: string, radius: number, discoverable?: boolean })[] = [
  ...surveyLandmarks,
  { id: 'falls', name: 'Tarnstep Falls', x: falls.x, z: falls.z, radius: fallsMarkerRadius },
  { id: 'fishing', name: 'Sandspit Fishing Pier', ...waterfront.fishing, radius: fishingPierMarkerRadius },
  { id: 'rescue', name: 'Brinewick Rescue Slip', ...waterfront.rescue, radius: rescueSlipMarkerRadius },
  { id: 'apiary', name: 'Long Acre Apiary', ...apiary, radius: apiaryMarkerRadius },
  ...discoveryWalks.map((walk) => ({ ...walk, discoverable: true })),
  ...sites.map(({ id, name, x, z }) => ({ id, name, x, z, radius: siteMarkerRadius })),
  ...villages.map(({ id, name, x, z }) => ({ id, name, x, z, radius: villageMarkerRadius })),
]
