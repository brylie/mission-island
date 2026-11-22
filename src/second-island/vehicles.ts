import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import {
  ambulanceBody,
  fireEngineBody,
  loggingBed,
  patrolBody,
  rescueHelicopter,
  roadVehicleGeometry,
  roadVehicleProfiles,
  saltwindVehicleDimensions,
  saltwindVehiclePaint as paint,
  utilityAirplane,
} from '../assets/geometry/saltwind-vehicles'
import { createOreHauler, haulerSpec } from '../assets/ore-hauler'
import { dressFleetWheel, fleetPaint, vehicleBodywork, type VehiclePart, type VehicleProfile } from '../assets/vehicle-kit'
import type { MeshFactory } from '../island-meshes'

const { helicopter, airplane, ...roadVehicleDimensions } = saltwindVehicleDimensions
export const vehicleSpecs = { ...roadVehicleDimensions, hauler: haulerSpec, helicopter, airplane } as const
export type VehicleId = keyof typeof vehicleSpecs
type RoadVehicleId = keyof typeof roadVehicleDimensions

const half = 0.5
const quarterTurn = Math.PI * half
const sides = [-1, 1] as const

function vehicleParts(meshes: MeshFactory, root: TransformNode) {
  const { panel } = vehicleBodywork(meshes, root)
  const box = (x: number, y: number, z: number, width: number, height: number, depth: number, color: string) =>
    meshes.box(x, y, z, width, height, depth, color, root)
  const part = ({ center, size }: VehiclePart, color: string) => box(...center, ...size, color)
  const ellipsoid = ({ center, size }: VehiclePart, color: string, segments: number) =>
    meshes.sphere(...center, ...size, color, root, true, segments)
  const cylinder = (x: number, y: number, z: number, diameter: number, length: number, segments: number, color: string) =>
    meshes.cylinder(x, y, z, diameter, diameter, length, segments, color, root)
  function wheel(x: number, z: number, radius: number, thickness: number) {
    const node = new TransformNode('Wheel', meshes.scene)
    node.parent = root
    node.position.set(x, radius, z)
    dressFleetWheel(meshes, node, x < 0 ? -1 : 1, radius, thickness)
  }
  return { box, cylinder, ellipsoid, panel, part, wheel }
}

type Parts = ReturnType<typeof vehicleParts>

function buildHelicopter({ box, cylinder, ellipsoid, part }: Parts) {
  const model = rescueHelicopter
  ellipsoid(model.cabin, paint.helicopter, model.shellSegments)
  ellipsoid(model.windshield, fleetPaint.windshield, model.shellSegments)
  ellipsoid(model.tailBoom, paint.cream, model.shellSegments)
  part(model.tailFin, paint.helicopter).rotation.x = model.tailFin.rake
  part(model.tailRotor, fleetPaint.rubber).rotation.x = model.tailRotor.rake
  part(model.rotorMast, paint.steel)
  for (const blade of model.rotorBlades) part(blade, fleetPaint.rubber)
  const { skid, skidStrut } = model
  for (const x of helicopter.skids) {
    box(x, skid.y, skid.z, ...skid.size, paint.steel)
    for (const z of skidStrut.z) {
      box(x * skidStrut.xRatio, skidStrut.y, z, ...skidStrut.size, paint.steel).rotation.z = Math.sign(x) * skidStrut.splay
    }
    const { skidTip, skidStep } = model
    box(x, skidTip.y, skidTip.z, ...skidTip.size, paint.steel).rotation.x = skidTip.rake
    box(x * skidStep.xRatio, skidStep.y, skidStep.z, ...skidStep.size, fleetPaint.tread)
  }
  const [boomX, boomY] = model.tailBoom.center
  for (const band of model.rescueBands) {
    cylinder(boomX, boomY, band.z, band.diameter, band.length, model.bandSegments, paint.ambulanceStripe).rotation.x = quarterTurn
  }
  const { doorGlass, winch } = model
  for (const side of sides) box(side * doorGlass.x, doorGlass.y, doorGlass.z, ...doorGlass.size, fleetPaint.doorGlass)
  part(winch.arm, fleetPaint.frame)
  part(winch.hoist, fleetPaint.frame)
  part(winch.cable, fleetPaint.brightTrim)
  part(winch.hook, fleetPaint.brightTrim)
  part(model.landingLight, fleetPaint.headlamp)
  part(model.strobe, paint.leftBeacon)
}

