import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { seededRandom } from '../seeded-random'
import { groundHeight } from '../terrain'
import type { Pose } from '../world'
import { ridgeLichenRocks } from '../worlds/starter/sites'
import { boundaryFade, createEffect, grid, type Builder, type EffectFrame, type Place } from './render'

const dapple: Builder = (meshes, origin, studio) => {
  const effect = createEffect(meshes, 'Canopy sunflecks', origin, { blend: 'alpha', bias: -1, fragment: `
    ${boundaryFade}
    vec2 drift = vec2(sin(clock*.64), cos(clock*.49)) * .33;
    vec2 solar = sunDirection.xz / max(.32, sunDirection.y) * .7;
    vec2 p = worldPoint.xz * 1.5 + drift + solar;
    float gaps = studyNoise(p + vec2(studyNoise(p*.67),studyNoise(p*.69+8.)) * .8);
    float fleck = smoothstep(.53,.69,gaps) * (.65 + .35 * studyNoise(p*4.1));
    vec3 color = mix(vec3(.11,.24,.18),vec3(.97,.87,.52),fleck);
    ink = vec4(color, border * (1. - rain * .6) * response * mix(.38,.53,fleck));
  ` })
  grid(meshes, effect, 'Dapple on the forest floor', 10, 8, 28,
    (x, z) => studio ? .025 : groundHeight({ x: origin.x + x, z: origin.z + z }) - origin.y + .04)
  return effect
}

const reeds: Builder = (meshes, origin, studio) => {
  const effect = createEffect(meshes, 'Reed leaf transmission', origin, { blend: 'opaque', fragment: `
    float tip = texCoord.y;
    float vein = softBand(texCoord.x,.5,.091) + .16 * sin(texCoord.x * 82.);
    float against = max(0., dot(normalize(toEye.xz), normalize(-sunDirection.xz)));
    float grazing = pow(against, 4.) * (.63 + .37 * max(0., dot(toEye,-sunDirection)));
    float membrane = smoothstep(.05,.95,tip) * (.48 + .52 * sin(texCoord.x * 3.1416));
    vec3 stem = mix(vec3(.19,.34,.12),vec3(.35,.55,.20), tip) + vein * .055;
    vec3 body = diffuseLight(stem, gl_FrontFacing ? n : -n);
    vec3 transmitted = mix(vec3(.39,.68,.19),vec3(.98,.84,.33),membrane);
    ink = vec4(body + transmitted * grazing * membrane * response * 1.18, 1.);
  ` })
  const vertices: number[] = [], uvs: number[] = [], indices: number[] = []
  const random = seededRandom(19335)
  for (let i = 0; i < 32; i++) {
    const x = (random() - .5) * 2.6, z = (random() - .5) * 1.7
    const base = studio ? 0 : groundHeight({ x: origin.x + x, z: origin.z + z }) - origin.y
    const angle = random() * Math.PI * 2
    const leaf = .56 + random() * .97
    const width = .044 + random() * .068
    const dx = Math.cos(angle), dz = Math.sin(angle)
    const rootIndex = vertices.length / 3
    for (let j = 0; j <= 5; j++) {
      const v = j / 5
      const spread = width * (.25 + Math.sin(v * Math.PI) * .81) * (1 - v * .92)
      const bend = v * v * leaf * .45
      for (const side of [-1, 1]) {
        vertices.push(x + dz * bend + dx * spread * side, base + leaf * v - bend * .3, z - dx * bend + dz * spread * side)
        uvs.push((side + 1) / 2, v)
      }
      if (j) {
        const d = rootIndex + j * 2, b = d - 2
        indices.push(b, b + 1, d + 1, b, d + 1, d)
      }
    }
  }
  meshes.surface('Reed clump', vertices, indices, effect.material, effect.root, uvs)
  return effect
}

const lichen: Builder = (meshes, origin) => {
  const effect = createEffect(meshes, 'Lichen hydration', origin, { blend: 'opaque', fragment: `
    vec2 p = worldPoint.xz * 3.3 + worldPoint.y * vec2(1.7, 4.1);
    float colonies = studyNoise(p*.64) * .65 + studyNoise(p*1.61) * .27 + studyNoise(p*5.2) * .08;
    float aspect = smoothstep(.02,.68,n.y);
    float moss = smoothstep(.43,.58,colonies) * aspect;
    float rim = softBand(colonies,.46,.063) * aspect;
    float grit = studyNoise(p*8.8) * .11;
    vec3 rock = mix(vec3(.39,.39,.32), vec3(.68,.65,.52), studyNoise(p*.94)) + grit;
    vec3 crust = mix(vec3(.72,.72,.36),vec3(.40,.52,.19), response);
    vec3 algae = mix(crust,vec3(.66,.78,.28), smoothstep(.58,.76,colonies) * response);
    vec3 color = mix(rock,algae,moss*.93) - rim * vec3(.13,.12,.075);
    float gloss = pow(max(0., dot(reflect(-sunDirection,n), toEye)), 21.) * response * moss * .22;
    ink = vec4(diffuseLight(color,n)+gloss,1.);
  ` })
  for (const [x, z, size] of ridgeLichenRocks) {
    const rock = meshes.sphere(x, size * .23, z, size, size * .74, size * .91, effect.material, effect.root, true, 8)
    rock.rotation.y = x * .62
  }
  return effect
}

