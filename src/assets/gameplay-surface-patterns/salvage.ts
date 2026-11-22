import { blend, hash, valueNoise, wrap } from '../../math/noise.ts'
import { salvageSurfaceTuning } from '../recipes/gameplay-surface-tuning-salvage.ts'
import { cell, smooth, wave, type Point, type Sample } from '../surface-pattern-tools.ts'
import { centered, disk, fullTurn, half, rim } from './math.ts'

export const salvagePatterns = {
  'watermarked-plaster': ({ u, v, n, seed, wear, patch, fine }) => {
    const style = salvageSurfaceTuning['watermarked-plaster']
    const drift = valueNoise(u, v, style.drift.frequency, seed, style.drift.verticalFrequency)
    const level = v * n + (drift - half) * style.drift.warp
    const band = centered(level)
    const strength = hash(wrap(Math.round(level), n), 0, seed)
    const line = disk(Math.abs(band), style.line.baseRadius + style.line.wearRadius * wear, style.line.edgeSoftness)
      * (style.line.baseWeight + strength * style.line.strengthVariation)
    const stain = disk(Math.abs(band + style.stain.offset), style.stain.radius, style.stain.edgeSoftness)
      * (style.stain.baseStrength + style.stain.strengthVariation * strength)
      * (style.stain.baseDrift + style.stain.driftVariation * drift)
    const flakes = cell(u + patch * style.flake.patchWarp, v, n * style.flake.frequency, seed + style.flake.seedOffset, style.flake.facet)
    const peeled = smooth(style.peel.low - wear * style.peel.wearLowering, style.peel.high, flakes.tone * style.peel.flakeTone + patch * style.peel.patch) * stain
    return [
      style.height.base + fine * style.height.fine + line * style.height.line - peeled * style.height.peelDepth,
      style.tone.base + style.tone.patch * patch - stain * style.tone.stainDepth,
      Math.max(peeled * style.accent.peel, line * wear, stain * style.accent.stain),
    ]
  },
  'tarred-caulking': ({ u, v, n, seed, wear, patch, fine }) => {
    const style = salvageSurfaceTuning['tarred-caulking']
    const joint = Math.abs(centered(u * n + style.joint.patchWarp * patch))
    const pitch = disk(joint, style.pitch.baseRadius + style.pitch.patchRadius * patch, style.pitch.edgeSoftness)
    const split = disk(joint, style.split.baseRadius + style.split.wearRadius * wear, style.split.edgeSoftness)
    const tool = wave(v * n * style.tool.frequency + fine * style.tool.finePhase) * pitch
    const grain = valueNoise(u, v, n * style.grain.frequency, seed, style.grain.verticalFrequency)
    return [
      style.height.base + (1 - pitch) * grain * style.height.grain - pitch * style.height.pitchDepth - split * wear * style.height.splitDepth + tool * style.height.tool,
      style.tone.base + grain * style.tone.grain + tool * style.tone.tool,
      pitch * style.accent.pitch,
    ]
  },
  'salt-blistered-paint': ({ u, v, n, seed, wear, patch, fine }) => {
    const style = salvageSurfaceTuning['salt-blistered-paint']
    const paint = cell(u + style.paint.patchWarp * patch, v, n, seed)
    const size = style.bubble.baseRadius + paint.tone * style.bubble.toneRadius
    const bubble = disk(paint.distance, size, style.bubble.edgeSoftness)
    const flake = disk(paint.distance, size * (style.flake.baseScale + wear * style.flake.wearScale), style.flake.edgeSoftness)
      * smooth(style.flake.toneLow, style.flake.toneHigh, paint.tone + style.flake.wearExposure * wear)
    const lip = rim(paint.distance, size * (style.lip.baseScale + wear * style.lip.wearScale), style.lip.width) * bubble
    return [
      style.height.base + bubble * style.height.bubble + lip * style.height.lip - flake * style.height.flakeDepth + fine * style.height.fine,
      style.tone.base + bubble * style.tone.bubble + patch * style.tone.patch,
      flake,
    ]
  },
  'stamped-packing-clay': ({ u, v, n, seed, wear, patch, fine }) => {
    const style = salvageSurfaceTuning['stamped-packing-clay']
    const stamp = cell(u, v, n, seed)
    const d = stamp.distance
    const angle = Math.atan2(stamp.dy, stamp.dx)
    const radial = wave(angle * style.seal.spokes / fullTurn) ** style.seal.sharpness
    const seal = Math.max(
      rim(d, style.outerRing.radius, style.outerRing.width),
      radial * disk(d, style.innerDisk.radius, style.innerDisk.edgeSoftness),
      disk(d, style.hub.radius, style.hub.edgeSoftness),
    )
    const mark = seal * smooth(style.ink.toneLow, style.ink.toneHigh, stamp.tone + style.ink.patchMix * patch) * (1 - wear * style.ink.wearLoss)
    const shoulder = rim(d, style.shoulder.radius, style.shoulder.width) * smooth(style.shoulder.toneLow, style.shoulder.toneHigh, stamp.tone)
    return [
      style.height.base + shoulder * style.height.shoulder - mark * style.height.markDepth + fine * style.height.fine,
      style.tone.base + patch * style.tone.patch - mark * style.tone.markDepth,
      shoulder * style.accent.shoulder,
    ]
  },
  'coir-cargo-mat': ({ u, v, n, seed, wear, patch, fine }) => {
    const style = salvageSurfaceTuning['coir-cargo-mat']
    const uBraid = u * n, vBraid = v * n
    const over = wave((uBraid + vBraid) * style.braid.phaseScale)
    const warp = wave(uBraid) ** style.braid.sharpness, weft = wave(vBraid) ** style.braid.sharpness
    const rope = blend(warp, weft * style.braid.weftStrength, smooth(style.braid.crossLow, style.braid.crossHigh, over))
    const twist = wave((uBraid + vBraid) * style.twist.frequency + wave(uBraid - vBraid) * style.twist.crossWarp)
    const crushing = smooth(style.crushing.low, style.crushing.high, valueNoise(u, v, style.crushing.frequency, seed, style.crushing.verticalFrequency)) * wear
    const height = rope * (style.rope.base + style.rope.twist * twist) * (1 - crushing * style.rope.crushDepth)
    return [
      style.height.base + height + fine * style.height.fine,
      style.tone.base + style.tone.rope * height + style.tone.patch * patch,
      crushing * (style.accent.crush + style.accent.fine * fine),
    ]
  },
  'waxed-provision-wrap': ({ u, v, n, seed, wear, patch, fine }) => {
    const style = salvageSurfaceTuning['waxed-provision-wrap']
    const sheet = cell(u + v + patch * style.sheet.patchWarp, v, n, seed, style.sheet.facet)
    const fold = disk(sheet.edge, style.fold.baseRadius + style.fold.wearRadius * wear, style.fold.edgeSoftness)
    const crease = disk(Math.abs(centered(u * n + v * style.crease.verticalFrequency + patch * style.crease.patchWarp)), style.crease.radius, style.crease.edgeSoftness)
    const whitening = Math.max(fold, crease * style.whitening.crease) * smooth(style.whitening.low, style.whitening.high, fine + wear * style.whitening.wear)
    return [
      style.height.base - fold * style.height.foldDepth - crease * style.height.creaseDepth + sheet.tone * style.height.sheetTone + fine * style.height.fine,
      style.tone.base + patch * style.tone.patch - crease * style.tone.creaseDepth,
      whitening,
    ]
  },
} satisfies Record<string, (p: Point) => Sample>

