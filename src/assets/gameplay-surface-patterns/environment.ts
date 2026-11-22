import { valueNoise } from '../../math/noise.ts'
import { environmentSurfaceTuning } from '../recipes/gameplay-surface-tuning-environment.ts'
import { cell, fraction, smooth, wave, type Point, type Sample } from '../surface-pattern-tools.ts'
import { centered, disk, half, rim } from './math.ts'

const ellipseEdgeSoftness = 0.33

function ellipse(x: number, y: number, width: number, length: number) {
  return disk(Math.hypot(x / width, y / length), 1, ellipseEdgeSoftness)
}

export const environmentPatterns = {
  'candled-lake-ice': ({ u, v, n, seed, wear, patch, fine }) => {
    const style = environmentSurfaceTuning['candled-lake-ice']
    const pillar = cell(u + v + style.pillar.uWarp * patch, v + patch * style.pillar.vWarp, n, seed)
    const patchTone = style.crackle.patchMix * patch + style.crackle.pillarMix * pillar.tone
    const crackle = disk(pillar.edge, style.crackle.baseRadius + style.crackle.wearRadius * wear, style.crackle.edgeSoftness)
      * (style.crackle.baseWeight + style.crackle.variation * smooth(style.crackle.patchLow, style.crackle.patchHigh, patchTone))
    const fracturePhase = u * style.fracture.uFrequency + v * style.fracture.vFrequency + patch * style.fracture.patchPhase
    const fracture = disk(Math.abs(centered(fracturePhase)), style.fracture.radius, style.fracture.edgeSoftness) * wear
    const frost = valueNoise(u, v, n * style.frost.frequency, seed + style.frost.seedOffset)
    return [
      style.height.base + pillar.tone * style.height.pillarTone - crackle * style.height.crackleDepth - style.height.fractureDepth * fracture + fine * style.height.fine,
      style.tone.base + frost * style.tone.frost + style.tone.patch * patch,
      Math.max(fracture * style.accent.fracture, crackle * style.accent.crackle),
    ]
  },
  'wind-slab-snow': ({ u, v, n, seed, wear, patch, fine }) => {
    const style = environmentSurfaceTuning['wind-slab-snow']
    const drift = v * n + u * style.drift.crossFrequency + valueNoise(u, v, style.drift.noiseFrequency, seed, style.drift.verticalFrequency) * style.drift.noiseWarp
    const surface = wave(drift + style.surface.warp * wave(drift)) ** (style.surface.baseSharpness + style.surface.wearSharpness * wear)
    const sastrugi = wave(drift * style.ridge.frequency + style.ridge.patchPhase * patch) * smooth(style.ridge.surfaceLow, style.ridge.surfaceHigh, surface)
    const packed = surface * (style.packing.base + style.packing.patch * patch) + sastrugi * wear * style.packing.ridgeWear
    return [
      style.height.base + style.height.packed * packed + (1 - wear * style.height.grainWearLoss) * fine * style.height.fine,
      style.tone.base + style.tone.packed * packed + fine * style.tone.fine,
      style.accent.lee * (1 - surface),
    ]
  },
  'frost-heaved-ground': ({ u, v, n, seed, wear, patch, fine }) => {
    const style = environmentSurfaceTuning['frost-heaved-ground']
    const stripe = wave(u * n + valueNoise(u, v, style.stripe.noiseFrequency, seed, style.stripe.verticalFrequency) * style.stripe.noiseWarp)
    const stones = cell(u, v, n * style.stone.frequency, seed + style.stone.seedOffset, style.stone.facet)
    const crown = disk(stones.distance, style.crown.baseRadius + style.crown.toneRadius * stones.tone, style.crown.edgeSoftness)
      * smooth(style.crown.stripeLow, style.crown.stripeHigh, stripe)
    const upheaval = stripe ** style.upheaval.sharpness * wear
    return [
      style.height.base + style.height.crown * crown + upheaval * style.height.upheaval + fine * style.height.fine,
      style.tone.base + crown * (style.tone.crown + style.tone.stoneTone * stones.tone) + patch * style.tone.patch,
      upheaval * style.accent.upheaval,
    ]
  },
  'lichen-clock': ({ u, v, n, seed, wear, patch, fine }) => {
    const style = environmentSurfaceTuning['lichen-clock']
    const colony = cell(u + style.colony.patchWarp * patch, v + style.colony.fineWarp * fine, n, seed)
    const pores = valueNoise(u, v, n * style.pores.frequency, seed + style.pores.seedOffset)
    const shelter = valueNoise(u, v, style.shelter.frequency, seed + style.shelter.seedOffset)
    const damp = smooth(style.damp.low, style.damp.high, style.damp.shelterMix * shelter + style.damp.patchMix * patch + style.damp.wearExposure * wear)
    const angle = Math.atan2(colony.dy, colony.dx)
    const frill = style.frill.radius * Math.cos(angle * style.frill.count + colony.tone * style.frill.tonePhase) + (pores - half) * style.frill.poreWarp
    const radius = style.colony.baseRadius + colony.tone * style.colony.toneRadius + wear * style.colony.wearRadius
    const edgeDistance = colony.distance + frill - radius
    const lobe = disk(colony.distance + frill, radius, style.colony.edgeSoftness) * damp
    const growth = rim(edgeDistance + style.growth.inset, 0, style.growth.width) * lobe
    return [
      style.height.base + style.height.fine * fine + lobe * (style.height.lobe + growth * style.height.growth + pores * style.height.pores),
      style.tone.base + style.tone.patch * patch + lobe * (style.tone.lobe + style.tone.pores * pores),
      growth * (style.accent.base + style.accent.colonyTone * colony.tone),
    ]
  },
  'mycelium-threads': ({ u, v, n, seed, wear, patch, fine }) => {
    const style = environmentSurfaceTuning['mycelium-threads']
    const scale = style.web.baseWidth + style.web.wearWidth * wear
    const mold = cell(u + style.web.patchWarp * patch, v + style.web.fineWarp * fine, n, seed)
    const web = disk(mold.edge, scale, scale * style.web.edgeSoftness)
    const forks = cell(u - style.fork.patchWarp * patch, v + style.fork.fineWarp * fine, n * style.fork.frequency, seed + style.fork.seedOffset)
    const tips = disk(forks.edge, scale * style.fork.widthRatio, scale * style.fork.edgeSoftness) * smooth(style.fork.colonyLow, style.fork.colonyHigh, 1 - mold.distance)
    const active = smooth(style.active.low, style.active.high, patch + wear * style.active.wearContribution)
    const thread = Math.max(web, tips * style.fork.strength) * active
    return [
      style.height.base + fine * style.height.fine + style.height.thread * thread,
      style.tone.base + style.tone.patch * patch + style.tone.thread * thread,
      thread,
    ]
  },
  'glow-algae-film': ({ u, v, n, seed, wear, patch, fine }) => {
    const style = environmentSurfaceTuning['glow-algae-film']
    const base = cell(u + style.film.patchWarp * patch, v, n, seed)
    const film = disk(base.distance, style.film.baseRadius - wear * style.film.wearLoss, style.film.edgeSoftness)
      * smooth(style.film.patchLow, style.film.patchHigh, patch + base.tone * style.film.toneMix)
    const clusters = cell(u, v, n * style.cluster.frequency, seed + style.cluster.seedOffset)
    const spark = disk(clusters.distance, style.spark.baseRadius - style.spark.wearLoss * wear, style.spark.edgeSoftness)
      * smooth(style.spark.toneLow, style.spark.toneHigh, clusters.tone)
    const glow = Math.max(spark * film * style.glow.spark, film * fine * style.glow.fine)
    return [
      style.height.base + style.height.film * film + fine * style.height.fine - wear * style.height.sparkWear * spark,
      style.tone.base + style.tone.film * film,
      style.accent.glow * glow,
      glow,
    ]
  },
} satisfies Record<string, (p: Point) => Sample>

