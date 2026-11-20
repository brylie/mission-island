import type { EffectStudy } from './effect-studies'
import { breathFixture, puddleFixture, sandFixture, sunbeamFixture, windowFixture } from './effect-air-fixtures'
import { ashFixture, crateGritFixture, ferrySparksFixture, sawdustFixture, wateringFixture } from './effect-job-fixtures'
import { chaffFixture, feathersFixture, fernFixture, hoeFixture, parachutesFixture } from './effect-land-fixtures'
import { eddyFixture, fishThrashFixture, submergedFixture, wadingFixture, wakeFixture } from './effect-water-fixtures'

export const expandedEffectStudies: EffectStudy[] = [
  {
    id: 'skiff-wake-foam', name: 'Skiff wake foam', group: 'Water', seed: 4487, width: 9.8, height: 2.7, angle: -1.23,
    description: 'Two foam ribbons peel off the skiff’s stern and widen as it accelerates. Use behind a skiff crossing the harbor.',
    strength: 'Foam density', footprint: 'Wake spread', fixture: wakeFixture,
  },
  {
    id: 'wading-crescents', name: 'Wading crescents', group: 'Water', seed: 6164, width: 4.8, height: 2.65, angle: .84,
    description: 'Shallow crescents push ahead of alternating boots. Fast steps throw a wider fan across the shallows.',
    strength: 'Splash strength', footprint: 'Footstep spread', fixture: wadingFixture,
  },
  {
    id: 'hooked-fish-thrash', name: 'Hooked-fish thrash', group: 'Water', seed: 4792, width: 4.5, height: 2.75, angle: .89,
    description: 'A hooked fish flicks a spray burst above the surface and leaves uneven rings around the bobber.',
    strength: 'Thrash intensity', footprint: 'Splash reach', fixture: fishThrashFixture,
  },
  {
    id: 'submerged-bubble-trail', name: 'Submerged bubble trail', group: 'Water', seed: 3661, width: 5.9, height: 2.35, angle: 1.27,
    ground: { height: -.87, color: '#354d4e' },
    description: 'Bubbles shed from a moving swimmer, wobble upward, and pop at the surface. The cutaway shows the underwater path.',
    strength: 'Bubble flow', footprint: 'Trail width', fixture: submergedFixture,
  },
  {
    id: 'eddy-foam-flecks', name: 'Eddy foam flecks', group: 'Water', seed: 5337, width: 5.6, height: 2.65, angle: 1.15,
    description: 'Foam sweeps around a rock before peeling back into the flow. Use downstream of the Tarnstep plunge pool.',
    strength: 'Foam density', footprint: 'Fleck spread', fixture: eddyFixture,
  },
  {
    id: 'puddle-strike-rings', name: 'Puddle strike rings', group: 'Weather and air', seed: 8620, width: 4.45, height: 3.1, angle: 1.12,
    description: 'Overlapping rings pick out rain impacts in a shallow puddle. Use on the wet Seabrook Market path.',
    strength: 'Rainfall', footprint: 'Puddle coverage', fixture: puddleFixture,
  },
  {
    id: 'window-spatter', name: 'Window spatter', group: 'Weather and air', seed: 7189, width: 4.3, height: 2.8, angle: 1.21,
    description: 'Drops cling to the glass for a beat, then stretch as they run down toward the sill. Use on a windward window.',
    strength: 'Spatter density', footprint: 'Glass coverage', fixture: windowFixture,
  },
  {
    id: 'sunbeam-dust', name: 'Sunbeam dust', group: 'Weather and air', seed: 4193, width: 4.6, height: 3.9, angle: 1.1, wind: true,
    description: 'Fine flecks brighten as they cross a shaft of light and fade back into shade. Use under the Pinewoods canopy.',
    strength: 'Dust density', footprint: 'Lit air width', fixture: sunbeamFixture,
  },
  {
    id: 'sand-skitter', name: 'Sand skitter', group: 'Weather and air', seed: 7956, width: 5.8, height: 2.65, angle: 1.16, wind: true,
    description: 'Low ribbons of dry sand dart across the beach in gusts and lose speed behind the rocks.',
    strength: 'Gust density', footprint: 'Drift reach', fixture: sandFixture,
  },
  {
    id: 'cold-breath', name: 'Cold breath', group: 'Weather and air', seed: 5341, width: 3.15, height: 2.5, angle: .47, wind: true,
    description: 'Short vapor clouds follow the crew member’s facing direction, then unravel in the air. Use on a cold Saltwind dawn.',
    strength: 'Breath volume', footprint: 'Cloud reach', fixture: breathFixture,
  },
  {
    id: 'seed-parachutes', name: 'Seed parachutes', group: 'Vegetation and loose ground', seed: 5880, width: 4.05, height: 2.9, angle: .8, wind: true,
    description: 'Tufted seeds lift from their heads, hover, and sail over the verge when the gust carries them clear.',
    strength: 'Loose seeds', footprint: 'Seed drift', fixture: parachutesFixture,
  },
  {
    id: 'wet-fern-shake', name: 'Wet fern shake', group: 'Vegetation and loose ground', seed: 3705, width: 3.65, height: 2.45, angle: .97,
    description: 'A brushed frond bends and sheds a one-sided arc of water. Use along a wet path through Juniper Hollow.',
    strength: 'Water shed', footprint: 'Droplet fan', fixture: fernFixture,
  },
  {
    id: 'hoe-soil-crumbs', name: 'Hoe soil crumbs', group: 'Vegetation and loose ground', seed: 1807, width: 3.68, height: 2.45, angle: .7,
    description: 'Dark clods flip out of the furrow as the blade meets the soil, then tumble and settle beside it.',
    strength: 'Loose soil', footprint: 'Clod scatter', fixture: hoeFixture,
  },
  {
    id: 'harvest-chaff', name: 'Harvest chaff', group: 'Vegetation and loose ground', seed: 6680, width: 3.8, height: 2.9, angle: .8, wind: true,
    description: 'Light straw fragments tumble around a cut barley bundle while fine chaff hangs downwind.',
    strength: 'Chaff density', footprint: 'Chaff spread', fixture: chaffFixture,
  },
  {
    id: 'takeoff-feathers', name: 'Takeoff feathers', group: 'Vegetation and loose ground', seed: 2184, width: 5, height: 3.1, angle: .96, wind: true,
    description: 'A startled bird leaves a few loose feathers at takeoff. They rock as the bird pulls away.',
    strength: 'Loose feathers', footprint: 'Feather drift', fixture: feathersFixture,
  },
  {
    id: 'watering-can-shower', name: 'Watering-can shower', group: 'Jobs', seed: 4097, width: 3.75, height: 2.75, angle: .63,
    description: 'A fan of water leaves the can’s rose, arcs down, and splashes onto the vegetable bed.',
    strength: 'Pour volume', footprint: 'Watering reach', fixture: wateringFixture,
  },
  {
    id: 'sawdust-fan', name: 'Sawdust fan', group: 'Jobs', seed: 7703, width: 4.5, height: 2.95, angle: .93,
    description: 'Wood chips shoot off the blade at Timber Works and fall near the bench. Fine dust lingers behind them.',
    strength: 'Cutting debris', footprint: 'Sawdust reach', fixture: sawdustFixture,
  },
  {
    id: 'crate-landing-grit', name: 'Crate landing grit', group: 'Jobs', seed: 8272, width: 3.85, height: 2.45, angle: .82,
    description: 'Three set-downs of increasing force throw dust and grit from the crate’s corners onto the gravel.',
    strength: 'Landing dust', footprint: 'Grit spread', fixture: crateGritFixture,
  },
  {
    id: 'wet-ash-steam', name: 'Wet-ash steam', group: 'Jobs', seed: 5817, width: 4.1, height: 3.4, angle: .99,
    description: 'Small white curls rise from soaked ash after the spray stops at a Forest Lookout fire bed.',
    strength: 'Steam density', footprint: 'Wet ash coverage', fixture: ashFixture,
  },
  {
    id: 'ferry-repair-sparks', name: 'Ferry repair sparks', group: 'Jobs', seed: 3819, width: 4.8, height: 2.9, angle: 1.11,
    description: 'A fan of hot sparks leaves a repair seam, skips once on the ferry deck, and cools from gold to red.',
    strength: 'Spark intensity', footprint: 'Spark fan reach', fixture: ferrySparksFixture,
  },
]
