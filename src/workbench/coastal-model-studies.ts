import { coastalModelReview } from '../assets/recipes/workbench-building-vehicle-studies'
import { createDockTug } from '../assets/dock-tug'
import { createFoxglove } from '../assets/foxglove'
import { createNetShed } from '../assets/net-shed'
import { createOystercatcher } from '../assets/oystercatcher'
import { range, type Entry } from './subject'

const degreesPerHalfTurn = 180

export const coastalModelStudies: Entry[] = [
  {
    id: 'foxglove',
    name: 'Foxglove',
    group: 'Plants',
    source: 'src/assets/foxglove.ts',
    description: 'Study the leaf rosette and the taper from open bells to buds. Change the specimen to compare its habit.',
    controls: [range('seed', 'Specimen', ...coastalModelReview.foxgloveSeed, true)],
    create(meshes, values) {
      const plant = createFoxglove(meshes, Number(values.seed))
      return ({ time }) => plant.sway(time)
    },
  },
  {
    id: 'oystercatcher',
    name: 'Oystercatcher',
    group: 'Animals',
    source: 'src/assets/oystercatcher.ts',
    description: 'Compare the dark hood, pale belly and chisel bill. Scrub the timeline to follow a shore probe.',
    controls: [{ type: 'checkbox', key: 'feeding', label: 'Probe for food', value: true }],
    create(meshes) {
      const { pose } = createOystercatcher(meshes)
      return ({ time }, values) => pose(time, Boolean(values.feeding))
    },
  },
  {
    id: 'net-shed',
    name: 'Harbor net shed',
    group: 'Starter buildings',
    source: 'src/assets/net-shed.ts',
    angle: coastalModelReview.netShedAngle,
    description: 'Orbit from the entrance to the sunlit drying rack. Follow the net up to its cork floats and loft vent.',
    create(meshes) { createNetShed(meshes) },
  },
  {
    id: 'dock-tug',
    name: 'Three-wheel dock tug',
    group: 'Starter vehicles',
    source: 'src/assets/dock-tug.ts',
    description: 'Inspect the open driving step, low load deck and steering clearance on a short harbor freight run.',
    controls: [range('steer', 'Front wheel angle (°)', ...coastalModelReview.tug.steering)],
    create(meshes) {
      const pose = createDockTug(meshes)
      return ({ time }, values) => pose(Number(values.steer) * Math.PI / degreesPerHalfTurn, time * coastalModelReview.tug.wheelRate)
    },
  },
]