function buildAirplane({ box, ellipsoid, part, wheel }: Parts) {
  const model = utilityAirplane
  ellipsoid(model.fuselage, paint.cream, model.shellSegments)
  ellipsoid(model.canopy, fleetPaint.windshield, model.shellSegments)
  part(model.wing, paint.airplaneWing)
  part(model.tailplane, paint.airplaneWing)
  part(model.fin, paint.airplaneFin).rotation.x = model.fin.rake
  part(model.propeller, fleetPaint.rubber).rotation.z = model.propeller.roll
  const { gearStrut, gearWheel } = model
  for (const [x, z] of airplane.gear) {
    box(x * gearStrut.xRatio, gearStrut.y, z, ...gearStrut.size, paint.steel).rotation.z = Math.sign(x) * gearStrut.splay
    wheel(x, z, gearWheel.radius, gearWheel.thickness)
  }
}

function buildAmbulance({ box, part }: Parts, width: number) {
  const { compartment, stripe, careEmblem, rearDoors, rearStep, cornerBeacon, sideDoor } = ambulanceBody
  box(0, compartment.y, compartment.z, width, compartment.height, compartment.depth, paint.cream)
  box(0, stripe.y, stripe.z, width + stripe.extraWidth, stripe.height, stripe.depth, paint.ambulanceStripe)
  const { surround, door, window, handle, band, hinge } = rearDoors
  // Side details author their height and position along the body; `x` picks the side.
  const onSide = (x: number, { center: [, y, z], size }: VehiclePart, color: string) => box(x, y, z, ...size, color)
  part(surround, fleetPaint.frame)
  for (const side of sides) {
    const at = (x: number) => side * x
    onSide(at(careEmblem.x), careEmblem.bar, paint.ambulanceStripe)
    onSide(at(careEmblem.x), careEmblem.upright, paint.ambulanceStripe)
    box(at(door.x), door.y, door.z, ...door.size, paint.cream)
    box(at(window.x), window.y, window.z, ...window.size, fleetPaint.windshield)
    box(at(handle.x), handle.y, handle.z, ...handle.size, fleetPaint.frame)
    box(at(band.x), band.y, band.z, ...band.size, paint.ambulanceStripe)
    for (const y of hinge.ys) box(at(hinge.x), y, hinge.z, ...hinge.size, fleetPaint.frame)
    box(at(cornerBeacon.x), cornerBeacon.y, cornerBeacon.z, ...cornerBeacon.size, paint.leftBeacon)
  }
  part(rearStep, fleetPaint.tread)
  // The curbside door is on the right.
  for (const z of sideDoor.seam.z) box(sideDoor.x, sideDoor.seam.y, z, ...sideDoor.seam.size, fleetPaint.frame)
  onSide(sideDoor.x, sideDoor.header, fleetPaint.frame)
  onSide(sideDoor.x, sideDoor.handle, fleetPaint.frame)
  onSide(sideDoor.x, sideDoor.glass, fleetPaint.windshield)
}

function buildFireEngine({ box, cylinder, part }: Parts, width: number) {
  const { compartment, lockers, ladderRails, ladderRungs, ladderBrackets, pumpPanel, hoseReel, grabRails, rearStep } = fireEngineBody
  box(0, compartment.y, compartment.z, width, compartment.height, compartment.depth, paint.engineBody)
  for (const side of sides) {
    const x = side * width * half
    for (const z of lockers.z) {
      box(x, lockers.y, z, ...lockers.surround, fleetPaint.frame)
      box(x, lockers.y, z, ...lockers.shutter, paint.steel)
      for (const offset of lockers.ribs.offsets) box(x, lockers.y + offset, z, ...lockers.ribs.size, fleetPaint.frame)
      box(x, lockers.y - lockers.liftBar.drop, z, ...lockers.liftBar.size, fleetPaint.brightTrim)
    }
    const { panel, outlets, gauges } = pumpPanel
    box(side * panel.x, panel.y, panel.z, ...panel.size, paint.steel)
    for (const z of outlets.z) {
      cylinder(side * outlets.x, outlets.y, z, outlets.diameter, outlets.length, pumpPanel.segments, fleetPaint.brightTrim).rotation.z = quarterTurn
    }
    for (const z of gauges.z) box(side * gauges.x, gauges.y, z, ...gauges.size, paint.cream)
    box(side * grabRails.x, grabRails.y, grabRails.z, ...grabRails.size, fleetPaint.brightTrim)
  }
  for (const x of ladderRails.x) {
    box(x, ladderRails.y, ladderRails.z, ...ladderRails.size, paint.steel)
    for (const z of ladderBrackets.z) box(x, ladderBrackets.y, z, ...ladderBrackets.size, fleetPaint.frame)
  }
  for (let i = 0; i < ladderRungs.count; i++) {
    box(0, ladderRungs.y, ladderRungs.firstZ + i * ladderRungs.spacing, ...ladderRungs.size, paint.steel)
  }
  const [reelX, reelY, reelZ] = hoseReel.center
  cylinder(reelX, reelY, reelZ, hoseReel.hose, hoseReel.length, hoseReel.segments, paint.cream).rotation.z = quarterTurn
  for (const side of sides) {
    const flangeX = reelX + side * (hoseReel.length + hoseReel.flangeWidth) * half
    cylinder(flangeX, reelY, reelZ, hoseReel.flange, hoseReel.flangeWidth, hoseReel.segments, fleetPaint.frame).rotation.z = quarterTurn
  }
  part(rearStep, fleetPaint.tread)
}