const flowers: Builder = (meshes, origin, studio) => {
  const effect = createEffect(meshes, 'Meadow flower opening', origin, { blend: 'opaque', deform: `
    float fold = 1. - response;
    vec2 direction = vec2(cos(uv.y*6.283185), sin(uv.y*6.283185));
    p.xz -= direction * (.112 * fold * uv.x);
    p.y += .155 * fold * uv.x;
  `, fragment: `
    float radial = texCoord.x;
    vec3 petal = mix(vec3(.91,.51,.13),vec3(1.,.91,.56),smoothstep(.12,.72,radial));
    petal += vec3(.013,.005,.0) * sin(radial * 43.);
    float wrap = .67 + .24 * abs(dot(normalize(vec3(n.x, .73, n.z)), sunDirection));
    ink = vec4(petal * wrap * (.36 + daylight * .72),1.);
  ` })
  const vertices: number[] = [], uvs: number[] = [], indices: number[] = []
  const random = seededRandom(8765)
  for (let i = 0; i < 15; i++) {
    const x = (random() - .5) * 3.5, z = (random() - .5) * 2.4
    const height = .26 + random() * .42
    const base = studio ? 0 : groundHeight({ x: origin.x + x, z: origin.z + z }) - origin.y
    const y = base + height
    meshes.cylinder(x, base + height / 2, z, .018, .034, height, 5, '#578044', effect.root, false)
    meshes.sphere(x, y, z, .112, .063, .112, '#c98235', effect.root, false, 6)
    for (let j = 0; j < 6; j++) {
      const direction = (j + random()*.14) / 6
      const a = direction * Math.PI * 2
      const dx = Math.cos(a), dz = Math.sin(a)
      const b = vertices.length / 3
      vertices.push(x, y, z,
        x+dx*.125+dz*.062, y+.031, z+dz*.125-dx*.062,
        x+dx*.125-dz*.062, y+.031, z+dz*.125+dx*.062,
        x+dx*.196, y+.053, z+dz*.196)
      uvs.push(0,direction,.63,direction,.63,direction,1,direction)
      indices.push(b,b+1,b+2,b+1,b+3,b+2)
    }
  }
  meshes.surface('Folding petals', vertices, indices, effect.material, effect.root, uvs)
  return effect
}

function makePrint(meshes: MeshFactory, origin: Place) {
  const print = createEffect(meshes, 'Sand pressure mark', origin, { blend: 'alpha', bias: -1, fragment: `
    vec2 p = texCoord * 2. - 1.;
    float heel = (1. - smoothstep(.49,.89,length((p-vec2(.02,-.37))*vec2(1.54,2.43))));
    float toe = (1. - smoothstep(.45,.89,length((p-vec2(-.08,.30))*vec2(1.27,1.65))));
    float tread = .65 + .35 * sin(p.y * 36. + abs(p.x) * 9.);
    float decay = (1. - smoothstep(.10,.98,detail));
    vec3 sand = mix(vec3(.26,.17,.10),vec3(.53,.39,.22),detail);
    ink = vec4(sand,(toe + heel) * tread * decay * response * .85);
  ` })
  grid(meshes, print, 'Heel and toe depressions', .31, .48)
  print.root.setEnabled(false)
  return print
}

export function createFootprintTrail(meshes: MeshFactory, origin: Place, studio: boolean) {
  const root = new TransformNode('Beach footprints', meshes.scene)
  const stamps = Array.from({ length: 16 }, () => {
    const print = makePrint(meshes, origin)
    print.root.parent = root
    return { print, time: -1000 }
  })
  let next = 0
  let previous: Pose | undefined

  function stamp(at: Pose, y: number, time: number) {
    const entry = stamps[next]
    const side = next % 2 ? .117 : -.117
    entry.print.root.position.set(at.x + Math.cos(at.heading)*side, y, at.z - Math.sin(at.heading)*side)
    entry.print.root.rotation.y = at.heading + side * .59
    entry.time = time
    next = (next + 1) % stamps.length
  }

  return {
    root,
    clear() {
      previous = undefined
      for (const stamp of stamps) stamp.time = -1000
    },
    step(at: Pose | undefined, time: number) {
      if (!at) { previous = undefined; return }
      const gap = previous ? Math.hypot(previous.x - at.x, previous.z - at.z) : 0
      if (!previous || gap > 3) previous = at
      if (gap < .59 || gap > 3) return
      stamp(at, groundHeight(at) + .028, time)
      previous = at
    },
    pose(frame: EffectFrame, response: number, demo = Number(studio)) {
      if (demo) {
        next = 0
        for (let i = 0; i < 9; i++) {
          const across = Math.sin(i*.37) * .41 - .24
          const along = i*.47 - 1.88
          const angle = studio ? 0 : .70
          const x = origin.x + across*Math.cos(angle) + along*Math.sin(angle)
          const z = origin.z - across*Math.sin(angle) + along*Math.cos(angle)
          const age = ((frame.time + i*.48) % 8) * .8
          stamp({ x, z, heading: angle + Math.cos(i*.37)*.30 },
            (studio ? origin.y : groundHeight({ x, z })) + .027, frame.time - age)
        }
      }
      const life = (1.1 + response * 11.4) * (1 - frame.weather.rain * .72)
      for (const { print, time } of stamps) {
        const age = frame.time - time
        print.root.setEnabled(age >= 0 && age < life)
        if (print.root.isEnabled()) print.pose(frame, .44 + response * .56, age / life)
      }
    },
  }
}

export const vegetationBuilders = {
  'canopy-dapple': dapple, 'reed-transmission': reeds, 'sand-footprints': createFootprintTrail,
  'ridge-lichen': lichen, 'closing-flowers': flowers,
}
