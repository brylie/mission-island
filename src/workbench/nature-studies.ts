import { animalPose, createFox, createGroundCover } from '../biome-scenery'
import { createHare } from '../hare'
import { juniperCenter } from '../juniper-habitat'
import { groundHeight } from '../terrain'
import type { Entry } from './subject'

const clearing = { x: juniperCenter.x + 5, z: juniperCenter.z - 3 }
const fieldSite = () => ({ name: 'Juniper Hollow', offset: { ...clearing, y: groundHeight(clearing) } })

export const natureEntries: Entry[] = [
  ...(['hare', 'fox'] as const).map((species): Entry => {
    const hare = species === 'hare'
    const modes = hare ? ['wandering', 'grazing', 'fleeing', 'sheltering'] : ['patrolling', 'chasing', 'watching']
    return {
      id: species,
      group: 'Animals',
      name: hare ? 'Woodland hare' : 'Red fox',
      duration: 4,
      fieldSite,
      source: 'src/biome-scenery.ts',
      description: 'Scrub an individual behavior or open the habitat to watch encounters.',
      controls: [{ type: 'select', key: 'behavior', label: 'Behavior', value: modes[0], choices: Object.fromEntries(modes.map((key) => [key, key[0].toUpperCase() + key.slice(1)])) }],
      create(meshes) {
        const animal = hare ? createHare(meshes, 'Hare', '#967858') : createFox(meshes)
        return ({ time }, settings) => {
          const pose = animalPose(species, String(settings.behavior), time)
          animal.position.y = pose.height
          animal.rotation.x = pose.pitch
        }
      },
    }
  }),
  ...(['clover', 'tussock'] as const).map((id): Entry => ({
    id,
    name: id === 'clover' ? 'Clover patch' : 'Grass tussock',
    group: 'Plants',
    fieldSite,
    source: 'src/biome-scenery.ts',
    description: 'Compare leaf arrangement and growth at the scale of a single patch.',
    controls: [
      { type: 'number', key: 'seed', label: 'Growth seed', value: 0, min: 0, max: 9999, step: 1, rebuild: true },
      { type: 'range', key: 'growth', label: 'Mature size (%)', value: 100, min: 28, max: 120, step: 1 },
    ],
    create(meshes, settings) {
      const patch = createGroundCover(meshes, id === 'tussock', Number(settings.seed))
      return (_, values) => patch.scaling.setAll(Number(values.growth) / 100)
    },
  })),
]
