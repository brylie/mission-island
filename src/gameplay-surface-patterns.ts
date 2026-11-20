import type { GameplaySurfaceId } from './gameplay-surface-recipes.ts'
import { blend, hash, valueNoise, wrap } from './surface-noise.ts'
import { cell, fraction, smooth, wave, type Point, type Sample } from './surface-pattern-tools.ts'

function centered(phase: number) {
  return fraction(phase + .5) - .5
}

function disk(distance: number, radius: number, edge: number) {
  return 1 - smooth(radius - edge, radius, distance)
}

function rim(distance: number, radius: number, width: number) {
  return disk(Math.abs(distance - radius), width, width * .7)
}

function ellipse(x: number, y: number, width: number, length: number) {
  return disk(Math.hypot(x / width, y / length), 1, .33)
}

function basaltHex(u: number, v: number, n: number, seed: number) {
  const x = u * n, y = v * n
  const a = [centered(x), centered(y) * Math.sqrt(3)]
  const b = [centered(x - .5), centered(y - .5) * Math.sqrt(3)]
  const offset = Math.hypot(...a) < Math.hypot(...b) ? 0 : .5
  const [dx, dy] = offset ? b : a
  const tone = hash(wrap(Math.round(x - offset), n), wrap(Math.round(y - offset), n), seed + offset * 2)
  return { distance: Math.max(Math.abs(dx), Math.abs(dx * .5) + Math.abs(dy * .866)), tone }
}

