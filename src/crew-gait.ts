import { crewSprintMultiplier, crewWalkSpeed, offset, type Point, type Pose } from './world.ts'

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
const ease = (t: number) => t * t * (3 - 2 * t)
const angleBetween = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a))

function profile(speed: number, scale: number) {
  const walk = Math.min(1, Math.max(0, (speed - 1.5) / (crewWalkSpeed - 1.5)))
  const sprint = Math.min(1, Math.max(0, (speed - crewWalkSpeed) / (crewWalkSpeed * (crewSprintMultiplier - 1))))
  const cycle = mix(mix(.84, 2.36, walk), 3.6, sprint) * scale
  // At the game's travel speeds there is a suspension interval between plants.
  // Keep the contact sweep within reach of the model's short legs.
  const contact = Math.min(.66, mix(mix(.43, .60, walk), .66, sprint) * scale)
  return { cycle, contact, lift: mix(mix(.09, .17, walk), .24, sprint) }
}

function footfall(cycle: number, distance: number, contact: number, lift: number) {
  const phase = cycle - Math.floor(cycle)
  const duty = contact / distance
  if (phase < duty) return { phase, forward: contact / 2 - phase * distance, lift: 0, pitch: 0, planted: true }
  const swing = (phase - duty) / (1 - duty)
  const clearance = Math.sin(Math.PI * swing) ** 2
  return {
    phase, forward: contact * (ease(swing) - .5), lift: lift * clearance,
    pitch: .30 * Math.sin(2 * Math.PI * swing) * clearance, planted: false,
  }
}

export function crewGaitFrame(cycle: number, speed: number, scale = 1) {
  const amount = ease(Math.min(1, speed / 1.35))
  const { contact, lift, cycle: distance } = profile(speed, scale)
  return {
    cycle, amount, crouch: (.035 + .26 * contact ** 2) * amount, contact, distance,
    feet: sides.map((_, i) => footfall(cycle + i / 2, distance, contact, lift)),
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
  let speed = 0, cycle = 0
  const plants: (Foot | undefined)[] = [undefined, undefined]
  const releases: (Foot | undefined)[] = [undefined, undefined]

  function reset() {
    previous = undefined
    speed = cycle = 0
    plants.fill(undefined)
    releases.fill(undefined)
  }

  function sample(pose: GroundPose, delta: number, ground: Ground) {
    const step = previous ? Math.hypot(pose.x - previous.x, pose.z - previous.z) : 0
    if (step > 2 || (previous && Math.abs(pose.y - previous.y) > .5)) reset()
    const travelled = previous ? step : 0
    const last = previous ?? pose
    previous = { ...pose }
    speed += (travelled / Math.max(delta, .001) - speed) * (1 - Math.exp(-delta * 12))
    const advance = travelled / profile(speed, 1).cycle
    cycle += advance
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
      const settle = ease(Math.min(1, foot.lift / .028))
      const move = foot.forward > 0 ? 1 : settle
      const recovery = { x: mix(release?.x ?? ideal.x, ideal.x, move), z: mix(release?.z ?? ideal.z, ideal.z, move) }
      const recoveryTurn = angleBetween(pose.heading, release?.heading ?? pose.heading)
      const target = plant ?? {
        ...recovery, y: ground(recovery), heading: pose.heading + recoveryTurn * (1 - move), pitch: foot.pitch,
      }
      const idle = offset(pose, lateral, crewHip.z)
      const turn = angleBetween(pose.heading, target.heading)
      // Release on sharp pivots before the ankle twists around the planted sole.
      const pivot = ease(Math.min(1, Math.max(0, (Math.abs(turn) - Math.PI / 3) / (Math.PI / 4))))
      const weight = frame.amount * (plant ? 1 - pivot : 1)
      return { x: mix(idle.x, target.x, weight), y: mix(ground(idle), target.y + foot.lift, weight),
        z: mix(idle.z, target.z, weight), heading: pose.heading + turn * weight, pitch: target.pitch * weight }
    })
    if (frame.amount < .001) {
      cycle = 0
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
