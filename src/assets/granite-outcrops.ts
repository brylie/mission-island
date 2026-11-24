import type { MeshFactory } from '../island-meshes'
import type { GraniteRock } from '../highwood-outcrops'
import { graniteBlockFacets } from '../granite-blocks'
import { graniteOutcropFinish as finish } from './geometry/granite-outcrops'
import { seededRandom } from '../seeded-random'
import { facetBatch } from './stone-facets'

// Highwood's granite outcrops and clitter as flat-faceted weathered blocks (granite-blocks.ts),
// merged into one mesh per 64 m tile so the tiles off screen are culled. Facets that face
// the sky carry the lichen tint of a weathered top; the rest stay buff-grey.

const half = 0.5
const toneSeedSpan = 1e6

type Batch = ReturnType<typeof facetBatch>
type Tint = readonly [number, number, number]

const tinted = (tint: Tint, scale: number): Tint => [tint[0] * scale, tint[1] * scale, tint[2] * scale]

export function createGraniteOutcrops(meshes: MeshFactory, rocks: readonly GraniteRock[]) {
  const material = meshes.paintRecipe('granite')
  const tiles = new Map<string, Batch>()
  for (const rock of rocks) {
    const key = `${Math.floor(rock.x / finish.tileM)},${Math.floor(rock.z / finish.tileM)}`
    const batch = tiles.get(key) ?? facetBatch(finish.repeatsPerMetre)
    tiles.set(key, batch)
    const random = seededRandom(Math.floor(rock.tone * toneSeedSpan))
    rock.slabs.forEach((slab, index) => {
      const tone = 1 + (rock.tone - half + (random() - half) * half) * (finish.toneSpread + finish.toneSpread)
      const side = tinted(finish.side, tone), crown = tinted(finish.top, tone)
      for (const { corners, normal } of graniteBlockFacets(rock, slab, index === 0, random)) {
        const upward = normal[1] / Math.hypot(...normal)
        batch.face(corners, upward >= finish.topNormalY ? crown : side)
      }
    })
  }
  for (const [key, batch] of tiles) batch.mesh(meshes, `Highwood granite ${key}`, material)
}
