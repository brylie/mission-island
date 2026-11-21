import { propTop } from '../scenery.ts'
import { groundHeight, waterLevel } from '../terrain.ts'
import { distance, localPoint, offset } from '../world.ts'
import type { Point, Pose } from '../world.ts'
import { liftSites, liftStrength } from '../worlds/starter/lift.ts'
import { ridgeHeading, ridgeLandingRadius, ridgeLaunch, ridgeLaunchClearance, ridgeMeadow, ridgeWind, ridgeWing } from '../worlds/starter/ridge-scout.ts'
import { canOccupyGround } from './movement.ts'

export const ridgeStep = 1 / 30

type PilotPose = Pose & { y: number }
type Steering = { turn: number, pitch: number }
// The island's weather decides how strongly each thermal rises. Midday sun with no rain by default.
type FlightConditions = { hour: number, rain: number }
const midday: FlightConditions = { hour: 13, rain: 0 }
type FlightOutcome = 'field' | 'early' | 'missed' | 'obstruction'

interface Flight {
  pilot: PilotPose
  elapsed: number
  bank: number
  pitch: number
  climbing: boolean
  clearance: number
  outcome?: FlightOutcome
}

const surfaces = Object.values(ridgeWing)
const wingProbes = [...surfaces, ...surfaces.map((vertex) => ({
  x: vertex.x / 2,
  y: (vertex.y + ridgeWing.keel.y) / 2,
  z: (vertex.z + ridgeWing.keel.z) / 2,
}))]
const response = 1 - Math.exp(-5 * ridgeStep)
const maxPitch = 0.24
const maxBank = 0.35
const liftBases = liftSites.map((site) => groundHeight(site))

export function startRidgeFlight(): Flight {
  return {
    pilot: { ...ridgeLaunch, y: groundHeight(ridgeLaunch) + ridgeLaunchClearance, heading: ridgeHeading },
    elapsed: 0,
    bank: 0,
    pitch: 0,
    climbing: false,
    clearance: Infinity,
  }
}

function wingClearance({ pilot, bank, pitch }: Flight) {
  const rollCos = Math.cos(bank), rollSin = Math.sin(bank)
  const pitchCos = Math.cos(pitch), pitchSin = Math.sin(pitch)
  return Math.min(...wingProbes.map((probe) => {
    const x = probe.x * rollCos - probe.y * rollSin
    const rolledY = probe.x * rollSin + probe.y * rollCos
    const y = pilot.y + rolledY * pitchCos - probe.z * pitchSin
    const z = rolledY * pitchSin + probe.z * pitchCos
    const point = offset(pilot, x, z)
    return y - Math.max(groundHeight(point), waterLevel, propTop(point, 0.12))
  }))
}

function touchdown(point: Point): FlightOutcome {
  if (!canOccupyGround(point, 0.45, 0)) return 'obstruction'
  const range = distance(point, ridgeMeadow)
  if (range <= ridgeLandingRadius) return 'field'
  const { z } = localPoint({ ...ridgeMeadow, heading: ridgeHeading }, point)
  return z < -ridgeLandingRadius && range < 32 ? 'early' : 'missed'
}

export function liftAt(pilot: PilotPose, { hour, rain }: FlightConditions = midday) {
  let lift = 0
  liftSites.forEach((site, index) => {
    const radial = 1 - (distance(pilot, site) / site.radius) ** 2
    if (radial <= 0) return
    const remaining = (site.ceiling - (pilot.y - liftBases[index])) / 10
    lift = Math.max(lift, site.lift * liftStrength(site, hour, rain) * radial * Math.max(0, Math.min(1, remaining)))
  })
  return lift
}

export function stepRidgeFlight(flight: Flight, input: Steering, conditions: FlightConditions = midday) {
  if (flight.outcome) return
  const { pilot } = flight
  flight.elapsed += ridgeStep
  const turn = Math.max(-1, Math.min(1, input.turn))
  // Positive yaw turns right. Negative roll lowers the right wing.
  flight.bank += (-maxBank * turn - flight.bank) * response
  // A sustained bank tightens the turn while small corrections stay gentle.
  const bankFraction = flight.bank / maxBank
  pilot.heading -= flight.bank * (0.82 + 0.9 * bankFraction ** 2) * ridgeStep
  flight.pitch += (maxPitch * Math.max(-1, Math.min(1, input.pitch)) - flight.pitch) * response
  const noseDown = flight.pitch / maxPitch
  const speed = 4.95 + 1.25 * noseDown
  const next = offset(pilot, 0, speed * ridgeStep)
  pilot.x = next.x + ridgeWind.x * ridgeStep
  pilot.z = next.z + ridgeWind.z * ridgeStep
  const surface = Math.max(groundHeight(pilot), waterLevel)
  const initial = Math.min(1, flight.elapsed / 1.6)
  const sink = Math.max(0.3, 0.62 + 1.36 * initial + noseDown * (noseDown > 0 ? 1.74 : 0.86))
  const verticalSpeed = liftAt(pilot, conditions) - sink
  flight.climbing = verticalSpeed > 0
  pilot.y += verticalSpeed * ridgeStep

  const wing = wingClearance(flight)
  const body = pilot.y - propTop(pilot, 0.3)
  flight.clearance = Math.min(flight.clearance, wing, body)
  if (wing <= 0 || body <= 0) flight.outcome = 'obstruction'
  else if (pilot.y <= surface) flight.outcome = touchdown(pilot)
  if (flight.outcome) {
    pilot.y = surface
    flight.climbing = false
  }
}
