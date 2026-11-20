import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { createCrewHair } from './crew-hair'
import { coastalProfile } from './coastal-profiles'
import type { MeshFactory } from '../island-meshes'
import { defaultAppearance, skinTones, uniforms } from '../crew-appearance'
import type { CrewAppearance } from '../crew-appearance'
import { waterLevel } from '../terrain'
const cream = '#fff3d0'

export const playerColors = [uniforms.amber.color, uniforms.blue.color]
export const skiffCrewSeats = [new Vector3(-0.44, -0.39, 0.25), new Vector3(0.44, -0.39, 0.25)]

export function createCrew(meshes: MeshFactory, id: number) {
  const { scene, sphere, box, paint } = meshes
  const root = new TransformNode(`Crew ${id + 1}`, scene)
  const arms: TransformNode[] = []
  const legs: TransformNode[] = []
  const fabric: Mesh[] = []
  const accents: Mesh[] = []
  const skin: Mesh[] = []
  const eyes: { mesh: Mesh; height: number }[] = []
  // Stacked cross-sections keep hems and soles level while giving the cheeks, jacket and boots soft edges.
  function upright(parent: TransformNode, name: string, color: string,
    sections: [height: number, backOffset: number, halfWidth: number, halfDepth: number][], sides = 12) {
    const mesh = coastalProfile(meshes, parent, name, color, sections, sides, .73)
    mesh.rotation.x = -Math.PI / 2
    return mesh
  }
  for (const side of [-1, 1]) {
    const leg = new TransformNode('Hip', scene)
    leg.parent = root
    leg.position.set(side * .18, .68, .02)
    upright(leg, 'Twill trousers', '#374f5d', [
      [-.46, 0, .127, .137], [-.39, 0, .141, .143], [-.19, .008, .149, .157], [.065, .018, .155, .155],
    ])
    upright(leg, 'Turned trouser hem', '#526673', [[-.463, 0, .134, .147], [-.399, 0, .146, .152]])
    upright(leg, 'Leather boot', '#654c3b', [
      [-.638, -.065, .143, .219], [-.594, -.068, .149, .222], [-.548, -.060, .145, .208],
      [-.505, -.009, .123, .145], [-.411, .006, .116, .125],
    ])
    upright(leg, 'Deck sole', '#453f37', [[-.679, -.066, .142, .215], [-.642, -.066, .149, .222]])
    legs.push(leg)
    const arm = new TransformNode('Shoulder', scene)
    arm.parent = root
    arm.position.set(side * .36, 1.19, .03)
    const sleevePivot = new TransformNode('Sleeve seam', scene)
    sleevePivot.parent = arm
    sleevePivot.rotation.z = side * .20
    sleevePivot.position.x = side * .017
    const sleeve = upright(sleevePivot, 'Cut sleeve', cream, [
      [-.399, 0, .102, .108], [-.22, 0, .108, .122], [-.064, .004, .136, .143], [.012, .014, .106, .110], [.044, .014, .052, .063],
    ])
    fabric.push(sleeve)
    const cuff = upright(sleevePivot, 'Turned sleeve cuff', cream, [[-.434, 0, .108, .12], [-.363, 0, .114, .127]])
    accents.push(cuff)
    skin.push(sphere(side * .115, -.499, .018, .158, .211, .175, cream, arm, true, 8))
    skin.push(sphere(side * .057, -.503, .070, .077, .101, .081, cream, arm, true, 6))
    arms.push(arm)
  }
  fabric.push(upright(root, 'Canvas chore shirt', cream, [
    [.65, .015, .301, .207], [.682, .015, .331, .228], [.87, .011, .327, .216],
    [1.09, 0, .348, .213], [1.185, .005, .355, .194], [1.252, .002, .204, .146],
  ], 16))
  fabric.push(upright(root, 'Shirt collar band', cream, [[1.231, 0, .169, .137], [1.278, 0, .148, .131]]))
  for (const side of [-1, 1]) {
    const collar = box(side * .073, 1.205, .152, .112, .105, .046, cream, root)
    collar.rotation.z = -side * .44
    accents.push(collar)
  }
  fabric.push(box(-.164, 1.043, .201, .120, .113, .035, cream, root))
  accents.push(box(-.164, 1.098, .212, .132, .026, .035, cream, root))
  for (const y of [.82, .945, 1.067]) accents.push(sphere(.009, y, .215, .033, .033, .017, cream, root, false, 4))
  skin.push(upright(root, 'Neck', cream, [[1.225, -.012, .129, .113], [1.348, -.012, .124, .125]]))
  skin.push(upright(root, 'Cheeks and chin', cream, [
    [1.296, -.073, .126, .138], [1.327, -.059, .186, .168], [1.417, -.040, .229, .19],
    [1.515, -.030, .245, .196], [1.621, -.019, .246, .199], [1.696, -.005, .218, .181], [1.739, 0, .153, .139],
  ], 20))
  skin.push(coastalProfile(meshes, root, 'Wedge nose', cream, [
    [.205, 1.49, .029, .061], [.246, 1.47, .045, .040], [.274, 1.456, .031, .022],
  ]))
  const hair = '#493932'
  for (const side of [-1, 1]) {
    skin.push(sphere(side * .235, 1.469, .012, .085, .132, .099, cream, root, true, 8))
    const white = sphere(side * .095, 1.527, .216, .087, .068, .032, '#fff3df', root, false, 8)
    const pupil = sphere(side * .093, 1.526, .233, .049, .055, .016, '#49372f', root, false, 8)
    const brow = sphere(side * .095, 1.587, .216, .098, .024, .025, hair, root, false, 6)
    brow.rotation.z = side * .07
    eyes.push({ mesh: white, height: white.scaling.y }, { mesh: pupil, height: pupil.scaling.y })
    const cheekSmile = sphere(side * .032, 1.385, .235, .072, .015, .019, '#865548', root, false, 6)
    cheekSmile.rotation.z = side * .14
  }
  const fitHair = createCrewHair(meshes, root)
  fitHair(true)
  const cap = upright(root, 'Canvas cap', cream, [
    [1.636, .007, .255, .222], [1.668, .007, .27, .233], [1.757, .018, .239, .208], [1.814, .020, .132, .12],
  ], 16)
  const brim = sphere(0, 1.65, .189, .463, .039, .302, cream, root, true, 10)
  fabric.push(cap)
  accents.push(brim)

  let worn: CrewAppearance | undefined
  let lastDye: string | undefined
  function setAppearance(appearance = defaultAppearance, dye?: string) {
    if (worn?.uniform === appearance.uniform && worn.skin === appearance.skin && lastDye === dye) return
    lastDye = dye
    worn = appearance
    const uniform = uniforms[appearance.uniform === 'default' ? (id === 0 ? 'amber' : 'blue') : appearance.uniform]
    const tone = skinTones[appearance.skin === 'default' ? (id === 0 ? 'light' : 'medium') : appearance.skin]
    const colors = [paint(dye ?? uniform.color), paint(uniform.trim), paint(tone.color)]
    for (const [i, parts] of [fabric, accents, skin].entries()) {
      for (const part of parts) part.material = colors[i]
    }
  }
  function blink(time: number) {
    const phase = (time + 4.1 + id * 1.59) % (5.8 + id * 0.47)
    const openness = Math.max(0.08, Math.min(1, Math.abs(phase - 0.11) / 0.11))
    for (const { mesh, height } of eyes) mesh.scaling.y = height * openness
  }
  setAppearance()
  return { root, arms, legs, setAppearance, blink, setCap(visible: boolean) { cap.setEnabled(visible); brim.setEnabled(visible); fitHair(visible) } }
}

