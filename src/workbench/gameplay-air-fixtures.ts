import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { createMillVent, createOilLantern } from '../assets/effect-props'
import { gateFrostStage, lanternStage, mothStage, snuffStage, ventStage } from '../assets/geometry/workbench-effect-fixtures'
import { canvasRunoffMotion, gateFrostMotion, mothMotion, snuffMotion, ventMotion } from '../assets/recipes/workbench-effect-fixtures'
import { createWrenGateAssembly, wrenGateTopRail } from '../assets/wren-gate'
import { gateLeaf } from '../gate-layout'
import type { MeshFactory } from '../island-meshes'
import { contactAge, crewAt, type Fixture } from './effect-fixtures'
import { createMarketRunoffStage } from './market-awning-stage'

const halves = 2
const half = 0.5

function lanternStand(meshes: MeshFactory) {
  const { height, legs, top } = lanternStage
  const lantern = createOilLantern(meshes)
  lantern.root.position.y = height
  for (const x of legs.x) {
    for (const z of legs.z) meshes.box(x, height / halves, z, legs.width, height, legs.depth, legs.color)
  }
  meshes.box(0, height - top.inset, 0, ...top.size, top.color)
  return lantern
}

export function mothFixture(meshes: MeshFactory): Fixture {
  const lamp = lanternStand(meshes)
  const { crew } = mothStage
  crewAt(meshes, crew.x, crew.z, crew.id).root.rotation.y = crew.heading
  const { orbit, flame } = mothMotion
  const y = lanternStage.height + orbit.heightAboveStand
  return {
    sourceAt(time, index) {
      const angle = time * orbit.approachRate + index * orbit.angleStep
      const radius = orbit.radius + (index % orbit.radiusCycle) * orbit.radiusStep
      const angularSpeed = index % orbit.turnCycle ? orbit.turnRate : orbit.counterTurnRate
      return { x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius, orbit: { x: 0, z: 0, angularSpeed, peelAfter: orbit.peelAfter } }
    },
    pose(time) {
      lamp.flame.scaling.y = flame.heightScale + flame.variation * Math.sin(time * flame.frequency)
    },
  }
}

export function ventFixture(meshes: MeshFactory): Fixture {
  const { wall, roof, vent: ventPlacement, crew } = ventStage
  meshes.box(...wall.position, ...wall.size, wall.color)
  meshes.box(0, roof.y, roof.z, roof.width, roof.thickness, roof.depth, roof.color)
  const vent = createMillVent(meshes)
  vent.root.position.set(ventPlacement.x, roof.y + roof.thickness / halves, ventPlacement.z)
  const { x, y, z } = vent.root.position
  const outlet = { x, y: y + vent.outletHeight, z }
  crewAt(meshes, crew.x, crew.z)
  return {
    sourceAt(time) {
      if (contactAge(time, ...ventMotion.puff) !== undefined) return outlet
    },
  }
}

export function gateFrostFixture(meshes: MeshFactory): Fixture {
  const { crew, frost } = gateFrostStage
  const { release, contacts, swing, floor } = gateFrostMotion
  const gate = createWrenGateAssembly(meshes, { x: -gateLeaf.length / halves, y: 0, z: 0 })
  gate.wornPin.setEnabled(false)
  const rail = wrenGateTopRail
  const top = rail.y + rail.height / halves
  meshes.box(rail.x, top + frost.thickness / halves, rail.z, rail.width, frost.thickness, rail.depth, frost.color, gate.leaf)
  const contact = new Vector3(rail.x, top + frost.thickness, rail.z)
  crewAt(meshes, crew.x, crew.z, crew.id).root.rotation.y = crew.heading
  function pose(time: number) {
    gate.hinge.rotation.y = swing.angle * Math.sin(Math.min(time, swing.duration) * Math.PI / swing.duration)
  }
  return {
    sourceAt(time, index) {
      if (contactAge(time, ...release) === undefined) return
      pose(time)
      const across = (index % contacts) / (contacts - 1) - half
      contact.x = rail.x + across * (rail.width - rail.depth)
      const { x, y, z } = Vector3.TransformCoordinates(contact, gate.leaf.computeWorldMatrix(true))
      return { x, y, z, yaw: gate.hinge.rotation.y, floor }
    },
    pose,
  }
}

export function canvasRunoffFixture(meshes: MeshFactory): Fixture {
  const { runway, runoffLane } = createMarketRunoffStage(meshes)
  const { surge: [start, period, duration], stagger, staggerCycle, ripplesStart } = canvasRunoffMotion
  return {
    sourceAt(time, index) {
      const surge = contactAge(time, start + stagger * (index % staggerCycle), period, duration)
      if (surge !== undefined) return runoffLane(index)
    },
    accents: [{ id: 'surface-pops', sourceAt: (time, index) => {
      if (time >= ripplesStart) return runway(index)
    } }],
  }
}

export function snuffFixture(meshes: MeshFactory): Fixture {
  const lamp = lanternStand(meshes)
  const { crew } = snuffStage
  crewAt(meshes, crew.x, crew.z).root.rotation.y = crew.heading
  const { extinguish, smokeEnd, source, unlitGlobeVisibility } = snuffMotion
  return {
    sourceAt(time) {
      if (time > extinguish && time < smokeEnd) return { ...source }
    },
    pose(time) {
      const lit = time < extinguish
      lamp.flame.setEnabled(lit)
      lamp.globe.visibility = lit ? 1 : unlitGlobeVisibility
    },
  }
}
