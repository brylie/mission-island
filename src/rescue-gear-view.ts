import { SpotLight } from '@babylonjs/core/Lights/spotLight'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Scene } from '@babylonjs/core/scene'
import { flashlightModel, rescueGearScale } from './assets/geometry/rescue-gear'
import type { Snapshot } from './protocol'

// A held flashlight casts a beam ahead: bright at night, faint by day.
export function createFlashlightBeams(scene: Scene, items: readonly { node: TransformNode }[], kinds: readonly string[]) {
  const { beam, lens } = flashlightModel
  const beams = kinds.flatMap((kind, id) => {
    if (kind !== 'flashlight') return []
    const light = new SpotLight('Flashlight beam', new Vector3(0, lens.y * rescueGearScale, beam.z * rescueGearScale), Vector3.Forward(), beam.angle, beam.exponent, scene)
    light.parent = items[id].node
    light.diffuse = Color3.FromHexString(beam.color)
    light.range = beam.range
    light.setEnabled(false)
    return [{ id, light }]
  })
  return (state: Snapshot | undefined, nightStrength: number) => {
    for (const { id, light } of beams) {
      const item = state?.items[id]
      const held = item && item.holder !== null && !state.players.find((player) => player.id === item.holder)?.seat
      // By day the beam is too faint to see, so it only lights from dusk.
      light.setEnabled(Boolean(held) && nightStrength > beam.minimumNight)
      light.intensity = beam.nightIntensity * nightStrength
    }
  }
}
