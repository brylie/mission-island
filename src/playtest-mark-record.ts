import { devViewParams } from './dev-view.ts'
import { landscapeLink } from './playtest-link.ts'
import { authoredNear, playtestMarkVersion, roundPoint, type AuthoredEntry, type MarkTarget } from './playtest-mark.ts'

// Builds the record a playtest mark saves from what the page knows at the moment of the mark.
// Pure, so the tests check exactly what an agent will read.

interface Orbit { target: number[], alpha: number, beta: number, radius: number, fov: number }

interface MarkInput {
  origin: string
  mode: string
  target?: MarkTarget
  // The reticle's interaction, when it is on one.
  interaction?: { name: string, label: string, key?: string }
  player?: { name: string, x: number, y: number, z: number }
  camera?: Orbit
  weather?: { hour: number, rain: number }
  clock: number
  checkpoint?: string
  layout: Record<string, Record<string, unknown>>
}

const angleDecimals = 4
const devCameraMinimumRadius = 0.5

// The layout entry to name a place by: the nearest top-level export or list item, such as
// `wrenCottage` or `crewHomes[1]`, rather than a point nested inside one.
function landmark(nearby: readonly AuthoredEntry[]) {
  const entry = nearby.find((each) => !each.path.includes('.')) ?? nearby[0]
  return entry && (entry.name ?? words(entry.path))
}

// An export path in words for a person: `wrenCottage` reads "Wren cottage", `lampPostSites[1]` "Lamp post sites 1".
export function words(path: string) {
  const text = path.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[[\].]+/g, ' ').trim().toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// A name a person would use for what the reticle is on, best evidence first.
export function markLabel(target: MarkTarget | undefined, nearby: readonly AuthoredEntry[], interaction?: { name: string }) {
  if (interaction) return interaction.name
  const place = landmark(nearby)
  const near = (thing: string) => place ? `${thing} near ${place}` : thing
  const part = target?.part
  if (part) return near(part.parents[0] ?? part.name)
  if (target && !target.mesh.endsWith('_merged')) return near(target.parents[0] ? `${target.mesh} (${target.parents[0]})` : target.mesh)
  return place ?? 'Island'
}

function roundOrbit(orbit: Orbit) {
  const round = (value: number) => Number(value.toFixed(angleDecimals))
  return { target: orbit.target.map(round), alpha: round(orbit.alpha), beta: round(orbit.beta), radius: round(orbit.radius), fov: round(orbit.fov) }
}

// Two ways back to the view: the Landscape Workbench, and the live game with a fixed dev camera.
export function markLinks(origin: string, orbit: Orbit | undefined, weather: { hour: number, rain: number } | undefined, clock: number) {
  if (!orbit || !weather) return {}
  const camera = roundOrbit(orbit)
  const workbench = landscapeLink(origin, { focus: [camera.target[0], camera.target[2]], camera, ...weather, time: clock, grid: false, wireframe: false })
  const [x, y, z] = camera.target
  const game = new URL('/', origin)
  game.search = devViewParams({ camera: { target: [x, y, z], alpha: camera.alpha, beta: camera.beta, radius: Math.max(devCameraMinimumRadius, camera.radius), fov: camera.fov }, sky: weather, overlays: [], perf: false, capture: false, mode: 'color' }).toString()
  return { workbench, game: game.href }
}

export function buildMarkRecord(input: MarkInput) {
  const { target, interaction, player, camera, weather } = input
  const around = target?.point ?? player
  const nearby = around ? authoredNear(input.layout, around) : []
  return {
    label: markLabel(target, nearby, interaction),
    version: playtestMarkVersion,
    page: input.origin,
    mode: input.mode,
    ...(input.checkpoint && { checkpoint: input.checkpoint }),
    target: target ?? null,
    ...(interaction && { interaction }),
    nearby,
    ...(player && { player: { name: player.name, ...roundPoint(player) } }),
    ...(camera && { camera: roundOrbit(camera) }),
    ...(weather && { island: { ...weather, clock: Number(input.clock.toFixed(1)) } }),
    links: markLinks(input.origin, camera, weather, input.clock),
  }
}