function buildPatrol({ box }: Parts, width: number) {
  const { livery, badge, pinstripe, archLip, pushBar } = patrolBody
  const { axles, wheel: radius } = roadVehicleDimensions.patrol
  for (const side of sides) {
    box(side * width * livery.lateralWidthRatio, livery.y, livery.z, ...livery.size, paint.cream)
    box(side * width * badge.lateralWidthRatio, badge.y, badge.z, ...badge.size, fleetPaint.brightTrim)
    box(side * width * pinstripe.lateralWidthRatio, pinstripe.y, pinstripe.z, ...pinstripe.size, paint.cream)
    for (const axle of axles) {
      box(side * width * archLip.lateralWidthRatio, radius + radius + archLip.radiusLift, axle, ...archLip.size, radius * archLip.lengthPerRadius, fleetPaint.frame)
    }
  }
  for (const x of pushBar.uprights.x) box(x, pushBar.uprights.y, pushBar.uprights.z, ...pushBar.uprights.size, fleetPaint.frame)
  for (const y of pushBar.rails.ys) box(0, y, pushBar.rails.z, ...pushBar.rails.size, fleetPaint.frame)
}

function buildRoadEquipment(parts: Parts, id: RoadVehicleId) {
  const { box } = parts
  const { width } = roadVehicleDimensions[id]
  switch (id) {
    case 'ambulance':
      buildAmbulance(parts, width)
      break
    case 'engine':
      buildFireEngine(parts, width)
      break
    case 'patrol':
      buildPatrol(parts, width)
      break
    case 'logger': {
      const { cargo } = roadVehicleDimensions.logger
      const { floor, stake } = loggingBed
      box(0, cargo.floor - floor.drop, cargo.z, cargo.width + floor.extraWidth, floor.thickness, cargo.length, paint.loggerBed)
      for (const side of sides) {
        const x = side * (cargo.width + stake.extraWidth) * half
        for (const ratio of stake.lengthRatios) {
          box(x, cargo.floor + cargo.height * half, cargo.z + ratio * cargo.length, stake.width, cargo.height, stake.depth, paint.steel)
        }
      }
      break
    }
  }
}

type RoadProfile = typeof roadVehicleProfiles[keyof typeof roadVehicleProfiles]

