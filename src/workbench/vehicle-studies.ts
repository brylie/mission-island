import { createFlatbed, poseFlatbed } from '../assets/flatbed'
import { createHarborBoat, poseFloating } from '../assets/waterfront'
import { createSupply } from '../assets/props'
import { surfaces } from '../materials'
import { groundHeight, waterLevel } from '../terrain'
import { truckStart, cargoSlots, crateSize, truckBed } from '../world'
import { control, range, type Entry } from './subject'

export const flatbedStudy: Entry = {
  id: 'flatbed',
  name: 'Flatbed truck',
  group: 'Starter vehicles',
  source: 'src/assets/flatbed.ts',
  duration: 4,
  fieldSite: () => ({ name: 'Harbor Depot', heading: truckStart.heading, offset: { ...truckStart, y: groundHeight(truckStart) } }),
  description: 'Inspect the truck exterior, side rails, steering, and cargo fit.',
  controls: [
    control('state', 'State', 'parked', { parked: 'Parked', driving: 'Driving', turning: 'Turning' }),
    range('steering', 'Steering angle', 28, -45, 45, 1),
    { type: 'checkbox', key: 'cargo', label: 'Show bed cargo', value: false },
    { type: 'checkbox', key: 'lights', label: 'Running lights', value: false },
    { type: 'checkbox', key: 'brake', label: 'Brake lights', value: false },
  ],
  create(meshes) {
    const truck = createFlatbed(meshes)
    const crates = cargoSlots.map((z) => {
      const crate = createSupply(meshes, 'crate')
      crate.parent = truck.root
      crate.position.set(0, truckBed.top + crateSize / 2, z)
      return crate
    })
    return ({ time }, values) => {
      const turn = Number(values.steering) * Math.PI / 180
      poseFlatbed(truck, values.state === 'parked' ? 0 : time * Math.PI * 4, values.state === 'turning' ? turn : 0)
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
  duration: 8,
  create(meshes) {
    const boat = createHarborBoat(meshes)
    return ({ time }) => poseFloating(boat, time, 0.5, 0.048)
  },
}
