import { smoothstep } from '../../math/smoothstep.ts'
import { shrubGrowth, type LogForm, type SnagForm } from '../geometry/shrub-species.ts'
import { treeDetail, treeGrowth } from '../geometry/tree-species.ts'
import { add, addPad, addTube, emptyMesh, normalize, scale, type MeshData, type SpinePoint, type Vec3 } from './tree-mesh.ts'
import { blendColor, shade, tint } from './tree-kit.ts'
import { authoredAge, between, centered, mix, noiseKey, wobble, type Streams, type TreeTemplateOptions } from './tree-catalog.ts'
import { logSize, snagSize } from './tree-collision.ts'

const fullTurn = Math.PI + Math.PI
const half = 0.5
const quarter = 0.25
const stubKeys = 100
const limbKeys = 300
const roughKey = 7
const capKey = 11
const rootKey = 13
const peelKey = 17
const { deadwood } = shrubGrowth

function jaggedCap(key: number, jag: number, color: ReturnType<typeof tint>) {
  const tooth = wobble(key, half)
  return { color, rise: (side: number) => (tooth(0, side) + half) * jag }
}

function stub(mesh: MeshData, origin: Vec3, direction: Vec3, length: number, radius: number, droop: number, color: ReturnType<typeof tint>, rings = 1) {
  const spine: SpinePoint[] = Array.from({ length: rings + 1 }, (_, ring) => {
    const t = ring / rings
    return { point: add(add(origin, scale(direction, length * t)), [0, -droop * length * t * t, 0]), radius: radius * mix(1, deadwood.limbTip, t) }
  })
  addTube(mesh, spine, { sides: shrubGrowth.stubSides, color: () => color })
}

// A pine that died standing: silvered wood shows where the bark has fallen away,
// the crown has snapped to a ragged point, and only stubs remain of most branches.
export function growSnag(form: SnagForm, options: TreeTemplateOptions, streams: Streams) {
  const random = streams(0)
  const age = authoredAge(options.age)
  const near = options.tier === 'near'
  const { height, radius, collision } = snagSize(form, options, random)
  const lean = (options.exposure === 'exposed' ? form.lean.exposed : form.lean.sheltered) * height
  const heading = random() * fullTurn
  const direction: Vec3 = options.exposure === 'exposed' ? [1, 0, 0] : [Math.cos(heading), 0, Math.sin(heading)]
  const point = (t: number): Vec3 => add([0, t * height, 0], scale(direction, lean * Math.max(0, t) ** treeGrowth.bendPower))
  const radiusAt = (t: number) => radius * mix(1, form.topRadius, Math.max(0, t))
  const rings = near ? shrubGrowth.snagRings : shrubGrowth.farSnagRings
  const bark = emptyMesh()
  const barkColor = tint('bark', form.bark.lower), bare = tint('bark', form.bark.bare), flake = tint('bark', form.bark.upper)
  const transition = form.bark.transition[age]
  const patches = wobble(noiseKey(streams, peelKey), 1)
  const spine = Array.from({ length: rings + 1 }, (_, ring) => {
    const t = ring === 0 ? -treeGrowth.embed * radius / height : (ring - 1) / (rings - 1)
    return { point: point(t), radius: radiusAt(t) }
  })
  addTube(bark, spine, {
    sides: near ? shrubGrowth.snagSides : shrubGrowth.farSnagSides,
    roughness: wobble(noiseKey(streams, roughKey), shrubGrowth.roughness),
    color: (ring, along, side) => {
      const peeled = smoothstep((along / height - transition) / transition + patches(ring, side) * half)
      return blendColor(blendColor(barkColor, flake, half * (1 - peeled)), bare, peeled)
    },
    cap: jaggedCap(noiseKey(streams, capKey), form.broken.jag, bare),
  })
  const stubs = near ? form.stubs[age] : 0
  for (let i = 0; i < stubs; i++) {
    const own = streams(stubKeys + i)
    const t = between(own, shrubGrowth.stubRange), angle = i * treeGrowth.goldenAngle + centered(own, treeGrowth.azimuthJitter)
    const out: Vec3 = [Math.cos(angle), 0, Math.sin(angle)]
    stub(bark, add(point(t), scale(out, radiusAt(t))), out, form.stub.length * height * between(own, treeGrowth.lengthJitter), radiusAt(t) * deadwood.stubRadius, form.stub.droop, bare)
  }
  const limbs = near ? form.limbs[age] : Math.min(form.limbs[age], treeGrowth.farLimbs)
  for (let i = 0; i < limbs; i++) {
    const own = streams(limbKeys + i)
    const t = between(own, shrubGrowth.limbRange), angle = own() * fullTurn
    const out = normalize([Math.cos(angle), form.limb.rise, Math.sin(angle)])
    stub(bark, point(t), out, form.limb.length * height * between(own, treeGrowth.lengthJitter), radiusAt(t) * deadwood.limbRadius, form.limb.droop, bare, near ? deadwood.limbRings : 1)
  }
  return { bark, foliage: emptyMesh(), collision }
}

