export const waterFilmShader = {
  vertexSource: `
      precision highp float;
      attribute vec3 position;
      attribute vec2 uv;
      uniform mat4 worldViewProjection;
      varying vec2 texCoord;
      void main() {
        texCoord = uv;
        gl_Position = worldViewProjection * vec4(position, 1.);
      }
    `,
  fragmentSource: `
      precision highp float;
      uniform float amount;
      uniform float time;
      uniform float wetArea;
      varying vec2 texCoord;
      void main() {
        vec2 p = (texCoord - .5) * 2.;
        float edge = mix(1., 1. - smoothstep(.48, 1., length(p) + .08 * sin(6. * p.x + 3. * p.y)), wetArea);
        float wave = sin(texCoord.y * 67. - time * 11. + sin(texCoord.x * 13. - time * 2.2) * 1.1);
        float shine = smoothstep(.58, .98, wave);
        vec3 base = mix(vec3(.49, .69, .73), vec3(.21, .34, .35), wetArea);
        vec3 glint = mix(vec3(.84, .94, .89), vec3(.56, .73, .72), wetArea);
        gl_FragColor = vec4(mix(base, glint, shine * .36), edge * amount * (.50 + shine * .26));
      }
    `,
}

export const waterFilmQuad = {
  indices: [0, 1, 2, 1, 3, 2],
  uv: [0, 0, 0, 1, 1, 0, 1, 1],
} as const

export const runoffFilmLook = {
  puddle: { width: 0.47, startZ: -0.15, endZ: 0.44, startRise: 0.004, endRise: -0.004 },
  gutter: { width: 0.066, startX: 1.36, endX: 0.03, startRise: 0.020, endRise: 0.023, opacity: 0.8 },
  trickle: { width: 0.113, startRise: 0.007, endRise: 0.006, endZ: -0.12, dripContribution: 0.24 },
} as const

export const rainChainStream = {
  crossSections: 4,
  sides: 8,
  radius: 0.013,
  radiusGrowth: 0.013,
  bend: 0.026,
  xOffset: -0.022,
  zOffset: 0.030,
  minimumWidthScale: 0.68,
  widthGain: 0.53,
} as const

export const marketRainStyle = {
  cycleSpeed: 1.37,
  phaseStep: 0.261,
  chainDrop: { count: 4, xOffset: -0.06, zOffset: 0.039, zStep: 0.008, size: [0.032, 0.078, 0.032], visibleUntil: 0.94 },
  awningBead: {
    count: 18,
    xFrequency: 28.21,
    zFrequency: 17.26,
    xSpan: 2.65,
    zSpan: 1.12,
    zInset: 0.12,
    size: [0.032, 0.022, 0.036],
    segments: 4,
    phaseStep: 0.691,
    cycleSpeed: 3.3,
    visibleFraction: 0.19,
    baseLift: 0.018,
    rise: 0.19,
  },
  splashRing: {
    count: 3,
    segments: 32,
    radii: [0.42, 0.50],
    opacity: 0.72,
    phaseOffset: 0.098,
    visibleUntil: 0.51,
    xOffset: -0.033,
    yOffset: 0.012,
    layerDepth: 0.002,
    zOffset: 0.023,
    startRadius: 0.075,
    radiusGrowth: 0.47,
    depthScale: 0.90,
  },
} as const
