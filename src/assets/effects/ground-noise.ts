// World-space noise for the terrain ground shader (beach-material.ts). The names
// differ from meadow-noise.ts, because both plugins share one material's shader.
// groundNoise returns a smooth value noise and its slope, so relief costs no extra samples.
// groundCells finds the nearest centre of a jittered grid, for grus stones: the
// offset points from the sample to the centre.
export const groundNoise = `
float groundHash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * .1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
vec3 groundNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3. - 2. * f), du = 6. * f * (1. - f);
  float a = groundHash(i), b = groundHash(i + vec2(1., 0.));
  float c = groundHash(i + vec2(0., 1.)), d = groundHash(i + vec2(1., 1.));
  float k = a - b - c + d;
  return vec3(a + (b - a) * u.x + (c - a) * u.y + k * u.x * u.y, du * (vec2(b - a, c - a) + k * u.yx));
}
void groundCells(vec2 p, out vec2 near, out float id) {
  vec2 i = floor(p), f = fract(p);
  float first = 8.;
  near = vec2(2.);
  id = 0.;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 r = g + vec2(groundHash(i + g), groundHash(i + g + 31.7)) - f;
      float d = dot(r, r);
      if (d < first) { first = d; near = r; id = groundHash(i + g + 17.3); }
    }
  }
}
`
