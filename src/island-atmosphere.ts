import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial'
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder'
import { CreateLineSystem } from '@babylonjs/core/Meshes/Builders/linesBuilder'
import type { Scene } from '@babylonjs/core/scene'
import type { DirectionalLight } from '@babylonjs/core/Lights/directionalLight'
import type { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight'
import type { Weather } from './protocol'
import { seededRandom } from './scenery'

const skyVertex = `
precision highp float;
attribute vec3 position;
uniform mat4 worldViewProjection;
varying vec3 ray;
void main() {
  ray = position;
  gl_Position = worldViewProjection * vec4(position, 1.);
}`

const skyFragment = `
precision highp float;
varying vec3 ray;
uniform vec3 sunDir;
uniform vec3 horizon;
uniform vec3 zenith;
uniform float time;
uniform float rain;
uniform float light;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
    mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
void main() {
  vec3 d = normalize(ray);
  vec3 color = mix(horizon, zenith, pow(max(d.y,0.),.56));
  float darkness = (1.-light) * smoothstep(.025,.20,d.y) * (1.-rain*.88);
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
  float sun = smoothstep(.9990,.9995,alignment);
  color += (gold * halo + vec3(1.,.87,.62)*sun)*visible;
  vec2 p = d.xz / (max(0.,d.y)+.21)*3. + vec2(time*.025,-time*.015);
  float cloud = noise(p)*.66+noise(p*2.08)*.24+noise(p*4.2)*.1;
  float mask = smoothstep(.50-.16*rain,.72-.13*rain,cloud)*smoothstep(.015,.18,d.y);
  vec3 body = mix(vec3(.075,.10,.17), vec3(.84,.89,.92),light);
  color = mix(color, mix(body, horizon, rain*.45), mask*.88);
  float twilight = 1.-smoothstep(.035,.27,abs(sunDir.y));
  if (alignment > .65 && twilight > .01 && rain < .9) {
    vec3 across = normalize(cross(vec3(0.,1.,0.),sunDir));
    vec3 above = cross(sunDir,across);
    vec2 radial = vec2(dot(d,across), dot(d,above));
    vec2 wedge = radial / max(length(radial),.001);
    vec2 veil = sunDir.xz * 12. + wedge * 3.7 + vec2(time*.018,-time*.011);
    float gaps = 1.-smoothstep(.35,.66,noise(veil)*.78+noise(veil*2.2)*.22);
    float shafts = gaps * smoothstep(.65,.97,alignment) * (1.-smoothstep(.991,.9995,alignment));
    color += gold * shafts * twilight * visible * (1.-mask*.82) * .38;
  }
  gl_FragColor = vec4(color,1.);
}`

export function createAtmosphere(scene: Scene, sky: HemisphericLight, sunlight: DirectionalLight, diameter = 1050) {
  const dome = CreateSphere('Atmospheric sky', { diameter, segments: 24 }, scene)
  dome.isPickable = false
  const material = new ShaderMaterial('Island atmosphere', scene, { vertexSource: skyVertex, fragmentSource: skyFragment }, {
    attributes: ['position'], uniforms: ['worldViewProjection', 'sunDir', 'horizon', 'zenith', 'time', 'rain', 'light'],
  })
  material.backFaceCulling = false
  dome.material = material
  const random = seededRandom(643311)
  const drops = Array.from({ length: 190 }, () => ({ x: (random() - 0.5) * 28, z: (random() - 0.5) * 28, y: random() * 17 }))
  const lines = drops.map(() => [Vector3.Zero(), Vector3.Zero()])
  const rain = CreateLineSystem('Rain', { lines, updatable: true }, scene)
  rain.color = Color3.FromHexString('#9dc0d0')
  rain.isPickable = false
  rain.alwaysSelectAsActiveMesh = true
  const sun = Vector3.Zero()
  const horizon = new Color3()
  const zenith = new Color3()
  const dusk = Color3.FromHexString('#e5a48b')
  const day = Color3.FromHexString('#c0dfe1')
  const night = Color3.FromHexString('#172842')
  const rainTint = Color3.FromHexString('#657c88')
  const amber = Color3.FromHexString('#ffad7b')
  const white = Color3.FromHexString('#fff3d7')
  return {
    update(time: number, weather: Weather, camera: Vector3, close: boolean, fogScale = 1) {
      const theta = (weather.hour - 6) * Math.PI / 12
      sun.set(-Math.cos(theta), Math.sin(theta), -0.24).normalize()
      const light = Math.max(0, Math.min(1, (sun.y + 0.11) * 2.65))
      const twilight = Math.max(0, 1 - Math.abs(sun.y) * 4.5)
      Color3.LerpToRef(night, day, light, horizon)
      Color3.LerpToRef(horizon, dusk, twilight * 0.73 * (1 - weather.rain), horizon)
      Color3.LerpToRef(horizon, rainTint, weather.rain * 0.76, horizon)
      zenith.set(0.035 + light * 0.25, 0.068 + light * 0.46, 0.16 + light * 0.57)
      Color3.LerpToRef(zenith, rainTint, weather.rain * 0.64, zenith)
      scene.fogColor.copyFrom(horizon)
      scene.clearColor.set(horizon.r, horizon.g, horizon.b, 1)
      if (close) {
        scene.fogStart = (36 - weather.rain * 20) * fogScale
        scene.fogEnd = (135 - weather.rain * 63) * fogScale
      }
      dome.position.copyFrom(camera)
      material.setVector3('sunDir', sun)
      material.setColor3('horizon', horizon)
      material.setColor3('zenith', zenith)
      material.setFloat('rain', weather.rain)
      material.setFloat('light', light)
      material.setFloat('time', time)
      sky.intensity = 0.29 + light * 0.41 - weather.rain * 0.05
      Color3.LerpToRef(white, amber, twilight, sunlight.diffuse)
      sunlight.intensity = Math.max(0, sun.y) ** 0.48 * (1 - weather.rain * 0.83)
      sunlight.direction.set(-sun.x, -Math.max(0.22, sun.y), -sun.z)
      sunlight.position.set(camera.x + sun.x * 65, 82, camera.z + sun.z * 65)
      rain.setEnabled(close && weather.rain > 0.04)
      if (rain.isEnabled()) {
        rain.alpha = weather.rain * 0.54
        for (let i = 0; i < drops.length; i++) {
          const { x, y, z } = drops[i]
          const height = ((y - time * 15) % 17 + 17) % 17 - 7
          lines[i][0].set(camera.x + x - height * 0.11, camera.y + height, camera.z + z)
          lines[i][1].copyFromFloats(lines[i][0].x + 0.08, lines[i][0].y - 0.56, lines[i][0].z)
        }
        CreateLineSystem('Rain', { lines, instance: rain }, scene)
      }
      return 0.24 + light * 0.76
    },
  }
}
