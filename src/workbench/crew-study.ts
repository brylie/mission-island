import { crewSwing, strideCycleMetres } from '../island-render-pose'
import { createCrew, createSkiffGear, poseCrew, poseSkiffCrew, poseSwimming, skiffCrewSeats } from '../assets/crew'
import { createSupply } from '../assets/props'
import { createHarborBoat } from '../assets/waterfront'
import { chargePower } from '../charged-actions'
import { clothingCatalog, shopItemFor } from '../clothing-catalog'
import { appearancePartKeys, appearanceParts, isEveryday, readAppearance, skinTones, uniforms, type CrewAppearance } from '../crew-appearance'
import { walkingHeight, waterLevel } from '../terrain'
import { crewCarrySpeed, crewSprintMultiplier, crewWalkSpeed, jumpGravity, jumpSpeed, skiffStart } from '../world'
import { control, range, type Entry } from './subject'
import { crewClothingSlots, relatedCrewOptions, shownCrewChoice } from './crew-outfit'

const duration = 2.4
const skiffPreviewHeight = 0.44

function describeOutfit(appearance: CrewAppearance) {
  const everyday = isEveryday(appearance.uniform)
  const item = (everyday && shopItemFor('shirt', appearance.shirt))
    || shopItemFor('uniform', appearance.uniform)
  if (item) {
    const { name, price } = clothingCatalog[item]
    const bottoms = everyday && appearance.shirt !== 'lagoon' && appearance.trousers
      ? ' · ' + appearanceParts.trousers.choices[appearance.trousers]
      : ''
    return `${name} · ${price} ${price === 1 ? 'coin' : 'coins'}${bottoms}`
  }
  const uniform = uniforms[appearance.uniform === 'default' ? 'amber' : appearance.uniform]
  if (!everyday) return uniform.name + ' · ' + uniform.unlock
  const shirt = appearance.shirt ? appearanceParts.shirt.choices[appearance.shirt] : uniform.name
  return shirt + ' · ' + appearanceParts.trousers.choices[appearance.trousers ?? 'slate']
}

export const crewStudy: Entry = {
  id: 'crew',
  name: 'Crew character',
  group: 'Wardrobe',
  source: 'src/assets/crew.ts',
  duration,
  headroom: 1.45,
  fieldSite: ({ state }) => state === 'paddle'
    ? { name: 'Harbor', offset: { x: skiffStart.x - 6, z: skiffStart.z, y: waterLevel - skiffPreviewHeight } }
    : { name: 'Seabrook', offset: { x: 39, z: 16, y: walkingHeight({ x: 39, z: 16 }) } },
  readout: 'Wardrobe',
  description: 'Preview a full work uniform or select individual items to switch to everyday clothes.',
  relatedOptions: relatedCrewOptions,
  controls: [
    control('state', 'Animation', 'walk', { idle: 'Idle', walk: 'Walk', sprint: 'Sprint', jump: 'Jump', paddle: 'Paddle skiff', swim: 'Swim', tread: 'Tread water', reach: 'Left reach', raise: 'Raise right hand', carry: 'Carry crate', throw: 'Throw crate', spray: 'Use extinguisher' }, true),
    control('uniform', 'Outfit preset', 'amber', Object.fromEntries(Object.entries(uniforms).map(([id, uniform]) => [id, uniform.name])), true),
    control('skin', 'Skin tone', 'light', Object.fromEntries(Object.entries(skinTones).map(([id, tone]) => [id, tone.name]))),
    ...appearancePartKeys.map((key) => {
      const { label, choices } = appearanceParts[key]
      const select = control(key, label, 'default', { default: 'Default', ...choices }, crewClothingSlots.has(key))
      if (crewClothingSlots.has(key)) select.displayValue = (values) => shownCrewChoice(key, values)
      return select
    }),
    { type: 'checkbox', key: 'cap', label: 'Show cap', value: true },
    { type: 'checkbox', key: 'dyed', label: 'Use custom shirt and cap dye', value: false },
    { type: 'color', key: 'dye', label: 'Fabric dye', value: '#488a73' },
    range('stride', 'Stride length', 1, 0.2, 1.4, 0.05),
  ],
  create(meshes, initial, _error, observe) {
    const crew = createCrew(meshes, 0)
    crew.setAppearance(readAppearance(initial), { dye: initial.dyed ? String(initial.dye) : undefined })
    crew.setCap(Boolean(initial.cap))
    let alignPaddle: (() => void) | undefined
    if (initial.state === 'paddle') {
      const boat = createHarborBoat(meshes)
      boat.position.set(0, skiffPreviewHeight, 0)
      boat.rotation.y = 0
      crew.root.parent = boat
      crew.root.position.copyFrom(skiffCrewSeats[0])
      const [portGear] = createSkiffGear(meshes, crew)
      alignPaddle = portGear.alignPaddle
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
      // Travel speeds and swing from the game, so the preview steps as the crew do.
      const pace = sprinting ? crewWalkSpeed * crewSprintMultiplier : values.state === 'carry' ? crewCarrySpeed : walking ? crewWalkSpeed : 0
      const stride = Number(values.stride) * crewSwing(pace)
      const appearance = readAppearance(values)
      crew.setAppearance(appearance, { dye: values.dyed ? String(values.dye) : undefined })
      crew.setCap(Boolean(values.cap))
      observe(describeOutfit(appearance))
      crew.blink(time)
      const power = windup ? chargePower('throw', time) : 0
      crew.root.rotation.x = 0
      if (paddling) poseSkiffCrew(crew, Math.sin(time * 4 * Math.PI / duration), -1, false, 1)
      else if (values.state === 'swim' || values.state === 'tread') poseSwimming(crew, time, Number(values.state === 'swim'))
      else poseCrew(crew, time * pace / strideCycleMetres(stride), stride, elevation > 0.08, carrying ? 'crate' : spraying ? 'extinguisher' : undefined, reach, 1, power, throwing, values.state === 'raise')
      alignPaddle?.()
      crate.setEnabled(carrying)
      crate.position.y = 1.13 + power * 0.41
      tool.setEnabled(spraying)
    }
  },
}
