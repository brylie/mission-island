export const skyVertex = `
precision highp float;
attribute vec3 position;
uniform mat4 worldViewProjection;
varying vec3 ray;
void main() {
  ray = position;
  gl_Position = worldViewProjection * vec4(position, 1.);
  gl_Position.z = gl_Position.w;
}`

export const skyFragment = `
precision highp float;
varying vec3 ray;
uniform vec3 sunDir;
uniform vec3 horizon;
uniform vec3 zenith;
uniform float time;
uniform float rain;
uniform float light;
uniform float physicalSky;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
    mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float cloudDensity(vec3 direction) {
  vec2 p = direction.xz / (max(0.,direction.y)+.21)*3. + vec2(time*.025,-time*.015);
  float cloud = noise(p)*.66+noise(p*2.08)*.24+noise(p*4.2)*.1;
  return smoothstep(.50-.16*rain,.72-.13*rain,cloud);
}
void main() {
  vec3 d = normalize(ray);
  float haze = 1.-smoothstep(-.02,.17,d.y);
  float opacity = mix(1., mix(max(.06,rain*.36),1.,haze), physicalSky);
  vec3 color = mix(mix(horizon, zenith, pow(max(d.y,0.),.56)), horizon, physicalSky) * opacity;
  float darkness = (1.-smoothstep(-.21,-.06,sunDir.y)) * smoothstep(.025,.20,d.y) * (1.-rain*.88);
  if (darkness > .01) {
    vec2 sky = vec2(atan(d.z,d.x),asin(clamp(d.y,-1.,1.)));
    vec2 field = sky * 117.;
    vec2 cell = floor(field);
    float seed = hash(cell);
    vec2 center = vec2(hash(cell+17.),hash(cell-31.))*.64+.18;
    float star = (1.-smoothstep(.017,.066,length(fract(field)-center))) * step(.963,seed);
    float shimmer = .67+.33*sin(time*(.9+seed)+seed*70.);
    color += vec3(.63,.75,1.) * star * shimmer * darkness;
    float interval = floor(time/41.);
    float flash = fract(time/41.)*41. - 9.;
    if (flash > 0. && flash < 1.1) {
      vec2 head = vec2(hash(vec2(interval,8.))*6.-3.,.32+hash(vec2(interval,2.))*.61);
      vec2 direction = vec2(.32,-.14);
      vec2 ray = sky-head-direction*flash;
      ray.x = atan(sin(ray.x),cos(ray.x));
      float trail = clamp(-dot(ray,direction)/dot(direction,direction),0.,.37);
      float glow = (1.-smoothstep(.0008,.009,length(ray+direction*trail))) * (1.-trail/.38);
      color += vec3(.79,.88,1.) * glow * sin(flash*2.856) * darkness;
    }
  }
  float alignment = max(0.,dot(d,sunDir));
  float visible = smoothstep(-.12,.10,sunDir.y) * (1.-rain*.86);
  vec3 gold = vec3(1.,.58,.27);
  float halo = pow(alignment,12.)*.28 + pow(alignment,128.)*.47;
  float sun = smoothstep(.99984,.99993,alignment);
  color += (gold * halo * (1.-physicalSky) + vec3(1.,.87,.62)*sun)*visible;
  float mask = cloudDensity(d)*smoothstep(.015,.18,d.y);
  vec3 body = mix(vec3(.075,.10,.17), vec3(.84,.89,.92),light);
  float cloudOpacity = mask*.88;
  color = mix(color, mix(body, horizon, rain*.45), cloudOpacity);
  gl_FragColor = vec4(color, mix(opacity, 1., cloudOpacity));
}`

export const sunShaftFragment = `
precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler;
uniform sampler2D sceneDepth;
uniform highp sampler2DShadow sunDepth;
uniform mat4 inverseViewProjection;
uniform mat4 sunViewProjection;
uniform vec3 eye;
uniform vec3 sunDirection;
uniform vec3 sunColor;
uniform float morningMist;
uniform float strength;

float sunlight(vec3 uvDepth) {
  vec3 edge = min(uvDepth, 1. - uvDepth);
  float coverage = smoothstep(0., .015, min(edge.x, min(edge.y, edge.z)));
  return mix(1., texture(sunDepth, vec3(uvDepth.xy, uvDepth.z - .0005)), coverage);
}

void main() {
  vec4 surface = texture2D(textureSampler, vUV);
  float depth = texture2D(sceneDepth, vUV).r;
  vec4 end = inverseViewProjection * vec4(vUV * 2. - 1., depth * 2. - 1., 1.);
  vec3 ray = end.xyz / end.w - eye;
  vec3 direction = normalize(ray);
  float cosine = dot(direction, sunDirection);
  float anisotropy = mix(.64, .60, morningMist);
  float phase = pow((1. - anisotropy) * (1. - anisotropy) /
    (1. + anisotropy * anisotropy - 2. * anisotropy * cosine), 1.5);

  const int samples = 24;
  float stepSize = min(length(ray), 85.) / float(samples);
  float offset = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));
  vec3 stepWorld = direction * stepSize;
  vec3 position = eye + stepWorld * offset;
  // The sun uses an orthographic shadow camera, so its depth coordinates
  // advance linearly along the view ray.
  vec3 uvDepth = (sunViewProjection * vec4(position, 1.)).xyz * .5 + .5;
  vec3 stepDepth = (sunViewProjection * vec4(stepWorld, 0.)).xyz * .5;
  float transmission = 1.;
  float scattering = 0.;
  for (int i = 0; i < samples; i++) {
    float density = mix(.036, .054, morningMist) * exp(-max(position.y, 0.) * .13);
    float opacity = 1. - exp(-density * stepSize);
    scattering += transmission * opacity * sunlight(uvDepth);
    transmission *= 1. - opacity;
    position += stepWorld;
    uvDepth += stepDepth;
  }
  gl_FragColor = vec4(mix(surface.rgb, sunColor, strength * phase * scattering), surface.a);
}`