// A windthrown pine lying along +x: the torn root plate stands at the origin and the
// snapped crown end lies downwind. Moss creeps over the upper face as it ages.
export function growLog(form: LogForm, options: TreeTemplateOptions, streams: Streams) {
  const random = streams(0)
  const age = authoredAge(options.age)
  const near = options.tier === 'near'
  const { length, radius, axisHeight, collision } = logSize(form, options, random)
  const bow = centered(random, form.bow) * length
  const rings = near ? shrubGrowth.logRings : shrubGrowth.farLogRings
  const spine = Array.from({ length: rings + 1 }, (_, ring) => {
    const t = ring / rings
    return { point: [t * length, axisHeight, Math.sin(t * Math.PI) * bow] as Vec3, radius: radius * mix(1, deadwood.logTip, t) }
  })
  const wood = tint('bark', form.bark.wood), bare = tint('bark', form.bark.bare), moss = tint('bark', form.bark.moss)
  const cover = form.bark.mossCover[age]
  const sides = near ? shrubGrowth.logSides : shrubGrowth.farLogSides
  const bark = emptyMesh()
  addTube(bark, spine, {
    sides,
    roughness: wobble(noiseKey(streams, roughKey), shrubGrowth.roughness),
    // The frame's binormal points up for a tube along +x, so a quarter turn is the top of the log.
    color: (_ring, _along, side) => {
      const upness = Math.sin(side / sides * fullTurn)
      return blendColor(wood, moss, smoothstep((upness - 1 + cover + cover) * deadwood.mossSharpness))
    },
    cap: jaggedCap(noiseKey(streams, capKey), form.broken.jag, bare),
  })
  const { roots } = form
  const plate = roots.size * half * radius / form.radius.young[1]
  addPad(bark, {
    center: [-roots.depth * half * plate, plate * deadwood.rootSink, 0],
    radius: [roots.depth * plate, plate, plate],
    segments: near ? roots.segments : treeDetail.far.padSegments,
    rings: near ? treeDetail.near.padRings : 1,
    flatten: 0,
    jitter: wobble(noiseKey(streams, rootKey), deadwood.rootJitter),
    color: () => shade(wood, deadwood.rootShade),
  })
  const stubs = near ? form.stubs[age] : 0
  for (let i = 0; i < stubs; i++) {
    const own = streams(stubKeys + i)
    const t = between(own, shrubGrowth.stubRange), angle = between(own, [-quarter, 1 + quarter]) * Math.PI
    const out: Vec3 = [half * own(), Math.sin(angle), Math.cos(angle)]
    const at = spine[Math.round(t * rings)]
    stub(bark, at.point, normalize(out), form.stub.length * between(own, treeGrowth.lengthJitter), at.radius * form.stub.radius, 0, bare)
  }
  return { bark, foliage: emptyMesh(), collision }
}
