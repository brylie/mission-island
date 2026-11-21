import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { createOreHauler, haulerSpec } from '../assets/ore-hauler'
import type { MeshFactory } from '../island-meshes'

const cream = '#fff0d0', glass = '#407783', rubber = '#303c39', steel = '#8da3a0'

// Model origin is on the ground. Local +Z is forward, +Y is up, and +X is the vehicle's right.
export const vehicleSpecs = {
  ambulance: { name: 'Ambulance', width: 2.32, length: 6.1, height: 2.9, track: 1.78, axles: [-1.75, 1.95], wheel: 0.40 },
  engine: { name: 'Fire engine', width: 2.55, length: 8.2, height: 3.25, track: 2.06, axles: [-2.62, -1.42, 2.7], wheel: 0.52 },
  patrol: { name: 'Patrol car', width: 1.92, length: 4.75, height: 1.65, track: 1.48, axles: [-1.49, 1.37], wheel: 0.32 },
  logger: { name: 'Logging truck', width: 2.55, length: 10.2, height: 3.6, track: 2.04, axles: [-3.6, -2.35, 3.28], wheel: 0.54, cargo: { width: 2.22, length: 6.55, height: 1.9, floor: 1.29, z: -1.35 } },
  hauler: haulerSpec,
  helicopter: { name: 'Rescue helicopter', width: 10.2, length: 11.65, height: 3.35, skids: [-0.90, 0.90] },
  airplane: { name: 'Utility airplane', width: 10.8, length: 7.6, height: 2.8, gear: [[-0.98, 0.4], [0.98, 0.4], [0, 2.42]] },
} as const
export type VehicleId = keyof typeof vehicleSpecs

