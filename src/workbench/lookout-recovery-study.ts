import { createLookoutIncident } from '../lookout-recovery-art'
import { lookoutRecoverySubject } from '../lookout-recovery'
import { createParticleEffect } from '../particle-effect'
import { particleBurst } from '../particle-motion'
import { particleRecipes } from '../assets/particle-recipes'
import { lookoutSteamCue } from '../starter-effect-cues'
import { daySeconds } from '../weather'
import { control, type Entry } from './subject'

export const lookoutRecoveryStudy: Entry = {
  id: lookoutRecoverySubject,
  name: 'Forest Lookout recovery',
  group: 'Island',
  source: 'src/lookout-recovery-art.ts',
  description: 'Revisit the same verge after the fire, after the first dawn, and after three dawns.',
  readout: 'Lookout verge',
  duration: 10,
  angle: -0.58,
  ground: { height: 0, color: '#87945c' },
  fieldSite: () => ({ name: 'Forest Lookout, Starter Island', offset: { x: 0, y: 0, z: 0 } }),
  weather: () => ({ hour: 13, rain: 0 }),
  controls: [
    control('visit', 'Visit', 'ash', { incident: 'Active fire', ash: 'Just extinguished', shoots: 'First dawn', established: 'Third dawn' }),
  ],
  create(meshes, _values, _reportError, observe) {
    const showLookout = createLookoutIncident(meshes, true)
    const cue = lookoutSteamCue()
    const recipe = particleRecipes[cue.id]
    const steam = createParticleEffect(meshes.scene, 'Lookout wet-ash steam', recipe, 5817)
    const puff = particleBurst(recipe, 5817, 0, cue.length, { strength: cue.strength, footprint: 0.88 }, () => cue.source)
    return ({ time }, { visit }) => {
      const incident = visit === 'incident'
      const days = visit === 'established' ? 3 : visit === 'shoots' ? 1 : 0
      const stage = showLookout({
        mission: incident ? 'fire' : 'complete',
        fire: 0.77,
        islandTime: days * daySeconds + time,
        lookoutFireClearedAt: 0,
      }, time)
      steam.draw(time, stage === 'ash' ? puff : [])
      observe(stage === 'ash'
        ? 'Damp ash · flattened grass'
        : stage === 'shoots'
          ? 'First dawn · green shoots at the edge'
          : stage === 'established' ? 'Third dawn · grass and flowers returning' : 'Active fire')
    }
  },
}
