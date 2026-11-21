import { crewSprintMultiplier, crewWalkSpeed, offset, type Point, type Pose } from './world.ts'
import { advanceGait, gaitAmount, gaitPhase, restingGait, type GaitTiming } from './simulation/gait.ts'
import { smoothRange } from './simulation/motion-easing.ts'

export const crewHip = { x: .18, y: .68, z: .02 }
export const crewThigh = .305
export const crewShin = .225

type Ground = (point: Point) => number
type GroundPose = Pose & { y: number }
type Foot = GroundPose & { pitch: number }
export interface CrewGaitPose {
  cycle: number
  amount: number
  crouch: number
  feet: Foot[]
}

const sides = [-1, 1] as const
const mix = (a: number, b: number, t: number) => a + (b - a) * t
const angleBetween = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a))

export function crewLegSwing(phase: number, stride: number, side: number) {
  const recovery = Math.max(0, -side * Math.cos(phase))
  const bend = stride * (.08 + .88 * recovery ** 2)
  return { hip: side * Math.sin(phase) * stride - bend * .36, bend }
}

function swingAnkle(phase: number, stride: number) {
  const { hip, bend } = crewLegSwing(phase, stride, -1)
  const pitch = hip + bend
  return {
    forward: -crewThigh * Math.sin(hip) - crewShin * Math.sin(pitch),
    lift: crewThigh * (1 - Math.cos(hip)) + crewShin * (1 - Math.cos(pitch)),
    pitch,
  }
}

function profile(speed: number, scale: number) {
  const walk = Math.min(1, Math.max(0, (speed - 1.5) / (crewWalkSpeed - 1.5)))
  const sprint = Math.min(1, Math.max(0, (speed - crewWalkSpeed) / (crewWalkSpeed * (crewSprintMultiplier - 1))))
  const cycle = mix(mix(.84, 3.55, walk), 4.55, sprint) * scale
  // At the game's travel speeds there is a suspension interval between plants.
  // Keep the contact sweep within reach of the model's short legs.
  const contact = Math.min(.66, mix(mix(.43, .60, walk), .66, sprint) * scale)
  return { cycle, contact, stride: mix(mix(.38, .57, walk), .89, sprint), lift: mix(.086, .105, sprint) }
}

const crewTiming = {
  metresPerCycle: speed => profile(speed, 1).cycle,
  speedResponse: 12,
  fullStrideSpeed: 1.35,
} satisfies GaitTiming

function footfall(phase: number, { cycle: distance, contact, stride, lift }: ReturnType<typeof profile>) {
  const duty = contact / distance
  if (phase < duty) return { phase, forward: contact / 2 - phase * distance, lift: 0, pitch: 0, planted: true }
  const swing = (phase - duty) / (1 - duty)
  // Preserve the original ankle arc and follow-through between the planted endpoints.
  const ankle = swingAnkle(Math.PI * (swing - .5), stride)
  const start = swingAnkle(-Math.PI / 2, stride).forward
  const end = swingAnkle(Math.PI / 2, stride).forward
  const forward = contact * ((ankle.forward - start) / (end - start) - .5)
  const easeLift = smoothRange(0, .22, Math.min(swing, 1 - swing))
  const pitch = ankle.pitch * easeLift
  const shoeTip = pitch > 0 ? .21 : -.13
  const requiredClearance = shoeTip * Math.sin(pitch) - .15 * (1 - Math.cos(pitch))
  return {
    phase, forward, lift: Math.max(requiredClearance, easeLift * (ankle.lift + lift * Math.sin(Math.PI * swing))),
    pitch, planted: false,
  }
}

export function crewGaitFrame(cycle: number, speed: number, scale = 1) {
  const amount = gaitAmount(crewTiming, speed)
  const gait = profile(speed, scale)
  return {
    cycle, amount, crouch: .022 * amount, contact: gait.contact, distance: gait.cycle,
    feet: sides.map((_, i) => footfall(gaitPhase(cycle, i / 2), gait)),
  }
}

export function crewGaitPreview(time: number, speed: number, scale: number) {
  const { cycle } = profile(speed, scale)
  const frame = crewGaitFrame(time * speed / cycle, speed, scale)
  const feet = frame.feet.map((foot, i) => ({
    x: crewHip.x * sides[i], y: frame.amount * foot.lift, z: crewHip.z + frame.amount * foot.forward,
    heading: 0, pitch: frame.amount * foot.pitch,
  }))
  return { ...frame, feet }
}

