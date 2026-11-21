import type { GameplaySurfaceId } from './assets/gameplay-surface-recipes.ts'
import { blend, hash, valueNoise, wrap } from './math/noise.ts'
import { cell, fraction, smooth, wave, type Point, type Sample } from './surface-pattern-tools.ts'

function centered(phase: number) {
  return fraction(phase + 0.5) - 0.5
}

function disk(distance: number, radius: number, edge: number) {
  return 1 - smooth(radius - edge, radius, distance)
}

function rim(distance: number, radius: number, width: number) {
  return disk(Math.abs(distance - radius), width, width * 0.7)
}

function ellipse(x: number, y: number, width: number, length: number) {
  return disk(Math.hypot(x / width, y / length), 1, 0.33)
}

function basaltHex(u: number, v: number, n: number, seed: number) {
  const x = u * n, y = v * n
  const a = [centered(x), centered(y) * Math.sqrt(3)]
  const b = [centered(x - 0.5), centered(y - 0.5) * Math.sqrt(3)]
  const offset = Math.hypot(...a) < Math.hypot(...b) ? 0 : 0.5
  const [dx, dy] = offset ? b : a
  const tone = hash(wrap(Math.round(x - offset), n), wrap(Math.round(y - offset), n), seed + offset * 2)
  return { distance: Math.max(Math.abs(dx), Math.abs(dx * 0.5) + Math.abs(dy * 0.866)), tone }
}

