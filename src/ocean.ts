import { Color3 } from '@babylonjs/core/Maths/math.color'
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial'
import { Vector2, Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { Scene } from '@babylonjs/core/scene'
import { island } from './world'

const vertexSource = `
precision highp float;
attribute vec3 position;
uniform mat4 world;
uniform mat4 worldViewProjection;
varying vec3 point;
void main() {
  point = (world * vec4(position, 1.0)).xyz;
  gl_Position = worldViewProjection * vec4(position, 1.0);
}
`

const fragmentSource = `
precision highp float;
varying vec3 point;
uniform vec2 islandRadii;
uniform vec3 eye;
uniform vec3 fogColor;
uniform float fogStart;
uniform float fogEnd;
uniform float time;
uniform float preview;
uniform float waveScale;
uniform float choppiness;
uniform vec3 tint;
uniform float daylight;
uniform float rain;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 c = floor(p);
  vec2 q = fract(p);
  q = q * q * (3.0 - 2.0 * q);
  return mix(mix(hash(c), hash(c + vec2(1,0)), q.x),
             mix(hash(c + vec2(0,1)), hash(c + vec2(1,1)), q.x), q.y);
}
void main() {
  vec2 p = point.xz * waveScale;
  vec2 coast = point.xz / islandRadii;
  float a = atan(coast.y, coast.x);
  float north = max(0.0, sin(a));
  float r = length(coast) / ((1.0 + 2.85 * north * north) * (1.0 + sin(a * 5.0 + 0.2) * 0.018 + cos(a * 9.0) * 0.013));

  float swell = noise(p * 0.58 + vec2(time * 0.30, -time * 0.19));
  float chop = noise(p * 2.45 + vec2(-time * 0.56, time * 0.48));
  float gust = noise(p * 0.22 + vec2(time * 0.056, time * 0.08));
  float phase = dot(p, vec2(1.24, 0.85)) + time * 2.05 + swell * 4.0;
  float crossWave = sin(dot(p, vec2(-2.07, 1.54)) - time * 2.7 + chop * 2.2);
  float ripples = sin(phase) * 0.36 + crossWave * 0.22 + (chop - 0.5) * 0.56;
  float flecks = pow(max(0.0, sin(phase + crossWave * 0.7)), 8.0) * smoothstep(0.47, 0.78, chop);
  vec3 color = mix(vec3(0.080, 0.37, 0.44), vec3(0.20, 0.57, 0.64), 0.52 + ripples * 0.63 * choppiness);
  color += vec3(0.28, 0.35, 0.34) * flecks * (0.38 + gust) * choppiness;

  float shallow = (1.0 - smoothstep(1.012, 1.145, r)) * (1.0 - preview);
  color = mix(color, mix(vec3(0.25,0.65,0.61), vec3(0.48,0.82,0.70), swell * 0.58 + chop * 0.42), shallow * 0.86);
  float wave = fract(r * 52.0 + time * 0.43 + swell * 0.16 + gust * 0.09);
  float ridge = smoothstep(0.73, 0.91, wave) * (1.0 - smoothstep(0.96, 1.0, wave));
  float breakers = ridge * (1.0 - smoothstep(1.024, 1.082, r))
    * smoothstep(1.000, 1.007, r) * smoothstep(0.25, 0.72, chop);
  float wash = (1.0 - smoothstep(0.0004, 0.0035, abs(r - 1.003 - sin(time + swell * 4.8) * 0.0016)))
    * smoothstep(0.29, 0.60, chop);
  float foam = min(0.78, (breakers * 0.87 + wash * 0.62) * (1.0 - preview));
  color = mix(color, vec3(0.86, 0.96, 0.91), foam);
  color += (tint - vec3(0.1373, 0.4902, 0.5451)) * 0.72;
  color *= mix(vec3(0.22, 0.32, 0.49), vec3(1.0), daylight) * (1.0 - 0.28 * rain);
  float distanceToEye = length(eye - point);
  float fog = smoothstep(fogStart, fogEnd, distanceToEye);
  gl_FragColor = vec4(mix(color, fogColor, fog), max(max(1.0 - shallow * 0.73, foam + 0.19), fog));
}
`

export function createOceanMaterial(scene: Scene, preview = false) {
  const material = new ShaderMaterial('Island water', scene, { vertexSource, fragmentSource }, {
    attributes: ['position'],
    uniforms: ['world', 'worldViewProjection', 'islandRadii', 'eye', 'fogColor', 'fogStart', 'fogEnd', 'time', 'preview', 'waveScale', 'choppiness', 'tint', 'daylight', 'rain'],
    needAlphaBlending: !preview,
  })
  material.setVector2('islandRadii', new Vector2(island.width / 2, island.length / 2))
  material.setFloat('preview', Number(preview))
  material.setFloat('waveScale', 1)
  material.setFloat('choppiness', 1)
  material.setColor3('tint', Color3.FromHexString('#237d8b'))
  const origin = Vector3.Zero()
  return {
    material,
    setAppearance(color: string, size: number, choppiness: number) {
      material.setColor3('tint', Color3.FromHexString(color))
      material.setFloat('waveScale', 1 / size)
      material.setFloat('choppiness', choppiness)
    },
    pose(time: number, daylight = 1, rain = 0) {
      material.setFloat('daylight', daylight)
      material.setFloat('rain', rain)
      material.setFloat('time', time)
      material.setVector3('eye', scene.activeCamera?.position ?? origin)
      material.setColor3('fogColor', scene.fogColor)
      material.setFloat('fogStart', preview ? 500 : scene.fogStart)
      material.setFloat('fogEnd', preview ? 600 : scene.fogEnd)
    },
  }
}
