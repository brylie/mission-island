import { createCrew, poseCrew } from '../assets/crew'
import type { Snapshot } from '../protocol'
import { conversationLines, openOffer } from '../residents/favors'
import { residentAt } from '../residents/schedule'
import { initialResidents } from '../residents/trust'
import { walkingHeight } from '../terrain'
import { daySeconds } from '../weather'
import { starterResidents } from '../worlds/starter/residents'
import { control, range, type Entry, type Values } from './subject'

const choices = Object.fromEntries(starterResidents.map(({ id, identity }) => [id, `${identity.name} · ${identity.role}`]))
const trustLevels = { 0: 'Stranger', 1: 'Familiar', 3: 'Trusted' }
const favorStates = { open: 'Asking', active: 'Under way', kept: 'Kept' }

function resident(values: Values) {
  return starterResidents.find(({ id }) => id === values.resident) ?? starterResidents[0]
}

// A snapshot with just what a resident's day and conversation read: the clock, the gate and the crew's record.
function rehearsal(values: Values) {
  const subject = resident(values)
  const favor = subject.favors[0]
  const islandTime = ((Number(values.hour) - 6 + 24) % 24) * daySeconds / 24
  const residents = initialResidents(starterResidents)
  residents[subject.id] = { trust: Number(values.trust),
    kept: values.favor === 'kept' ? [favor.id] : [], active: values.favor === 'active' ? favor.id : null }
  return { islandTime, mission: 'complete', residents, gateRepair: { stage: 'sagging', pinHolder: null } } as unknown as Snapshot
}

export const residentRoutinesStudy: Entry = {
  id: 'resident-routines', name: 'Resident routines', group: 'NPC interactions', source: 'src/worlds/starter/residents.ts',
  description: 'Pick a resident and an hour to see where the shared schedule puts them, then set the crew’s trust and favor to hear what they say.',
  readout: 'Resident routine', duration: 6,
  // On the island the stage moves to wherever the resident is at that hour.
  fieldSite: (values) => {
    const spot = residentAt(resident(values).schedule, rehearsal(values))
    return { name: `${resident(values).identity.name}, Starter Island`, offset: { x: spot.x, y: walkingHeight(spot), z: spot.z } }
  },
  controls: [
    control('resident', 'Resident', starterResidents[0].id, choices, true),
    range('hour', 'Island hour', 10, 0, 23.75, .25, true),
    control('trust', 'Crew trust', '0', trustLevels),
    control('favor', 'First favor', 'open', favorStates),
  ],
  create(meshes, values, _reportError, observe) {
    const subject = resident(values)
    const rig = createCrew(meshes, 4)
    rig.setAppearance(subject.appearance.look, { dye: subject.appearance.dye })
    const spot = residentAt(subject.schedule, rehearsal(values))
    rig.root.rotation.y = spot.heading
    return ({ time }, current) => {
      rig.blink(time)
      poseCrew(rig, time * 1.8, spot.walking ? .65 : 0, false, undefined, 0, 1)
      const state = rehearsal(current)
      const [greeting, advice] = conversationLines(subject, state)
      const where = spot.indoors ? 'indoors' : spot.stop === 'walking' ? 'walking' : `at ${spot.stop}`
      const asking = openOffer(subject, state) ? ' · Agree to help is offered' : ''
      observe(`${subject.identity.name} is ${where} (${spot.x.toFixed(1)}, ${spot.z.toFixed(1)})${asking}. ${greeting} ${advice}`)
    }
  },
}
