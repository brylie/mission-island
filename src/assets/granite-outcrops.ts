import type { MeshFactory } from '../island-meshes'
import { groundHeight } from '../terrain'
import type { GraniteRock, GraniteSlab } from '../highwood-outcrops'
import { graniteOutcropFinish as finish, graniteOutcropShape as shape } from './geometry/granite-outcrops'
import { seededRandom } from '../seeded-random'
import { facetBatch, type Corner } from './stone-facets'

// Highwood's granite outcrops and clitter as flat-faceted stone, merged into one mesh
// per 64 m tile so the tiles off screen are culled. Each slab is a pillow-edged
// block: a foot ring sunk into the ground, a shoulder ring, and an inset top.

const half = 0.5
const toneSeedSpan = 1e6

type Batch = ReturnType<typeof facetBatch>
type Tint = readonly [number, number, number]

const tinted = (tint: Tint, scale: number): Tint => [tint[0] * scale, tint[1] * scale, tint[2] * scale]

// A rectangle's outline with its corners cut, as (along, across) pairs in units of the half length and half width.
function cutRectangle(cut: number) {
  // Going round counter-clockwise, alternate corners meet the long side first.
  const corners = [[1, 1, false], [-1, 1, true], [-1, -1, false], [1, -1, true]] as const
  return corners.flatMap(([su, sv, flip]) => {
    const pair: [number, number][] = [[su, sv * (1 - cut)], [su * (1 - cut), sv]]
    return flip ? pair.reverse() : pair
  })
}

function addSlab(batch: Batch, rock: GraniteRock, slab: GraniteSlab, embed: number | undefined, random: () => number, tone: number) {
  const outcrop = rock.kind === 'outcrop'
  const kind = outcrop ? 'outcrop' : 'clitter'
  const shoulder = shape.shoulder[kind]
  const outline = cutRectangle(shape.cornerCut[kind])
  const jitter = shape.cornerJitter[kind], tilt = shape.tiltM[kind]
  const cos = Math.cos(slab.heading), sin = Math.sin(slab.heading)
  const cx = rock.x + slab.dx, cz = rock.z + slab.dz
  const baseY = rock.ground + slab.base
  const topY = baseY + slab.height, shoulderY = topY - slab.height * shoulder
  // The top leans a little, so slabs don't all lie dead level.
  const tiltU = (random() - half) * tilt / slab.length, tiltV = (random() - half) * tilt / slab.width
  const foot: Corner[] = [], ring: Corner[] = [], top: Corner[] = []
  for (const [along, across] of outline) {
    const r = 1 + (random() - half) * (jitter + jitter)
    // The slab's own frame: u along its length, v across; then turned by its heading.
    const u = along * slab.length * half * r, v = across * slab.width * half * r
    const lean = u * tiltU + v * tiltV
    const corner = (scale: number, y: number): Corner => [cx + (u * cos - v * sin) * scale, y, cz + (u * sin + v * cos) * scale]
    const [fx, , fz] = corner(1, 0)
    // The lowest slab's foot follows the ground under each corner, sunk below it; upper slabs sit on the one below.
    foot.push([fx, embed === undefined ? baseY : Math.min(baseY, groundHeight({ x: fx, z: fz }) - embed), fz])
    ring.push(corner(1, shoulderY + lean))
    top.push(corner(1 - shoulder, topY + lean))
  }
  const side = tinted(finish.side, tone), crown = tinted(finish.top, tone)
  const sides = outline.length
  for (let k = 0; k < sides; k++) {
    const j = (k + 1) % sides
    batch.face([foot[k], foot[j], ring[j], ring[k]], side)
    batch.face([ring[k], ring[j], top[j], top[k]], crown)
  }
  batch.face(top, crown)
}

export function createGraniteOutcrops(meshes: MeshFactory, rocks: readonly GraniteRock[]) {
  const material = meshes.paintRecipe('granite')
  const tiles = new Map<string, Batch>()
  for (const rock of rocks) {
    const key = `${Math.floor(rock.x / finish.tileM)},${Math.floor(rock.z / finish.tileM)}`
    const batch = tiles.get(key) ?? facetBatch(finish.repeatsPerMetre)
    tiles.set(key, batch)
    const random = seededRandom(Math.floor(rock.tone * toneSeedSpan))
    const embed = rock.kind === 'outcrop' ? shape.embedM.outcrop : shape.embedM.clitter
    rock.slabs.forEach((slab, index) => {
      const tone = 1 + (rock.tone - half + (random() - half) * half) * (finish.toneSpread + finish.toneSpread)
      addSlab(batch, rock, slab, index === 0 ? embed : undefined, random, tone)
    })
  }
  for (const [key, batch] of tiles) batch.mesh(meshes, `Highwood granite ${key}`, material)
}
