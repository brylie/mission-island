import { Matrix } from '@babylonjs/core/Maths/math.vector'
import { fernfallSection, groundHeight, streamX } from '../terrain'
import { boundaryFade, createEffect, grid, type Builder } from './render'

const wake: Builder = (meshes, origin) => {
  const effect = createEffect(meshes, 'Kelvin wake', origin, { blend: 'alpha', fragment: `
    float back = -localPoint.z - 1.9;
    float side = abs(localPoint.x);
    float travel = max(0., back);
    float wing = 1. - smoothstep(.15, 1.15, abs(side - (.68 + .32 * travel)));
    float wavelength = mix(5.7, 2.6, response);
    float ridges = pow(max(0., sin(travel * wavelength - side * 3.1 - clock * (1.2 + response * 6.4))), 5.);
    float churn = exp(-side * side * (.9 + travel * .15)) * smoothstep(.42, .81,
      studyNoise(vec2(localPoint.x * 4.5, travel * 2.9 - clock * (2. + 5. * response))));
    float fade = smoothstep(.02, .85, back) * (1. - smoothstep(4.5, 12., travel));
    ink = vec4(mix(vec3(.38,.77,.78), vec3(.89,.98,.93), ridges),
      response * fade * (wing * ridges * .82 + churn * .55));
  ` })
  const wakeGrid = grid(meshes, effect, 'Wake behind the transom', 11, 13)
  wakeGrid.bakeTransformIntoVertices(Matrix.Translation(0, 0, -7.7))
  return effect
}

const wading: Builder = (meshes, origin) => {
  const effect = createEffect(meshes, 'Wader impulse rings', origin, { blend: 'alpha', fragment: `
    float radius = length(localPoint.xz);
    float phase = fract(clock * (1.2 + response * .48));
    float first = softBand(radius, mix(.18, 2.15, phase), mix(.06, .135, phase)) * (1. - phase);
    float next = fract(phase + .5);
    float second = softBand(radius, mix(.18, 2.15, next), mix(.06, .135, next)) * (1. - next) * .55;
    float ring = (first + second) * response;
    float broken = .72 + .28 * studyNoise(localPoint.xz * 4.2);
    ink = vec4(vec3(.72,.93,.88), ring * broken * .83);
  ` })
  grid(meshes, effect, 'Wading ring footprint', 4.5, 4.5)
  return effect
}

const caustics: Builder = (meshes, origin, studio) => {
  const effect = createEffect(meshes, 'Focused seabed light', origin, { blend: 'add', bias: -1, fragment: `
    ${boundaryFade}
    vec2 p = worldPoint.xz * 3.1;
    float t = clock * .92;
    vec2 lens = vec2(sin(p.x + p.y * .75 + t), cos(p.y - p.x * .54 - t * 1.18));
    vec2 fine = sin(p * 1.08 + lens * 1.95 + vec2(t*.95, -t*.78));
    float focus = pow(max(0., 1. - abs(fine.x + fine.y)), 8.);
    float depth = detail - worldPoint.y;
    float bed = smoothstep(.025, .16, depth) * (1. - smoothstep(.45, 1.13, depth));
    ink = vec4(.70,.97,.66, focus * bed * border * response * .62);
  ` })
  grid(meshes, effect, 'Caustics on the bed', 6.7, 5.7, 32, (x, z) => studio
    ? -.29 - .14 * Math.exp(-(x*x+z*z) * .75)
    : groundHeight({ x: origin.x + x, z: origin.z + z }) - origin.y + .029, -1)
  return effect
}

const rainRings: Builder = (meshes, origin) => {
  const effect = createEffect(meshes, 'Rain impacts on water', origin, { blend: 'alpha', fragment: `
    ${boundaryFade}
    vec2 field = worldPoint.xz * 2.4;
    vec2 tile = floor(field);
    float hits = 0.;
    for (int i = 0; i < 9; i++) {
      if (detail > .5 && (i == 0 || i == 2 || i == 6 || i == 8)) continue;
      vec2 cell = tile + vec2(float(i - (i / 3) * 3 - 1), float(i / 3 - 1));
      float seed = studyHash(cell);
      float age = fract(clock * (.83 + seed * .53) + seed * 17.);
      vec2 origin = cell + .11 + vec2(studyHash(cell + 4.), studyHash(cell - 7.)) * .78;
      float radius = length(field - origin);
      float ripple = softBand(radius, age * (detail > .5 ? .53 : .84), .042 + age * .036) * (1. - age) * smoothstep(0., .07, age);
      hits += ripple * (1. - smoothstep(response, response + .18, seed));
    }
    ink = vec4(.75,.91,1., hits * border * smoothstep(0., .20, response) * .84);
  ` })
  grid(meshes, effect, 'Rain disturbance footprint', 12, 11)
  return effect
}

const shear: Builder = (meshes, origin, studio) => {
  const effect = createEffect(meshes, 'Sheared spring spill', origin, { blend: 'alpha', fragment: `
    float lane = texCoord.x * 2. - 1.;
    float speed = mix(.77, 1.6, 1. - lane * lane);
    vec2 p = vec2(lane * 13., localPoint.z * 2.1 - clock * speed * (response * 5.));
    float channels = studyNoise(vec2(p.x, p.y * .34));
    float strands = pow(max(0., sin(p.y * 2.9 + 15. * channels)), 4.);
    float glint = smoothstep(.38,.74, channels) * strands;
    float clearEdge = (1. - smoothstep(.65, 1., abs(lane))) * smoothstep(.0, .12, texCoord.y) * (1. - smoothstep(.78,1.,texCoord.y));
    ink = vec4(mix(vec3(.29,.60,.65), vec3(.88,.98,.94), glint),
      clearEdge * (.31 + glint * .62) * response);
  ` })
  const vertices: number[] = [], indices: number[] = [], uvs: number[] = []
  for (let row = 0; row <= 54; row++) {
    const progress = row / 54
    const z = 83.5 + progress * 7.7
    const section = fernfallSection(z)
    for (let col = 0; col <= 12; col++) {
      const u = col / 12
      const lane = u * 2 - 1
      const center = studio ? Math.sin(progress * 2.9) * .34 : streamX(z) - origin.x
      const y = studio ? (section.y + .115) * .72 : section.y - origin.y
      const localZ = studio ? z - 87.4 : z - origin.z
      vertices.push(center + lane * section.halfWidth * .92, y + .041, localZ)
      uvs.push(u, progress)
      if (row && col) {
        const d = row * 13 + col, b = d - 13
        indices.push(b - 1, b, d, b - 1, d, d - 1)
      }
    }
  }
  const spill = meshes.surface('Spill flow ribbons', vertices, indices, effect.material, effect.root, uvs)
  spill.alphaIndex = 5
  return effect
}

export const waterBuilders = {
  'skiff-wake': wake, 'wading-rings': wading, 'seabed-caustics': caustics, 'water-rain-rings': rainRings, 'waterfall-shear': shear,
}
