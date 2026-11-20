export const shaderPresets = {
  clearWater: { clarity: 1.35 },
  surfWash: { foamReach: .34 },
  seaBreeze: { gust: .65 },
  rollingMeadow: { grassDistance: 26, patchContrast: .32 },
  rainPolished: { wetness: 1, reflection: .72 },
  dawnSilver: { mistDensity: 1, scattering: 1.5 },
} as const

export type ShaderQuality = 'off' | 'low' | 'full'

export interface ShoreSettings {
  clarity: number
  foamReach: number
  quality: ShaderQuality
}

export interface MeadowSettings {
  gust: number
  grassDistance: number
  patchContrast: number
}

export const shoreDefaults: ShoreSettings = {
  ...shaderPresets.clearWater, ...shaderPresets.surfWash, quality: 'full',
}

export const meadowDefaults: MeadowSettings = {
  ...shaderPresets.seaBreeze, ...shaderPresets.rollingMeadow,
}

// A small world-space pattern shared by the blade and terrain materials.
export const patchNoise = `
float studyHash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * .1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float studyNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(studyHash(i), studyHash(i + vec2(1,0)), f.x),
    mix(studyHash(i + vec2(0,1)), studyHash(i + vec2(1,1)), f.x), f.y);
}
float meadowPatch(vec2 p) {
  p *= .14;
  return smoothstep(.25, .76, studyNoise(p) * .77 + studyNoise(p * 2.1 + 7.) * .23);
}
float meadowFade(float range, float distanceToEye) {
  return smoothstep(range * .50, range, distanceToEye);
}
`
