import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import {
  ambulanceBody,
  fireEngineBody,
  loggingBed,
  patrolDoorStripe,
  rescueHelicopter,
  roadVehicleGeometry,
  roadVehicleProfiles,
  saltwindVehicleDimensions,
  saltwindVehiclePaint as paint,
  saltwindVehicleWheel,
  utilityAirplane,
  type SaltwindVehiclePart,
} from '../assets/geometry/saltwind-vehicles'
import { createOreHauler, haulerSpec } from '../assets/ore-hauler'
import type { MeshFactory } from '../island-meshes'

const { helicopter, airplane, ...roadVehicleDimensions } = saltwindVehicleDimensions
export const vehicleSpecs = { ...roadVehicleDimensions, hauler: haulerSpec, helicopter, airplane } as const
export type VehicleId = keyof typeof vehicleSpecs
type RoadVehicleId = keyof typeof roadVehicleDimensions

const half = 0.5
const quarterTurn = Math.PI * half
const diameterPerRadius = 2

function vehicleParts(meshes: MeshFactory, root: TransformNode) {
  const box = (x: number, y: number, z: number, width: number, height: number, depth: number, color: string) =>
    meshes.box(x, y, z, width, height, depth, color, root)
  const part = ({ center, size }: SaltwindVehiclePart, color: string) => box(...center, ...size, color)
  const ellipsoid = ({ center, size }: SaltwindVehiclePart, color: string, segments: number) =>
    meshes.sphere(...center, ...size, color, root, true, segments)
  function wheel(x: number, z: number, radius: number, thickness: number) {
    const { tireSegments, hubSegments, hubDiameterPerRadius, hubThickness } = saltwindVehicleWheel
    const diameter = radius * diameterPerRadius
    const hub = radius * hubDiameterPerRadius
    meshes.cylinder(x, radius, z, diameter, diameter, thickness, tireSegments, paint.rubber, root).rotation.z = quarterTurn
    meshes.cylinder(x + Math.sign(x) * thickness * half, radius, z, hub, hub, hubThickness, hubSegments, paint.steel, root).rotation.z = quarterTurn
  }
  return { box, ellipsoid, part, wheel }
}

type Parts = ReturnType<typeof vehicleParts>

function buildHelicopter({ box, ellipsoid, part }: Parts) {
  const model = rescueHelicopter
  ellipsoid(model.cabin, paint.helicopter, model.shellSegments)
  ellipsoid(model.windshield, paint.glass, model.shellSegments)
  ellipsoid(model.tailBoom, paint.cream, model.shellSegments)
  part(model.tailFin, paint.helicopter).rotation.x = model.tailFin.rake
  part(model.tailRotor, paint.rubber).rotation.x = model.tailRotor.rake
  part(model.rotorMast, paint.steel)
  for (const blade of model.rotorBlades) part(blade, paint.rubber)
  const { skid, skidStrut } = model
  for (const x of helicopter.skids) {
    box(x, skid.y, skid.z, ...skid.size, paint.steel)
    for (const z of skidStrut.z) {
      box(x * skidStrut.xRatio, skidStrut.y, z, ...skidStrut.size, paint.steel).rotation.z = Math.sign(x) * skidStrut.splay
    }
  }
}

function buildAirplane({ box, ellipsoid, part, wheel }: Parts) {
  const model = utilityAirplane
  ellipsoid(model.fuselage, paint.cream, model.shellSegments)
  ellipsoid(model.canopy, paint.glass, model.shellSegments)
  part(model.wing, paint.airplaneWing)
  part(model.tailplane, paint.airplaneWing)
  part(model.fin, paint.airplaneFin).rotation.x = model.fin.rake
  part(model.propeller, paint.rubber).rotation.z = model.propeller.roll
  const { gearStrut, gearWheel } = model
  for (const [x, z] of airplane.gear) {
    box(x * gearStrut.xRatio, gearStrut.y, z, ...gearStrut.size, paint.steel).rotation.z = Math.sign(x) * gearStrut.splay
    wheel(x, z, gearWheel.radius, gearWheel.thickness)
  }
}

