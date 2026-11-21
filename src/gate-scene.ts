import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { createCrew, poseCrew } from './assets/crew'
import type { MeshFactory } from './island-meshes'
import { fenceHeight, fenceRuns, gateLeaf, gateMendedStage, hingePost, leafAngle, mendingBench, sagAngle, wrenAt } from './gate-repair'
import { moveTo } from './island-render-pose'
import type { Snapshot } from './protocol'
import { groundHeight, walkingHeight } from './terrain'
import { distance, offset } from './world'
import type { Point } from './world'

const timber = '#9a8263', cap = '#c9b48d', iron = '#4a4644', rust = '#8c5a3c', brass = '#e2b55a', soil = '#5b4532'

function fenceRun(meshes: MeshFactory, from: Point, to: Point) {
  const length = distance(from, to)
  const heading = Math.atan2(to.x - from.x, to.z - from.z) - Math.PI / 2
  const root = new TransformNode('Garden fence', meshes.scene)
  root.position.set(from.x, groundHeight(from), from.z)
  root.rotation.y = heading
  for (let x = 0; x <= length + .01; x += Math.max(.5, length / Math.ceil(length))) {
    meshes.box(x, fenceHeight / 2, 0, .11, fenceHeight, .11, timber, root)
  }
  for (const y of [.32, 1.18]) meshes.box(length / 2, y, .07, length, .08, .04, timber, root)
  for (let x = .08; x < length; x += .16) meshes.box(x, .78, .1, .1, 1.46, .025, cap, root)
}

// Wren's gate: a leaf on a hinge pivot that the host swings, a hinge whose worn top pin
// lets the free end drop into a groove, and the mending bench where new pins wait.
export function createGardenGate(meshes: MeshFactory, residentId: number) {
  const { box, cylinder, scene } = meshes
  for (const { from, to } of fenceRuns) fenceRun(meshes, from, to)
  const base = groundHeight(hingePost)
  box(hingePost.x, base + .8, hingePost.z, .14, 1.6, .14, timber)
  box(hingePost.x + 1.12, base + .8, hingePost.z, .14, 1.6, .14, timber)
  const hinge = new TransformNode('Garden gate hinge', scene)
  hinge.position.set(hingePost.x, base, hingePost.z)
  const leaf = new TransformNode('Garden gate leaf', scene)
  leaf.parent = hinge
  for (const y of [.3, 1.2]) box(gateLeaf.length / 2 + .03, y, 0, gateLeaf.length - .04, .09, .05, timber, leaf)
  for (let x = .12; x < gateLeaf.length; x += .15) box(x, .78, .03, .1, 1.36, .025, cap, leaf)
  const brace = box(gateLeaf.length / 2, .75, -.01, 1.08, .07, .04, timber, leaf)
  brace.rotation.z = .74
  for (const y of [.32, 1.2]) box(.12, y, -.04, .2, .05, .02, iron, leaf)
  const wornPin = box(.02, 1.2, 0, .035, .1, .035, rust, hinge)
  const newPin = cylinder(.02, 1.2, 0, .045, .045, .16, 8, brass, hinge)
  const groove = new TransformNode('Gate groove', scene)
  for (let angle = -.05; angle <= sagAngle + .25; angle += .07) {
    const radius = gateLeaf.length - .08
    box(hingePost.x + Math.cos(angle) * radius, groundHeight(hingePost) + .012, hingePost.z + Math.sin(angle) * radius,
      .16, .02, .12, soil, groove).rotation.y = -angle
  }

  const benchY = groundHeight(mendingBench)
  const bench = new TransformNode('Mending bench', scene)
  bench.position.set(mendingBench.x, benchY, mendingBench.z)
  bench.rotation.y = mendingBench.heading
  box(0, .82, 0, 1.6, .08, .7, '#a77a52', bench)
  for (const x of [-.7, .7]) for (const z of [-.27, .27]) box(x, .4, z, .09, .8, .09, '#7a5a3f', bench)
  box(0, .2, 0, 1.4, .05, .55, '#7a5a3f', bench)
  box(-.5, .93, -.1, .18, .14, .22, iron, bench)
  box(.35, .89, .1, .4, .06, .26, '#3f5d5a', bench)
  const benchPin = cylinder(.35, .95, .1, .045, .045, .16, 8, brass, bench)
  const carried = cylinder(0, 0, 0, .045, .045, .16, 8, brass)

  const wren = createCrew(meshes, residentId)
  wren.setAppearance({ uniform: 'default', skin: 'deep', shirt: 'coral', hair: 'bun', hairColor: 'black', hat: 'none', trousers: 'sand' })
  wren.root.setEnabled(false)
  let cycle = 0

  return {
    resident: wren.root,
    update(state: Snapshot, factor: number, delta: number, time: number) {
      const stage = state.gateRepair.stage
      const fixed = stage === 'fitted' || stage === 'mended'
      hinge.rotation.y += (-leafAngle(state) - hinge.rotation.y) * factor
      // The worn pin lets the free end drop and scrape until a new one is fitted.
      leaf.rotation.z += ((fixed ? 0 : -.055) - leaf.rotation.z) * factor
      wornPin.setEnabled(!fixed)
      newPin.setEnabled(fixed)
      groove.setEnabled(gateMendedStage(state) !== 'settled')
      benchPin.setEnabled(state.gateRepair.pinHolder === null && stage !== 'fitted' && stage !== 'mended')
      const holder = state.players.find((player) => player.id === state.gateRepair.pinHolder)
      carried.setEnabled(Boolean(holder))
      if (holder) {
        const hand = offset(holder, .42, .18)
        carried.position.set(hand.x, holder.y + .82, hand.z)
      }
      const spot = wrenAt(state)
      moveTo(wren.root, spot, walkingHeight(spot), factor)
      wren.root.setEnabled(!spot.indoors)
      if (spot.walking) cycle += delta * 1.8
      poseCrew(wren, cycle, spot.walking ? .65 : 0, false, undefined, 0, factor)
      wren.blink(time)
    },
  }
}
