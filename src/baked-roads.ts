import { roadLayerEncoding as encoding } from './assets/geometry/island-preview.ts'
import { roadNetwork } from './assets/geometry/road-kinds.ts'
import type { Culvert } from './road-culverts.ts'
import { rasterLookup, rasterTileKey } from './road-grading.ts'
import type { Point } from './world.ts'

// Reads the baked road layer (src/assets/geometry/road-layer.ts) that scripts/bake-roads.mjs writes
// from the graded roads in the source tree: the grading raster, the culverts, and the formation
// distance the terrain is cut to. The game reads these instead of grading the roads on load.

interface RoadLayerBake {
  rasterTiles: string
  raster: string
  formationTiles: string
  formation: string
  culverts: readonly { road: string, along: number, inlet: Point, outlet: Point | null, depth: number }[]
}

const { tileCells, cellM } = roadNetwork
const nodes = tileCells + 1, tileNodes = nodes * nodes, tileM = tileCells * cellM

function bytes(base64: string) {
  const text = atob(base64)
  const out = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i)
  return out
}

// Each tile's key, in the order the tiles' nodes are listed.
function tileKeys(base64: string) {
  const pairs = new Int16Array(bytes(base64).buffer)
  return Array.from({ length: pairs.length >> 1 }, (_, k) => rasterTileKey(pairs[k + k], pairs[k + k + 1]))
}

export function decodeRoadLayer(layer: RoadLayerBake) {
  const deltas = new Float32Array(bytes(layer.raster).buffer)
  const tiles = new Map(tileKeys(layer.rasterTiles).map((key, k) => [key, deltas.subarray(k * tileNodes, (k + 1) * tileNodes)]))
  const steps = new Int16Array(bytes(layer.formation).buffer)
  const formationTiles = new Map(tileKeys(layer.formationTiles).map((key, k) => [key, steps.subarray(k * tileNodes, (k + 1) * tileNodes)]))
  const culverts: Culvert[] = layer.culverts.map(({ outlet, ...culvert }) => ({ ...culvert, outlet: outlet ?? undefined }))
  // The formation distance at a node of the 1 m grid, where the generated terrain's vertices
  // stand, or undefined off the grid, as at the authored island's ring of vertices: there the
  // caller asks the grading. (Blending the grid between nodes is not safe: the distance jumps
  // where one road's say gives way to another's, by up to a metre within two of an edge.)
  const formationAt = ({ x, z }: Point) => {
    const tx = Math.floor(x / tileM), tz = Math.floor(z / tileM)
    const gx = (x - tx * tileM) / cellM, gz = (z - tz * tileM) / cellM
    if (!Number.isInteger(gx) || !Number.isInteger(gz)) return undefined
    const tile = formationTiles.get(rasterTileKey(tx, tz))
    if (!tile) return Infinity
    const step = tile[gz * nodes + gx]
    return step === encoding.formationFar ? Infinity : step * encoding.formationStepM
  }
  return { raster: rasterLookup(tiles), culverts, formationAt }
}
