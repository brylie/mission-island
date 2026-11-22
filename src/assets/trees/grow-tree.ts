import { smoothstep } from '../../math/smoothstep.ts'
import { treeDetail, treeGrowth, type TreeForm } from '../geometry/tree-species.ts'
import { add, addPad, addTube, emptyMesh, normalize, scale, type MeshData, type Rgb, type SpinePoint, type Vec3 } from './tree-mesh.ts'
import { blendColor, emitPad, limbMasses, shade, tint, type FoliageLook, type FoliagePad } from './tree-kit.ts'
import {
  authoredAge,
  between,
  centered,
  mix,
  noiseKey,
  wobble,
  type Stream,
  type Streams,
  type TreeDetail,
  type TreeTemplateOptions,
} from './tree-catalog.ts'
import { treeSize } from './tree-collision.ts'

const fullTurn = Math.PI + Math.PI
const half = 0.5
const stemKeys = 100
const branchKeys = 1000
const childKey = 50
const accentKey = 90_000
const bandKey = 70_000
const breakKey = 80_000
const humpKey = 60_000
const snapKey = 50_000
const forkChildren = [-1, 1] as const
const mainStem = 0

interface Stem { point: (t: number) => Vec3, radius: (t: number) => number, height: number }

// What an old tree changes from its mature form; young and mature trees use the table as authored.
// Saplings never grow old: an old sapling is grown as a mature one. Only some old trees
// have lost their leading top, decided per seed from the species' break chance.
function aging(form: TreeForm, options: TreeTemplateOptions, streams: Streams) {
  const old = options.age === 'old' && form.budget === 'tree' ? treeGrowth.old : undefined
  const snapped = Boolean(old) && streams(snapKey)() < form.old.breakChance
  return {
    branches: old?.branches ?? 1,
    fewestLimbs: old?.fewestLimbs ?? 1,
    limb: old?.limb ?? 1,
    spread: old?.spread ?? 1,
    droop: old?.droop ?? 1,
    fork: old?.fork,
    flatten: old ? form.old.flatten : 0,
    top: snapped ? treeGrowth.old.breakAt : 1,
    broken: snapped,
    humps: Boolean(old),
  }
}

interface Grower {
  form: TreeForm
  options: TreeTemplateOptions
  age: ReturnType<typeof aging>
  detail: TreeDetail
  exposed: boolean
  streams: Streams
  bark: MeshData
  pads: FoliagePad[]
  crownRadius: number
  // Clumps still available under the per-tree limit, spent when a limb divides.
  spare: number
  barkColor: (height: number, ring: number, side: number) => Rgb
  limbs: { length: number, spine: SpinePoint[] }[]
}

function barkPainter(form: TreeForm, height: number, streams: Streams) {
  const lower = tint('bark', form.bark.lower), upper = tint('bark', form.bark.upper)
  const band = form.bark.band
  const blotch = band && tint('bark', band.color)
  const marks = wobble(noiseKey(streams, bandKey), 1)
  return (y: number, ring: number, side: number): Rgb => {
    const t = smoothstep((y / height - form.bark.transition * half) / form.bark.transition)
    const base = blendColor(lower, upper, t)
    if (!blotch || !band || marks(ring, side) * half + half > band.chance) return base
    return blendColor(base, blotch, treeGrowth.barkBandShade * t)
  }
}

function makeStem(grower: Grower, index: number, stems: number, height: number, baseRadius: number): Stem {
  const { form, exposed } = grower
  const random = grower.streams(stemKeys + index)
  const azimuth = index === mainStem ? random() * fullTurn : index / stems * fullTurn + centered(random, half)
  const lean = index === mainStem ? 0 : form.trunk.stemLean * between(random, treeGrowth.lengthJitter)
  const stemHeight = index === mainStem ? height : height * between(random, treeGrowth.stemHeight)
  const radius = baseRadius * (index === mainStem ? 1 : treeGrowth.stemHeight[0])
  const offset = index === mainStem ? 0 : baseRadius * treeGrowth.stemOffset
  const phase = random() * fullTurn, meander = form.trunk.meander * height
  const sweep = between(random, treeGrowth.sweep) * height
  const wind = exposed ? form.exposure.lean * height : 0
  return {
    height: stemHeight,
    point: (t) => {
      const along = Math.max(0, t), y = t * stemHeight
      const spread = offset + Math.tan(lean) * Math.max(0, y)
      const bow = sweep * along ** treeGrowth.bendPower
      return [
        Math.cos(azimuth) * (spread + bow) + Math.sin(t * Math.PI * treeGrowth.meanderWaves + phase) * meander * along + wind * along ** treeGrowth.bendPower,
        y,
        Math.sin(azimuth) * (spread + bow) + Math.cos(t * Math.PI * treeGrowth.meanderWaves + phase) * meander * along,
      ]
    },
    radius: (t) => radius * mix(1, form.trunk.topRadius, Math.max(0, t)) * (1 + form.trunk.flare * (1 - Math.min(1, Math.max(0, t) * treeGrowth.flareFalloff)) ** treeGrowth.flareCurve),
  }
}

