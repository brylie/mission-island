import { gameplayPatterns } from './gameplay-surface-patterns.ts'
import { blend, hash, valueNoise, wrap } from './surface-noise.ts'
import { cell, fraction, smooth, wave, type Point, type Sample } from './surface-pattern-tools.ts'
import type { StandardSurfaceId, SurfaceRecipe, SurfaceSettings } from './surface-recipes.ts'

function turf({ u, v, n, seed, wear, patch, fine }: Point, dry: boolean): Sample {
  const tuft = cell(u, v, n, seed)
  const density = dry ? patch * .71 + tuft.tone * .29 : tuft.tone * .78 + fine * .16 + patch * .06
  const cover = smooth(.13 + .42 * wear, .46 + .44 * wear, density)
  const lean = tuft.tone - .5
  const blades = wave((tuft.dx + tuft.dy * (lean * 2.5 + tuft.dx * 1.6)) * 3.6 + tuft.tone) ** 4
  const clump = (1 - smooth(.13, .56, tuft.distance)) * smooth(.008, .055, tuft.edge)
  const height = cover * (.16 + clump * (.21 + blades * .62))
  const soil = (1 - cover) * (dry ? .86 : .32)
  const tone = dry ? .19 + cover * .37 + height * .53 + .12 * patch : .36 + cover * .22 + height * .28
  return [height + .1 * fine, tone, soil]
}

function needleScatter(u: number, v: number, n: number, seed: number, fan: boolean) {
  let height = 0, tips = 0
  for (let layer = 0; layer < 2; layer++) {
    const twig = cell(u + layer * .21, v - layer * .17, n, seed + layer * 23)
    const angle = (fan ? .7 + twig.tone : twig.tone * 6.28)
    const along = twig.dx * Math.cos(angle) + twig.dy * Math.sin(angle)
    const across = twig.dy * Math.cos(angle) - twig.dx * Math.sin(angle)
    const rake = fan ? Math.abs(across) * 1.7 - along : along
    const blade = (1 - smooth(.12, .49, Math.abs(along))) *
      (fan ? smooth(.77, .96, wave(rake * 5.5)) * (1 - smooth(.08, .38, Math.abs(across)))
        : 1 - smooth(.015, .071, Math.abs(across + along * along * .4)))
    height = Math.max(height, blade * (.62 + twig.tone * .38))
    tips = Math.max(tips, blade * smooth(.07, .35, Math.abs(along)))
  }
  return { height, tips }
}

function aggregate({ u, v, n, seed, wear, fine }: Point, kind: 'chips' | 'scree' | 'cobbles'): Sample {
  const angular = kind !== 'cobbles'
  const warp = valueNoise(u, v, 4, seed + 19) * .08
  const stone = cell(u + warp, v - warp * .72, n, seed, kind === 'scree' ? .92 : angular ? .57 : 0)
  const crown = angular
    ? (.5 + .5 * smooth(-.045, .08, stone.dx * .7 - stone.dy * (stone.tone + .3)))
    : 1 - smooth(.12, .75, stone.distance) * .52
  const joint = kind === 'chips' ? .008 + wear * .012 : .012 + wear * .058
  const rim = smooth(joint, joint + (angular ? .105 : .16), stone.edge)
  const body = kind === 'chips' ? rim * (1 - smooth(.12, .34 + stone.tone * .4, stone.distance)) : rim
  const fractured = kind === 'scree' ? smooth(.6, .9, fine) * wear * .35 : 0
  const height = body * (crown * (.67 + stone.tone * .28) - fractured)
  return [height * (kind === 'chips' ? 1 - wear * .32 : 1) + fine * .09,
    .15 + body * (.4 + stone.tone * .38) + fine * .15, angular ? (1 - body) * wear * .65 : (1 - body) * .16]
}

function strata({ u, v, n, seed, wear, patch, fine }: Point, slate: boolean): Sample {
  const warp = valueNoise(u, v, slate ? 5 : 3, seed + 4, slate ? 6 : 2)
  const phase = v * n + u * (slate ? 3 : 1) + warp * (slate ? .88 : 2.3)
  const layer = fraction(phase)
  const edge = smooth(.04, .11 + wear * .25, layer)
  const step = slate ? edge * (1 - .34 * layer) : wave(phase) * .55 + wave(phase * 2) * .19
  const erosion = smooth(.45, .8, fine * .66 + patch * .34) * wear
  return [step * (.96 - erosion * .7) + (slate ? .05 : .21) * fine,
    .19 + step * .47 + fine * .19, erosion * step * .75]
}