function buildRoadEquipment({ box, part }: Parts, id: RoadVehicleId) {
  const { width } = roadVehicleDimensions[id]
  switch (id) {
    case 'ambulance': {
      const { compartment, stripe, careEmblem, doorSeam } = ambulanceBody
      box(0, compartment.y, compartment.z, width, compartment.height, compartment.depth, paint.cream)
      box(0, stripe.y, stripe.z, width + stripe.extraWidth, stripe.height, stripe.depth, paint.ambulanceStripe)
      part(careEmblem.bar, paint.ambulanceStripe)
      part(careEmblem.upright, paint.ambulanceStripe)
      part(doorSeam, paint.steel)
      break
    }
    case 'engine': {
      const { compartment, lockers, ladderRails, ladderRungs } = fireEngineBody
      box(0, compartment.y, compartment.z, width, compartment.height, compartment.depth, paint.engineBody)
      for (const side of [-1, 1]) for (const z of lockers.z) box(side * width * half, lockers.y, z, ...lockers.size, paint.steel)
      for (const x of ladderRails.x) box(x, ladderRails.y, ladderRails.z, ...ladderRails.size, paint.steel)
      for (let i = 0; i < ladderRungs.count; i++) {
        box(0, ladderRungs.y, ladderRungs.firstZ + i * ladderRungs.spacing, ...ladderRungs.size, paint.steel)
      }
      break
    }
    case 'patrol': {
      const stripe = patrolDoorStripe
      for (const side of [-1, 1]) box(side * width * stripe.lateralWidthRatio, stripe.y, stripe.z, ...stripe.size, paint.cream)
      break
    }
    case 'logger': {
      const { cargo } = roadVehicleDimensions.logger
      const { floor, stake } = loggingBed
      box(0, cargo.floor - floor.drop, cargo.z, cargo.width + floor.extraWidth, floor.thickness, cargo.length, paint.loggerBed)
      for (const side of [-1, 1]) {
        const x = side * (cargo.width + stake.extraWidth) * half
        for (const ratio of stake.lengthRatios) {
          box(x, cargo.floor + cargo.height * half, cargo.z + ratio * cargo.length, stake.width, cargo.height, stake.depth, paint.steel)
        }
      }
      break
    }
  }
}

function buildRoadVehicle(parts: Parts, id: RoadVehicleId) {
  const { box, wheel } = parts
  const { width, length, track, axles, wheel: radius } = roadVehicleDimensions[id]
  const color = id === 'ambulance' ? paint.cream : paint[id]
  const profile = id === 'patrol' ? roadVehicleProfiles.low : roadVehicleProfiles.tall
  const { shell, sill, cabWidthRatio, windshield, sideGlass, headlamp, tailLamp, wheelClearance, grille, beaconMount, beacon } = roadVehicleGeometry
  const front = length * half
  const cabZ = front - profile.cab.inset
  const bodyY = profile.shell.y
  box(0, bodyY, 0, width * shell.widthRatio, profile.shell.height, length - shell.lengthInset, color)
  box(0, bodyY - sill.drop, 0, width * sill.widthRatio, sill.height, length - sill.lengthInset, paint.rubber)
  box(0, profile.cab.y, cabZ, width * cabWidthRatio, profile.cab.height, profile.cab.depth, color)
  box(0, profile.windshield.y, cabZ + profile.windshield.offsetZ, width * windshield.widthRatio, profile.windshield.height, windshield.thickness, paint.glass)
  for (const side of [-1, 1]) {
    box(side * width * sideGlass.lateralWidthRatio, profile.sideGlass.y, cabZ, sideGlass.thickness, profile.sideGlass.height, profile.sideGlass.depth, paint.glass)
    box(side * width * headlamp.lateralWidthRatio, bodyY + headlamp.raise, front - headlamp.frontInset, ...headlamp.size, paint.headlamp)
    box(side * width * tailLamp.lateralWidthRatio, bodyY, -front + tailLamp.rearInset, ...tailLamp.size, paint.tailLamp)
    for (const axle of axles) wheel(side * track * half, axle, radius, width - track - wheelClearance)
  }
  box(0, bodyY + grille.raise, front - grille.frontInset, width * grille.widthRatio, grille.height, grille.depth, paint.grille)
  if (id === 'ambulance' || id === 'engine' || id === 'patrol') {
    const y = profile.beaconHeight
    box(0, y + beaconMount.raise, cabZ, width * beaconMount.widthRatio, beaconMount.height, beaconMount.depth, paint.rubber)
    for (const side of [-1, 1]) {
      box(side * width * beacon.lateralWidthRatio, y + beacon.raise, cabZ, ...beacon.size, side > 0 ? paint.rightBeacon : paint.leftBeacon)
    }
  }
  buildRoadEquipment(parts, id)
}

export function createSaltwindVehicle(meshes: MeshFactory, id: VehicleId) {
  if (id === 'hauler') return createOreHauler(meshes).root
  const root = new TransformNode(vehicleSpecs[id].name, meshes.scene)
  const parts = vehicleParts(meshes, root)
  if (id === 'helicopter') buildHelicopter(parts)
  else if (id === 'airplane') buildAirplane(parts)
  else buildRoadVehicle(parts, id)
  return root
}
