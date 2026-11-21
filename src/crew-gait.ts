import { crewSprintMultiplier, crewWalkSpeed, offset, type Point, type Pose } from './world.ts'
import { advanceGait, gaitAmount, gaitPhase, restingGait, type GaitTiming } from './simulation/gait.ts'
import { smoothRange } from './simulation/motion-easing.ts'

export const crewHip = { x: .18, y: .68, z: .02 }
export const crewThigh = .305
export const crewShin = .225

type Ground = (point: Point) => number
type GroundPose = Pose & { y: number }
type Foot = GroundPose & { pitch: number }
type LegTarget = Foot & { support: number; bend: number }
export interface CrewGaitPose {
  cycle: number
  amount: number
  feet: LegTarget[]
}

const sides = [-1, 1] as const
const mix = (a: number, b: number, t: number) => a + (b - a) * t
const angleBetween = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a))

export function crewLegSwing(phase: number, stride: number, side: number) {
  const recovery = Math.max(0, -side * Math.cos(phase))
  const bend = stride * (.08 + .88 * recovery ** 2)
  return { hip: side * Math.sin(phase) * stride - bend * .36, bend }
}

// Integral of a smoothstep velocity ramp. The foot has zero ground speed
// and zero acceleration at both ends, with an even sweep between the ramps.
function swingTravel(t: number, ramp: number): number {
  if (t > 1 - ramp) return 1 - swingTravel(1 - t, ramp)
  if (t >= ramp) return (t - ramp / 2) / (1 - ramp)
  const u = t / ramp
  return ramp * u ** 3 * (1 - u / 2) / (1 - ramp)
}

function profile(speed: number, scale: number) {
  const walk = Math.min(1, Math.max(0, (speed - 1.5) / (crewWalkSpeed - 1.5)))
  const sprint = Math.min(1, Math.max(0, (speed - crewWalkSpeed) / (crewWalkSpeed * (crewSprintMultiplier - 1))))
  const cycle = mix(mix(.84, 3.55, walk), 4.55, sprint) * scale
  // At the game's travel speeds there is a suspension interval between plants.
  // Keep the contact sweep within reach of the model's short legs.
  const contact = Math.min(.66, mix(mix(.36, .50, walk), .66, sprint) * scale)
  return { cycle, contact, stride: mix(mix(.38, .57, walk), .89, sprint) }
}

const crewTiming = {
  metresPerCycle: speed => profile(speed, 1).cycle,
  speedResponse: 12,
  fullStrideSpeed: 1.35,
} satisfies GaitTiming

// The gait tracks a footprint on the pavement. Convert it to the ankle
// above the outsole by rotating the shoe around its contacting edge.
function soleRoll(pitch: number) {
  const edge = pitch < 0 ? -.13 : .215
  const height = crewHip.y - crewThigh - crewShin
  return {
    forward: edge * (1 - Math.cos(pitch)) + height * Math.sin(pitch),
    lift: edge * Math.sin(pitch) - height * (1 - Math.cos(pitch)),
  }
}

function footfall(phase: number, { cycle: distance, contact, stride }: ReturnType<typeof profile>) {
  const duty = contact / distance
  const heelStrike = -.28, toeOff = .42
  if (phase < duty) {
    const stance = phase / duty
    const pitch = heelStrike * (1 - smoothRange(0, .38, stance)) + toeOff * smoothRange(.5, 1, stance)
    return { phase, forward: contact / 2 - phase * distance, lift: 0, pitch, support: 1, bend: .12, planted: true }
  }
  const swing = (phase - duty) / (1 - duty)
  const ramp = Math.min(.35, .29 / (distance - contact))
  const forward = -contact / 2 + distance * swingTravel(swing, ramp) - (distance - contact) * swing
  const pitch = mix(toeOff, heelStrike, smoothRange(.08, .83, swing))
  // Clearance is a floor for the authored recovery pose.
  const envelope = Math.sin(Math.PI * swing)
  const lift = .012 * envelope ** 2
  const support = 1 - smoothRange(0, .22, Math.min(swing, 1 - swing))
  const bend = mix(crewLegSwing(Math.PI * (swing - .5), stride, -1).bend, .12, support)
  return { phase, forward, lift, pitch, support, bend, planted: false }
}

export function crewGaitFrame(cycle: number, speed: number, scale = 1) {
  const amount = gaitAmount(crewTiming, speed)
  const gait = profile(speed, scale)
  return {
    cycle, amount, contact: gait.contact, distance: gait.cycle,
    feet: sides.map((_, i) => footfall(gaitPhase(cycle, i / 2), gait)),
  }
}

export function crewGaitPreview(time: number, speed: number, scale: number) {
  const { cycle } = profile(speed, scale)
  const frame = crewGaitFrame(time * speed / cycle, speed, scale)
  const feet = frame.feet.map((foot, i) => ({
    x: crewHip.x * sides[i], y: frame.amount * foot.lift, z: crewHip.z + frame.amount * foot.forward,
    heading: 0, pitch: frame.amount * foot.pitch, support: foot.support, bend: frame.amount * foot.bend,
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
    const feet = frame.feet.map((foot, i): LegTarget => {
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
        // Carry only the offset introduced by a turn during stance. Blending
        // the whole plant into the swing would ease forward travel twice.
        const duty = frame.contact / frame.distance
        const t = advance > 0 ? Math.max(0, 1 - (foot.phase - duty) / advance) : 1
        const heading = last.heading + angleBetween(last.heading, pose.heading) * t
        const boundary = offset({ x: mix(last.x, pose.x, t), z: mix(last.z, pose.z, t), heading },
          lateral, crewHip.z - frame.contact / 2)
        releases[i] = { ...plant, x: plant.x - boundary.x, z: plant.z - boundary.z }
        plant = plants[i] = undefined
      }
      const release = releases[i]
      const duty = frame.contact / frame.distance
      const move = smoothRange(0, .5, (foot.phase - duty) / (1 - duty))
      const recovery = { x: ideal.x + (release?.x ?? 0) * (1 - move), z: ideal.z + (release?.z ?? 0) * (1 - move) }
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
        z: mix(idle.z, target.z, weight), heading: pose.heading + turn * weight, pitch: foot.pitch * weight,
        support: foot.support, bend: foot.bend * weight }
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
  const roll = soleRoll(foot.pitch)
  const ankle = offset(foot, 0, roll.forward)
  const dx = ankle.x - pose.x, dz = ankle.z - pose.z
  const c = Math.cos(pose.heading), s = Math.sin(pose.heading)
  return {
    x: dx * c - dz * s - side * crewHip.x,
    y: foot.y + roll.lift - pose.y - crewThigh - crewShin + crouch,
    z: dx * s + dz * c - crewHip.z,
  }
}