export const gameplayPatterns: Record<GameplaySurfaceId, (p: Point) => Sample> = {
  'magnetite-seam': ({ u, v, n, seed, wear, patch, fine }) => {
    const vein = centered(u * n + v + patch * .82 + fine * .095)
    const deposit = valueNoise(u + v, v, n, seed + 82, 3)
    const oreWidth = .043 + .21 * deposit * (wear + .26)
    const main = disk(Math.abs(vein), oreWidth, .055)
    const fork = disk(Math.abs(vein - .14 - .13 * patch), .047, .035) * smooth(.48, .79, deposit)
    const seam = Math.max(main, fork * .84) * smooth(.10, .47, deposit + .14 * wear)
    const grains = cell(u, v, n * 4, seed, .72)
    const chip = smooth(.013, .10, grains.edge) * (.28 + .72 * grains.tone)
    const stain = disk(Math.abs(vein), .24 + .082 * wear, .14) * deposit
    return [.43 + .09 * patch + .16 * fine + seam * (chip * .47 - .24),
      .43 + .40 * patch, seam * (.68 + chip * .32) + stain * .24]
  },
  'malachite-bloom': ({ u, v, n, seed, wear, fine }) => {
    const nodule = cell(u + .012 * fine, v, n, seed)
    const size = .34 + .19 * nodule.tone - wear * .11
    const body = disk(nodule.distance, size, .24)
    const band = wave(nodule.distance * 10.4 + nodule.tone * .74)
    const banding = body * (.44 + band * .56)
    return [.13 + body * (.48 + .27 * band) + fine * .15,
      .19 + body * .46 + .17 * fine, banding * (.94 - wear * .27)]
  },
  'honey-calcite': ({ u, v, n, seed, wear, patch, fine }) => {
    const crystal = cell(u + v + fine * .009, v - patch * .022, n, seed, .84)
    const face = smooth(-.08, .06, crystal.dx * .41 + crystal.dy * .77)
    const cleavage = smooth(.014, .085, crystal.edge)
    const bruised = rim(crystal.edge, .082, .035 + .055 * wear) * smooth(.29, .68, fine)
    return [.14 + cleavage * (.36 + face * .28 + crystal.tone * .18) - bruised * .12,
      .24 + cleavage * (.32 + .22 * crystal.tone) + .14 * face, bruised]
  },
  'columnar-basalt': ({ u, v, n, seed, wear, patch, fine }) => {
    const column = basaltHex(u + (patch - .5) * .17, v + (fine - .5) * .014, n, seed)
    const joint = disk(column.distance, .49 - .07 * wear, .035 + .032 * wear)
    const crystals = valueNoise(u, v, n * 5, seed + 1)
    const chipped = smooth(.51, .87, .63 * patch + .37 * fine) * wear
    return [.05 + joint * (.63 + .26 * column.tone - chipped * .45) + fine * .04,
      .16 + joint * (.32 + column.tone * .39) + crystals * .11, chipped * joint * .65]
  },
  'fossil-shell-bed': ({ u, v, n, seed, wear, patch, fine }) => {
    const coiled = cell(u, v, n, seed)
    const angle = Math.atan2(coiled.dy, coiled.dx) / (2 * Math.PI)
    const size = .24 + .19 * coiled.tone
    const shell = disk(coiled.distance, size, .11) * smooth(.14, .59, coiled.tone + wear * .22)
    const spiral = wave(coiled.distance * 7.5 - angle) ** 5
    const ribs = wave(angle * 17 + coiled.distance * 3) ** 8
    const relief = shell * (.35 + spiral * (.46 + ribs * .19))
    return [.19 + fine * .18 + patch * .14 + relief * (.62 + .35 * wear),
      .30 + patch * .32 + fine * .19, relief * .95]
  },
  'drowned-mosaic': ({ u, v, n, seed, wear, patch, fine }) => {
    const x = u * n, y = v * n
    const col = wrap(Math.floor(x), n), row = wrap(Math.floor(y), n)
    const dx = (col + .5) / n - .5, dy = (row + .5) / n - .5
    const radius = Math.hypot(dx, dy), angle = Math.atan2(dy, dx)
    const design = Number(radius < .255 + Math.cos(angle * 8) * .125 || Math.max(Math.abs(dx), Math.abs(dy)) > .426)
    const chip = hash(col, row, seed)
    const joint = Math.min(.5 - Math.abs(fraction(x) - .5), .5 - Math.abs(fraction(y) - .5))
    const tile = smooth(.01, .095, joint + (fine - .5) * .15) * smooth(wear * .43, wear * .43 + .09, chip)
    const silt = smooth(.44, .78, patch * .63 + fine * .37) * wear
    return [.06 + tile * (.61 + chip * .21) + silt * .24, .13 + tile * (.49 + .24 * chip),
      design * tile * (1 - silt * .8)]
  },
  'salt-pan-crust': ({ u, v, n, seed, wear, patch, fine }) => {
    const plate = cell(u + patch * .08, v, n, seed)
    const field = smooth(.016, .051, plate.edge) * (.42 + plate.tone * .21)
    const crust = rim(plate.edge, .047 + wear * .032, .036 + .034 * wear) *
      smooth(.24, .66, fine * .76 + patch * .24 + wear * .18)
    return [.18 + field * .51 + crust * .52 + fine * .08, .23 + .51 * field + fine * .16, crust]
  },
  'barnacle-belt': ({ u, v, n, seed, wear, patch, fine }) => {
    const shell = cell(u, v, n, seed)
    const size = .21 + .20 * shell.tone
    const angle = Math.atan2(shell.dy, shell.dx)
    const ribs = .89 + .11 * Math.cos(angle * 9 + shell.tone)
    const cone = disk(shell.distance, size * ribs, size * .85)
    const mouth = disk(shell.distance, .055 + .056 * wear, .055)
    const edge = rim(shell.distance, .075 + .033 * wear, .045) * cone
    const broken = smooth(.56, .88, .51 * patch + .49 * fine) * wear
    const crown = cone * (1 - .86 * mouth) * (1 - broken * .68)
    return [.14 + crown * .91 + fine * .11, .18 + crown * .96 + fine * .12, edge * (1 - broken)]
  },
  'wrack-line': ({ u, v, n, seed, wear, patch, fine }) => {
    const swirl = valueNoise(u, v, 6, seed, 3)
    const phase = u * n + n * (.26 * swirl + .12 * wave(v * 3 + patch))
    const curl = .25 + .75 * smooth(.32, .79, valueNoise(u, v, 9, seed + 4))
    const blade = Math.abs(centered(phase))
    const ribbon = disk(blade, .34 - wear * .13, .09) * curl
    const thinEdge = rim(blade, .18, .057) * ribbon
    const fleck = smooth(.72, .94, fine) * smooth(.32, .60, patch)
    return [.12 + ribbon * (.51 + thinEdge * wear) + fleck * .47 + fine * .10,
      .31 + fine * .33 + thinEdge * .28 + fleck * .37, ribbon * .94]
  },
  'candled-lake-ice': ({ u, v, n, seed, wear, patch, fine }) => {
    const pillar = cell(u + v + .03 * patch, v + patch * .036, n, seed)
    const crackle = disk(pillar.edge, .021 + .039 * wear, .023) *
      (.37 + .63 * smooth(.26, .64, .58 * patch + .42 * pillar.tone))
    const fracture = disk(Math.abs(centered(u * 3 + v * 2 + patch * 1.58)), .045, .032) * wear
    const frost = valueNoise(u, v, n * 3, seed + 3)
    return [.40 + pillar.tone * .097 - crackle * .23 - .2 * fracture + fine * .06,
      .39 + frost * .28 + .16 * patch, Math.max(fracture * .82, crackle * .96)]
  },
  'wind-slab-snow': ({ u, v, n, seed, wear, patch, fine }) => {
    const drift = v * n + u * 2 + valueNoise(u, v, 3, seed, 4) * 2.1
    const surface = wave(drift + .14 * wave(drift)) ** (1.2 + 2.1 * wear)
    const sastrugi = wave(drift * 4 + .35 * patch) * smooth(.45, .9, surface)
    const packed = surface * (.70 + .29 * patch) + sastrugi * wear * .21
    return [.19 + .72 * packed + (1 - wear * .71) * fine * .082,
      .36 + .56 * packed + fine * .12, .24 * (1 - surface)]
  },
  'frost-heaved-ground': ({ u, v, n, seed, wear, patch, fine }) => {
    const stripe = wave(u * n + valueNoise(u, v, 4, seed, 2) * .91)
    const stones = cell(u, v, n * 3, seed + 4, .3)
    const crown = disk(stones.distance, .33 + .12 * stones.tone, .1) * smooth(.23, .83, stripe)
    const upheaval = stripe ** 2.6 * wear
    return [.14 + .48 * crown + upheaval * .42 + fine * .11,
      .23 + crown * (.42 + .26 * stones.tone) + patch * .14, upheaval * .72]
  },
  'lichen-clock': ({ u, v, n, seed, wear, patch, fine }) => {
    const colony = cell(u, v, n, seed)
    const angle = Math.atan2(colony.dy, colony.dx)
    const frill = Math.cos(angle * 11 + colony.tone * 7) * .05 + (fine - .5) * .07
    const radius = .29 + colony.tone * .17 + wear * .13
    const lobe = disk(colony.distance + frill, radius, .08) * smooth(.12, .46, colony.tone + .25 * wear)
    const edge = rim(colony.distance + frill, radius - .09, .082) * lobe
    const pores = valueNoise(u, v, n * 5, seed + 29)
    return [.12 + lobe * (.32 + edge * .24 + pores * .32) + fine * .11,
      .23 + .65 * lobe + .08 * patch, edge * (.55 + .39 * colony.tone)]
  },
  'mycelium-threads': ({ u, v, n, seed, wear, patch, fine }) => {
    const scale = .034 + .046 * wear
    const mold = cell(u + .09 * patch, v + .04 * fine, n, seed)
    const web = disk(mold.edge, scale, scale * .65)
    const forks = cell(u - .06 * patch, v + .025 * fine, n * 2, seed + 17)
    const tips = disk(forks.edge, scale * .87, scale * .56) * smooth(.24, .7, 1 - mold.distance)
    const active = smooth(.36, .73, patch + wear * .29)
    const thread = Math.max(web, tips * .57) * active
    return [.18 + fine * .19 + .42 * thread, .30 + .22 * patch + .32 * thread, thread]
  },
  'glow-algae-film': ({ u, v, n, seed, wear, patch, fine }) => {
    const base = cell(u + .06 * patch, v, n, seed)
    const film = disk(base.distance, .41 - wear * .13, .23) * smooth(.17, .51, patch + base.tone * .37)
    const clusters = cell(u, v, n * 3, seed + 57)
    const spark = disk(clusters.distance, .21 - .075 * wear, .14) * smooth(.40, .79, clusters.tone)
    const glow = Math.max(spark * film * 1.7, film * fine * .21)
    return [.24 + .49 * film + fine * .10 - wear * .08 * spark, .22 + .64 * film,
      .57 * glow, glow]
  },
  'watermarked-plaster': ({ u, v, n, seed, wear, patch, fine }) => {
    const drift = valueNoise(u, v, 5, seed, 2)
    const level = v * n + (drift - .5) * .14
    const band = centered(level)
    const strength = hash(wrap(Math.round(level), n), 0, seed)
    const line = disk(Math.abs(band), .036 + .06 * wear, .04) * (.38 + strength * .62)
    const stain = disk(Math.abs(band + .15), .27, .15) * (.18 + .82 * strength) * (.52 + .48 * drift)
    const flakes = cell(u + patch * .05, v, n * 4, seed + 7, .5)
    const peeled = smooth(.55 - wear * .24, .79, flakes.tone * .64 + patch * .36) * stain
    return [.35 + fine * .14 + line * .30 - peeled * .74,
      .55 + .30 * patch - stain * .34, Math.max(peeled * 1.5, line * wear, stain * .64)]
  },
  'tarred-caulking': ({ u, v, n, seed, wear, patch, fine }) => {
    const joint = Math.abs(centered(u * n + .11 * patch))
    const pitch = disk(joint, .15 + .08 * patch, .07)
    const split = disk(joint, .025 + .084 * wear, .042)
    const tool = wave(v * n * 2 + fine * .4) * pitch
    const grain = valueNoise(u, v, n * 5, seed, 3)
    return [.49 + (1 - pitch) * grain * .26 - pitch * .22 - split * wear * .44 + tool * .19,
      .35 + grain * .41 + tool * .22, pitch * .95]
  },
  'salt-blistered-paint': ({ u, v, n, seed, wear, patch, fine }) => {
    const paint = cell(u + .042 * patch, v, n, seed)
    const size = .26 + paint.tone * .18
    const bubble = disk(paint.distance, size, .22)
    const flake = disk(paint.distance, size * (.32 + wear * .69), .065) * smooth(.23, .72, paint.tone + .38 * wear)
    const lip = rim(paint.distance, size * (.38 + wear * .69), .05) * bubble
    return [.34 + bubble * .34 + lip * .56 - flake * .56 + fine * .06,
      .44 + bubble * .29 + patch * .18, flake]
  },
  'stamped-packing-clay': ({ u, v, n, seed, wear, patch, fine }) => {
    const stamp = cell(u, v, n, seed)
    const d = stamp.distance
    const angle = Math.atan2(stamp.dy, stamp.dx)
    const radial = wave(angle * 8 / (2 * Math.PI)) ** 4
    const seal = Math.max(rim(d, .29, .055), radial * disk(d, .22, .10), disk(d, .09, .041))
    const mark = seal * smooth(.27, .64, stamp.tone + .19 * patch) * (1 - wear * .8)
    const shoulder = rim(d, .34, .075) * smooth(.24, .65, stamp.tone)
    return [.40 + shoulder * .16 - mark * .49 + fine * .12,
      .62 + patch * .23 - mark * .55, shoulder * .66]
  },
  'coir-cargo-mat': ({ u, v, n, seed, wear, patch, fine }) => {
    const uBraid = u * n, vBraid = v * n
    const over = wave((uBraid + vBraid) * .5)
    const warp = wave(uBraid) ** .62, weft = wave(vBraid) ** .62
    const rope = blend(warp, weft * .89, smooth(.24, .76, over))
    const twist = wave((uBraid + vBraid) * 2 + wave(uBraid - vBraid) * .94)
    const crushing = smooth(.27, .79, valueNoise(u, v, 3, seed, 5)) * wear
    const height = rope * (.71 + .17 * twist) * (1 - crushing * .73)
    return [.13 + height + fine * .09, .20 + .63 * height + .11 * patch, crushing * (.68 + .2 * fine)]
  },
  'waxed-provision-wrap': ({ u, v, n, seed, wear, patch, fine }) => {
    const sheet = cell(u + v + patch * .023, v, n, seed, .55)
    const fold = disk(sheet.edge, .028 + .077 * wear, .038)
    const crease = disk(Math.abs(centered(u * n + v * 3 + patch * .74)), .04, .03)
    const whitening = Math.max(fold, crease * .7) * smooth(.26, .68, fine + wear * .33)
    return [.40 - fold * .36 - crease * .13 + sheet.tone * .14 + fine * .06,
      .56 + patch * .23 - crease * .23, whitening]
  },
  'rutted-clay': ({ u, v, n, seed, wear, patch, fine }) => {
    const x = centered(u * n + .5 + .15 * valueNoise(u, v, 2, seed, 4))
    const trench = disk(Math.abs(x), .21 + wear * .09, .14)
    const berm = rim(Math.abs(x), .24 + wear * .09, .13)
    const chevron = wave(v * 12 + Math.abs(x) * 2.7) ** 8 * trench
    const mud = trench * wear
    return [.44 + .19 * berm - .51 * mud - chevron * (.24 + .25 * wear) + fine * .13,
      .64 + .19 * patch - .34 * mud, mud * .88]
  },
  'hare-crossings': ({ u, v, n, seed, wear, patch, fine }) => {
    const y = fraction(v * n)
    const x = centered(u - .05 * wave(v * 2 + .41) - .04 * patch)
    const yShift = x * .1
    const left = ellipse(x + .076, y - .65 + yShift, .045, .136)
    const right = ellipse(x - .075, y - .73 + yShift, .045, .146)
    const front = Math.max(ellipse(x + .035, y - .21, .033, .078), ellipse(x - .038, y - .38, .031, .073))
    const claw = ellipse(x + .071, y - .53, .026, .066)
    const scuffed = valueNoise(u, v, n * 6, seed)
    const print = Math.max(left, right, front * .89, claw * .68) * (1 - wear * (.56 + .4 * scuffed))
    return [.40 - print * .61 + fine * .13 + patch * .13, .54 + .29 * patch - print * .38, print * .89]
  },
  'corduroy-track': ({ u, v, n, seed, wear, patch, fine }) => {
    const groove = Math.abs(centered(v * n + (patch - .5) * .58))
    const exposed = smooth(.29 + .33 * wear, .69 + .20 * wear, valueNoise(u, v, 5, seed, n))
    const crown = disk(groove, .44, .32) * exposed
    const grain = valueNoise(u, v, 6, seed + 47, n * 4)
    const rot = disk(groove, .11 + .15 * patch, .07) * grain
    return [.17 + crown * (.57 + .15 * grain - .19 * rot) + fine * .14 + patch * .12,
      .21 + crown * (.52 + .23 * grain) + patch * .14, (1 - exposed) * wear * .37]
  },
  'forge-scale': ({ u, v, n, seed, wear, patch, fine }) => {
    const slag = cell(u + .027 * patch, v - patch * .051, n, seed, .94)
    const face = smooth(-.09, .12, slag.dx + slag.dy * 1.4) * (.37 + .63 * slag.tone)
    const flake = smooth(.012, .115, slag.edge) * disk(slag.distance, .33 + slag.tone * .22, .12)
    const oxide = smooth(.42, .80, (1 - flake) * .40 + patch * .60) * wear
    return [.13 + flake * (.72 * face + .22) * (1 - oxide * .53) + fine * .09,
      .23 + flake * .42 + face * .26, oxide]
  },
  'vesicular-slag': ({ u, v, n, seed, wear, patch, fine }) => {
    const vesicle = cell(u, v, n, seed)
    const small = cell(u + .23, v - .17, n * 2, seed + 8)
    const size = .10 + .28 * vesicle.tone + .075 * wear
    const collapse = disk(vesicle.distance, size, size * .44) * (.49 + .45 * vesicle.tone)
    const bubbles = Math.max(collapse, disk(small.distance, .12 + .09 * small.tone, .09) * .43)
    const glass = rim(vesicle.distance, size, .07)
    return [.57 - bubbles * .82 + glass * .26 + fine * .067,
      .49 - .44 * bubbles + .28 * patch + glass * .07, glass * (.34 + wear * .59)]
  },
  'sawdust-drifts': ({ u, v, n, seed, wear, patch, fine }) => {
    const shaving = cell(u, v, n, seed)
    const curled = Math.hypot(shaving.dx, shaving.dy * (1.24 + shaving.tone))
    const curl = rim(curled, .19 + .1 * shaving.tone, .055) * smooth(-.24, .06, shaving.dy + .13 * shaving.dx)
    const drift = wave(v * 3 + u * 2 + valueNoise(u, v, 4, seed, 2) * 1.44)
    const settled = smooth(.25 + .48 * wear, .68 + .25 * wear, drift * .71 + patch * .29)
    const dust = settled * (.4 + .59 * fine)
    return [.14 + dust * .33 + curl * settled * .58 + fine * .088, .29 + dust * .51, settled * curl]
  },
}