// A raked cab with a divided windshield, wipers, door glass and mirrors.
function buildCab({ box, panel }: Parts, width: number, front: number, profile: RoadProfile, color: string) {
  const { cabWidthRatio, windshield, wiper, sideGlass, mirror } = roadVehicleGeometry
  const { y, height, depth, inset, windshieldBase: base, rakeRun, rearRun } = profile.cab
  const cabZ = front - inset
  const rear = cabZ - depth * half, nose = cabZ + depth * half
  const bottom = y - height * half, top = y + height * half
  const halfWidth = width * cabWidthRatio * half
  const shape: [number, number][] = [[rear, bottom], [nose, bottom], [nose, base], [nose - rakeRun, top], [rear + rearRun, top]]
  if (rearRun > 0) shape.push([rear, base])
  panel('Raked cab', halfWidth, shape, color)

  // Points on the windshield slope, measured from its base and stood off its face.
  const rise = top - base
  const slope = Math.hypot(rakeRun, rise)
  const rake = -Math.atan2(rakeRun, rise)
  const onGlass = (along: number, standoff: number) =>
    [nose - rakeRun * along / slope + rise / slope * standoff, base + rise * along / slope + rakeRun / slope * standoff] as const
  const paneHeight = slope - windshield.baseInset - windshield.topInset
  const [paneZ, paneY] = onGlass(windshield.baseInset + paneHeight * half, windshield.standoff)
  // Trucks divide the windshield with a center pillar; the patrol car has one pane.
  const glassWidth = width * windshield.widthRatio
  const paneWidth = (glassWidth - windshield.paneGap) * half
  const [wiperZ, wiperY] = onGlass(wiper.along, wiper.standoff)
  if (!profile.dividedWindshield) box(0, paneY, paneZ, glassWidth, paneHeight, windshield.thickness, fleetPaint.windshield).rotation.x = rake
  for (const side of sides) {
    const paneX = side * (windshield.paneGap + paneWidth) * half
    if (profile.dividedWindshield) box(paneX, paneY, paneZ, paneWidth, paneHeight, windshield.thickness, fleetPaint.windshield).rotation.x = rake
    const wiperWidth = profile.dividedWindshield ? paneWidth * wiper.widthRatio : glassWidth * wiper.singlePaneRatio
    box(paneX, wiperY, wiperZ, wiperWidth, ...wiper.size, fleetPaint.frame).rotation.set(rake, 0, side * wiper.sweep)
  }

  // Door glass follows the windshield pillar and, on the patrol car, the rear pillar.
  const { inset: glassInset } = sideGlass
  const glassBottom = base + glassInset.bottom, glassTop = top - glassInset.top
  const frontEdge = (height: number) => nose - rakeRun * (height - base) / rise - glassInset.front
  const rearEdge = (height: number) => rear + rearRun * (height - base) / rise + glassInset.rear
  const glass: VehicleProfile = [
    [rearEdge(glassBottom), glassBottom],
    [frontEdge(glassBottom), glassBottom],
    [frontEdge(glassTop), glassTop],
    [rearEdge(glassTop), glassTop],
  ]
  const scale = profile.mirrorScale
  const mirrorY = base + mirror.rise * scale, mirrorZ = nose - mirror.setback
  const scaled = (size: readonly number[]) => size.map((length) => length * scale) as [number, number, number]
  for (const side of sides) {
    panel('Cab door glass', sideGlass.halfWidth, glass, fleetPaint.doorGlass, side * (halfWidth + sideGlass.standoff))
    box(side * (halfWidth + mirror.mount.reach * scale), mirrorY, mirrorZ, ...scaled(mirror.mount.size), fleetPaint.frame)
    const housingX = side * (halfWidth + mirror.housing.reach * scale)
    const housingY = mirrorY + mirror.housing.lift * scale
    const housing = scaled(mirror.housing.size)
    const glassSize = scaled(mirror.glass.size)
    box(housingX, housingY, mirrorZ, ...housing, fleetPaint.frame)
    box(housingX, housingY, mirrorZ - (housing[2] + glassSize[2]) * half, ...glassSize, fleetPaint.brightTrim)
  }
}

// Lamps in frame housings with inboard indicators, a barred grille and bumpers.
function buildLampsAndBumpers({ box }: Parts, width: number, front: number, profile: RoadProfile) {
  const { headlamp, tailLamp, lampHousing, indicator, tailIndicator, grille, grilleBars, bumper } = roadVehicleGeometry
  const bodyY = profile.shell.y
  const shellBottom = bodyY - profile.shell.height * half
  const [headWidth, headHeight] = headlamp.size, [tailWidth, tailHeight] = tailLamp.size
  const margin = lampHousing.margin + lampHousing.margin
  const headY = bodyY + headlamp.raise
  const inboard = (center: number, lampWidth: number, gap: number, indicatorWidth: number) =>
    center - lampWidth * half - lampHousing.margin - gap - indicatorWidth * half
  for (const side of sides) {
    const headX = width * headlamp.lateralWidthRatio
    box(side * headX, headY, front - lampHousing.inset, headWidth + margin, headHeight + margin, lampHousing.depth, fleetPaint.frame)
    box(side * headX, headY, front - headlamp.frontInset, ...headlamp.size, fleetPaint.headlamp)
    box(side * inboard(headX, headWidth, indicator.gap, indicator.size[0]), headY, front - indicator.inset, ...indicator.size, fleetPaint.indicator)
    const tailX = width * tailLamp.lateralWidthRatio
    box(side * tailX, bodyY, -front + lampHousing.inset, tailWidth + margin, tailHeight + margin, lampHousing.depth, fleetPaint.frame)
    box(side * tailX, bodyY, -front + tailLamp.rearInset, ...tailLamp.size, fleetPaint.tailRed)
    box(side * inboard(tailX, tailWidth, tailIndicator.gap, tailIndicator.size[0]), bodyY, -front + tailIndicator.inset, ...tailIndicator.size, fleetPaint.tailAmber)
  }
  const grilleWidth = width * grille.widthRatio
  const grilleY = bodyY + grille.raise
  box(0, grilleY, front - grille.frontInset, grilleWidth, grille.height, grille.depth, fleetPaint.frame)
  for (const offset of grilleBars.offsets) {
    box(0, grilleY + offset, front - grille.frontInset + grilleBars.standoff, grilleWidth - grilleBars.inset, ...grilleBars.size, fleetPaint.brightTrim)
  }
  for (const end of sides) box(0, shellBottom + bumper.raise, end * (front - bumper.inset), width * bumper.widthRatio, ...bumper.size, fleetPaint.bumper)
}