export function createSaltwindVehicle(meshes: MeshFactory, id: VehicleId) {
  if (id === 'hauler') return createOreHauler(meshes).root
  const root = new TransformNode(vehicleSpecs[id].name, meshes.scene)
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, color: string) =>
    meshes.box(x, y, z, w, h, d, color, root)
  const ellipsoid = (x: number, y: number, z: number, w: number, h: number, d: number, color: string) =>
    meshes.sphere(x, y, z, w, h, d, color, root, true, 10)
  const cross = (y: number, z: number) => {
    box(0, y, z, 0.56, 0.16, 0.035, '#d85846')
    box(0, y, z + 0.018, 0.16, 0.51, 0.035, '#d85846')
  }
  const wheel = (x: number, z: number, radius: number, thickness: number) => {
    meshes.cylinder(x, radius, z, radius * 2, radius * 2, thickness, 12, rubber, root).rotation.z = Math.PI / 2
    meshes.cylinder(x + Math.sign(x) * thickness / 2, radius, z, radius * 1.08, radius * 1.08, 0.04, 10, steel, root).rotation.z = Math.PI / 2
  }

  if (id === 'helicopter') {
    ellipsoid(0, 1.65, 1.02, 2.18, 2.03, 4.25, '#e7a54c')
    ellipsoid(0, 1.95, 2.04, 1.88, 1.37, 2.17, glass)
    ellipsoid(0, 1.72, -2.44, 0.57, 0.6, 4.76, cream)
    box(0, 2.18, -4.48, 0.20, 1.36, 0.88, '#e7a54c').rotation.x = -0.27
    box(0.15, 2.05, -4.58, 0.09, 1.45, 0.14, rubber).rotation.x = -0.55
    box(0, 2.83, 0.75, 0.18, 0.61, 0.18, steel)
    box(0, 3.17, 0.75, 10.2, 0.07, 0.24, rubber)
    box(0, 3.2, 0.75, 0.24, 0.07, 10.2, rubber)
    for (const x of vehicleSpecs.helicopter.skids) {
      box(x, 0.11, 0.68, 0.17, 0.22, 3.67, steel)
      for (const z of [-0.55, 1.84]) box(x * 0.83, 0.43, z, 0.12, 0.66, 0.13, steel).rotation.z = Math.sign(x) * 0.27
    }
    return root
  }
  if (id === 'airplane') {
    ellipsoid(0, 1.41, 0, 1.33, 1.3, 7.25, cream)
    ellipsoid(0, 1.92, 0.82, 1.16, 0.92, 2.65, glass)
    box(0, 2.14, 0.45, 10.8, 0.19, 1.64, '#e6bb66')
    box(0, 1.58, -2.88, 3.24, 0.12, 0.92, '#e6bb66')
    box(0, 2.02, -2.85, 0.13, 1.55, 0.99, '#cf7355').rotation.x = -0.26
    box(0, 1.44, 3.66, 1.5, 0.12, 0.10, rubber).rotation.z = 0.66
    for (const [x, z] of vehicleSpecs.airplane.gear) {
      box(x * 0.78, 0.66, z, 0.12, 0.86, 0.16, steel).rotation.z = Math.sign(x) * 0.4
      wheel(x, z, 0.285, 0.16)
    }
    return root
  }

  const spec = vehicleSpecs[id]
  const { width, length, track, axles, wheel: radius } = spec
  const color = { ambulance: cream, engine: '#c54d3e', patrol: '#385563', logger: '#537d62' }[id]
  const low = id === 'patrol'
  const cabZ = length / 2 - (low ? 1.63 : 1.18)
  const bodyY = low ? 0.61 : 1.0
  box(0, bodyY, 0, width * 0.92, low ? 0.54 : 0.57, length - 0.13, color)
  box(0, bodyY - 0.27, 0, width * 0.80, 0.25, length - 0.38, rubber)
  box(0, low ? 1.16 : 1.87, cabZ, width * 0.88, low ? 0.62 : 1.48, low ? 2 : 2.18, color)
  box(0, low ? 1.28 : 2.2, cabZ + (low ? 0.91 : 1.096), width * 0.76, low ? 0.39 : 0.58, 0.035, glass)
  for (const side of [-1, 1]) {
    box(side * width * 0.444, low ? 1.26 : 2.19, cabZ, 0.035, low ? 0.35 : 0.55, low ? 1.45 : 1.55, glass)
    box(side * width * 0.35, bodyY + 0.04, length / 2 - 0.043, 0.28, 0.23, 0.063, '#ffeab1')
    box(side * width * 0.39, bodyY, -length / 2 + 0.034, 0.22, 0.15, 0.060, '#d95d48')
    for (const axle of axles) wheel(side * track / 2, axle, radius, width - track - 0.10)
  }
  box(0, bodyY + 0.03, length / 2 - 0.035, width * 0.39, 0.28, 0.06, '#394b4a')
  if (id === 'ambulance' || id === 'engine' || id === 'patrol') {
    const y = low ? 1.51 : 2.69
    box(0, y + 0.035, cabZ, width * 0.63, 0.13, 0.24, rubber)
    for (const side of [-1, 1]) box(side * width * 0.23, y + 0.13, cabZ, 0.38, 0.15, 0.23, side > 0 ? '#498bc2' : '#d65847')
  }
  if (id === 'ambulance') {
    box(0, 1.79, -1.03, width, 2.17, 3.9, cream)
    box(0, 1.11, -1.045, width + 0.025, 0.19, 3.94, '#d85846')
    cross(2.15, -3.005)
    box(0, 1.92, -3.025, 0.032, 1.29, 0.034, steel)
  }
  if (id === 'engine') {
    box(0, 1.87, -1.24, width, 1.81, 5.11, '#c64f41')
    for (const side of [-1, 1]) for (const z of [-2.85, -1.32, 0.20]) box(side * width / 2, 1.92, z, 0.035, 0.85, 1.34, steel)
    for (const x of [-0.39, 0.39]) box(x, 2.92, -0.86, 0.10, 0.12, 4.65, steel)
    for (let i = 0; i < 9; i++) box(0, 2.92, -2.85 + i * 0.49, 0.73, 0.08, 0.08, steel)
  }
  if (id === 'patrol') for (const x of [-width * 0.463, width * 0.463]) box(x, 0.72, -0.25, 0.035, 0.41, 1.59, cream)
  if (id === 'logger') {
    const cargo = vehicleSpecs[id].cargo
    box(0, cargo.floor - 0.095, cargo.z, cargo.width + 0.23, 0.19, cargo.length, '#48534d')
    for (const side of [-1, 1]) {
      const x = side * (cargo.width + 0.13) / 2
      for (const ratio of [-0.42, -0.13, 0.16, 0.45]) box(x, cargo.floor + cargo.height / 2, cargo.z + ratio * cargo.length, 0.13, cargo.height, 0.17, steel)
    }
  }
  return root
}
