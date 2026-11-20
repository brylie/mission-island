import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial'
import type { Scene } from '@babylonjs/core/scene'

export function createSoundMaterial(scene: Scene) {
  const material = new ShaderMaterial('Saltwind Sound', scene, {
    vertexSource: `
      precision highp float;
      attribute vec3 position;
      uniform mat4 worldViewProjection;
      varying vec2 point;
      void main() { point = position.xz; gl_Position = worldViewProjection * vec4(position, 1.0); }
    `,
    fragmentSource: `
      precision highp float;
      varying vec2 point;
      uniform float time;
      uniform float light;
      void main() {
        vec2 coast = point / vec2(450.0, 312.0);
        float angle = atan(coast.y, coast.x);
        float edge = 1.0 + 0.061 * sin(angle * 3.0 + 0.8) + 0.041 * cos(angle * 5.0 - 0.6) + 0.022 * sin(angle * 9.0);
        float bay = 17.0 * exp(-dot((point + vec2(278.0, 251.0)) / vec2(48.0, 63.0), (point + vec2(278.0, 251.0)) / vec2(48.0, 63.0)));
        float depth = (length(coast) - edge) * 325.0 + bay;
        float ripple = sin(point.x * 0.29 + point.y * 0.74 + time * 1.65 + sin(point.x * 0.11 - time * 0.7));
        float crossWave = sin(point.y * 0.96 - point.x * 0.25 - time * 2.1);
        float fade = 1.0 - smoothstep(430.0, 850.0, length(point));
        vec3 blue = mix(vec3(0.26, 0.51, 0.57), vec3(0.49, 0.72, 0.67), 1.0 - smoothstep(0.0, 36.0, depth));
        blue += (ripple * 0.014 + crossWave * 0.011) * fade;
        float swash = (1.0 - smoothstep(0.46, 1.62, abs(depth - 1.9 - ripple * 0.73))) * smoothstep(-0.3, 0.55, crossWave);
        vec3 water = mix(blue, vec3(0.83, 0.90, 0.82), swash * 0.62);
        gl_FragColor = vec4(water * (0.18 + light * 0.82), 0.58 + 0.42 * smoothstep(13.0, 27.0, depth));
      }
    `,
  }, { attributes: ['position'], uniforms: ['worldViewProjection', 'time', 'light'], needAlphaBlending: true })
  material.setFloat('light', 1)
  material.setFloat('time', 0)
  return material
}
