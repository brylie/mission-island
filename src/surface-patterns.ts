import { gameplayPatterns } from './gameplay-surface-patterns.ts'
import { blend, hash, valueNoise, wrap } from './math/noise.ts'
import { cell, fraction, smooth, wave, type Point, type Sample } from './surface-pattern-tools.ts'
import type { StandardSurfaceId, SurfaceRecipe, SurfaceSettings } from './assets/surface-recipes.ts'

function turf({ u, v, n, seed, wear, patch, fine }: Point, dry: boolean): Sample {
  const tuft = cell(u, v, n, seed)
  const density = dry ? patch * 0.71 + tuft.tone * 0.29 : tuft.tone * 0.78 + fine * 0.16 + patch * 0.06
  const cover = smooth(0.13 + 0.42 * wear, 0.46 + 0.44 * wear, density)
  const lean = tuft.tone - 0.5
  const blades = wave((tuft.dx + tuft.dy * (lean * 2.5 + tuft.dx * 1.6)) * 3.6 + tuft.tone) ** 4
  const clump = (1 - smooth(0.13, 0.56, tuft.distance)) * smooth(0.008, 0.055, tuft.edge)
  const height = cover * (0.16 + clump * (0.21 + blades * 0.62))
  const soil = (1 - cover) * (dry ? 0.86 : 0.32)
  const tone = dry ? 0.19 + cover * 0.37 + height * 0.53 + 0.12 * patch : 0.36 + cover * 0.22 + height * 0.28
  return [height + 0.1 * fine, tone, soil]
}

function needleScatter(u: number, v: number, n: number, seed: number, fan: boolean) {
  let height = 0, tips = 0
  for (let layer = 0; layer < 2; layer++) {
    const twig = cell(u + layer * 0.21, v - layer * 0.17, n, seed + layer * 23)
    const angle = (fan ? 0.7 + twig.tone : twig.tone * 6.28)
    const along = twig.dx * Math.cos(angle) + twig.dy * Math.sin(angle)
    const across = twig.dy * Math.cos(angle) - twig.dx * Math.sin(angle)
    const rake = fan ? Math.abs(across) * 1.7 - along : along
    const blade = (1 - smooth(0.12, 0.49, Math.abs(along)))
      * (fan
        ? smooth(0.77, 0.96, wave(rake * 5.5)) * (1 - smooth(0.08, 0.38, Math.abs(across)))
        : 1 - smooth(0.015, 0.071, Math.abs(across + along * along * 0.4)))
    height = Math.max(height, blade * (0.62 + twig.tone * 0.38))
    tips = Math.max(tips, blade * smooth(0.07, 0.35, Math.abs(along)))
  }
  return { height, tips }
}

function aggregate({ u, v, n, seed, wear, fine }: Point, kind: 'chips' | 'scree' | 'cobbles'): Sample {
  const angular = kind !== 'cobbles'
  const warp = valueNoise(u, v, 4, seed + 19) * 0.08
  const stone = cell(u + warp, v - warp * 0.72, n, seed, kind === 'scree' ? 0.92 : angular ? 0.57 : 0)
  const crown = angular
    ? (0.5 + 0.5 * smooth(-0.045, 0.08, stone.dx * 0.7 - stone.dy * (stone.tone + 0.3)))
    : 1 - smooth(0.12, 0.75, stone.distance) * 0.52
  const joint = kind === 'chips' ? 0.008 + wear * 0.012 : 0.012 + wear * 0.058
  const rim = smooth(joint, joint + (angular ? 0.105 : 0.16), stone.edge)
  const body = kind === 'chips' ? rim * (1 - smooth(0.12, 0.34 + stone.tone * 0.4, stone.distance)) : rim
  const fractured = kind === 'scree' ? smooth(0.6, 0.9, fine) * wear * 0.35 : 0
  const height = body * (crown * (0.67 + stone.tone * 0.28) - fractured)
  return [height * (kind === 'chips' ? 1 - wear * 0.32 : 1) + fine * 0.09, 0.15 + body * (0.4 + stone.tone * 0.38) + fine * 0.15, angular ? (1 - body) * wear * 0.65 : (1 - body) * 0.16]
}