export const workshopPatterns = {
  'forge-scale': ({ u, v, n, seed, wear, patch, fine }) => {
    const style = salvageSurfaceTuning['forge-scale']
    const slag = cell(u + style.slag.uWarp * patch, v - patch * style.slag.vWarp, n, seed, style.slag.facet)
    const face = smooth(style.face.low, style.face.high, slag.dx + slag.dy * style.face.ySlope) * (style.face.baseTone + style.face.toneVariation * slag.tone)
    const flake = smooth(style.flake.edgeLow, style.flake.edgeHigh, slag.edge)
      * disk(slag.distance, style.flake.baseRadius + slag.tone * style.flake.toneRadius, style.flake.edgeSoftness)
    const oxide = smooth(style.oxide.low, style.oxide.high, (1 - flake) * style.oxide.flakeMix + patch * style.oxide.patchMix) * wear
    return [
      style.height.base + flake * (style.height.face * face + style.height.flake) * (1 - oxide * style.height.oxidationLoss) + fine * style.height.fine,
      style.tone.base + flake * style.tone.flake + face * style.tone.face,
      oxide,
    ]
  },
  'vesicular-slag': ({ u, v, n, seed, wear, patch, fine }) => {
    const style = salvageSurfaceTuning['vesicular-slag']
    const vesicle = cell(u, v, n, seed)
    const small = cell(u + style.small.uOffset, v - style.small.vOffset, n * style.small.frequency, seed + style.small.seedOffset)
    const size = style.vesicle.baseRadius + style.vesicle.toneRadius * vesicle.tone + style.vesicle.wearRadius * wear
    const collapse = disk(vesicle.distance, size, size * style.collapse.edgeSoftness) * (style.collapse.baseStrength + style.collapse.toneStrength * vesicle.tone)
    const bubbles = Math.max(collapse, disk(small.distance, style.small.baseRadius + style.small.toneRadius * small.tone, style.small.edgeSoftness) * style.small.strength)
    const glass = rim(vesicle.distance, size, style.glass.width)
    return [
      style.height.base - bubbles * style.height.bubbleDepth + glass * style.height.glass + fine * style.height.fine,
      style.tone.base - style.tone.bubbleDepth * bubbles + style.tone.patch * patch + glass * style.tone.glass,
      glass * (style.accent.glass + wear * style.accent.wearGlass),
    ]
  },
  'sawdust-drifts': ({ u, v, n, seed, wear, patch, fine }) => {
    const style = salvageSurfaceTuning['sawdust-drifts']
    const shaving = cell(u, v, n, seed)
    const curled = Math.hypot(shaving.dx, shaving.dy * (style.shaving.baseStretch + shaving.tone))
    const curl = rim(curled, style.curl.baseRadius + style.curl.toneRadius * shaving.tone, style.curl.width)
      * smooth(style.curl.bandLow, style.curl.bandHigh, shaving.dy + style.curl.xSlope * shaving.dx)
    const driftNoise = valueNoise(u, v, style.drift.noiseFrequency, seed, style.drift.noiseVerticalFrequency)
    const drift = wave(v * style.drift.vFrequency + u * style.drift.uFrequency + driftNoise * style.drift.noiseWarp)
    const settled = smooth(
      style.settle.low + style.settle.lowWear * wear,
      style.settle.high + style.settle.highWear * wear,
      drift * style.settle.driftMix + patch * style.settle.patchMix,
    )
    const dust = settled * (style.dust.base + style.dust.fine * fine)
    return [
      style.height.base + dust * style.height.dust + curl * settled * style.height.curl + fine * style.height.fine,
      style.tone.base + dust * style.tone.dust,
      settled * curl,
    ]
  },
} satisfies Record<string, (p: Point) => Sample>