export const roadPatterns = {
  'rutted-clay': ({ u, v, n, seed, wear, patch, fine }) => {
    const style = environmentSurfaceTuning['rutted-clay']
    const x = centered(u * n + style.rut.phase + style.rut.noiseWarp * valueNoise(u, v, style.rut.frequency, seed, style.rut.verticalFrequency))
    const trench = disk(Math.abs(x), style.trench.baseRadius + wear * style.trench.wearRadius, style.trench.edgeSoftness)
    const berm = rim(Math.abs(x), style.berm.baseRadius + wear * style.berm.wearRadius, style.berm.width)
    const chevron = wave(v * style.tread.frequency + Math.abs(x) * style.tread.crossFrequency) ** style.tread.sharpness * trench
    const mud = trench * wear
    return [
      style.height.base + style.height.berm * berm - style.height.mudDepth * mud
      - chevron * (style.height.treadDepth + style.height.treadWearDepth * wear) + fine * style.height.fine,
      style.tone.base + style.tone.patch * patch - style.tone.mudDepth * mud,
      mud * style.accent.mud,
    ]
  },
  'hare-crossings': ({ u, v, n, seed, wear, patch, fine }) => {
    const style = environmentSurfaceTuning['hare-crossings']
    const y = fraction(v * n)
    const x = centered(u - style.path.bend * wave(v * style.path.frequency + style.path.phase) - style.path.patchWarp * patch)
    const yShift = x * style.path.tailSlant
    const left = ellipse(x + style.leftHind.xOffset, y - style.leftHind.yOffset + yShift, style.leftHind.width, style.leftHind.length)
    const right = ellipse(x - style.rightHind.xOffset, y - style.rightHind.yOffset + yShift, style.rightHind.width, style.rightHind.length)
    const front = Math.max(
      ellipse(x + style.leftFore.xOffset, y - style.leftFore.yOffset, style.leftFore.width, style.leftFore.length),
      ellipse(x - style.rightFore.xOffset, y - style.rightFore.yOffset, style.rightFore.width, style.rightFore.length),
    )
    const claw = ellipse(x + style.claw.xOffset, y - style.claw.yOffset, style.claw.width, style.claw.length)
    const scuffed = valueNoise(u, v, n * style.scuff.frequency, seed)
    const print = Math.max(left, right, front * style.print.foreStrength, claw * style.print.clawStrength)
      * (1 - wear * (style.print.baseWear + style.print.scuffWear * scuffed))
    return [
      style.height.base - print * style.height.printDepth + fine * style.height.fine + patch * style.height.patch,
      style.tone.base + style.tone.patch * patch - print * style.tone.printDepth,
      print * style.accent.print,
    ]
  },
  'corduroy-track': ({ u, v, n, seed, wear, patch, fine }) => {
    const style = environmentSurfaceTuning['corduroy-track']
    const groove = Math.abs(centered(v * n + (patch - half) * style.groove.patchWarp))
    const exposed = smooth(
      style.exposure.low + style.exposure.lowWear * wear,
      style.exposure.high + style.exposure.highWear * wear,
      valueNoise(u, v, style.exposure.frequency, seed, n),
    )
    const crown = disk(groove, style.crown.radius, style.crown.edgeSoftness) * exposed
    const grain = valueNoise(u, v, style.grain.frequency, seed + style.grain.seedOffset, n * style.grain.verticalFrequency)
    const rot = disk(groove, style.rot.baseRadius + style.rot.patchRadius * patch, style.rot.edgeSoftness) * grain
    return [
      style.height.base + crown * (style.height.crown + style.height.grain * grain - style.height.rotDepth * rot) + fine * style.height.fine + patch * style.height.patch,
      style.tone.base + crown * (style.tone.crown + style.tone.grain * grain) + patch * style.tone.patch,
      (1 - exposed) * wear * style.accent.buried,
    ]
  },
} satisfies Record<string, (p: Point) => Sample>
