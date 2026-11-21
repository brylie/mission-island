import { hash, valueNoise, wrap } from '../../math/noise.ts'
import { geologySurfaceTuning } from '../recipes/gameplay-surface-tuning-geology.ts'
import { cell, fraction, smooth, wave, type Point, type Sample } from '../surface-pattern-tools.ts'
import { centered, disk, fullTurn, half, rim } from './math.ts'

const hexAspectSquared = 3
const hexRowAspect = Math.sqrt(hexAspectSquared)
const hexDiagonalSlope = 0.866
const hexLatticeCount = 2

function basaltHex(u: number, v: number, n: number, seed: number) {
  const x = u * n, y = v * n
  const a = [centered(x), centered(y) * hexRowAspect]
  const b = [centered(x - half), centered(y - half) * hexRowAspect]
  const offset = Math.hypot(...a) < Math.hypot(...b) ? 0 : half
  const [dx, dy] = offset ? b : a
  const tone = hash(wrap(Math.round(x - offset), n), wrap(Math.round(y - offset), n), seed + offset * hexLatticeCount)
  return { distance: Math.max(Math.abs(dx), Math.abs(dx * half) + Math.abs(dy * hexDiagonalSlope)), tone }
}

export const geologyPatterns = {
  'magnetite-seam': ({ u, v, n, seed, wear, patch, fine }) => {
    const style = geologySurfaceTuning['magnetite-seam']
    const fold = valueNoise(u, v, style.fold.frequency, seed + style.fold.seedOffset)
    const vein = centered(u * n + v + fold * style.vein.foldWarp + patch * style.vein.patchWarp + fine * style.vein.fineWarp)
    const deposit = valueNoise(u + v, v, n, seed + style.deposit.seedOffset, style.deposit.verticalFrequency)
    const oreWidth = style.ore.baseWidth + style.ore.depositWidth * deposit * (wear + style.ore.baseExposure)
    const main = disk(Math.abs(vein), oreWidth, style.ore.edgeSoftness)
    const fork = disk(Math.abs(vein - style.fork.offset - style.fork.patchWarp * patch), style.fork.width, style.fork.edgeSoftness)
      * smooth(style.fork.depositLow, style.fork.depositHigh, deposit)
    const seam = Math.max(main, fork * style.fork.strength) * smooth(style.seam.depositLow, style.seam.depositHigh, deposit + style.seam.wearExposure * wear)
    const grains = cell(u, v, n * style.grain.frequency, seed, style.grain.facet)
    const chip = smooth(style.chip.edgeLow, style.chip.edgeHigh, grains.edge) * (style.chip.baseTone + style.chip.toneVariation * grains.tone)
    const stain = disk(Math.abs(vein), style.stain.baseWidth + style.stain.wearWidth * wear, style.stain.edgeSoftness) * deposit
    return [
      style.height.base + style.height.patch * patch + style.height.fine * fine + seam * (chip * style.height.chip - style.height.seamDepth),
      style.tone.base + style.tone.patch * patch,
      seam * (style.accent.seam + chip * style.accent.chip) + stain * style.accent.stain,
    ]
  },
  'malachite-bloom': ({ u, v, n, seed, wear, patch, fine }) => {
    const style = geologySurfaceTuning['malachite-bloom']
    const nodule = cell(u + style.nodule.fineWarp * fine, v, n, seed)
    const size = style.nodule.baseRadius + style.nodule.toneRadius * nodule.tone - wear * style.nodule.wearLoss
    const body = disk(nodule.distance + (fine - half) * style.nodule.fineEdge, size, style.nodule.edgeSoftness) * smooth(style.nodule.patchLow, style.nodule.patchHigh, patch)
    const band = wave(nodule.distance * style.ring.frequency + nodule.tone * style.ring.tonePhase)
    const banding = body * (style.ring.baseWeight + band * style.ring.variation)
    return [
      style.height.base + body * (style.height.body + style.height.ring * band) + fine * style.height.fine,
      style.tone.base + body * style.tone.body + style.tone.fine * fine,
      banding * (style.accent.base - wear * style.accent.wearLoss),
    ]
  },
  'honey-calcite': ({ u, v, n, seed, wear, patch, fine }) => {
    const style = geologySurfaceTuning['honey-calcite']
    const crystal = cell(u + v + fine * style.crystal.fineWarp, v - patch * style.crystal.patchWarp, n, seed, style.crystal.facet)
    const face = smooth(style.face.low, style.face.high, crystal.dx * style.face.xSlope + crystal.dy * style.face.ySlope)
    const cleavage = smooth(style.cleavage.edgeLow, style.cleavage.edgeHigh, crystal.edge)
    const bruised = rim(crystal.edge, style.bruise.radius, style.bruise.baseWidth + style.bruise.wearWidth * wear) * smooth(style.bruise.fineLow, style.bruise.fineHigh, fine)
    return [
      style.height.base + cleavage * (style.height.cleavage + face * style.height.face + crystal.tone * style.height.crystalTone) - bruised * style.height.bruiseDepth,
      style.tone.base + cleavage * (style.tone.cleavage + style.tone.crystalTone * crystal.tone) + style.tone.face * face,
      bruised,
    ]
  },
  'columnar-basalt': ({ u, v, n, seed, wear, patch, fine }) => {
    const style = geologySurfaceTuning['columnar-basalt']
    const column = basaltHex(u + (patch - half) * style.column.patchWarp, v + (fine - half) * style.column.fineWarp, n, seed)
    const joint = disk(column.distance, style.joint.baseRadius - style.joint.wearLoss * wear, style.joint.baseSoftness + style.joint.wearSoftness * wear)
    const crystals = valueNoise(u, v, n * style.crystals.frequency, seed + 1)
    const chipped = smooth(style.chip.low, style.chip.high, style.chip.patch * patch + style.chip.fine * fine) * wear
    return [
      style.height.base + joint * (style.height.joint + style.height.columnTone * column.tone - chipped * style.height.chipDepth) + fine * style.height.fine,
      style.tone.base + joint * (style.tone.joint + column.tone * style.tone.columnTone) + crystals * style.tone.crystals,
      chipped * joint * style.accent.chips,
    ]
  },
  'fossil-shell-bed': ({ u, v, n, seed, wear, patch, fine }) => {
    const style = geologySurfaceTuning['fossil-shell-bed']
    const coiled = cell(u, v, n, seed)
    const angle = Math.atan2(coiled.dy, coiled.dx) / fullTurn
    const size = style.shell.baseRadius + style.shell.toneRadius * coiled.tone
    const shell = disk(coiled.distance, size, style.shell.edgeSoftness)
      * smooth(style.shell.exposureLow, style.shell.exposureHigh, coiled.tone + wear * style.shell.wearExposure)
    const spiral = wave(coiled.distance * style.spiral.frequency - angle) ** style.spiral.sharpness
    const ribs = wave(angle * style.rib.count + coiled.distance * style.rib.radialFrequency) ** style.rib.sharpness
    const relief = shell * (style.relief.base + spiral * (style.relief.spiral + ribs * style.relief.rib))
    return [
      style.height.base + fine * style.height.fine + patch * style.height.patch + relief * (style.height.shell + style.height.wearLift * wear),
      style.tone.base + patch * style.tone.patch + fine * style.tone.fine,
      relief * style.accent.shell,
    ]
  },
  'drowned-mosaic': ({ u, v, n, seed, wear, patch, fine }) => {
    const style = geologySurfaceTuning['drowned-mosaic']
    const x = u * n, y = v * n
    const col = wrap(Math.floor(x), n), row = wrap(Math.floor(y), n)
    const dx = (col + half) / n - half, dy = (row + half) / n - half
    const radius = Math.hypot(dx, dy), angle = Math.atan2(dy, dx)
    const design = Number(radius < style.star.radius + Math.cos(angle * style.star.points) * style.star.reach || Math.max(Math.abs(dx), Math.abs(dy)) > style.star.border)
    const chip = hash(col, row, seed)
    const joint = Math.min(half - Math.abs(fraction(x) - half), half - Math.abs(fraction(y) - half))
    const chipThreshold = wear * style.tile.wearLoss
    const tile = smooth(style.tile.jointLow, style.tile.jointHigh, joint + (fine - half) * style.tile.fineWarp)
      * smooth(chipThreshold, chipThreshold + style.tile.chipFade, chip)
    const silt = smooth(style.silt.low, style.silt.high, patch * style.silt.patch + fine * style.silt.fine) * wear
    return [
      style.height.base + tile * (style.height.tile + chip * style.height.chip) + silt * style.height.silt,
      style.tone.base + tile * (style.tone.tile + style.tone.chip * chip),
      design * tile * (1 - silt * style.accent.siltMask),
    ]
  },
  'salt-pan-crust': ({ u, v, n, seed, wear, patch, fine }) => {
    const style = geologySurfaceTuning['salt-pan-crust']
    const plate = cell(u + patch * style.plate.patchWarp, v, n, seed)
    const field = smooth(style.field.edgeLow, style.field.edgeHigh, plate.edge) * (style.field.baseWeight + plate.tone * style.field.toneWeight)
    const crust = rim(plate.edge, style.crust.baseRadius + wear * style.crust.wearRadius, style.crust.baseWidth + style.crust.wearWidth * wear)
      * smooth(style.crust.maskLow, style.crust.maskHigh, fine * style.crust.fine + patch * style.crust.patch + wear * style.crust.wear)
    return [
      style.height.base + field * style.height.field + crust * style.height.crust + fine * style.height.fine,
      style.tone.base + style.tone.field * field + fine * style.tone.fine,
      crust,
    ]
  },
  'barnacle-belt': ({ u, v, n, seed, wear, patch, fine }) => {
    const style = geologySurfaceTuning['barnacle-belt']
    const shell = cell(u, v, n, seed)
    const size = style.shell.baseRadius + style.shell.toneRadius * shell.tone
    const angle = Math.atan2(shell.dy, shell.dx)
    const ribs = style.rib.baseRadius + style.rib.amplitude * Math.cos(angle * style.rib.count + shell.tone)
    const cone = disk(shell.distance, size * ribs, size * style.shell.edgeSoftness)
    const mouth = disk(shell.distance, style.mouth.baseRadius + style.mouth.wearRadius * wear, style.mouth.edgeSoftness)
    const edge = rim(shell.distance, style.lip.baseRadius + style.lip.wearRadius * wear, style.lip.width) * cone
    const broken = smooth(style.breakage.low, style.breakage.high, style.breakage.patch * patch + style.breakage.fine * fine) * wear
    const crown = cone * (1 - style.crown.mouthDepth * mouth) * (1 - broken * style.crown.breakageLoss)
    return [
      style.height.base + crown * style.height.crown + fine * style.height.fine,
      style.tone.base + crown * style.tone.crown + fine * style.tone.fine,
      edge * (1 - broken),
    ]
  },
  'wrack-line': ({ u, v, n, seed, wear, patch, fine }) => {
    const style = geologySurfaceTuning['wrack-line']
    const swirl = valueNoise(u, v, style.swirl.frequency, seed, style.swirl.verticalFrequency)
    const phase = u * n + n * (style.phase.swirl * swirl + style.phase.wave * wave(v * style.phase.waveFrequency + patch))
    const curl = style.curl.base + style.curl.variation * smooth(style.curl.low, style.curl.high, valueNoise(u, v, style.curl.frequency, seed + style.curl.seedOffset))
    const blade = Math.abs(centered(phase))
    const ribbon = disk(blade, style.ribbon.baseRadius - wear * style.ribbon.wearLoss, style.ribbon.edgeSoftness) * curl
    const thinEdge = rim(blade, style.edge.radius, style.edge.width) * ribbon
    const fleck = smooth(style.fleck.fineLow, style.fleck.fineHigh, fine) * smooth(style.fleck.patchLow, style.fleck.patchHigh, patch)
    return [
      style.height.base + ribbon * (style.height.ribbon + thinEdge * wear) + fleck * style.height.fleck + fine * style.height.fine,
      style.tone.base + fine * style.tone.fine + thinEdge * style.tone.edge + fleck * style.tone.fleck,
      ribbon * style.accent.ribbon,
    ]
  },
} satisfies Record<string, (p: Point) => Sample>
