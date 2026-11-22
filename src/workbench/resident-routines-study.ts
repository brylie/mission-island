import { residentRehearsal } from '../assets/recipes/workbench-place-studies'
import { restoreFarmWork } from '../farm-orders'
import { createCrew, poseCrew } from '../assets/crew'
import { createHouse } from '../assets/buildings'
import { initialFerryRepair } from '../ferry-repair'
import { initialGateRepair } from '../gate-repair'
import { emptyJournal } from '../journal/journal'
import { initialMaterialsWork } from '../materials-work'
import type { Snapshot } from '../protocol'
import { conversationLines, favorLine } from '../residents/favors'
import { chooseRemark, remarkContext } from '../residents/remarks'
import { residentAt, residentVisitingHours, secondsAtIslandHour } from '../residents/schedule'
import { initialResidents } from '../residents/trust'
import { walkingHeight } from '../terrain'
import { islandRemarks } from '../worlds/starter/island-remarks'
import { starterResidents } from '../worlds/starter/residents'
import { buildings, distance } from '../world'
import { control, range, type Entry, type Values } from './subject'

const choices = Object.fromEntries(starterResidents.map(({ id, identity }) => [id, `${identity.name} · ${identity.role}`]))
const favorStates = { open: 'Asking', active: 'Under way', kept: 'Kept' }
const standings = { steady: 'Steady', wronged: 'Promise broken', wary: 'Put right, still wary', forgiven: 'Relies on the crew again' }

function resident(values: Values) {
  return starterResidents.find(({ id }) => id === values.resident) ?? starterResidents[0]
}

function frameHousehold(schedule: ReturnType<typeof resident>['schedule'], spot: ReturnType<typeof residentAt>) {
  return spot.stop === 'home' || distance(spot, schedule.home) <= residentRehearsal.houseApproachRadius
}

// A snapshot with just what a resident's day and conversation read: the clock, the gate and the crew's record.
function rehearsal(values: Values) {
  const subject = resident(values)
  const favor = subject.favors[0]
  const islandTime = secondsAtIslandHour(Number(values.hour))
  const residents = initialResidents(starterResidents)
  const breach = values.standing === 'wronged' || values.standing === 'wary'
    ? { favor: favor.id, at: 0, amended: values.standing === 'wary', rebuilt: 0 }
    : null
  residents[subject.id] = { ...residents[subject.id], trust: Number(values.trust), breach, forgiven: values.standing === 'forgiven' ? 1 : 0, kept: values.favor === 'kept' ? [favor.id] : [], active: values.favor === 'active' ? favor.id : null }
  const weather = { hour: Number(values.hour), rain: values.rain ? 1 : 0 }
  return {
    ...initialGateRepair(),
    ...initialFerryRepair(),
    islandTime,
    weather,
    farmWork: restoreFarmWork(),
    materialsWork: initialMaterialsWork(),
    journal: emptyJournal(),
    mission: 'complete',
    jobs: { active: null, completed: 0 },
    farm: [],
    aviation: { qualified: false },
    residents,
  } as unknown as Snapshot
}

export const residentRoutinesStudy: Entry = {
  id: 'resident-routines',
  name: 'Resident routines',
  group: 'NPC interactions',
  source: 'src/worlds/starter/residents.ts',
  description: 'Pick a resident and an hour to see where the shared schedule puts them, then set the crew’s trust, standing, favor and weather to hear what they say. Change the remark seed to hear other small talk that fits.',
  readout: 'Resident routine',
  duration: residentRehearsal.duration,
  angle: residentRehearsal.houseAngle,
  weather: (_time, values) => ({ hour: Number(values.hour), rain: values.rain ? 1 : 0 }),
  // On the island the stage moves to wherever the resident is at that hour.
  fieldSite: (values) => {
    const { schedule, identity } = resident(values)
    const spot = residentAt(schedule, rehearsal(values))
    const name = `${identity.name}, Starter Island`
    if (!frameHousehold(schedule, spot)) return { name, offset: { x: spot.x, y: walkingHeight(spot), z: spot.z } }
    const { building } = schedule.household
    return { name, offset: { x: building.x, y: 0, z: building.z }, replaceBuilding: buildings.indexOf(building) }
  },
  controls: [
    control('resident', 'Resident', starterResidents[0].id, choices, true),
    range('hour', 'Island hour', ...residentRehearsal.hour, true),
    control('trust', 'Crew trust', '0', residentRehearsal.trust),
    control('favor', 'First favor', 'open', favorStates),
    control('standing', 'Standing', 'steady', standings),
    { type: 'checkbox', key: 'rain', label: 'Raining', value: false },
    { type: 'number', key: 'seed', label: 'Remark seed', min: 0, max: residentRehearsal.remarkMaxSeed, step: 1, value: 1 },
  ],
  create(meshes, values, _reportError, observe) {
    const subject = resident(values)
    const rig = createCrew(meshes, residentRehearsal.avatarId)
    rig.setAppearance(subject.appearance.look, { dye: subject.appearance.dye })
    const spot = residentAt(subject.schedule, rehearsal(values))
    if (frameHousehold(subject.schedule, spot)) {
      const household = subject.schedule.household
      const { building } = household
      const house = createHouse(meshes, { ...building, x: 0, z: 0 }, household)
      house.showWindows(spot.windowLit)
      rig.root.position.set(spot.x - building.x, 0, spot.z - building.z)
    }
    rig.root.setEnabled(!spot.indoors)
    rig.root.rotation.y = spot.heading
    return ({ time }, current) => {
      rig.blink(time)
      poseCrew(rig, time * residentRehearsal.walkCycleRate, spot.walking ? residentRehearsal.walkStride : 0, false, undefined, 0, 1)
      if (spot.stop === 'home' && spot.indoors) {
        const activity = spot.windowLit ? 'awake inside with the windows lit' : 'asleep with the windows dark'
        observe(`${subject.identity.name} is ${activity}. ${residentVisitingHours(subject.schedule)}`)
        return
      }
      const state = rehearsal(current)
      const [greeting, advice] = conversationLines(subject, state)
      const where = spot.stop === 'walking' ? 'walking' : `at ${spot.stop}`
      const said = chooseRemark(subject, islandRemarks, remarkContext(subject, state, { id: 0, name: 'Crew 1' }), Number(current.seed))
      observe(`${subject.identity.name} is ${where} (${spot.x.toFixed(1)}, ${spot.z.toFixed(1)}). ${greeting} “${said?.text ?? ''}” ${advice} ${favorLine(subject, state) ?? ''}`)
    }
  },
}