export function poseCrew(crew: ReturnType<typeof createCrew>, cycle: number, stride: number, airborne: boolean,
  carrying?: 'crate' | 'extinguisher' | 'tool', reach = 0, blend = 1, winding = 0, throwing = false, rightHandRaised = false) {
  const swing = Math.sin(cycle * Math.PI * 2) * stride
  for (const [i, leg] of crew.legs.entries()) {
    const side = i === 0 ? -1 : 1
    leg.rotation.x += ((airborne ? side * 0.35 : swing * side) - leg.rotation.x) * blend
    const arm = crew.arms[i]
    arm.rotation.z *= 1 - blend
    const swinging = airborne ? -0.8 : -swing * side * 0.77
    const relaxed = throwing ? -1.75 : carrying === 'crate' ? -1.22 - winding * 0.67
      : (carrying === 'extinguisher' || carrying === 'tool') && i === 0 ? -1.36 : swinging
    const reachAmount = i === 0 ? reach : Number(rightHandRaised)
    const forward = relaxed + (-Math.PI / 2 - relaxed) * reachAmount
    arm.rotation.x += (forward - arm.rotation.x) * blend
  }
}

export function poseSwimming(crew: ReturnType<typeof createCrew>, time: number, speed: number, blend = 1) {
  const stroke = time * Math.PI * 2 / 1.6
  crew.root.rotation.x = .06 + .22 * speed
  for (const [i, arm] of crew.arms.entries()) {
    const side = i === 0 ? -1 : 1
    const reach = -.86 - Math.cos(stroke) * (.2 + .46 * speed)
    const sweep = side * (.7 + Math.sin(stroke) * .44)
    arm.rotation.x += (reach - arm.rotation.x) * blend
    arm.rotation.z += (sweep - arm.rotation.z) * blend
    crew.legs[i].rotation.x = .25 + side * Math.sin(stroke * 2) * (.17 + .27 * speed)
  }
}

