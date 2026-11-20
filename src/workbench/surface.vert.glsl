precision highp float;

attribute vec3 position;
attribute vec3 normal;
uniform mat4 world;
uniform mat4 worldViewProjection;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vWorld;

void main() {
  vPosition = position;
  vWorld = (world * vec4(position, 1.0)).xyz;
  vNormal = mat3(world) * normal;
  gl_Position = worldViewProjection * vec4(position, 1.0);
}