const standardPatterns: Record<StandardSurfaceId, (p: Point) => Sample> = {
  'meadow-turf': p => turf(p, false),
  'dry-turf': p => turf(p, true),
  'pine-duff': ({ u, v, n, seed, wear, fine }) => {
    const litter = needleScatter(u, v, n, seed, false)
    const height = litter.height * (.96 - smooth(.27, .8, fine) * wear)
    return [height + .2 * fine, .19 + height * .69, litter.tips * .72]
  },
  'path-gravel': p => aggregate(p, 'chips'),
  scree: p => aggregate(p, 'scree'),
  cobbles: p => aggregate(p, 'cobbles'),
  'dry-beach': ({ u, v, n, seed, wear, patch, fine }) => {
    const grain = valueNoise(u, v, n, seed + 11)
    const scour = valueNoise(u, v, 4, seed + 7, 14)
    const shell = smooth(.73, .94, grain) * (1 - .55 * wear)
    return [grain * .57 + scour * wear * .25, .37 + grain * .4 + patch * .14 + fine * .06, shell]
  },
  'rippled-sand': ({ u, v, n, seed, wear, patch, fine }) => {
    const phase = v * n + valueNoise(u, v, 4, seed + 5) * .7
    const crest = wave(phase + .16 * wave(phase)) ** (1.3 + wear * 2.1)
    const height = crest * (1 - .5 * patch * wear)
    return [height + .14 * fine, .29 + height * .49 + fine * .17, crest * .2]
  },
  'estuary-silt': ({ u, v, n, seed, wear, patch, fine }) => {
    const mud = cell(u + patch * .06, v - patch * .055, n, seed, .21)
    const crust = smooth(.013, .032 + .144 * wear, mud.edge)
    const rim = (1 - smooth(.05, .2, mud.edge)) * crust
    return [crust * .54 + rim * wear * .5 + fine * .08, .16 + crust * (.43 + .23 * mud.tone), rim * .32]
  },
  'poured-concrete': ({ u, v, n, seed, wear, patch, fine }) => {
    const pore = cell(u, v, n, seed)
    const pit = (1 - smooth(.04, .11 + wear * .14, pore.distance)) * smooth(.27, .63, pore.tone)
    return [.42 + fine * .17 - pit * .73, .34 + patch * .4 + fine * .18, pit * .77]
  },
  'lime-plaster': ({ u, v, n, seed, wear, patch, fine }) => {
    // Integer shear keeps each edge continuous across the repeat.
    const strokes = valueNoise(u + v, v + .16 * patch, n / 2, seed + 17, n)
    const flake = smooth(.59, .74 - wear * .1, strokes)
    return [.22 + .28 * strokes + flake * .28 + .05 * fine,
      .43 + .34 * strokes + .15 * patch, flake * (.3 + .2 * patch)]
  },
  brick: ({ u, v, n, seed, wear, fine }) => {
    const row = Math.floor(v * n)
    const x = u * (n / 3) + wrap(row, 2) * .5
    const tone = hash(wrap(Math.floor(x), n / 3), wrap(row, n), seed)
    const a = fraction(x), b = fraction(v * n)
    const lip = Math.min(a * 3, (1 - a) * 3, b, 1 - b) + (fine - .5) * wear * .16
    const clay = smooth(.028, .068 + wear * .065, lip)
    return [clay * (.65 + .2 * tone) + fine * .1, .36 + clay * (.09 + tone * .41), 1 - clay]
  },
  granite: ({ u, v, n, seed, wear, fine }) => {
    const crystal = cell(u + fine * .015, v - fine * .017, n, seed, .61)
    const facet = smooth(.02, .11, crystal.edge)
    const mica = smooth(.66, .94, crystal.tone)
    return [.31 + facet * (.16 + .43 * crystal.tone) * (.61 + wear * .39) + fine * .12,
      .1 + .79 * crystal.tone, mica * (.36 + .44 * wear)]
  },
  slate: p => strata(p, true),
  sandstone: p => strata(p, false),
  'fresh-cut-timber': ({ u, v, n, seed, wear, patch, fine }) => {
    const grain = wave(u * n + valueNoise(u, v, 6, seed, 3) * 2.55)
    const knotRadius = Math.hypot(fraction(u + .13) - .5, (fraction(v + .91) - .5) * .59)
    const knot = 1 - smooth(.025, .19, knotRadius)
    const rings = blend(grain, wave(knotRadius * 39 + patch), knot)
    const saw = wave(v * n + patch * .74) ** 8
    return [rings * .42 + saw * wear * .48 + fine * .09, .22 + rings * .59 - knot * .17, saw * wear * .41]
  },
  'weathered-board': ({ u, v, n, seed, wear, patch, fine }) => {
    const fiber = valueNoise(u, v, n, seed, 3)
    const raised = wave(u * n + fiber * .67 + patch * .45) ** 3
    const cracks = smooth(.5, .86, fiber * .65 + patch * .35 + wear * .25)
    const salt = smooth(.4, .84, patch * .56 + fiber * .44 + wear * .24)
    return [.34 + raised * (.27 + wear * .3) - cracks * .48 + fine * .1,
      .26 + raised * .35 + fiber * .31, salt * (1 - cracks * .67)]
  },
  bark: ({ u, v, n, seed, wear, patch, fine }) => {
    const warped = u + .066 * valueNoise(u, v, 5, seed, 4)
    const plate = cell(warped, v, n, seed + 9, .55)
    const ridge = wave(warped * n + valueNoise(u, v, n, seed + 29, 4) * .9)
    const fissure = smooth(.1 + wear * .17, .59, ridge + (patch - .5) * .33)
    const height = fissure * (.48 + smooth(.015, .18, plate.edge) * .36)
    return [height + fine * .2, .16 + height * .68 + fine * .15, smooth(.54, .79, height) * .66]
  },
  broadleaf: ({ u, v, n, seed, wear, fine }) => {
    const leaf = cell(u, v, n, seed)
    const angle = leaf.tone * 5
    const along = leaf.dx * Math.cos(angle) + leaf.dy * Math.sin(angle)
    const across = leaf.dy * Math.cos(angle) - leaf.dx * Math.sin(angle)
    const edge = (1 - smooth(.15, .52, Math.abs(along))) * .27 - Math.abs(across)
    const blade = smooth(-.02, .04, edge)
    const vein = (1 - smooth(.008, .039, Math.abs(across))) * .68 +
      wave((along - Math.abs(across) * .73) * 8) ** 9 * .28
    const curl = smooth(-.012, .034, edge) * (1 - smooth(.03, .08, edge)) * wear
    return [blade * (.46 + vein * .29 + fine * .09) + curl * .51,
      .17 + blade * (.39 + .3 * leaf.tone), blade * vein * .56 + curl * .35]
  },
  needles: ({ u, v, n, seed, wear, fine }) => {
    const spray = needleScatter(u, v, n, seed, true)
    return [spray.height - spray.tips * wear * .36 + fine * .08, .11 + spray.height * .82, spray.tips * wear]
  },
  'reed-blades': ({ u, v, n, seed, wear, patch, fine }) => {
    const blade = fraction(u * n + patch * .69 + wave(v) * .28)
    const fold = smooth(.08, .24, blade) * (1 - smooth(.48, .97, blade))
    const split = smooth(.68 - .3 * wear, .82, valueNoise(u, v, n, seed, 5)) * wave(blade * 2)
    return [fold * (1 - .67 * split) + fine * .048, .21 + fold * .55, split * .55]
  },
  brass: ({ u, v, n, seed, wear, patch, fine }) => {
    const hammer = cell(u, v, n, seed)
    const dimple = (1 - smooth(.02, .51, hammer.distance)) * .71
    const tarnish = smooth(.42, .85, patch * .7 + dimple * .3 + wear * .35)
    return [.82 - dimple * (1 - tarnish * .25) + fine * (.065 + tarnish * .12), .61 + .17 * fine - dimple * .26, tarnish * .86]
  },
  steel: ({ u, v, n, seed, wear, fine }) => {
    const brush = valueNoise(u, v, n, seed, 6)
    const scratch = wave(u * 17 + v * 31 + brush) ** 11 * wear
    return [.39 + brush * .42 - scratch * .42 + fine * .09, .38 + brush * .31, scratch * .9]
  },
  copper: ({ u, v, n, seed, wear, patch, fine }) => {
    const pit = cell(u, v, n, seed)
    const stain = smooth(.46, .77, patch * .72 + fine * .28 + .36 * wear)
    const pore = (1 - smooth(.04, .23, pit.distance)) * (.34 + .6 * pit.tone)
    return [.38 - pore * .64 + stain * (.16 + fine * .29), .39 + .34 * fine, stain]
  },
  canvas: ({ u, v, n, wear, fine }) => {
    const warp = wave(u * n), weft = wave(v * n)
    const over = wave((u + v) * n / 2)
    const fray = wear * smooth(.47, .86, fine) * (1 - Math.max(warp, weft))
    const yarn = blend(warp ** .65, weft ** .65, over)
    return [yarn * .76 + fray * .44, .24 + yarn * .55 + fine * .12, fray * 1.55]
  },
  wool: ({ u, v, n, seed, wear, fine }) => {
    const loop = cell(u, v, n, seed)
    const ring = 1 - smooth(.035, .12, Math.abs(loop.distance - .23))
    const pill = (1 - smooth(.03, .20, loop.distance)) * smooth(.55, .95, loop.tone + wear * .3)
    const fleece = valueNoise(u, v, n * 3, seed + 18)
    return [.18 + .38 * ring + pill * .62 + fleece * .19, .32 + ring * .25 + fine * .23, pill * .84]
  },
  'workwear-twill': ({ u, v, n, wear, patch, fine }) => {
    const warp = wave(u * n)
    const weft = wave(v * n)
    const diagonal = wave((v - u) * n / 3)
    const rib = blend(warp, weft * .76, smooth(.38, .85, diagonal)) * (.72 + .28 * diagonal)
    const worn = smooth(.39, .79, patch + .21 * wear) * wear
    return [rib * (1 - worn * .68) + .1 * fine, .21 + rib * .62, worn * (1 - rib * .5) * .52]
  },
}

const patterns = { ...standardPatterns, ...gameplayPatterns }

export function sampleSurface(recipe: SurfaceRecipe, settings: SurfaceSettings) {
  const pattern = patterns[recipe.id]
  const wear = settings.wear ?? recipe.wear.amount
  const { seed, spacing: { cells: n } } = recipe
  return (u: number, v: number) => pattern({
    u, v, n, seed, wear,
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
  return smooth(.18, .89, wide * .44 + patch * .38 + verge * .18 + (wear - .27) * .48)
}
