import { createCrew, poseCrew } from '../assets/crew'
import { crewSwing, strideCycleMetres } from '../island-render-pose'
import { defaultAppearance, skinTones, type CrewAppearance } from '../crew-appearance'
import { dyeLineup } from '../assets/recipes/dye-lineup'
import { dyeSwatches, type DyeSwatchId } from '../assets/recipes/dye-swatches'
import { walkingHeight } from '../terrain'
import { crewWalkSpeed } from '../world'
import { control, range, type Entry, type Values } from './subject'

const swatchChoices = Object.fromEntries(Object.entries(dyeSwatches).map(([id, swatch]) => [id, swatch.name]))
const skinChoices = Object.fromEntries(Object.entries(skinTones).map(([id, tone]) => [id, tone.name]))
const { meadow, sideOffset, walkAway, minutesPerHour, clockDigits } = dyeLineup
const clock = (hour: number) => `${Math.floor(hour)}:${String(Math.round((hour % 1) * minutesPerHour)).padStart(clockDigits, '0')}`

function look(values: Values, side: 'left' | 'right'): CrewAppearance {
  return { ...defaultAppearance, uniform: 'amber', shirt: 'amber', hat: 'amber', skin: values[`${side}Skin`] as CrewAppearance['skin'] }
}

function dye(values: Values, side: 'left' | 'right') {
  const swatch = dyeSwatches[values[`${side}Dye`] as DyeSwatchId]
  return { color: swatch.color, trim: swatch.trim }
}

// Two crewmates in plain dyed shirts and caps under the island's real light,
// for checking that partners stay recognizable at follow-camera and island distance.
export const dyeLineupStudy: Entry = {
  id: 'dye-lineup', name: 'Dye lineup', group: 'Wardrobe', source: 'src/assets/recipes/dye-swatches.ts',
  description: 'Put two crewmates side by side in dye swatches under the island hour, then let them walk away to judge them from behind.',
  readout: 'Dye lineup',
  duration: walkAway / crewWalkSpeed,
  angle: dyeLineup.cameraAngle,
  headroom: dyeLineup.headroom,
  fieldSite: () => ({ name: 'Village meadow, Starter Island', offset: { x: meadow.x, z: meadow.z, y: walkingHeight(meadow) } }),
  weather: (_time, values) => ({ hour: Number(values.hour), rain: values.rain ? 1 : 0 }),
  controls: [
    range('hour', 'Island hour', dyeLineup.hour.start, dyeLineup.hour.min, dyeLineup.hour.max, dyeLineup.hour.step),
    { type: 'checkbox', key: 'rain', label: 'Raining', value: false },
    control('leftDye', 'Left dye', 'mid-256', swatchChoices),
    control('leftSkin', 'Left skin tone', 'warm', skinChoices),
    control('rightDye', 'Right dye', 'mid-301', swatchChoices),
    control('rightSkin', 'Right skin tone', 'medium', skinChoices),
    { type: 'checkbox', key: 'walk', label: 'Walk away from the camera', value: true },
  ],
  create(meshes, _values, _reportError, observe) {
    const crew = (['left', 'right'] as const).map((side, i) => ({ side, rig: createCrew(meshes, i) }))
    return ({ time }, values) => {
      const walking = Boolean(values.walk)
      const travelled = walking ? (time * crewWalkSpeed) % walkAway : 0
      const stride = crewSwing(walking ? crewWalkSpeed : 0)
      for (const { side, rig } of crew) {
        rig.setAppearance(look(values, side), { dye: dye(values, side) })
        rig.setCap(true)
        rig.blink(time)
        // The camera looks along +z, so walking toward +z leads away from it.
        rig.root.position.set(side === 'left' ? -sideOffset : sideOffset, 0, travelled)
        rig.root.rotation.y = 0
        poseCrew(rig, travelled / strideCycleMetres(stride), stride, false, undefined, 0, 1)
      }
      const left = dyeSwatches[values.leftDye as DyeSwatchId], right = dyeSwatches[values.rightDye as DyeSwatchId]
      observe(`${left.name} beside ${right.name} at ${clock(Number(values.hour))}`)
    }
  },
}
