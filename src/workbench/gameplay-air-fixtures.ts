import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { createMillVent, createOilLantern } from '../assets/effect-props'
import { createWrenGateAssembly, wrenGateTopRail } from '../assets/wren-gate'
import { gateLeaf } from '../gate-layout'
import type { MeshFactory } from '../island-meshes'
import { contactAge, crewAt, type Fixture } from './effect-fixtures'
import { createMarketRunoffStage } from './market-awning-stage'

function lanternStand(meshes: MeshFactory, height: number) {
  const lantern = createOilLantern(meshes)
  lantern.root.position.y = height
  for (const x of [-0.38, 0.38]) {
    for (const z of [-0.22, 0.22]) meshes.box(x, height / 2, z, 0.085, height, 0.09, '#6a5c49')
  }
  meshes.box(0, height - 0.037, 0, 0.98, 0.073, 0.63, '#9e815f')
  return lantern
}

export function mothFixture(meshes: MeshFactory): Fixture {
  const height = 0.94
  const lamp = lanternStand(meshes, height)
  const crew = crewAt(meshes, -1.2, -0.51, 1)
  crew.root.rotation.y = 1.17
  const y = height + 0.26
  return {
    sourceAt(time, index) {
      const angle = time * 4.9 + index * 1.38
      const ray = 0.29 + (index % 5) * 0.107
      return { x: Math.cos(angle) * ray, y, z: Math.sin(angle) * ray, orbit: { x: 0, z: 0, angularSpeed: index % 3 ? 3.8 : -2.15, peelAfter: 1.45 } }
    },
    pose(time) {
      lamp.flame.scaling.y = 0.13 + 0.022 * Math.sin(time * 12)
    },
  }
}

export function ventFixture(meshes: MeshFactory): Fixture {
  meshes.box(0, 0.66, -0.57, 2.7, 1.32, 1.37, '#6d766d')
  const roofCentre = 1.34
  const roofThickness = 0.14
  meshes.box(0, roofCentre, -0.55, 2.95, roofThickness, 1.54, '#486360')
  const vent = createMillVent(meshes)
  vent.root.position.set(0.03, roofCentre + roofThickness / 2, -0.23)
  const { x, y, z } = vent.root.position
  const outlet = { x, y: y + vent.outletHeight, z }
  crewAt(meshes, -1.71, 0.42)
  return {
    sourceAt(time) {
      if (contactAge(time, 0.25, 1.1, 0.74) !== undefined) return outlet
    },
  }
}

const frostThickness = 0.016
const frostContactCount = 7
const gateSwing = 0.61
const gateSwingDuration = 3

export function gateFrostFixture(meshes: MeshFactory): Fixture {
  const gate = createWrenGateAssembly(meshes, { x: -gateLeaf.length / 2, y: 0, z: 0 })
  gate.wornPin.setEnabled(false)
  const rail = wrenGateTopRail
  const top = rail.y + rail.height / 2
  meshes.box(rail.x, top + frostThickness / 2, rail.z, rail.width, frostThickness, rail.depth, '#c5d6cb', gate.leaf)
  const contact = new Vector3(rail.x, top + frostThickness, rail.z)
  const crew = crewAt(meshes, 1.03, 0.72, 1)
  crew.root.rotation.y = -2.7
  function pose(time: number) {
    gate.hinge.rotation.y = gateSwing * Math.sin(Math.min(time, gateSwingDuration) * Math.PI / gateSwingDuration)
  }
  return {
    sourceAt(time, index) {
      if (contactAge(time, 0.4, 1.05, 0.16) === undefined) return
      pose(time)
      const across = (index % frostContactCount) / (frostContactCount - 1) - 0.5
      contact.x = rail.x + across * (rail.width - rail.depth)
      const { x, y, z } = Vector3.TransformCoordinates(contact, gate.leaf.computeWorldMatrix(true))
      return { x, y, z, yaw: gate.hinge.rotation.y, floor: 0.015 }
    },
    pose,
  }
}

export function canvasRunoffFixture(meshes: MeshFactory): Fixture {
  const { runway, runoffLane } = createMarketRunoffStage(meshes)
  return {
    sourceAt(time, index) {
      const surge = contactAge(time, 0.28 + 0.035 * (index % 4), 0.67, 0.24)
      if (surge !== undefined) return runoffLane(index)
    },
    accents: [{ id: 'surface-pops', sourceAt: (time, index) => {
      if (time >= 0.68) return runway(index)
    } }],
  }
}

export function snuffFixture(meshes: MeshFactory): Fixture {
  const lamp = lanternStand(meshes, 0.94)
  const crew = crewAt(meshes, -0.74, -0.83)
  crew.root.rotation.y = 0.82
  return {
    sourceAt(time) {
      if (time > 0.52 && time < 1.13) return { x: 0, y: 1.34, z: 0 }
    },
    pose(time) {
      const lit = time < 0.52
      lamp.flame.setEnabled(lit)
      lamp.globe.visibility = lit ? 1 : 0.2
    },
  }
}
