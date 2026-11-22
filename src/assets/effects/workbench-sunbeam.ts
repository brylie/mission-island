export const workbenchSunbeamShader = {
  vertexSource: `
      precision highp float;
      attribute vec3 position;
      attribute vec2 uv;
      uniform mat4 worldViewProjection;
      varying vec2 beamUV;
      void main() {
        beamUV = uv;
        gl_Position = worldViewProjection * vec4(position, 1.);
      }
    `,
  fragmentSource: `
      precision mediump float;
      varying vec2 beamUV;
      void main() {
        float edge = pow(max(0., sin(beamUV.x * 3.141593)), 1.7);
        gl_FragColor = vec4(1., .83, .52, .25 * edge * (.38 + .62 * beamUV.y));
      }
    `,
}
