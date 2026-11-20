precision highp float;

uniform vec3 baseColor;
uniform vec3 lightDirection;
uniform vec3 lightColor;
uniform vec3 eyePosition;
uniform float ambient;
uniform float sunlight;
uniform float detailScale;
uniform float detailStrength;
uniform float time;
uniform int pattern;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vWorld;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 cell = floor(p);
  vec2 t = fract(p);
  t = t * t * (3.0 - 2.0 * t);
  return mix(mix(hash(cell), hash(cell + vec2(1.0, 0.0)), t.x),
             mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0)), t.x), t.y);
}

float grit(vec2 p) {
  return noise(p) * 0.55 + noise(p * 2.7) * 0.30 + noise(p * 6.1) * 0.15;
}

float angularChip(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p) - 0.5;
  f += vec2(hash(cell), hash(cell + 11.0)) * 0.18 - 0.09;
  float edge = max(abs(f.x + f.y * 0.41), abs(f.y - f.x * 0.54));
  float body = 1.0 - smoothstep(0.29, 0.47, edge);
  return body * (0.59 + 0.29 * floor((f.x - f.y) * 4.0 + 2.0) / 4.0);
}

float leafBlade(vec2 p) {
  vec2 q = fract(p) - 0.5;
  q = mat2(0.82, -0.57, 0.57, 0.82) * q;
  float blade = 1.0 - smoothstep(0.0, 0.025, abs(q.x) - max(0.0, 0.44 - abs(q.y)) * 0.58);
  float midrib = 1.0 - smoothstep(0.016, 0.035, abs(q.x));
  return blade * 0.71 + blade * midrib * 0.29;
}

void main() {
  vec3 n = normalize(vNormal);
  vec2 p = (vPosition.xz + vPosition.xy * vec2(0.01, 0.77)) * detailScale;
  float large = noise(p * 1.5);
  float fine = grit(p * 16.0);
  float variation = 0.0;
  float sheen = 0.0;
  float gloss = 15.0;

  if (pattern == 0) {
    // Combine waves from two directions for the animated water normals.
    vec2 waves = vec2(dot(p, vec2(3.5, 6.0)), dot(p, vec2(-7.0, 2.0)));
    vec2 slope = cos(waves + vec2(time * 2.4, -time * 1.7));
    n = normalize(n + vec3(slope.y, 0.0, slope.x) * detailStrength * 0.22);
    variation = sin(waves.x + time * 2.4 + sin(waves.y - time * 1.7)) * 0.24;
    sheen = 0.75;
    gloss = 44.0;
  } else if (pattern == 1) {
    variation = (angularChip(p * 11.0) - 0.4) * 0.47 + (fine - 0.5) * 0.26;
  } else if (pattern == 2) {
    variation = (fine - 0.5) * 0.31 + sin(p.y * 18.0 + large * 2.0) * 0.07;
  } else if (pattern == 3) {
    variation = (large - 0.5) * 0.26 + (fine - 0.5) * 0.34;
  } else if (pattern == 4) {
    float grain = sin(p.x * 35.0 + noise(p * vec2(3.0, 0.9)) * 5.0);
    float cut = smoothstep(0.94, 0.99, fract(p.x * 1.6));
    variation = grain * 0.15 + (noise(p * vec2(50.0, 3.0)) - 0.5) * 0.32 - cut * 0.32;
  } else if (pattern == 5) {
    float veins = 1.0 - smoothstep(0.02, 0.12, abs(sin(p.x * 2.0 + grit(p * 3.0) * 7.0)));
    variation = (large - 0.5) * 0.38 + (fine - 0.5) * 0.26 + veins * 0.15;
  } else if (pattern == 6) {
    vec2 leaf = fract(vec2(p.x + p.y * 0.6, p.y) * 9.0) - 0.5;
    float veins = 1.0 - smoothstep(0.014, 0.05, abs(leaf.x) + abs(leaf.y) * 0.04);
    variation = (large - 0.5) * 0.35 + leafBlade(p * 9.0) * 0.31 + veins * 0.10 - 0.18;
  } else if (pattern == 7) {
    variation = (noise(p * vec2(4.0, 115.0)) - 0.5) * 0.33;
    sheen = 0.68;
    gloss = 55.0;
  } else {
    variation = (noise(p * vec2(70.0, 13.0)) - 0.5) * 0.36 + (large - 0.5) * 0.38;
  }

  vec3 light = normalize(lightDirection);
  vec3 view = normalize(eyePosition - vWorld);
  float diffuse = ambient * (0.76 + 0.24 * max(n.y, 0.0)) + max(dot(n, light), 0.0) * sunlight;
  float highlights = sheen * pow(max(dot(n, normalize(light + view)), 0.0), gloss) * sunlight;
  vec3 color = baseColor * (1.0 + variation * detailStrength) * mix(vec3(diffuse), diffuse * lightColor, 0.6);
  gl_FragColor = vec4(color + highlights * lightColor * vec3(0.69, 0.82, 0.86), 1.0);
}
