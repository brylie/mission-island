import { restoreFarmWork } from '../farm-orders'
import { createCrew, poseCrew } from '../assets/crew'
import type { Snapshot } from '../protocol'
import { conversationLines, favorLine } from '../residents/favors'
import { chooseRemark, remarkContext } from '../residents/remarks'
import { residentAt } from '../residents/schedule'
import { initialResidents } from '../residents/trust'
import { walkingHeight } from '../terrain'
import { daySeconds } from '../weather'
import { islandRemarks } from '../worlds/starter/island-remarks'
import { starterResidents } from '../worlds/starter/residents'
import { control, range, type Entry, type Values } from './subject'

const choices = Object.fromEntries(starterResidents.map(({ id, identity }) => [id, `${identity.name} · ${identity.role}`]))
const trustLevels = { 0: 'Stranger', 1: 'Familiar', 3: 'Trusted' }
const favorStates = { open: 'Asking', active: 'Under way', kept: 'Kept' }
const standings = { steady: 'Steady', wronged: 'Promise broken', wary: 'Put right, still wary', forgiven: 'Relies on the crew again' }

function resident(values: Values) {
  return starterResidents.find(({ id }) => id === values.resident) ?? starterResidents[0]
}

// A snapshot with just what a resident's day and conversation read: the clock, the gate and the crew's record.
function rehearsal(values: Values) {
  const subject = resident(values)
  const favor = subject.favors[0]
  const islandTime = ((Number(values.hour) - 6 + 24) % 24) * daySeconds / 24
  const residents = initialResidents(starterResidents)
  const breach = values.standing === 'wronged' || values.standing === 'wary'
    ? { favor: favor.id, at: 0, amended: values.standing === 'wary', rebuilt: 0 } : null
  residents[subject.id] = { ...residents[subject.id], trust: Number(values.trust), breach, forgiven: values.standing === 'forgiven' ? 1 : 0,
    kept: values.favor === 'kept' ? [favor.id] : [], active: values.favor === 'active' ? favor.id : null }
  const weather = { hour: Number(values.hour), rain: values.rain ? 1 : 0 }
  return { islandTime, weather, farmWork: restoreFarmWork(), mission: 'complete', jobs: { active: null, completed: 0 }, farm: [],
    aviation: { qualified: false }, residents, gateRepair: { stage: 'sagging', pinHolder: null } } as unknown as Snapshot
}

export const residentRoutinesStudy: Entry = {
  id: 'resident-routines', name: 'Resident routines', group: 'NPC interactions', source: 'src/worlds/starter/residents.ts',
  description: 'Pick a resident and an hour to see where the shared schedule puts them, then set the crew’s trust, standing, favor and weather to hear what they say. Change the remark seed to hear other small talk that fits.',
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
    control('standing', 'Standing', 'steady', standings),
    { type: 'checkbox', key: 'rain', label: 'Raining', value: false },
    { type: 'number', key: 'seed', label: 'Remark seed', min: 0, max: 999, step: 1, value: 1 },
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
      const said = chooseRemark(subject, islandRemarks, remarkContext(subject, state, { id: 0, name: 'Crew 1' }), Number(current.seed))
      observe(`${subject.identity.name} is ${where} (${spot.x.toFixed(1)}, ${spot.z.toFixed(1)}). ${greeting} “${said?.text ?? ''}” ${advice} ${favorLine(subject, state) ?? ''}`)
    }
  },
}
