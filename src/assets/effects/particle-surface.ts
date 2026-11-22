export const particleQuad = {
  corners: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]],
  uv: [0, 0, 1, 0, 1, 1, 0, 1],
  indices: [0, 1, 2, 0, 2, 3],
} as const

export const particleSurfaceShader = {
  vertexSource: `
      precision highp float;
      attribute vec3 position;
      attribute vec2 uv;
      attribute vec4 color;
      uniform mat4 worldViewProjection;
      varying vec2 texCoord;
      varying vec4 tint;
      void main() {
        texCoord = uv;
        tint = color;
        gl_Position = worldViewProjection * vec4(position, 1.);
      }
    `,
  fragmentSource: `
      precision mediump float;
      uniform sampler2D shape;
      varying vec2 texCoord;
      varying vec4 tint;
      void main() {
        gl_FragColor = texture2D(shape, texCoord) * tint;
      }
    `,
}
