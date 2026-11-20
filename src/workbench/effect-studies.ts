import { createLookoutFire } from '../fire-effect'
import { createExtinguisherSpray } from '../extinguisher-spray'
import { createSupply } from '../assets/props'
import { control, range, type Entry } from './subject'

export const effectStudies: Entry[] = [
  {
    id: 'extinguisher', name: 'Extinguisher mist', group: 'Effects', source: 'src/extinguisher-spray.ts', duration: 3.5,
    description: 'Trigger the spray and inspect nozzle alignment, spread, and falloff.',
    angle: 0.36,
    controls: [
      control('mode', 'Emission', 'burst', { idle: 'Off', burst: 'Burst loop', continuous: 'Continuous' }),
      range('rate', 'Particles per second', 155, 35, 300, 5),
    ],
    create(meshes) {
      const tool = createSupply(meshes, 'extinguisher')
      tool.position.set(0, 0.6, -2.3)
      const spray = createExtinguisherSpray(meshes.scene)
      // Bound the visible stream when framing the preview.
      const extent = meshes.box(0, 1.35, 0.7, 2.4, 1.5, 6.6, '#ffffff', tool, false)
      extent.parent = null
      extent.isVisible = false
      return ({ time, rate, seek }, values) => {
        const opening = 0.25
        const stopping = 2.4
        let elapsed = 0
        let since = 0
        if (values.mode === 'continuous') elapsed = time + 0.53
        if (values.mode === 'burst') {
          elapsed = Math.max(0, Math.min(time, stopping) - opening)
          since = Math.max(0, time - stopping)
        }
        spray.setRate(Number(values.rate))
        if (seek) spray.seek(tool, elapsed, since)
        spray.setPlaybackSpeed(rate)
        spray.update(tool, elapsed > 0 && since === 0)
      }
    },
  },
  {
    id: 'fire', name: 'Lookout fire', group: 'Effects', source: 'src/fire-effect.ts', duration: 5, headroom: 2.8,
    description: 'Preview the flame shapes and lower the intensity to simulate suppression.',
    controls: [range('intensity', 'Intensity', 1, 0, 1, 0.01)],
    create(meshes) {
      const fire = createLookoutFire(meshes.scene)
      const extent = meshes.box(0.4, 1.55, 0, 3.6, 3.1, 2.8, '#ffffff', undefined, false)
      extent.isVisible = false
      return ({ time, rate, seek }, values) => fire.pose(time, Number(values.intensity), rate, seek)
    },
  },
]