function emitStem(grower: Grower, stem: Stem, main: boolean) {
  const rings = main ? grower.detail.trunkRings : grower.detail.stemRings
  const sides = main ? grower.detail.trunkSides : grower.detail.stemSides
  const top = main ? grower.age.top : 1
  const below = -treeGrowth.embed * stem.radius(0) / stem.height
  // Below ground, at the flared root collar, then rings packed toward the top where a wind-bent stem curves most.
  const spine = Array.from({ length: rings + 1 }, (_, ring) => {
    const t = ring === 0 ? below : top * ((ring - 1) / (rings - 1)) ** (1 / treeGrowth.bendPower)
    return { point: stem.point(t), radius: stem.radius(t) }
  })
  const jag = wobble(noiseKey(grower.streams, breakKey), half)
  addTube(grower.bark, spine, {
    sides,
    color: (ring, _along, side) => grower.barkColor(spine[ring].point[1], ring, side),
    cap: main && grower.age.broken && grower.options.tier === 'near' ? { rise: (side) => (jag(0, side) + half) * treeGrowth.old.jag, color: tint('bark', grower.form.bark.lower) } : undefined,
  })
}

interface Limb { origin: Vec3, direction: Vec3, length: number, radius: number, rise: number, droop: number, lift: number, key: number, limb: number }

function limbPoint(grower: Grower, limb: Limb, t: number): Vec3 {
  const { arc } = grower.form.crown
  // Species whose tips hang rather than rise (birch) set liftFrom to 1 and get no lift.
  const tip = arc.liftFrom < 1 ? Math.max(0, (t - arc.liftFrom) / (1 - arc.liftFrom)) : 0
  const height = limb.length * (limb.rise * t - limb.droop * t * t + limb.lift * tip * tip)
  const drift = grower.exposed ? grower.form.exposure.drift * limb.length * t * t : 0
  return add(add(limb.origin, scale(limb.direction, limb.length * t)), [drift, height, 0])
}

function growLimb(grower: Grower, limb: Limb, depth: number) {
  const { form, detail } = grower
  const random = grower.streams(limb.key)
  // Both tiers share the fork decisions, so a distant mass covers the same divided limb.
  const chance = grower.age.fork ?? form.crown.fork
  const forks = depth === 0 && random() < chance && grower.spare > 0
  const end = forks ? between(random, treeGrowth.forkAt) : 1
  const rings = depth ? detail.twigRings : detail.branchRings
  const spine = Array.from({ length: rings + 1 }, (_, ring) => {
    const t = ring / rings * end
    return { point: limbPoint(grower, limb, t), radius: limb.radius * mix(1, treeGrowth.branchTipRadius, t) }
  })
  if (grower.options.tier === 'near' || depth === 0) grower.limbs.push({ length: limb.length, spine })
  if (!forks) {
    addClump(grower, limb, random)
    return
  }
  grower.spare--
  const joint = spine[spine.length - 1]
  for (const side of forkChildren) {
    const turn = side * form.crown.forkSpread * between(random, treeGrowth.lengthJitter)
    const [dx, , dz] = limb.direction
    growLimb(grower, {
      ...limb,
      origin: joint.point,
      direction: [dx * Math.cos(turn) - dz * Math.sin(turn), 0, dx * Math.sin(turn) + dz * Math.cos(turn)],
      length: limb.length * between(random, treeGrowth.forkLength),
      radius: Math.max(treeGrowth.minimumBranchRadius, joint.radius),
      rise: limb.rise + treeGrowth.forkRise,
      key: limb.key * childKey + side + childKey,
    }, depth + 1)
  }
}

