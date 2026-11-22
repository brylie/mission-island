import { clamp, hash } from '../../math/noise.ts'
import { bakeSurfaceMaps, components } from '../surface-maps.ts'
import { surfaceRecipe } from '../surface-recipes.ts'
import { treeGrowth } from '../geometry/tree-species.ts'
import { addPad, type MeshData, type Rgb, type Vec3 } from './tree-mesh.ts'
import { mix, wobble, type FoliageRecipe } from './tree-catalog.ts'

// Colour and foliage helpers shared by the growers. Tints bake a recipe once, so this
// module is for rendering paths; collision sizing lives in tree-collision.ts.

const gamma = 2.2
const xAxis = 0
const yAxis = 1
const zAxis = 2
const byteRange = 255
const calibrationSize = 32
const rgbaStride = 4
const half = 0.5
const bipolarSpan = 2

function linear(hex: string): Rgb {
  const [r, g, b] = components(hex).map((channel) => (channel / byteRange) ** gamma)
  return [r, g, b]
}

// The mean linear albedo of a recipe's baked color map, measured once on a small bake.
const recipeMeans = new Map<string, Rgb>()
function recipeMean(id: 'bark' | FoliageRecipe): Rgb {
  const known = recipeMeans.get(id)
  if (known) return known
  const { color } = bakeSurfaceMaps(surfaceRecipe(id), {}, calibrationSize)
  const sum = [0, 0, 0]
  for (let i = 0; i < color.length; i += rgbaStride) for (let c = 0; c < sum.length; c++) sum[c] += (color[i + c] / byteRange) ** gamma
  const texels = color.length / rgbaStride
  const mean: Rgb = [sum[0] / texels, sum[1] / texels, sum[2] / texels]
  recipeMeans.set(id, mean)
  return mean
}

// Vertex colors multiply the recipe's albedo in linear light, so a tint is the wanted
// paint divided by the texture's average. The texture keeps its plates and veins.
export function tint(recipe: 'bark' | FoliageRecipe, hex: string): Rgb {
  const wanted = linear(hex), mean = recipeMean(recipe)
  return [wanted[0] / mean[0], wanted[1] / mean[1], wanted[2] / mean[2]]
}

export const shade = (color: Rgb, amount: number): Rgb => [color[0] * amount, color[1] * amount, color[2] * amount]
export const blendColor = (a: Rgb, b: Rgb, t: number): Rgb => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]

export interface FoliagePad {
  center: Vec3
  radius: Vec3
  color: Rgb
  flatten: number
  key: number
  // The limb the pad grows on, so distant silhouettes can merge a limb's pads into one mass.
  limb: number
  // A raised top pole for flame-shaped juniper.
  peak?: number
  // Upper surfaces that take another color, such as flowering heather.
  crest?: { color: Rgb, cover: number }
}

interface PadDetail { readonly padSegments: number, readonly padRings: number }

// Inner clumps, nearer the crown's axis than its reach, take a darker shade.
export interface FoliageLook { underside: number, inner: number, softCenter: Vec3, reach: number, far?: boolean }

const fullTurn = Math.PI + Math.PI
const lobePhaseKey = 3
const lobeCountKey = 5

export function emitPad(mesh: MeshData, pad: FoliagePad, detail: PadDetail, look: FoliageLook, jitter: number = treeGrowth.padJitter) {
  const { center, radius, color, flatten, key, peak = 0, crest } = pad
  const rough = wobble(key, jitter)
  const phase = hash(key, lobePhaseKey, 0) * fullTurn
  const [fewest, most] = treeGrowth.lobes
  const lobes = hash(key, lobeCountKey, 0) < half ? fewest : most
  const lobe = (side: number) => treeGrowth.lobeDepth * Math.cos(lobes * fullTurn * side / detail.padSegments + phase)
  const outward = Math.min(1, Math.hypot(center[0] - look.softCenter[0], center[2] - look.softCenter[2]) / look.reach)
  const depth = mix(look.inner, 1, outward)
  const underside = look.far ? mix(look.underside, 1, treeGrowth.farFlatten) : look.underside
  const lift = look.far ? treeGrowth.farLift : 1
  addPad(mesh, {
    center,
    radius,
    segments: detail.padSegments,
    rings: detail.padRings,
    flatten,
    jitter: (ring, side) => rough(ring, side) + (ring === 0 ? peak : lobe(side)),
    color: (height) => {
      const lit = lift * depth * mix(underside, 1, (height + 1) * half)
      const flowering = crest ? clamp((height - 1 + crest.cover + crest.cover) / crest.cover) : 0
      return shade(crest ? blendColor(color, crest.color, flowering) : color, lit)
    },
  })
}

const volume = (group: readonly FoliagePad[]) => group.reduce((sum, { radius }) => sum + radius[0] * radius[1] * radius[2], 0)
function centroid(group: readonly FoliagePad[]): Vec3 {
  const weight = volume(group)
  const mean = (axis: number) => group.reduce((sum, pad) => sum + pad.center[axis] * pad.radius[0] * pad.radius[1] * pad.radius[2], 0) / weight
  return [mean(xAxis), mean(yAxis), mean(zAxis)]
}

// Distant trees keep one mass per major limb. Smaller limbs join the nearest kept mass
// rather than vanishing, so the crown keeps its extent while the main gaps stay open.
export function limbMasses(pads: readonly FoliagePad[], count: number, grow: number): FoliagePad[] {
  const byLimb = new Map<number, FoliagePad[]>()
  for (const pad of pads) byLimb.set(pad.limb, [...byLimb.get(pad.limb) ?? [], pad])
  const ranked = [...byLimb.values()].sort((a, b) => volume(b) - volume(a))
  const kept = ranked.slice(0, count).map((group) => ({ pads: [...group], center: centroid(group) }))
  for (const group of ranked.slice(count)) {
    const middle = centroid(group)
    const distance = (center: Vec3) => Math.hypot(center[xAxis] - middle[xAxis], center[yAxis] - middle[yAxis], center[zAxis] - middle[zAxis])
    const nearest = kept.reduce((best, mass) => distance(mass.center) < distance(best.center) ? mass : best)
    nearest.pads.push(...group)
  }
  // Each mass spans its group's true extent: it never rises above the tallest clump, and a
  // flat-bottomed mass still reaches down to the lowest underside.
  return kept.map(({ pads: group }) => {
    const below = (pad: FoliagePad, axis: number) => pad.radius[axis] * (axis === yAxis ? 1 - pad.flatten : 1)
    const low = (axis: number) => Math.min(...group.map((pad) => pad.center[axis] - below(pad, axis)))
    const high = (axis: number) => Math.max(...group.map((pad) => pad.center[axis] + pad.radius[axis]))
    const middle = (axis: number) => (low(axis) + high(axis)) * half
    const reach = (axis: number) => (high(axis) - low(axis)) * half
    const flatten = group[0].flatten
    const rise = (high(yAxis) - low(yAxis)) / (bipolarSpan - flatten)
    return {
      ...group[0],
      center: [middle(xAxis), high(yAxis) - rise, middle(zAxis)],
      radius: [reach(xAxis) * grow, rise, reach(zAxis) * grow],
    }
  })
}
