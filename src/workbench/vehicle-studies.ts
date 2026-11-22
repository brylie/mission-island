import { flatbedReview, skiffReview } from '../assets/recipes/workbench-building-vehicle-studies'
import { Quaternion } from '@babylonjs/core/Maths/math.vector'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { itemScale, stowedPose } from '../rescue-gear'
import { createCompactTractor } from '../assets/compact-tractor'
import { createFlatbed, poseFlatbed } from '../assets/flatbed'
import { createResponsePickup } from '../assets/response-pickup'
import { learnerVehicles, type LearnerVehicleId } from '../learner-vehicles'
import { createHarborBoat, poseFloating } from '../assets/waterfront'
import { createSupply } from '../assets/props'
import { surfaces } from '../materials'
import { groundHeight, waterLevel } from '../terrain'
import { truckStart, cargoSlots, crateSize, itemStarts, truckBed } from '../world'
import { control, range, type Entry } from './subject'

const halves = 2
const degreesPerHalfTurn = 180

export const flatbedStudy: Entry = {
  id: 'flatbed',
  name: 'Flatbed truck',
  group: 'Starter vehicles',
  source: 'src/assets/flatbed.ts',
  duration: flatbedReview.duration,
  fieldSite: () => ({ name: 'Harbor Depot', heading: truckStart.heading, offset: { ...truckStart, y: groundHeight(truckStart) } }),
  description: 'Inspect the truck exterior, side rails, steering, and cargo fit.',
  controls: [
    control('state', 'State', 'parked', { parked: 'Parked', driving: 'Driving', turning: 'Turning' }),
    range('steering', 'Steering angle', ...flatbedReview.steering),
    { type: 'checkbox', key: 'cargo', label: 'Show bed cargo', value: false },
    { type: 'checkbox', key: 'lights', label: 'Running lights', value: false },
    { type: 'checkbox', key: 'brake', label: 'Brake lights', value: false },
  ],
  create(meshes) {
    const truck = createFlatbed(meshes, { merge: false })
    const crates = cargoSlots.map((z) => {
      const crate = createSupply(meshes, 'crate')
      crate.parent = truck.root
      crate.position.set(0, truckBed.top + crateSize / halves, z)
      return crate
    })
    return ({ time }, values) => {
      const turn = Number(values.steering) * Math.PI / degreesPerHalfTurn
      poseFlatbed(truck, values.state === 'parked' ? 0 : time * Math.PI * flatbedReview.wheelHalfTurnsPerSecond, values.state === 'turning' ? turn : 0)
      truck.setLights(values.lights ? 1 : 0, Boolean(values.brake))
      for (const crate of crates) crate.setEnabled(Boolean(values.cargo))
    }
  },
}

export const harborBoatStudy: Entry = {
  id: 'boat',
  name: 'Harbor boat',
  group: 'Starter vehicles',
  source: 'src/assets/waterfront.ts',
  description: 'Inspect the skiff hull, bench seats, and gentle motion at the dock.',
  ground: { height: waterLevel, color: surfaces.water.color },
  duration: skiffReview.duration,
  create(meshes) {
    const boat = createHarborBoat(meshes)
    return ({ time }) => poseFloating(boat, time, skiffReview.bobPhase, skiffReview.bobHeight)
  },
}

type LearnerModel = ReturnType<typeof createResponsePickup>

// The production gear models, placed in their bed slots on a parked pickup.
function stowGear(meshes: Parameters<Entry['create']>[0], root: TransformNode) {
  const parked = { x: 0, y: 0, z: 0, heading: 0, pitch: 0, roll: 0, speed: 0, steering: 0, braking: false, suspension: [] }
  return itemStarts.flatMap(({ kind }, id) => {
    if (!('slot' in itemStarts[id])) return []
    const node = createSupply(meshes, kind)
    node.scaling.setAll(itemScale({ id }))
    node.parent = root
    const pose = stowedPose({ id }, { pickup: parked, tractor: parked })
    node.position.set(pose.x, pose.y, pose.z)
    if (pose.rotation) node.rotationQuaternion = new Quaternion(pose.rotation.x, pose.rotation.y, pose.rotation.z, pose.rotation.w)
    return [node]
  })
}

function learnerStudy(id: string, vehicle: LearnerVehicleId, source: string, description: string, create: (meshes: Parameters<Entry['create']>[0]) => LearnerModel): Entry {
  const { name, park } = learnerVehicles[vehicle]
  return {
    id,
    name,
    group: 'Starter vehicles',
    source,
    duration: flatbedReview.duration,
    description,
    fieldSite: () => ({ name, heading: park.heading, offset: { ...park, y: groundHeight(park) } }),
    controls: [
      control('state', 'State', 'parked', { parked: 'Parked', driving: 'Driving', turning: 'Turning' }),
      range('steering', 'Steering angle', ...flatbedReview.steering),
      { type: 'checkbox', key: 'lights', label: 'Running lights', value: false },
      { type: 'checkbox', key: 'brake', label: 'Brake lights', value: false },
      ...(vehicle === 'pickup' ? [{ type: 'checkbox' as const, key: 'gear', label: 'Show rescue gear', value: true }] : []),
    ],
    create(meshes) {
      const model = create(meshes)
      const gear = vehicle === 'pickup' ? stowGear(meshes, model.root) : []
      return ({ time }, values) => {
        for (const node of gear) node.setEnabled(Boolean(values.gear))
        const vehicle = model
        const turn = Number(values.steering) * Math.PI / degreesPerHalfTurn
        vehicle.pose(values.state === 'parked' ? 0 : time * Math.PI * flatbedReview.wheelHalfTurnsPerSecond, values.state === 'turning' ? turn : 0)
        vehicle.setLights(values.lights ? 1 : 0, Boolean(values.brake))
      }
    },
  }
}

export const responsePickupStudy = learnerStudy('response-pickup', 'pickup', 'src/assets/response-pickup.ts', 'Inspect the Seabrook Fire and Rescue pickup: crew cab, light bar, response locker and the rescue gear in its bed.', (meshes) => createResponsePickup(meshes, { merge: false }))

export const compactTractorStudy = learnerStudy('compact-tractor', 'tractor', 'src/assets/compact-tractor.ts', 'Inspect the Island Farm tractor: lugged rear tires, small steering wheels, roll bar and seat.', (meshes) => createCompactTractor(meshes, { merge: false }))
