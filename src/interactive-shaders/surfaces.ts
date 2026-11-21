import { createDockPile } from '../assets/waterfront'
import { saltBloomPile } from './catalog'
import { card, createEffect, grid, type Builder } from './render'

const piling: Builder = (meshes, origin) => {
  const effect = createEffect(meshes, 'Harborside salt efflorescence', origin, { blend: 'opaque', fragment: `
    vec2 bark = vec2(texCoord.x * 35., localPoint.y * 2.);
    float fibers = .63 * studyNoise(bark) + .37 * studyNoise(bark * vec2(2.31,.38));
    float wet = 1. - smoothstep(detail-.025,detail+.08,worldPoint.y);
    float stain = worldPoint.y - detail - (.055 + .13 * studyNoise(vec2(texCoord.x * 13.,4.)));
    float salt = softBand(stain,.16,.31) * smoothstep(.36,.68,fibers) * (1. - wet) * response;
    float crystals = smoothstep(.70,.85,studyNoise(worldPoint.xz * 50. + worldPoint.y * 13.));
    vec3 timber = mix(vec3(.24,.13,.07),vec3(.61,.42,.24),fibers) * (1. - wet * .53);
    timber = mix(timber,vec3(.89,.86,.69) + crystals * .1, smoothstep(.07,.42,salt));
    ink = vec4(diffuseLight(timber,n),1.);
  ` })
  const { bottom, top, diameter } = saltBloomPile
  const halfHeight = (top - bottom) / 2
  createDockPile(meshes, { x: 0, z: 0, bottom: -halfHeight, top: halfHeight, diameter }, effect.material, effect.root)
  return effect
}

const awning: Builder = (meshes, origin) => {
  const effect = createEffect(meshes, 'Rain-weighted canvas', origin, { blend: 'opaque', deform: `
    float sag = pow(max(0.,sin(uv.x * 3.141593) * sin(uv.y * 3.141593)),1.6);
    p.y -= sag * response * .38;
  `, fragment: `
    float pocket = pow(max(0.,sin(texCoord.x * 3.141593) * sin(texCoord.y * 3.141593)),2.2);
    float stripe = step(.46,fract(texCoord.x*7.));
    float weave = .94 + .032 * sin(texCoord.x*420.) + .026 * sin(texCoord.y*297.);
    vec3 canvas = mix(vec3(.91,.73,.48),vec3(.57,.29,.20),stripe) * weave;
    float pond = smoothstep(.28,.81,pocket*response);
    float sheen = pow(max(0.,1.-abs(dot(toEye,n))),3.);
    vec3 color = diffuseLight(canvas * (1. - pond*.48),gl_FrontFacing ? n : -n);
    ink = vec4(color + vec3(.37,.49,.51) * pond * sheen * .39,1.);
  ` })
  grid(meshes, effect, 'Canvas stretched to fixed edges', 3.35, 2.1, 28, (_x, z) => 2.18 - z * 0.19)
  for (const x of [-1.66, 1.66]) {
    meshes.box(x, 0.98, 1.04, 0.069, 1.98, 0.069, '#566457', effect.root)
    meshes.box(x, 1.18, -1.04, 0.069, 2.38, 0.069, '#566457', effect.root)
  }
  for (const z of [-1.05, 1.05]) meshes.box(0, 2.176 - z * 0.19, z, 3.46, 0.061, 0.068, '#756854', effect.root)
  return effect
}

const window: Builder = (meshes, origin, studio) => {
  const effect = createEffect(meshes, 'Recessed glazed interior', origin, { blend: 'opaque', fragment: `
    vec2 p = texCoord;
    vec2 parallax = clamp(toEye.xy/max(.28,abs(toEye.z)),vec2(-2.),vec2(2.));
    vec2 deep = p - parallax * response * .26;
    vec2 middle = p - parallax * response * .105;
    float backRoom = smoothstep(.02,.11,min(min(deep.x,1.-deep.x),min(deep.y,1.-deep.y)));
    float plaster = .75 + .25 * studyNoise(deep * 6.);
    vec3 wall = mix(vec3(.11,.125,.12),vec3(.57,.36,.19)*plaster,backRoom);
    float sill = 1. - smoothstep(.25,.29,deep.y);
    wall = mix(wall,vec3(.28,.16,.10),sill);
    float frame = softBand(middle.x,.62,.18)*softBand(middle.y,.59,.22);
    float lamp = exp(-length((deep-vec2(.34,.58))*vec2(2.,1.2))*6.);
    wall = mix(wall,vec3(.27,.18,.14),frame*.8) + vec3(.82,.44,.13)*lamp;
    float glass = .18 + .49 * pow(1.-clamp(abs(toEye.z),0.,1.),2.4);
    vec3 exterior = mix(vec3(.18,.31,.36), fogTint, .38);
    ink = vec4(mix(exterior, mix(wall, exterior, glass), smoothstep(.04,.41,response)),1.);
  ` })
  card(meshes, effect, 'Window pane', 0.958, 0.766)
  if (studio) {
    for (const x of [-0.56, 0.56]) meshes.box(x, 0, 0.028, 0.14, 0.96, 0.12, '#e7cda1', effect.root)
    for (const y of [-0.475, 0.475]) meshes.box(0, y, 0.022, 1.25, 0.11, 0.14, '#dfc89e', effect.root)
    meshes.box(0, 0, -0.013, 0.04, 0.85, 0.04, '#d4bf97', effect.root)
    meshes.box(-0.93, 0, 0.18, 0.65, 2.1, 0.24, '#71958e', effect.root)
    meshes.box(0.93, 0, 0.18, 0.65, 2.1, 0.24, '#71958e', effect.root)
  }
  return effect
}

