import { createCrew, createSkiffGear, poseCrew, poseSkiffCrew, poseSwimming, skiffCrewSeats } from '../assets/crew'
import { createSupply } from '../assets/props'
import { createHarborBoat } from '../assets/waterfront'
import { chargePower } from '../charged-actions'
import { anglerCost, readAppearance, skinTones, uniforms } from '../crew-appearance'
import { walkingHeight, waterLevel } from '../terrain'
import { jumpGravity, jumpSpeed, skiffStart } from '../world'
import { control, range, type Entry } from './subject'

const duration = 2.4
const skiffPreviewHeight = 0.44

export const crewStudy: Entry = {
  id: 'crew', name: 'Crew character', group: 'Wardrobe', source: 'src/assets/crew.ts', duration, headroom: 1.45,
  fieldSite: ({ state }) => state === 'paddle'
    ? { name: 'Harbor', offset: { x: skiffStart.x - 6, z: skiffStart.z, y: waterLevel - skiffPreviewHeight } }
    : { name: 'Seabrook', offset: { x: 39, z: 16, y: walkingHeight({ x: 39, z: 16 }) } },
  readout: 'Wardrobe',
  description: 'Play or scrub the crew poses and compare uniform and skin color choices.',
  controls: [
    control('state', 'Animation', 'walk', { idle: 'Idle', walk: 'Walk', sprint: 'Sprint', jump: 'Jump', paddle: 'Paddle skiff', swim: 'Swim', tread: 'Tread water', reach: 'Left reach', raise: 'Raise right hand', carry: 'Carry crate', throw: 'Throw crate', spray: 'Use extinguisher' }, true),
    control('uniform', 'Uniform', 'amber', Object.fromEntries(Object.entries(uniforms).map(([id, uniform]) => [id, uniform.name]))),
    control('skin', 'Skin tone', 'light', Object.fromEntries(Object.entries(skinTones).map(([id, tone]) => [id, tone.name]))),
    { type: 'checkbox', key: 'cap', label: 'Wear uniform cap', value: true },
    { type: 'checkbox', key: 'dyed', label: 'Use custom fabric dye', value: false },
    { type: 'color', key: 'dye', label: 'Fabric dye', value: '#488a73' },
    range('stride', 'Stride length', 1, 0.2, 1.4, 0.05),
  ],
  create(meshes, initial, _error, observe) {
    const crew = createCrew(meshes, 0)
    if (initial.state === 'paddle') {
      const boat = createHarborBoat(meshes)
      boat.position.set(0, skiffPreviewHeight, 0)
      boat.rotation.y = 0
      crew.root.parent = boat
      crew.root.position.copyFrom(skiffCrewSeats[0])
      const [portGear] = createSkiffGear(meshes, crew)
      portGear.grip.setEnabled(true)
      portGear.rod.setEnabled(false)
    }
    const crate = createSupply(meshes, 'crate')
    crate.parent = crew.root
    crate.position.set(0, 1.13, 0.89)
    const tool = createSupply(meshes, 'extinguisher')
    tool.parent = crew.root
    tool.position.set(-0.49, 0.24, 0.59)
    return ({ time }, values) => {
      const sprinting = values.state === 'sprint'
      const walking = values.state === 'walk' || values.state === 'carry'
      const jumping = values.state === 'jump'
      const windup = values.state === 'throw' && time < 1.12
      const throwing = values.state === 'throw' && time >= 1.12 && time < 1.39
      const carrying = values.state === 'carry' || windup
      const spraying = values.state === 'spray'
      const reach = values.state === 'reach' ? 1 : spraying ? 0.8 + 0.2 * Math.sin(time * 4) : 0
      const jumpTime = Math.max(0, time - 0.6)
      const elevation = jumping ? Math.max(0, jumpSpeed * jumpTime - jumpGravity / 2 * jumpTime * jumpTime) : 0
      const paddling = values.state === 'paddle'
      if (!paddling) crew.root.position.y = elevation
      const stride = Number(values.stride) * (sprinting ? 0.89 : walking ? 0.57 : 0)
      const appearance = readAppearance(values)
      const uniform = uniforms[appearance.uniform === 'default' ? 'amber' : appearance.uniform]
      crew.setAppearance(appearance, values.dyed ? String(values.dye) : undefined)
      crew.setCap(Boolean(values.cap))
      observe(uniform.name + ' · ' + (appearance.uniform === 'angler' ? anglerCost + ' coins' : uniform.unlock || 'Starting uniform'))
      crew.blink(time)
      const power = windup ? chargePower('throw', time) : 0
      crew.root.rotation.x = 0
      if (paddling) poseSkiffCrew(crew, Math.sin(time * 4 * Math.PI / duration), -1, false, 1)
      else if (values.state === 'swim' || values.state === 'tread') poseSwimming(crew, time, Number(values.state === 'swim'))
      else poseCrew(crew, time * (sprinting ? 2.5 : 5 / 3), stride, elevation > 0.08,
        carrying ? 'crate' : spraying ? 'extinguisher' : undefined, reach, 1, power, throwing, values.state === 'raise')
      crate.setEnabled(carrying)
      crate.position.y = 1.13 + power * 0.41
      tool.setEnabled(spraying)
    }
  },
}