function strata({ u, v, n, seed, wear, patch, fine }: Point, slate: boolean): Sample {
  const warp = valueNoise(u, v, slate ? 5 : 3, seed + 4, slate ? 6 : 2)
  const phase = v * n + u * (slate ? 3 : 1) + warp * (slate ? 0.88 : 2.3)
  const layer = fraction(phase)
  const edge = smooth(0.04, 0.11 + wear * 0.25, layer)
  const step = slate ? edge * (1 - 0.34 * layer) : wave(phase) * 0.55 + wave(phase * 2) * 0.19
  const erosion = smooth(0.45, 0.8, fine * 0.66 + patch * 0.34) * wear
  return [step * (0.96 - erosion * 0.7) + (slate ? 0.05 : 0.21) * fine, 0.19 + step * 0.47 + fine * 0.19, erosion * step * 0.75]
}

const standardPatterns: Record<StandardSurfaceId, (p: Point) => Sample> = {
  'meadow-turf': (p) => turf(p, false),
  'dry-turf': (p) => turf(p, true),
  'pine-duff': ({ u, v, n, seed, wear, fine }) => {
    const litter = needleScatter(u, v, n, seed, false)
    const height = litter.height * (0.96 - smooth(0.27, 0.8, fine) * wear)
    return [height + 0.2 * fine, 0.19 + height * 0.69, litter.tips * 0.72]
  },
  'path-gravel': (p) => aggregate(p, 'chips'),
  'scree': (p) => aggregate(p, 'scree'),
  'cobbles': (p) => aggregate(p, 'cobbles'),
  'dry-beach': ({ u, v, n, seed, wear, patch, fine }) => {
    const grain = valueNoise(u, v, n, seed + 11)
    const scour = valueNoise(u, v, 4, seed + 7, 14)
    const shell = smooth(0.73, 0.94, grain) * (1 - 0.55 * wear)
    return [grain * 0.57 + scour * wear * 0.25, 0.37 + grain * 0.4 + patch * 0.14 + fine * 0.06, shell]
  },
  'rippled-sand': ({ u, v, n, seed, wear, patch, fine }) => {
    const phase = v * n + valueNoise(u, v, 4, seed + 5) * 0.7
    const crest = wave(phase + 0.16 * wave(phase)) ** (1.3 + wear * 2.1)
    const height = crest * (1 - 0.5 * patch * wear)
    return [height + 0.14 * fine, 0.29 + height * 0.49 + fine * 0.17, crest * 0.2]
  },
  'estuary-silt': ({ u, v, n, seed, wear, patch, fine }) => {
    const mud = cell(u + patch * 0.06, v - patch * 0.055, n, seed, 0.21)
    const crust = smooth(0.013, 0.032 + 0.144 * wear, mud.edge)
    const rim = (1 - smooth(0.05, 0.2, mud.edge)) * crust
    return [crust * 0.54 + rim * wear * 0.5 + fine * 0.08, 0.16 + crust * (0.43 + 0.23 * mud.tone), rim * 0.32]
  },
  'poured-concrete': ({ u, v, n, seed, wear, patch, fine }) => {
    const pore = cell(u, v, n, seed)
    const pit = (1 - smooth(0.04, 0.11 + wear * 0.14, pore.distance)) * smooth(0.27, 0.63, pore.tone)
    return [0.42 + fine * 0.17 - pit * 0.73, 0.34 + patch * 0.4 + fine * 0.18, pit * 0.77]
  },
  'lime-plaster': ({ u, v, n, seed, wear, patch, fine }) => {
    // Integer shear keeps each edge continuous across the repeat.
    const strokes = valueNoise(u + v, v + 0.16 * patch, n / 2, seed + 17, n)
    const flake = smooth(0.59, 0.74 - wear * 0.1, strokes)
    return [0.22 + 0.28 * strokes + flake * 0.28 + 0.05 * fine, 0.43 + 0.34 * strokes + 0.15 * patch, flake * (0.3 + 0.2 * patch)]
  },
  'brick': ({ u, v, n, seed, wear, fine }) => {
    const row = Math.floor(v * n)
    const x = u * (n / 3) + wrap(row, 2) * 0.5
    const tone = hash(wrap(Math.floor(x), n / 3), wrap(row, n), seed)
    const a = fraction(x), b = fraction(v * n)
    const lip = Math.min(a * 3, (1 - a) * 3, b, 1 - b) + (fine - 0.5) * wear * 0.16
    const clay = smooth(0.028, 0.068 + wear * 0.065, lip)
    return [clay * (0.65 + 0.2 * tone) + fine * 0.1, 0.36 + clay * (0.09 + tone * 0.41), 1 - clay]
  },
  'granite': ({ u, v, n, seed, wear, fine }) => {
    const crystal = cell(u + fine * 0.015, v - fine * 0.017, n, seed, 0.61)
    const facet = smooth(0.02, 0.11, crystal.edge)
    const mica = smooth(0.66, 0.94, crystal.tone)
    return [0.31 + facet * (0.16 + 0.43 * crystal.tone) * (0.61 + wear * 0.39) + fine * 0.12, 0.1 + 0.79 * crystal.tone, mica * (0.36 + 0.44 * wear)]
  },
  'slate': (p) => strata(p, true),
  'sandstone': (p) => strata(p, false),
  'fresh-cut-timber': ({ u, v, n, seed, wear, patch, fine }) => {
    const grain = wave(u * n + valueNoise(u, v, 6, seed, 3) * 2.55)
    const knotRadius = Math.hypot(fraction(u + 0.13) - 0.5, (fraction(v + 0.91) - 0.5) * 0.59)
    const knot = 1 - smooth(0.025, 0.19, knotRadius)
    const rings = blend(grain, wave(knotRadius * 39 + patch), knot)
    const saw = wave(v * n + patch * 0.74) ** 8
    return [rings * 0.42 + saw * wear * 0.48 + fine * 0.09, 0.22 + rings * 0.59 - knot * 0.17, saw * wear * 0.41]
  },
  'weathered-board': ({ u, v, n, seed, wear, patch, fine }) => {
    const fiber = valueNoise(u, v, n, seed, 3)
    const raised = wave(u * n + fiber * 0.67 + patch * 0.45) ** 3
    const cracks = smooth(0.5, 0.86, fiber * 0.65 + patch * 0.35 + wear * 0.25)
    const salt = smooth(0.4, 0.84, patch * 0.56 + fiber * 0.44 + wear * 0.24)
    return [0.34 + raised * (0.27 + wear * 0.3) - cracks * 0.48 + fine * 0.1, 0.26 + raised * 0.35 + fiber * 0.31, salt * (1 - cracks * 0.67)]
  },
  'bark': ({ u, v, n, seed, wear, patch, fine }) => {
    const warped = u + 0.066 * valueNoise(u, v, 5, seed, 4)
    const plate = cell(warped, v, n, seed + 9, 0.55)
    const ridge = wave(warped * n + valueNoise(u, v, n, seed + 29, 4) * 0.9)
    const fissure = smooth(0.1 + wear * 0.17, 0.59, ridge + (patch - 0.5) * 0.33)
    const height = fissure * (0.48 + smooth(0.015, 0.18, plate.edge) * 0.36)
    return [height + fine * 0.2, 0.16 + height * 0.68 + fine * 0.15, smooth(0.54, 0.79, height) * 0.66]
  },
  'broadleaf': ({ u, v, n, seed, wear, fine }) => {
    const leaf = cell(u, v, n, seed)
    const angle = leaf.tone * 5
    const along = leaf.dx * Math.cos(angle) + leaf.dy * Math.sin(angle)
    const across = leaf.dy * Math.cos(angle) - leaf.dx * Math.sin(angle)
    const edge = (1 - smooth(0.15, 0.52, Math.abs(along))) * 0.27 - Math.abs(across)
    const blade = smooth(-0.02, 0.04, edge)
    const vein = (1 - smooth(0.008, 0.039, Math.abs(across))) * 0.68
      + wave((along - Math.abs(across) * 0.73) * 8) ** 9 * 0.28
    const curl = smooth(-0.012, 0.034, edge) * (1 - smooth(0.03, 0.08, edge)) * wear
    return [blade * (0.46 + vein * 0.29 + fine * 0.09) + curl * 0.51, 0.17 + blade * (0.39 + 0.3 * leaf.tone), blade * vein * 0.56 + curl * 0.35]
  },
  'needles': ({ u, v, n, seed, wear, fine }) => {
    const spray = needleScatter(u, v, n, seed, true)
    return [spray.height - spray.tips * wear * 0.36 + fine * 0.08, 0.11 + spray.height * 0.82, spray.tips * wear]
  },
  'reed-blades': ({ u, v, n, seed, wear, patch, fine }) => {
    const blade = fraction(u * n + patch * 0.69 + wave(v) * 0.28)
    const fold = smooth(0.08, 0.24, blade) * (1 - smooth(0.48, 0.97, blade))
    const split = smooth(0.68 - 0.3 * wear, 0.82, valueNoise(u, v, n, seed, 5)) * wave(blade * 2)
    return [fold * (1 - 0.67 * split) + fine * 0.048, 0.21 + fold * 0.55, split * 0.55]
  },
  'brass': ({ u, v, n, seed, wear, patch, fine }) => {
    const hammer = cell(u, v, n, seed)
    const dimple = (1 - smooth(0.02, 0.51, hammer.distance)) * 0.71
    const tarnish = smooth(0.42, 0.85, patch * 0.7 + dimple * 0.3 + wear * 0.35)
    return [0.82 - dimple * (1 - tarnish * 0.25) + fine * (0.065 + tarnish * 0.12), 0.61 + 0.17 * fine - dimple * 0.26, tarnish * 0.86]
  },
  'steel': ({ u, v, n, seed, wear, fine }) => {
    const brush = valueNoise(u, v, n, seed, 6)
    const scratch = wave(u * 17 + v * 31 + brush) ** 11 * wear
    return [0.39 + brush * 0.42 - scratch * 0.42 + fine * 0.09, 0.38 + brush * 0.31, scratch * 0.9]
  },
  'copper': ({ u, v, n, seed, wear, patch, fine }) => {
    const pit = cell(u, v, n, seed)
    const stain = smooth(0.46, 0.77, patch * 0.72 + fine * 0.28 + 0.36 * wear)
    const pore = (1 - smooth(0.04, 0.23, pit.distance)) * (0.34 + 0.6 * pit.tone)
    return [0.38 - pore * 0.64 + stain * (0.16 + fine * 0.29), 0.39 + 0.34 * fine, stain]
  },
  'canvas': ({ u, v, n, wear, fine }) => {
    const warp = wave(u * n), weft = wave(v * n)
    const over = wave((u + v) * n / 2)
    const fray = wear * smooth(0.47, 0.86, fine) * (1 - Math.max(warp, weft))
    const yarn = blend(warp ** 0.65, weft ** 0.65, over)
    return [yarn * 0.76 + fray * 0.44, 0.24 + yarn * 0.55 + fine * 0.12, fray * 1.55]
  },
  'wool': ({ u, v, n, seed, wear, fine }) => {
    const loop = cell(u, v, n, seed)
    const ring = 1 - smooth(0.035, 0.12, Math.abs(loop.distance - 0.23))
    const pill = (1 - smooth(0.03, 0.20, loop.distance)) * smooth(0.55, 0.95, loop.tone + wear * 0.3)
    const fleece = valueNoise(u, v, n * 3, seed + 18)
    return [0.18 + 0.38 * ring + pill * 0.62 + fleece * 0.19, 0.32 + ring * 0.25 + fine * 0.23, pill * 0.84]
  },
  'workwear-twill': ({ u, v, n, wear, patch, fine }) => {
    const warp = wave(u * n)
    const weft = wave(v * n)
    const diagonal = wave((v - u) * n / 3)
    const rib = blend(warp, weft * 0.76, smooth(0.38, 0.85, diagonal)) * (0.72 + 0.28 * diagonal)
    const worn = smooth(0.39, 0.79, patch + 0.21 * wear) * wear
    return [rib * (1 - worn * 0.68) + 0.1 * fine, 0.21 + rib * 0.62, worn * (1 - rib * 0.5) * 0.52]
  },
}

const patterns = { ...standardPatterns, ...gameplayPatterns }

export function sampleSurface(recipe: SurfaceRecipe, settings: SurfaceSettings) {
  const pattern = patterns[recipe.id]
  const wear = settings.wear ?? recipe.wear.amount
  const { seed, spacing: { cells: n } } = recipe
  return (u: number, v: number) => pattern({
    u,
    v,
    n,
    seed,
    wear,
    patch: valueNoise(u, v, 5, seed + 37),
    fine: valueNoise(u, v, 59, seed + 79),
  })
}

export function meadowGroundTone(x: number, z: number, wear: number) {
  // World-space fields with no wrap, at hillside, tussock patch and verge scales.
  const wide = valueNoise(x / 18, z / 18, 1, 483, 1, false)
  const warp = valueNoise(x / 9, z / 9, 1, 317, 1, false) * 9
  const patch = valueNoise((x + warp) / 5, (z - warp) / 5, 1, 472, 1, false)
  const verge = valueNoise(x / 1.9, z / 1.9, 1, 81, 1, false)
  return smooth(0.18, 0.89, wide * 0.44 + patch * 0.38 + verge * 0.18 + (wear - 0.27) * 0.48)
}
