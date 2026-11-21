export const phenomenonLooks = {
  mist: {
    tint: '#d8e9d8',
    count: 9,
    width: 0.51,
    height: 0.105,
    opacity: 0.44,
    visibleDistance: 48,
    driftSpeed: 0.21,
    driftExtent: 0.14,
    lift: 0.055,
    liftVariation: 0.024,
  },
  spray: {
    tint: '#e0f2ed',
    count: 13,
    width: 0.37,
    height: 0.34,
    opacity: 0.49,
    visibleDistance: 27,
    climbExtent: 0.26,
    travelExtent: 0.42,
  },
  glow: {
    tint: '#81e5d1',
    count: 11,
    width: 0.14,
    height: 0.085,
    opacity: 0.8,
    visibleDistance: 27,
    flickerBase: 0.77,
    flickerAmplitude: 0.23,
    flickerSpeed: 2.5,
  },
} as const

export const phenomenonPatch = {
  minimumScale: 0.65,
  scaleVariation: 0.65,
  speed: 0.24,
  rainSpeedFactor: 0.16,
  lift: 0.035,
} as const

export const mistLighting = {
  sunDirectionZ: -0.24,
  rainScatteringLoss: 0.8,
  reducedOpacityMultiplier: 1.2,
} as const

export const phenomenonShader = {
  vertexSource: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 worldViewProjection;
        #ifdef LIT_MIST
        uniform mat4 world;
        varying vec3 mistPoint;
        #endif
        varying vec2 texCoord;
        void main() {
          texCoord = uv;
          #ifdef LIT_MIST
          mistPoint = (world * vec4(position, 1.)).xyz;
          #endif
          gl_Position = worldViewProjection * vec4(position, 1.);
        }
      `,
  fragmentSource: `
        precision highp float;
        varying vec2 texCoord;
        uniform vec3 tint;
        uniform float opacity;
        #ifdef LIT_MIST
        varying vec3 mistPoint;
        uniform vec3 mistEye;
        uniform vec3 morningSun;
        uniform float scattering;
        #endif
        void main() {
          vec2 p = (texCoord - .5) * 2.;
          float wisps = 0.9 + sin(p.x * 13. + sin(p.y * 6.) * 1.2) * .1;
          float weight = max(0., 1. - dot(p,p));
          vec3 color = tint;
          float alpha = opacity * weight * weight * wisps;
          #ifdef LIT_MIST
          if (scattering > 0.) {
            vec3 ray = normalize(mistPoint - mistEye);
            float g = .62;
            float forward = (1. - g*g) / pow(1. + g*g - 2.*g*dot(ray, morningSun), 1.5);
            float lowSun = smoothstep(-.035, .045, morningSun.y) * (1. - smoothstep(.15, .52, morningSun.y));
            float light = (1. - exp(-forward * lowSun * scattering * .22));
            color = mix(tint * .83, vec3(1., .78, .51), light);
            alpha += light * weight * weight * wisps * opacity * .52;
          }
          #endif
          gl_FragColor = vec4(color, clamp(alpha, 0., 1.));
        }
      `,
}
