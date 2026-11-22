import { shrubGrowth, type FrondForm, type MoundForm } from '../geometry/shrub-species.ts'
import { treeDetail, treeGrowth } from '../geometry/tree-species.ts'
import { add, addFrond, addTube, emptyMesh, normalize, type FrondPoint, type Vec3 } from './tree-mesh.ts'
import { blendColor, emitPad, limbMasses, tint, type FoliageLook, type FoliagePad } from './tree-kit.ts'
import { authoredAge, between, centered, mix, noiseKey, type Streams, type TreeTemplateOptions } from './tree-catalog.ts'
import { frondSize, moundSize } from './tree-collision.ts'

const fullTurn = Math.PI + Math.PI
const half = 0.5
const clumpKeys = 100
const accentKeys = 500
const frondKeys = 100
const stemKeys = 900
// Frond spines start with the base and the top of the bare stipe.
const stipePoints = 2
const lobePeriod = 2

// Juniper, heather and bilberry: overlapping clumps in an envelope. Low clumps sit
// toward the rim and tall ones near the middle, so the outline reads as a mound or a flame.
export function growMound(form: MoundForm, options: TreeTemplateOptions, streams: Streams) {
  const random = streams(0)
  const age = authoredAge(options.age)
  const exposed = options.exposure === 'exposed'
  const { exposure, clump } = form
  const { vase, height, spread, collision } = moundSize(form, options, random)
  const lean = exposed ? exposure.lean * spread : 0
  const size = spread * clump.size
  const rise = Math.min(size * clump.stretch * (exposed ? exposure.stretch : vase?.stretch ?? 1), height * half)
  const detail = treeDetail[options.tier]
  const colors = form.leaves.colors.map((hex) => tint(form.foliage, hex))
  const flowering = form.accent && form.accent.cover > 0 && options.age !== 'young'
    ? { color: tint(form.foliage, form.accent.color), cover: form.accent.cover }
    : undefined
  const count = form.clumps[age]
  const pads: FoliagePad[] = []
  for (let i = 0; i < count; i++) {
    const own = streams(clumpKeys + i)
    const f = (i + half + centered(own, treeGrowth.heightJitter)) / count
    const angle = i * treeGrowth.goldenAngle + centered(own, treeGrowth.azimuthJitter)
    const radial = (spread - size) * Math.sqrt(Math.max(0, 1 - f))
    const r = size * between(own, treeGrowth.padSize)
    const tall = rise * between(own, treeGrowth.padSize)
    // The lowest clumps rest their own flattened underside on the ground.
    pads.push({
      center: [Math.cos(angle) * radial + lean * f, mix(tall * (1 - clump.flatten), Math.max(tall, height - tall), f), Math.sin(angle) * radial],
      radius: [r, tall, r],
      color: colors[Math.min(colors.length - 1, Math.floor(f * colors.length))],
      flatten: clump.flatten,
      key: noiseKey(streams, clumpKeys + i),
      limb: i % form.far.masses,
      peak: clump.point,
      crest: flowering,
    })
  }
  const bark = emptyMesh(), foliage = emptyMesh()
  const look: FoliageLook = { underside: form.leaves.underside, inner: form.leaves.inner, softCenter: [lean * half, height * half, 0], reach: spread }
  const shown = options.tier === 'near' ? pads : limbMasses(pads, form.far.masses, form.far.mass)
  for (const pad of shown) emitPad(foliage, pad, detail, look, shrubGrowth.clumpJitter)
  if (options.tier === 'near') {
    growStems(form, bark, height, lean, streams)
    addBerries(form, options, pads, foliage, look, streams)
  }
  return { bark, foliage, collision, clumps: pads.length }
}

function growStems(form: MoundForm, bark: ReturnType<typeof emptyMesh>, height: number, lean: number, streams: Streams) {
  const color = tint('bark', form.bark)
  for (let i = 0; i < form.stems; i++) {
    const random = streams(stemKeys + i)
    const angle = random() * fullTurn, reach = form.stemRadius * between(random, treeGrowth.lengthJitter)
    const top: Vec3 = [Math.cos(angle) * reach + lean * shrubGrowth.clumpLift, height * shrubGrowth.clumpLift, Math.sin(angle) * reach]
    const spine = [
      { point: [0, -form.stemRadius, 0] as Vec3, radius: form.stemRadius },
      { point: top, radius: form.stemRadius * half },
    ]
    addTube(bark, spine, { sides: treeDetail.near.twigSides, color: () => color })
  }
}