export const gameplayPatterns: Record<GameplaySurfaceId, (p: Point) => Sample> = {
  'magnetite-seam': ({ u, v, n, seed, wear, patch, fine }) => {
    const fold = valueNoise(u, v, 3, seed + 13)
    const vein = centered(u * n + v + fold * 1.8 + patch * 0.64 + fine * 0.12)
    const deposit = valueNoise(u + v, v, n, seed + 82, 3)
    const oreWidth = 0.043 + 0.21 * deposit * (wear + 0.26)
    const main = disk(Math.abs(vein), oreWidth, 0.055)
    const fork = disk(Math.abs(vein - 0.14 - 0.13 * patch), 0.047, 0.035) * smooth(0.48, 0.79, deposit)
    const seam = Math.max(main, fork * 0.84) * smooth(0.28, 0.66, deposit + 0.11 * wear)
    const grains = cell(u, v, n * 4, seed, 0.72)
    const chip = smooth(0.013, 0.10, grains.edge) * (0.28 + 0.72 * grains.tone)
    const stain = disk(Math.abs(vein), 0.24 + 0.082 * wear, 0.14) * deposit
    return [0.43 + 0.09 * patch + 0.16 * fine + seam * (chip * 0.47 - 0.24), 0.43 + 0.40 * patch, seam * (0.68 + chip * 0.32) + stain * 0.24]
  },
  'malachite-bloom': ({ u, v, n, seed, wear, patch, fine }) => {
    const nodule = cell(u + 0.012 * fine, v, n, seed)
    const size = 0.34 + 0.19 * nodule.tone - wear * 0.11
    const body = disk(nodule.distance + (fine - 0.5) * 0.10, size, 0.21) * smooth(0.30, 0.70, patch)
    const band = wave(nodule.distance * 10.4 + nodule.tone * 0.74)
    const banding = body * (0.44 + band * 0.56)
    return [0.13 + body * (0.48 + 0.27 * band) + fine * 0.15, 0.19 + body * 0.46 + 0.17 * fine, banding * (0.94 - wear * 0.27)]
  },
  'honey-calcite': ({ u, v, n, seed, wear, patch, fine }) => {
    const crystal = cell(u + v + fine * 0.009, v - patch * 0.022, n, seed, 0.84)
    const face = smooth(-0.08, 0.06, crystal.dx * 0.41 + crystal.dy * 0.77)
    const cleavage = smooth(0.014, 0.085, crystal.edge)
    const bruised = rim(crystal.edge, 0.082, 0.035 + 0.055 * wear) * smooth(0.29, 0.68, fine)
    return [0.14 + cleavage * (0.36 + face * 0.28 + crystal.tone * 0.18) - bruised * 0.12, 0.24 + cleavage * (0.32 + 0.22 * crystal.tone) + 0.14 * face, bruised]
  },
  'columnar-basalt': ({ u, v, n, seed, wear, patch, fine }) => {
    const column = basaltHex(u + (patch - 0.5) * 0.17, v + (fine - 0.5) * 0.014, n, seed)
    const joint = disk(column.distance, 0.49 - 0.07 * wear, 0.035 + 0.032 * wear)
    const crystals = valueNoise(u, v, n * 5, seed + 1)
    const chipped = smooth(0.51, 0.87, 0.63 * patch + 0.37 * fine) * wear
    return [0.05 + joint * (0.63 + 0.26 * column.tone - chipped * 0.45) + fine * 0.04, 0.16 + joint * (0.32 + column.tone * 0.39) + crystals * 0.11, chipped * joint * 0.65]
  },
  'fossil-shell-bed': ({ u, v, n, seed, wear, patch, fine }) => {
    const coiled = cell(u, v, n, seed)
    const angle = Math.atan2(coiled.dy, coiled.dx) / (2 * Math.PI)
    const size = 0.24 + 0.19 * coiled.tone
    const shell = disk(coiled.distance, size, 0.11) * smooth(0.14, 0.59, coiled.tone + wear * 0.22)
    const spiral = wave(coiled.distance * 7.5 - angle) ** 5
    const ribs = wave(angle * 17 + coiled.distance * 3) ** 8
    const relief = shell * (0.35 + spiral * (0.46 + ribs * 0.19))
    return [0.19 + fine * 0.18 + patch * 0.14 + relief * (0.62 + 0.35 * wear), 0.30 + patch * 0.32 + fine * 0.19, relief * 0.95]
  },
  'drowned-mosaic': ({ u, v, n, seed, wear, patch, fine }) => {
    const x = u * n, y = v * n
    const col = wrap(Math.floor(x), n), row = wrap(Math.floor(y), n)
    const dx = (col + 0.5) / n - 0.5, dy = (row + 0.5) / n - 0.5
    const radius = Math.hypot(dx, dy), angle = Math.atan2(dy, dx)
    const design = Number(radius < 0.255 + Math.cos(angle * 8) * 0.125 || Math.max(Math.abs(dx), Math.abs(dy)) > 0.426)
    const chip = hash(col, row, seed)
    const joint = Math.min(0.5 - Math.abs(fraction(x) - 0.5), 0.5 - Math.abs(fraction(y) - 0.5))
    const tile = smooth(0.01, 0.095, joint + (fine - 0.5) * 0.15) * smooth(wear * 0.43, wear * 0.43 + 0.09, chip)
    const silt = smooth(0.44, 0.78, patch * 0.63 + fine * 0.37) * wear
    return [0.06 + tile * (0.61 + chip * 0.21) + silt * 0.24, 0.13 + tile * (0.49 + 0.24 * chip), design * tile * (1 - silt * 0.8)]
  },
  'salt-pan-crust': ({ u, v, n, seed, wear, patch, fine }) => {
    const plate = cell(u + patch * 0.08, v, n, seed)
    const field = smooth(0.016, 0.051, plate.edge) * (0.42 + plate.tone * 0.21)
    const crust = rim(plate.edge, 0.047 + wear * 0.032, 0.036 + 0.034 * wear)
      * smooth(0.24, 0.66, fine * 0.76 + patch * 0.24 + wear * 0.18)
    return [0.18 + field * 0.51 + crust * 0.52 + fine * 0.08, 0.23 + 0.51 * field + fine * 0.16, crust]
  },
  'barnacle-belt': ({ u, v, n, seed, wear, patch, fine }) => {
    const shell = cell(u, v, n, seed)
    const size = 0.21 + 0.20 * shell.tone
    const angle = Math.atan2(shell.dy, shell.dx)
    const ribs = 0.89 + 0.11 * Math.cos(angle * 9 + shell.tone)
    const cone = disk(shell.distance, size * ribs, size * 0.85)
    const mouth = disk(shell.distance, 0.055 + 0.056 * wear, 0.055)
    const edge = rim(shell.distance, 0.075 + 0.033 * wear, 0.045) * cone
    const broken = smooth(0.56, 0.88, 0.51 * patch + 0.49 * fine) * wear
    const crown = cone * (1 - 0.86 * mouth) * (1 - broken * 0.68)
    return [0.14 + crown * 0.91 + fine * 0.11, 0.18 + crown * 0.96 + fine * 0.12, edge * (1 - broken)]
  },
  'wrack-line': ({ u, v, n, seed, wear, patch, fine }) => {
    const swirl = valueNoise(u, v, 6, seed, 3)
    const phase = u * n + n * (0.26 * swirl + 0.12 * wave(v * 3 + patch))
    const curl = 0.25 + 0.75 * smooth(0.32, 0.79, valueNoise(u, v, 9, seed + 4))
    const blade = Math.abs(centered(phase))
    const ribbon = disk(blade, 0.34 - wear * 0.13, 0.09) * curl
    const thinEdge = rim(blade, 0.18, 0.057) * ribbon
    const fleck = smooth(0.72, 0.94, fine) * smooth(0.32, 0.60, patch)
    return [0.12 + ribbon * (0.51 + thinEdge * wear) + fleck * 0.47 + fine * 0.10, 0.31 + fine * 0.33 + thinEdge * 0.28 + fleck * 0.37, ribbon * 0.94]
  },
  'candled-lake-ice': ({ u, v, n, seed, wear, patch, fine }) => {
    const pillar = cell(u + v + 0.03 * patch, v + patch * 0.036, n, seed)
    const crackle = disk(pillar.edge, 0.021 + 0.039 * wear, 0.023)
      * (0.37 + 0.63 * smooth(0.26, 0.64, 0.58 * patch + 0.42 * pillar.tone))
    const fracture = disk(Math.abs(centered(u * 3 + v * 2 + patch * 1.58)), 0.045, 0.032) * wear
    const frost = valueNoise(u, v, n * 3, seed + 3)
    return [0.40 + pillar.tone * 0.097 - crackle * 0.23 - 0.2 * fracture + fine * 0.06, 0.39 + frost * 0.28 + 0.16 * patch, Math.max(fracture * 0.82, crackle * 0.96)]
  },
  'wind-slab-snow': ({ u, v, n, seed, wear, patch, fine }) => {
    const drift = v * n + u * 2 + valueNoise(u, v, 3, seed, 4) * 2.1
    const surface = wave(drift + 0.14 * wave(drift)) ** (1.2 + 2.1 * wear)
    const sastrugi = wave(drift * 4 + 0.35 * patch) * smooth(0.45, 0.9, surface)
    const packed = surface * (0.70 + 0.29 * patch) + sastrugi * wear * 0.21
    return [0.19 + 0.72 * packed + (1 - wear * 0.71) * fine * 0.082, 0.36 + 0.56 * packed + fine * 0.12, 0.24 * (1 - surface)]
  },
  'frost-heaved-ground': ({ u, v, n, seed, wear, patch, fine }) => {
    const stripe = wave(u * n + valueNoise(u, v, 4, seed, 2) * 0.91)
    const stones = cell(u, v, n * 3, seed + 4, 0.3)
    const crown = disk(stones.distance, 0.33 + 0.12 * stones.tone, 0.1) * smooth(0.23, 0.83, stripe)
    const upheaval = stripe ** 2.6 * wear
    return [0.14 + 0.48 * crown + upheaval * 0.42 + fine * 0.11, 0.23 + crown * (0.42 + 0.26 * stones.tone) + patch * 0.14, upheaval * 0.72]
  },
  'lichen-clock': ({ u, v, n, seed, wear, patch, fine }) => {
    const colony = cell(u + 0.043 * patch, v + 0.027 * fine, n, seed)
    const pores = valueNoise(u, v, n * 5, seed + 29)
    const shelter = valueNoise(u, v, 3, seed + 11)
    const damp = smooth(0.34, 0.67, 0.60 * shelter + 0.4 * patch + 0.16 * wear)
    const angle = Math.atan2(colony.dy, colony.dx)
    const frill = 0.027 * Math.cos(angle * 7 + colony.tone * 5) + (pores - 0.5) * 0.12
    const radius = 0.12 + colony.tone * 0.25 + wear * 0.18
    const edgeDistance = colony.distance + frill - radius
    const lobe = disk(colony.distance + frill, radius, 0.085) * damp
    const growth = rim(edgeDistance + 0.045, 0, 0.057) * lobe
    return [0.16 + 0.13 * fine + lobe * (0.14 + growth * 0.18 + pores * 0.22), 0.28 + 0.15 * patch + lobe * (0.31 + 0.21 * pores), growth * (0.20 + 0.56 * colony.tone)]
  },
  'mycelium-threads': ({ u, v, n, seed, wear, patch, fine }) => {
    const scale = 0.034 + 0.046 * wear
    const mold = cell(u + 0.09 * patch, v + 0.04 * fine, n, seed)
    const web = disk(mold.edge, scale, scale * 0.65)
    const forks = cell(u - 0.06 * patch, v + 0.025 * fine, n * 2, seed + 17)
    const tips = disk(forks.edge, scale * 0.87, scale * 0.56) * smooth(0.24, 0.7, 1 - mold.distance)
    const active = smooth(0.36, 0.73, patch + wear * 0.29)
    const thread = Math.max(web, tips * 0.57) * active
    return [0.18 + fine * 0.19 + 0.42 * thread, 0.30 + 0.22 * patch + 0.32 * thread, thread]
  },
  'glow-algae-film': ({ u, v, n, seed, wear, patch, fine }) => {
    const base = cell(u + 0.06 * patch, v, n, seed)
    const film = disk(base.distance, 0.41 - wear * 0.13, 0.23) * smooth(0.17, 0.51, patch + base.tone * 0.37)
    const clusters = cell(u, v, n * 3, seed + 57)
    const spark = disk(clusters.distance, 0.21 - 0.075 * wear, 0.14) * smooth(0.40, 0.79, clusters.tone)
    const glow = Math.max(spark * film * 1.7, film * fine * 0.21)
    return [0.24 + 0.49 * film + fine * 0.10 - wear * 0.08 * spark, 0.22 + 0.64 * film, 0.57 * glow, glow]
  },
  'watermarked-plaster': ({ u, v, n, seed, wear, patch, fine }) => {
    const drift = valueNoise(u, v, 5, seed, 2)
    const level = v * n + (drift - 0.5) * 0.14
    const band = centered(level)
    const strength = hash(wrap(Math.round(level), n), 0, seed)
    const line = disk(Math.abs(band), 0.036 + 0.06 * wear, 0.04) * (0.38 + strength * 0.62)
    const stain = disk(Math.abs(band + 0.15), 0.27, 0.15) * (0.18 + 0.82 * strength) * (0.52 + 0.48 * drift)
    const flakes = cell(u + patch * 0.05, v, n * 4, seed + 7, 0.5)
    const peeled = smooth(0.55 - wear * 0.24, 0.79, flakes.tone * 0.64 + patch * 0.36) * stain
    return [0.35 + fine * 0.14 + line * 0.30 - peeled * 0.74, 0.55 + 0.30 * patch - stain * 0.34, Math.max(peeled * 1.5, line * wear, stain * 0.64)]
  },
  'tarred-caulking': ({ u, v, n, seed, wear, patch, fine }) => {
    const joint = Math.abs(centered(u * n + 0.11 * patch))
    const pitch = disk(joint, 0.15 + 0.08 * patch, 0.07)
    const split = disk(joint, 0.025 + 0.084 * wear, 0.042)
    const tool = wave(v * n * 2 + fine * 0.4) * pitch
    const grain = valueNoise(u, v, n * 5, seed, 3)
    return [0.49 + (1 - pitch) * grain * 0.26 - pitch * 0.22 - split * wear * 0.44 + tool * 0.19, 0.35 + grain * 0.41 + tool * 0.22, pitch * 0.95]
  },
  'salt-blistered-paint': ({ u, v, n, seed, wear, patch, fine }) => {
    const paint = cell(u + 0.042 * patch, v, n, seed)
    const size = 0.26 + paint.tone * 0.18
    const bubble = disk(paint.distance, size, 0.22)
    const flake = disk(paint.distance, size * (0.32 + wear * 0.69), 0.065) * smooth(0.23, 0.72, paint.tone + 0.38 * wear)
    const lip = rim(paint.distance, size * (0.38 + wear * 0.69), 0.05) * bubble
    return [0.34 + bubble * 0.34 + lip * 0.56 - flake * 0.56 + fine * 0.06, 0.44 + bubble * 0.29 + patch * 0.18, flake]
  },
  'stamped-packing-clay': ({ u, v, n, seed, wear, patch, fine }) => {
    const stamp = cell(u, v, n, seed)
    const d = stamp.distance
    const angle = Math.atan2(stamp.dy, stamp.dx)
    const radial = wave(angle * 8 / (2 * Math.PI)) ** 4
    const seal = Math.max(rim(d, 0.29, 0.055), radial * disk(d, 0.22, 0.10), disk(d, 0.09, 0.041))
    const mark = seal * smooth(0.27, 0.64, stamp.tone + 0.19 * patch) * (1 - wear * 0.8)
    const shoulder = rim(d, 0.34, 0.075) * smooth(0.24, 0.65, stamp.tone)
    return [0.40 + shoulder * 0.16 - mark * 0.49 + fine * 0.12, 0.62 + patch * 0.23 - mark * 0.55, shoulder * 0.66]
  },
  'coir-cargo-mat': ({ u, v, n, seed, wear, patch, fine }) => {
    const uBraid = u * n, vBraid = v * n
    const over = wave((uBraid + vBraid) * 0.5)
    const warp = wave(uBraid) ** 0.62, weft = wave(vBraid) ** 0.62
    const rope = blend(warp, weft * 0.89, smooth(0.24, 0.76, over))
    const twist = wave((uBraid + vBraid) * 2 + wave(uBraid - vBraid) * 0.94)
    const crushing = smooth(0.27, 0.79, valueNoise(u, v, 3, seed, 5)) * wear
    const height = rope * (0.71 + 0.17 * twist) * (1 - crushing * 0.73)
    return [0.13 + height + fine * 0.09, 0.20 + 0.63 * height + 0.11 * patch, crushing * (0.68 + 0.2 * fine)]
  },
  'waxed-provision-wrap': ({ u, v, n, seed, wear, patch, fine }) => {
    const sheet = cell(u + v + patch * 0.023, v, n, seed, 0.55)
    const fold = disk(sheet.edge, 0.028 + 0.077 * wear, 0.038)
    const crease = disk(Math.abs(centered(u * n + v * 3 + patch * 0.74)), 0.04, 0.03)
    const whitening = Math.max(fold, crease * 0.7) * smooth(0.26, 0.68, fine + wear * 0.33)
    return [0.40 - fold * 0.36 - crease * 0.13 + sheet.tone * 0.14 + fine * 0.06, 0.56 + patch * 0.23 - crease * 0.23, whitening]
  },
  'rutted-clay': ({ u, v, n, seed, wear, patch, fine }) => {
    const x = centered(u * n + 0.5 + 0.15 * valueNoise(u, v, 2, seed, 4))
    const trench = disk(Math.abs(x), 0.21 + wear * 0.09, 0.14)
    const berm = rim(Math.abs(x), 0.24 + wear * 0.09, 0.13)
    const chevron = wave(v * 12 + Math.abs(x) * 2.7) ** 8 * trench
    const mud = trench * wear
    return [0.44 + 0.19 * berm - 0.51 * mud - chevron * (0.24 + 0.25 * wear) + fine * 0.13, 0.64 + 0.19 * patch - 0.34 * mud, mud * 0.88]
  },
  'hare-crossings': ({ u, v, n, seed, wear, patch, fine }) => {
    const y = fraction(v * n)
    const x = centered(u - 0.05 * wave(v * 2 + 0.41) - 0.04 * patch)
    const yShift = x * 0.1
    const left = ellipse(x + 0.076, y - 0.65 + yShift, 0.045, 0.136)
    const right = ellipse(x - 0.075, y - 0.73 + yShift, 0.045, 0.146)
    const front = Math.max(ellipse(x + 0.035, y - 0.21, 0.033, 0.078), ellipse(x - 0.038, y - 0.38, 0.031, 0.073))
    const claw = ellipse(x + 0.071, y - 0.53, 0.026, 0.066)
    const scuffed = valueNoise(u, v, n * 6, seed)
    const print = Math.max(left, right, front * 0.89, claw * 0.68) * (1 - wear * (0.56 + 0.4 * scuffed))
    return [0.40 - print * 0.61 + fine * 0.13 + patch * 0.13, 0.54 + 0.29 * patch - print * 0.38, print * 0.89]
  },
  'corduroy-track': ({ u, v, n, seed, wear, patch, fine }) => {
    const groove = Math.abs(centered(v * n + (patch - 0.5) * 0.58))
    const exposed = smooth(0.29 + 0.33 * wear, 0.69 + 0.20 * wear, valueNoise(u, v, 5, seed, n))
    const crown = disk(groove, 0.44, 0.32) * exposed
    const grain = valueNoise(u, v, 6, seed + 47, n * 4)
    const rot = disk(groove, 0.11 + 0.15 * patch, 0.07) * grain
    return [0.17 + crown * (0.57 + 0.15 * grain - 0.19 * rot) + fine * 0.14 + patch * 0.12, 0.21 + crown * (0.52 + 0.23 * grain) + patch * 0.14, (1 - exposed) * wear * 0.37]
  },
  'forge-scale': ({ u, v, n, seed, wear, patch, fine }) => {
    const slag = cell(u + 0.027 * patch, v - patch * 0.051, n, seed, 0.94)
    const face = smooth(-0.09, 0.12, slag.dx + slag.dy * 1.4) * (0.37 + 0.63 * slag.tone)
    const flake = smooth(0.012, 0.115, slag.edge) * disk(slag.distance, 0.33 + slag.tone * 0.22, 0.12)
    const oxide = smooth(0.42, 0.80, (1 - flake) * 0.40 + patch * 0.60) * wear
    return [0.13 + flake * (0.72 * face + 0.22) * (1 - oxide * 0.53) + fine * 0.09, 0.23 + flake * 0.42 + face * 0.26, oxide]
  },
  'vesicular-slag': ({ u, v, n, seed, wear, patch, fine }) => {
    const vesicle = cell(u, v, n, seed)
    const small = cell(u + 0.23, v - 0.17, n * 2, seed + 8)
    const size = 0.10 + 0.28 * vesicle.tone + 0.075 * wear
    const collapse = disk(vesicle.distance, size, size * 0.44) * (0.49 + 0.45 * vesicle.tone)
    const bubbles = Math.max(collapse, disk(small.distance, 0.12 + 0.09 * small.tone, 0.09) * 0.43)
    const glass = rim(vesicle.distance, size, 0.07)
    return [0.57 - bubbles * 0.82 + glass * 0.26 + fine * 0.067, 0.49 - 0.44 * bubbles + 0.28 * patch + glass * 0.07, glass * (0.34 + wear * 0.59)]
  },
  'sawdust-drifts': ({ u, v, n, seed, wear, patch, fine }) => {
    const shaving = cell(u, v, n, seed)
    const curled = Math.hypot(shaving.dx, shaving.dy * (1.24 + shaving.tone))
    const curl = rim(curled, 0.19 + 0.1 * shaving.tone, 0.055) * smooth(-0.24, 0.06, shaving.dy + 0.13 * shaving.dx)
    const drift = wave(v * 3 + u * 2 + valueNoise(u, v, 4, seed, 2) * 1.44)
    const settled = smooth(0.25 + 0.48 * wear, 0.68 + 0.25 * wear, drift * 0.71 + patch * 0.29)
    const dust = settled * (0.4 + 0.59 * fine)
    return [0.14 + dust * 0.33 + curl * settled * 0.58 + fine * 0.088, 0.29 + dust * 0.51, settled * curl]
  },
}