const reflectors: Builder = (meshes, origin) => {
  const effect = createEffect(meshes, 'Glass-bead retroreflection', origin, { blend: 'opaque', fragment: `
    vec3 backToLamp = lamp - worldPoint;
    float metres = length(backToLamp);
    vec3 toLamp = backToLamp / max(.1,metres);
    float cone = smoothstep(.82,.965,dot(-toLamp.xz, beam));
    float retro = pow(max(0., dot(toEye,toLamp)), 49.);
    float facing = .31 + .69 * abs(dot(n,toLamp));
    float nearFalloff = 1. / (1. + metres*metres*.017);
    float beads = .80 + .2 * studyNoise(texCoord * vec2(48.,20.));
    vec3 beamTint = vec3(1.,.82,.46);
    vec3 matte = vec3(.48,.40,.19) * (.24 + daylight*.6);
    ink = vec4(matte + beamTint * 1.8 * response * cone * retro * facing * nearFalloff * beads,1.);
  ` })
  for (const x of [-1.2, -0.15, 0.9, 1.95]) {
    const body = meshes.box(x, 0.09, 0, 0.42, 0.16, 0.21, '#555950', effect.root, false)
    body.rotation.y = 1.15
    const lens = card(meshes, effect, 'Roadside bead inset', 0.35, 0.105)
    lens.rotation.y = 1.15
    lens.position.set(x - 0.111, 0.104, -0.050)
  }
  return effect
}

const rope: Builder = (meshes, origin) => {
  const effect = createEffect(meshes, 'Twisted jute fibers', origin, { blend: 'opaque', fragment: `
    float plies = pow(.5 + .5*sin(18.85*(texCoord.y + texCoord.x*6.)),4.);
    float bristles = studyNoise(vec2(texCoord.x*63.,texCoord.y*99. + texCoord.x*41.));
    vec3 base = mix(vec3(.35,.23,.105),vec3(.71,.56,.32),.54 + .32*plies) + bristles*.095;
    float azimuth = texCoord.x * 18.85;
    vec3 tangent = normalize(vec3(-sin(azimuth),.07,cos(azimuth)));
    vec3 halfAngle = normalize(toEye + sunDirection);
    float shine = pow(max(0.,1.-abs(dot(halfAngle,tangent))),17.) * max(0.,dot(n,halfAngle));
    ink = vec4(diffuseLight(base,n) + vec3(1.,.79,.43) * shine*response*(.24+.53*plies),1.);
  ` })
  const pos: number[] = [], uvs: number[] = [], indices: number[] = []
  for (let i = 0; i <= 132; i++) {
    const u = i / 132, a = u * Math.PI * 6
    const center = 0.67 - u * 0.21
    for (let j = 0; j <= 12; j++) {
      const v = j / 12, turn = v * Math.PI * 2
      const r = center + Math.cos(turn) * 0.075
      pos.push(Math.cos(a) * r, 0.095 + u * 0.36 + Math.sin(turn) * 0.075, Math.sin(a) * r)
      uvs.push(u, v)
      if (i && j) {
        const d = i * 13 + j, b = d - 13
        indices.push(b - 1, d, b, b - 1, d - 1, d)
      }
    }
  }
  meshes.surface('Three turns of mooring rope', pos, indices, effect.material, effect.root, uvs)
  return effect
}

export const surfaceBuilders = {
  'timber-salt-bloom': piling,
  'awning-rain-load': awning,
  'window-parallax': window,
  'road-retroreflector': reflectors,
  'rope-fiber-sheen': rope,
}