function addBerries(form: MoundForm, options: TreeTemplateOptions, pads: FoliagePad[], foliage: ReturnType<typeof emptyMesh>, look: FoliageLook, streams: Streams) {
  const accent = form.accent
  if (!accent || !accent.clusters || options.age === 'young') return
  const color = tint(form.foliage, accent.color)
  const detail = { padSegments: treeDetail.near.accentSegments, padRings: 1 }
  for (let i = 0; i < accent.clusters; i++) {
    const random = streams(accentKeys + i)
    const pad = pads[Math.floor(random() * pads.length)]
    const angle = random() * fullTurn
    const r = accent.size * between(random, shrubGrowth.berrySize)
    const center = add(pad.center, [Math.cos(angle) * pad.radius[0], pad.radius[1] * shrubGrowth.accentCover, Math.sin(angle) * pad.radius[2]])
    emitPad(foliage, { center, radius: [r, r, r], color, flatten: 0, key: noiseKey(streams, accentKeys + i), limb: 0 }, detail, { ...look, inner: 1 })
  }
}

// Bracken: single fronds rise from a creeping rhizome, each on a nearly upright stipe,
// then the triangular blade runs out close to level. Lobes along the blade suggest the pinnae.
export function growFronds(form: FrondForm, options: TreeTemplateOptions, streams: Streams) {
  const age = authoredAge(options.age)
  const exposed = options.exposure === 'exposed'
  const near = options.tier === 'near'
  const count = near ? form.fronds[age] : form.far.fronds
  const segments = near ? form.blade.segments : form.far.segments
  const colors = form.leaves.colors.map((hex) => tint('broadleaf', hex))
  const tip = tint('broadleaf', form.leaves.tip)
  const foliage = emptyMesh()
  for (let i = 0; i < count; i++) {
    const random = streams(frondKeys + i)
    // The far tier grows the near tier's first fronds, so both stand in the same places.
    const angle = i * treeGrowth.goldenAngle + centered(random, treeGrowth.azimuthJitter)
    const length = between(random, form.length[age]) * (exposed ? form.exposure.height : 1)
    const reach = (exposed ? form.exposure.spread : 1) * (1 - shrubGrowth.frondFan + shrubGrowth.frondFan * random())
    const direction: Vec3 = [Math.cos(angle), 0, Math.sin(angle)]
    const across = normalize([-direction[2], centered(random, shrubGrowth.frondTilt), direction[0]])
    const along = random() * fullTurn, apart = between(random, form.patch)
    const base: Vec3 = [Math.cos(along) * apart, 0, Math.sin(along) * apart]
    const spine: FrondPoint[] = []
    // The base and the top of the bare stipe, then the blade out to its tip.
    for (let k = 0; k <= segments; k++) {
      const stipe = k < stipePoints
      const t = k === 0 ? 0 : mix(form.blade.start, 1, (k - 1) / (segments - 1))
      const stipeT = Math.min(t, form.blade.start), bladeT = Math.max(0, t - form.blade.start)
      const y = length * (form.arc.stipe * stipeT + form.arc.rise * bladeT - form.arc.droop * bladeT * bladeT)
      const out = length * reach * (form.arc.lean * stipeT + bladeT)
      const blade = (1 - (t - form.blade.start) / (1 - form.blade.start)) ** shrubGrowth.bladeTaper
      const lobe = 1 - form.blade.lobeDepth * (k % lobePeriod)
      const width = stipe ? shrubGrowth.stipeWidth : Math.max(shrubGrowth.stipeWidth, form.blade.width * length * blade * (near ? lobe : 1))
      spine.push({ point: add(base, [direction[0] * out, y, direction[2] * out]), width })
    }
    const green = colors[Math.floor(random() * colors.length)]
    const bronze = mix(shrubGrowth.frondBronze[0], shrubGrowth.frondBronze[1], random()) * (age === 'mature' ? 1 : half)
    addFrond(foliage, spine, across, (along) => blendColor(green, tip, bronze * along * along))
  }
  return { bark: emptyMesh(), foliage, collision: frondSize(form, options) }
}