export function createCrewGait() {
  let previous: GroundPose | undefined
  let gait = restingGait
  const plants: (Foot | undefined)[] = [undefined, undefined]
  const releases: (Foot | undefined)[] = [undefined, undefined]

  function reset() {
    previous = undefined
    gait = restingGait
    plants.fill(undefined)
    releases.fill(undefined)
  }

  function sample(pose: GroundPose, delta: number, ground: Ground) {
    const step = previous ? Math.hypot(pose.x - previous.x, pose.z - previous.z) : 0
    if (step > 2 || (previous && Math.abs(pose.y - previous.y) > .5)) reset()
    const travelled = previous ? step : 0
    const last = previous ?? pose
    previous = { ...pose }
    const { advance, cycle, speed } = advanceGait(crewTiming, gait, travelled, delta)
    gait = { cycle, speed }
    const frame = crewGaitFrame(cycle, speed)
    const feet = frame.feet.map((foot, i): Foot => {
      const lateral = crewHip.x * sides[i]
      const ideal = offset(pose, lateral, crewHip.z + foot.forward)
      let plant = plants[i]
      if (foot.planted && (!plant || foot.phase < advance)) {
        // Locate contact within the render interval so a skipped boundary does
        // not push the footprint forward by one frame of travel.
        const t = advance > 0 ? Math.max(0, 1 - foot.phase / advance) : 1
        const contact = { x: mix(last.x, pose.x, t), z: mix(last.z, pose.z, t),
          heading: last.heading + angleBetween(last.heading, pose.heading) * t }
        const point = offset(contact, lateral, crewHip.z + frame.contact / 2)
        plant = plants[i] = { ...point, y: ground(point), heading: contact.heading, pitch: 0 }
      } else if (!foot.planted && plant) {
        releases[i] = plant
        plant = plants[i] = undefined
      }
      const release = releases[i]
      const settle = smoothRange(0, .028, foot.lift)
      const move = foot.forward > 0 ? 1 : settle
      const recovery = { x: mix(release?.x ?? ideal.x, ideal.x, move), z: mix(release?.z ?? ideal.z, ideal.z, move) }
      const recoveryTurn = angleBetween(pose.heading, release?.heading ?? pose.heading)
      const target = plant ?? {
        ...recovery, y: ground(recovery), heading: pose.heading + recoveryTurn * (1 - move), pitch: foot.pitch,
      }
      const idle = offset(pose, lateral, crewHip.z)
      const turn = angleBetween(pose.heading, target.heading)
      // Release on sharp pivots before the ankle twists around the planted sole.
      const pivot = smoothRange(Math.PI / 3, Math.PI * 7 / 12, Math.abs(turn))
      const weight = frame.amount * (plant ? 1 - pivot : 1)
      return { x: mix(idle.x, target.x, weight), y: mix(ground(idle), target.y + foot.lift, weight),
        z: mix(idle.z, target.z, weight), heading: pose.heading + turn * weight, pitch: target.pitch * weight }
    })
    if (frame.amount < .001) {
      gait = { cycle: 0, speed }
      plants.fill(undefined)
      releases.fill(undefined)
    }
    return { ...frame, feet }
  }
  return { reset, sample }
}

export function solveCrewLeg(x: number, y: number, z: number) {
  const roll = Math.atan2(x, -y)
  const down = Math.hypot(x, y)
  const cosine = (down ** 2 + z ** 2 - crewThigh ** 2 - crewShin ** 2) / (2 * crewThigh * crewShin)
  const bend = Math.acos(Math.max(-1, Math.min(1, cosine)))
  const pitch = Math.atan2(-z, down) - Math.atan2(crewShin * Math.sin(bend), crewThigh + crewShin * Math.cos(bend))
  return { roll, pitch, bend }
}

export function crewFootInHipSpace(pose: GroundPose, foot: Foot, side: number, crouch: number) {
  const dx = foot.x - pose.x, dz = foot.z - pose.z
  const c = Math.cos(pose.heading), s = Math.sin(pose.heading)
  return {
    x: dx * c - dz * s - side * crewHip.x,
    y: foot.y - pose.y - crewThigh - crewShin + crouch,
    z: dx * s + dz * c - crewHip.z,
  }
}