function addClump(grower: Grower, limb: Limb, random: Stream) {
  const { clump } = grower.form.crown
  const colors = grower.form.leaves.colors.map((hex) => tint(grower.form.foliage, hex))
  const size = grower.crownRadius * clump.size * between(random, treeGrowth.padSize) * Math.min(1, limb.length / grower.crownRadius + half)
  grower.pads.push({
    center: add(limbPoint(grower, limb, clump.at), [0, size * clump.lift, 0]),
    radius: [size, size * clump.height * between(random, treeGrowth.clumpThickness), size * between(random, treeGrowth.padSize)],
    color: colors[Math.min(colors.length - 1, Math.floor(random() * colors.length))],
    flatten: clump.flatten,
    key: noiseKey(grower.streams, limb.key),
    limb: limb.limb,
  })
}

function layoutCrown(grower: Grower, stem: Stem, stemIndex: number, count: number) {
  const { form, options, exposed, age } = grower
  const { crown, exposure } = form
  const base = crown.base[authoredAge(options.age)]
  const whorls = crown.whorl ? Math.ceil(count / crown.whorl) : count
  // Wind and age both flatten a crown; together they compound rather than add.
  const flatten = 1 - (1 - (exposed ? exposure.flatten : 0)) * (1 - age.flatten)
  const snapped = age.broken && stemIndex === mainStem
  for (let i = 0; i < count; i++) {
    const key = branchKeys * (stemIndex + 1) + i
    const random = grower.streams(key)
    const tier = crown.whorl ? Math.floor(i / crown.whorl) : i
    const spin = crown.whorl ? tier * treeGrowth.goldenAngle + (i % crown.whorl) / crown.whorl * fullTurn : i * treeGrowth.goldenAngle
    const azimuth = spin + centered(random, treeGrowth.azimuthJitter) + stemIndex
    const u = Math.min(1, Math.max(0, (tier + half + centered(random, treeGrowth.heightJitter)) / whorls))
    const reach = mix(profileAt(crown.profile[authoredAge(options.age)], u), 1, flatten * half)
    const wind = exposed ? mix(exposure.windward, exposure.leeward, (Math.cos(azimuth) + 1) * half) : 1
    const t = mix(base, treeGrowth.topReach * (snapped ? age.top : 1), u)
    growLimb(grower, {
      origin: stem.point(t),
      direction: normalize([Math.cos(azimuth) + (exposed ? exposure.drift : 0), 0, Math.sin(azimuth)]),
      length: grower.crownRadius * reach * wind * between(random, treeGrowth.lengthJitter),
      radius: Math.max(treeGrowth.minimumBranchRadius, stem.radius(t) * crown.branchRadius * age.limb),
      rise: crown.arc.rise * (1 - flatten),
      droop: crown.arc.droop * age.droop,
      lift: crown.arc.lift * (1 - flatten * half),
      key,
      limb: key,
    }, 0)
  }
  if (snapped) return
  const top = stem.point(1)
  const size = grower.crownRadius * crown.top.size * (stemIndex === mainStem ? 1 : treeGrowth.stemHeight[0])
  grower.pads.push({
    center: add(top, [0, size * crown.top.height * half, 0]),
    radius: [size, size * crown.top.height * (1 - flatten * half), size],
    color: tint(form.foliage, form.leaves.colors[2]),
    flatten: crown.clump.flatten,
    key: noiseKey(grower.streams, branchKeys * stemKeys + stemIndex),
    // Only the leading stem keeps its own crown top at a distance; the others join the limb masses.
    limb: stemIndex === mainStem ? -1 : branchKeys * stemKeys + stemIndex,
  })
}

function profileAt(profile: readonly (readonly [number, number])[], u: number) {
  for (let i = 1; i < profile.length; i++) {
    const [u0, v0] = profile[i - 1], [u1, v1] = profile[i]
    if (u <= u1) return mix(v0, v1, (u - u0) / (u1 - u0))
  }
  return profile[profile.length - 1][1]
}

// Old trunks heave the ground around them with a few root humps.
function addRootHumps(grower: Grower, radius: number) {
  const old = treeGrowth.old
  const random = grower.streams(humpKey)
  const color = shade(tint('bark', grower.form.bark.lower), treeGrowth.old.humpShade)
  for (let i = 0; i < old.humps; i++) {
    const angle = i / old.humps * fullTurn + centered(random, half), r = radius * between(random, old.humpSize)
    const reach = radius * old.humpReach
    addPad(grower.bark, {
      center: [Math.cos(angle) * reach, 0, Math.sin(angle) * reach],
      radius: [r, r * old.humpHeight, r],
      segments: treeDetail.far.padSegments,
      rings: 1,
      flatten: 1,
      jitter: wobble(noiseKey(grower.streams, humpKey + i), treeGrowth.padJitter),
      color: () => color,
    })
  }
}