function buildRoadVehicle(parts: Parts, id: RoadVehicleId) {
  const { box, panel, wheel } = parts
  const { width, length, track, axles, wheel: radius } = roadVehicleDimensions[id]
  const color = id === 'ambulance' ? paint.cream : paint[id]
  const profile = id === 'patrol' ? roadVehicleProfiles.low : roadVehicleProfiles.tall
  const { shell, sill, wheelClearance, mudFlap, beaconMount, beacon, beaconHousing, takedown } = roadVehicleGeometry
  const front = length * half
  const bodyY = profile.shell.y
  const { nose, noseDrop, tail, tailDrop } = profile.shellChamfer
  const shellEnd = (length - shell.lengthInset) * half
  const shellTop = bodyY + profile.shell.height * half
  const shellBase = bodyY - profile.shell.height * half
  if (nose > 0) {
    panel('Sloped car shell', width * shell.widthRatio * half, [
      [-shellEnd, shellBase],
      [shellEnd, shellBase],
      [shellEnd, shellTop - noseDrop],
      [shellEnd - nose, shellTop],
      [-shellEnd + tail, shellTop],
      [-shellEnd, shellTop - tailDrop],
    ], color)
  }
  else box(0, bodyY, 0, width * shell.widthRatio, profile.shell.height, length - shell.lengthInset, color)
  box(0, bodyY - sill.drop, 0, width * sill.widthRatio, sill.height, length - sill.lengthInset, fleetPaint.rubber)
  buildCab(parts, width, front, profile, color)
  buildLampsAndBumpers(parts, width, front, profile)
  const tireDepth = width - track - wheelClearance
  const shellBottom = bodyY - profile.shell.height * half
  const flapHeight = radius * mudFlap.heightPerRadius
  for (const side of sides) {
    for (const axle of axles) wheel(side * track * half, axle, radius, tireDepth)
    if (profile.mudFlaps) {
      const flapZ = Math.min(...axles) - radius - mudFlap.gap
      box(side * track * half, shellBottom - flapHeight * half, flapZ, tireDepth * mudFlap.widthRatio, flapHeight, mudFlap.thickness, fleetPaint.rubber)
    }
  }
  if (id === 'ambulance' || id === 'engine' || id === 'patrol') {
    const y = profile.beaconHeight
    const cabZ = front - profile.cab.inset
    box(0, y + beaconMount.raise, cabZ, width * beaconMount.widthRatio, beaconMount.height, beaconMount.depth, fleetPaint.frame)
    const [beaconWidth, beaconHeight, beaconDepth] = beacon.size
    const margin = beaconHousing.margin + beaconHousing.margin
    const housingY = y + beacon.raise - (beaconHeight - beaconHousing.height) * half - beaconHousing.drop
    for (const side of sides) {
      const x = side * width * beacon.lateralWidthRatio
      box(x, housingY, cabZ, beaconWidth + margin, beaconHousing.height, beaconDepth + margin, fleetPaint.frame)
      box(x, y + beacon.raise, cabZ, ...beacon.size, side > 0 ? paint.rightBeacon : paint.leftBeacon)
    }
    box(0, y + takedown.raise, cabZ, ...takedown.size, fleetPaint.headlamp)
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