export function swimmingHeight(time: number) {
  return waterLevel - 1.01 + .036 * Math.sin(time * Math.PI * 2 / 1.6)
}

export function createFarmTools({ scene, box, cylinder, sphere }: MeshFactory, character: ReturnType<typeof createCrew>) {
  const hoe = new TransformNode('Hoe', scene)
  const can = new TransformNode('Watering can', scene)
  for (const grip of [hoe, can]) {
    grip.parent = character.arms[0]
    grip.position.set(-0.12, -0.53, 0.017)
    grip.setEnabled(false)
  }
  hoe.rotation.z = -0.8
  cylinder(0, -0.36, 0, 0.068, 0.068, 1.29, 9, '#ab784d', hoe)
  box(0, -0.99, 0.08, 0.21, 0.082, 0.34, '#58716e', hoe)
  sphere(0, -0.16, 0.15, 0.33, 0.42, 0.32, '#608f87', can)
  box(0, -0.16, 0.35, 0.073, 0.09, 0.25, '#6a9990', can).rotation.x = -0.35
  sphere(0, -0.13, 0.48, 0.117, 0.11, 0.09, '#d0ae72', can)
  return { hoe, can }
}

export function poseSkiffCrew(crew: ReturnType<typeof createCrew>, stroke: number, side: number, fishing: boolean, blend: number) {
  for (const [i, leg] of crew.legs.entries()) {
    leg.rotation.x += (-1.27 - leg.rotation.x) * blend
    const arm = crew.arms[i]
    arm.rotation.z *= 1 - blend
    const outerArm = i === (side < 0 ? 0 : 1)
    const pose = fishing ? (outerArm ? -1.39 : -1.07) : outerArm ? -1.09 + stroke * 0.59 : -1.25 + stroke * 0.22
    arm.rotation.x += (pose - arm.rotation.x) * blend
  }
}

export function createSkiffGear({ scene, box, cylinder, sphere }: MeshFactory, character: ReturnType<typeof createCrew>) {
  return [-1, 1].map((side, i) => {
    const grip = new TransformNode('Skiff gear', scene)
    grip.parent = character.arms[i]
    grip.position.set(side * 0.12, -0.53, 0.017)
    const paddle = new TransformNode('Paddle', scene)
    paddle.parent = grip
    paddle.rotation.z = side * 1.34
    cylinder(0, -0.23, 0, 0.056, 0.056, 1.28, 8, '#8f6746', paddle)
    box(0, -0.96, 0, 0.25, 0.4, 0.068, '#c29862', paddle)
    const rod = new TransformNode('Fishing rod', scene)
    rod.parent = grip
    cylinder(0, -0.6, 0, 0.04, 0.013, 1.65, 8, '#496552', rod)
    sphere(0, -0.12, 0.06, 0.13, 0.12, 0.09, '#cbd4bd', rod, false)
    grip.setEnabled(false)
    return { grip, paddle, rod }
  })
}