function emitAccents(grower: Grower, foliage: MeshData, look: FoliageLook) {
  const accent = grower.form.accent
  if (!accent || grower.options.age === 'young' || grower.options.tier !== 'near') return
  const random = grower.streams(accentKey)
  const color = tint(grower.form.foliage, accent.color)
  const outer = grower.pads.filter(({ limb }) => limb >= 0)
  const detail = { padSegments: treeDetail.near.accentSegments, padRings: 1 }
  for (let i = 0; i < accent.clusters && outer.length; i++) {
    const pad = outer[Math.floor(random() * outer.length)]
    for (let berry = 0; berry < treeGrowth.accentBerries; berry++) {
      const center = add(pad.center, [pad.radius[0] * centered(random, treeGrowth.accentSpread), -pad.radius[1] * treeGrowth.accentSpread, pad.radius[2] * centered(random, treeGrowth.accentSpread)])
      const r = accent.size * grower.form.height.mature[1]
      emitPad(foliage, { center, radius: [r, r, r], color, flatten: 0, key: noiseKey(grower.streams, accentKey + i * treeGrowth.accentBerries + berry), limb: pad.limb }, detail, { ...look, inner: 1 })
    }
  }
}

export function growTree(form: TreeForm, options: TreeTemplateOptions, streams: Streams) {
  const random = streams(0)
  const age = aging(form, options, streams)
  const authored = authoredAge(options.age)
  const exposed = options.exposure === 'exposed'
  const { fullHeight, height, baseRadius, collision } = treeSize(form, options, random)
  const stems = Math.round(between(random, form.trunk.stems[authored]))
  const total = Math.max(age.fewestLimbs, Math.round(between(random, form.crown.branches[authored]) * age.branches))
  const tops = age.broken ? stems - 1 : stems
  // At least one limb per stem, even when many stems crowd the clump limit.
  const roomPerStem = Math.max(1, Math.floor((treeGrowth.clumpLimit - tops) / stems))
  const perStem = Math.min(roomPerStem, Math.max(Math.min(total, treeGrowth.minimumStemBranches), Math.round(total / stems)))
  const detail = treeDetail[options.tier]
  const grower: Grower = {
    form,
    options,
    age,
    detail,
    exposed,
    streams,
    bark: emptyMesh(),
    pads: [],
    crownRadius: fullHeight * form.crown.radius[authored] * age.spread,
    spare: treeGrowth.clumpLimit - perStem * stems - tops,
    barkColor: barkPainter(form, height, streams),
    limbs: [],
  }
  for (let index = 0; index < stems; index++) {
    const stem = makeStem(grower, index, stems, height, baseRadius)
    emitStem(grower, stem, index === mainStem)
    layoutCrown(grower, stem, index, perStem)
  }
  if (age.humps && options.tier === 'near') addRootHumps(grower, baseRadius)
  const drawn = options.tier === 'near' ? grower.limbs : [...grower.limbs].sort((a, b) => b.length - a.length).slice(0, treeGrowth.farLimbs)
  for (const { spine } of drawn) {
    const sides = options.tier === 'near' && spine[0].radius > treeGrowth.minimumBranchRadius * treeGrowth.roundLimbRatio ? detail.branchSides : detail.twigSides
    addTube(grower.bark, spine, { sides, color: (ring, _along, side) => grower.barkColor(spine[ring].point[1], ring, side) })
  }
  const foliage = emptyMesh()
  const crownMid = form.crown.base[authored] + (1 - form.crown.base[authored]) * half
  const crownCenter: Vec3 = [exposed ? form.exposure.lean * height * crownMid : 0, height * crownMid, 0]
  const look: FoliageLook = { underside: form.leaves.underside, inner: form.leaves.inner, softCenter: crownCenter, reach: grower.crownRadius, far: options.tier === 'far' }
  const pads = options.tier === 'near'
    ? grower.pads
    : [
        ...limbMasses(grower.pads.filter(({ limb }) => limb >= 0), form.far.masses, form.far.mass),
        ...grower.pads.filter(({ limb }) => limb < 0),
      ]
  for (const pad of pads) emitPad(foliage, pad, detail, look)
  emitAccents(grower, foliage, look)
  return { bark: grower.bark, foliage, collision, clumps: grower.pads.length }
}
