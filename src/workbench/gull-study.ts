import { gullReview } from '../assets/recipes/workbench-wildlife-studies'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { createGull } from '../assets/gull'
import { gullAt, gullCycle } from '../gull-flight'
import type { Weather } from '../protocol'
import { control, type Entry, type Values } from './subject'

const halves = 2
const { perch, piling } = gullReview
const conditions: Record<string, Weather> = gullReview.conditions

const sky = (_time: number, values: Values) => conditions[String(values.sky)] ?? conditions.clear

export const gullStudy: Entry = {
  id: 'harbor-gull',
  name: 'Harbor gull landing',
  group: 'Animals',
  source: 'src/assets/gull.ts',
  description: 'Scrub the harbor gull’s circuit to see it bank, glide, flare, plant its feet, and fold its wings.',
  readout: 'Gull motion',
  duration: gullCycle(0).period,
  angle: gullReview.angle,
  ground: { height: 0, color: '#77999a' },
  weather: sky,
  controls: [
    control('sky', 'Conditions', 'clear', { clear: 'Clear noon', wet: 'Wet noon', dusk: 'Dusk' }),
    { type: 'checkbox', key: 'follow', label: 'Follow gull', value: true },
  ],
  create(meshes, _values, _reportError, observe) {
    const stage = new TransformNode('Gull study framing', meshes.scene)
    meshes.cylinder(0, perch.y / halves, 0, piling.diameter, piling.diameter, perch.y, piling.sides, meshes.paintSurface('wood'), stage)
    const gull = createGull(meshes, 0)
    gull.root.parent = stage
    gull.pose(gullAt(0, 0, perch, conditions.clear))
    return ({ time }, values) => {
      const sample = gullAt(time, 0, perch, sky(time, values))
      gull.pose(sample)
      if (values.follow) stage.position.set(-sample.x, perch.y - sample.y, -sample.z)
      else stage.position.setAll(0)
      observe(sample.phase + (sample.grounded ? ' · feet on piling' : ' · airborne'))
    }
  },
}
