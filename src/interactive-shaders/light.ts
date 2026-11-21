import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import { seededRandom } from '../seeded-random'
import { groundHeight } from '../terrain'
import { boundaryFade, card, createEffect, grid, type Builder } from './render'

const rainbow: Builder = (meshes, origin) => {
  const effect = createEffect(meshes, 'Spectral spray arc', origin, { blend: 'add', fragment: `
    ${boundaryFade}
    float angle = acos(clamp(dot(-toEye,-sunDirection),-1.,1.));
    float red = softBand(angle,.738,.020);
    float green = softBand(angle,.719,.018);
    float blue = softBand(angle,.701,.019);
    float violet = softBand(angle,.684,.022);
    vec3 spectrum = vec3(1.,.20,.075)*red + vec3(.29,.94,.18)*green
      + vec3(.08,.46,1.)*blue + vec3(.43,.12,.91)*violet;
    float spray = .73 + .27 * studyNoise(worldPoint.xz*.88 + vec2(clock*.18,-clock*.33));
    float plume = (1. - smoothstep(.2,.70,length((texCoord-.5)*vec2(.93,1.06))));
    ink = vec4(spectrum, border * spray * plume * response * (1. - rain*.8) * .87);
  ` })
  card(meshes, effect, 'Fernfall spray volume', 9.8, 6.1, true)
  return effect
}

const embers: Builder = (meshes, origin, studio) => {
  const effect = createEffect(meshes, 'Cooling ash and cracks', origin, { blend: 'alpha', bias: -1, fragment: `
    float bed = length(localPoint.xz / vec2(1.55,1.23));
    vec2 p = worldPoint.xz * 5.;
    float lumps = studyNoise(p*.41 + 6.);
    float grain = studyNoise(p * 2.2);
    float fissure = pow(max(0.,1.-abs(studyNoise(p) * 2. - 1.)),11.);
    float heat = smoothstep(bed*.67+lumps*.45+.03,bed*.67+lumps*.45+.26,response);
    float fleck = .79 + .21 * sin(clock*8.1+lumps*43.);
    vec3 ash = mix(vec3(.106,.099,.077),vec3(.32,.28,.20),grain);
    vec3 glow = mix(vec3(.60,.085,.016),vec3(1.,.66,.18),heat * fissure);
    vec3 color = ash * (.48 + daylight*.46) + glow * heat * (fissure*.94+.11) * fleck;
    float ragged = bed + (grain-.5)*.19;
    ink = vec4(color,1.-smoothstep(.65,1.11,ragged));
  ` })
  grid(meshes, effect, 'Charred forest floor', 3.6, 3.1, 18,
    (x, z) => studio ? .022 : groundHeight({ x: origin.x + x, z: origin.z + z }) - origin.y + .074)
  return effect
}

const lampHalo: Builder = (meshes, origin, studio) => {
  const effect = createEffect(meshes, 'Lamplit raindrops', origin, { blend: 'add', fragment: `
    vec2 p = texCoord - vec2(.5,.68);
    float halo = exp(-length(p*vec2(3.5,2.7))*5.);
    float pool = exp(-length((p+vec2(.0,.21))*vec2(3.8,1.9))*3.);
    vec2 grain = (texCoord + vec2(texCoord.y*.13,clock*.38)) * vec2(48.,12.);
    vec2 tile = floor(grain), f = fract(grain);
    float seed = studyHash(tile);
    float line = softBand(f.x,.2 + .6*seed,.056)
      * smoothstep(.1,.5,f.y)*(1.-smoothstep(.63,.9,f.y));
    float droplets = line * smoothstep(.49,.78,seed) * pool * response;
    ink = vec4(vec3(1.,.66,.29), detail * (halo * (.29 + response*.67) + droplets * 1.24 + pool*response*.38));
  ` })
  const veil = card(meshes, effect, 'Lamp halo and falling droplets', 4.3, 4.05, true)
  veil.position.y = -.70
  if (studio) {
    meshes.cylinder(.28,-1.26,.03,.084,.132,2.57,8,'#48584e',effect.root)
    meshes.box(.12,.11,0,.39,.084,.084,'#4e5b54',effect.root)
    meshes.cylinder(0,.08,0,.20,.36,.13,10,'#4e5b54',effect.root)
    const globe = meshes.paint('#ffdf89', true)
    meshes.sphere(0,-.04,0,.22,.16,.22,globe,effect.root,false,8)
  }
  return effect
}

const pollen: Builder = (meshes, origin) => {
  const effect = createEffect(meshes, 'Meadow pollen drift', origin, { blend: 'add', deform: `
    float age = fract(normal.x + clock * (.12 + normal.z * .083));
    p.x += (age-.5) * 3.0;
    p.y += sin(age*3.14159) * (.30 + normal.y*.51);
    p.z += sin(age*4.1+normal.z*15.) * .33;
  `, fragment: `
    float glow = 1. - smoothstep(.10,.98,length(texCoord*2.-1.));
    float glimmer = .56 + .44 * sin(clock*3. + worldPoint.x*3.1 + worldPoint.z*4.9);
    float sunlit = .35 + .65 * smoothstep(-.33,1.,dot(-toEye,sunDirection));
    float density = smoothstep(1. - response,1.04 - response,n.x);
    ink = vec4(vec3(1.,.85,.43), glow * density * (.38 + glimmer*.62) * sunlit);
  ` })
  const positions: number[] = [], uvs: number[] = [], normals: number[] = [], indices: number[] = []
  const random = seededRandom(876)
  for (let i = 0; i < 56; i++) {
    const x = (random()-.5)*7, y = .37 + random() * 1.42, z = (random()-.5)*5
    const radius = .019 + random()*.042
    const seed = [random(),random()*.46+.27,random()*.44+.22]
    for (const dir of [-1,1]) {
      const first = positions.length/3
      for (const [u,v] of [[0,0],[1,0],[1,1],[0,1]]) {
        const edge = (u-.5)*radius*2
        positions.push(x+edge,y+(v-.5)*radius*2,z+dir*edge*.74)
        uvs.push(u,v)
        normals.push(...seed)
      }
      indices.push(first,first+1,first+2,first,first+2,first+3)
    }
  }
  const motes = meshes.surface('Seeded pollen motes',positions,indices,effect.material,effect.root,uvs)
  motes.setVerticesData(VertexBuffer.NormalKind,normals)
  motes.alphaIndex = 5
  return effect
}

const moon: Builder = (meshes, origin) => {
  const effect = createEffect(meshes, 'Moonlit wave facets', origin, { blend: 'add', fragment: `
    ${boundaryFade}
    vec2 p = worldPoint.xz;
    float swell = sin(dot(p,vec2(.73,1.84))-clock*1.6);
    float chop = sin(dot(p,vec2(-1.65,2.75))+clock*2.2+1.6*swell);
    float speck = studyNoise(p*3.1+vec2(clock*.82,-clock*.28))-.5;
    vec3 normal = normalize(vec3(swell*.14+speck*.20,1.,chop*.116+speck*.12));
    vec3 moon = normalize(vec3(-.18,.17,.97));
    vec3 halfVector = normalize(moon+toEye);
    float glint = pow(max(0.,dot(normal,halfVector)),71.);
    float ribbon = pow(max(0.,dot(normalize(-toEye.xz),normalize(moon.xz))),32.);
    float crest = smoothstep(-.29,.79,swell+chop*.31);
    vec3 silver = mix(vec3(.27,.48,.72),vec3(.73,.89,1.),glint);
    ink = vec4(silver, border * response * ribbon * glint * crest * .9);
  ` })
  grid(meshes,effect,'Glitter path',22,28)
  return effect
}

export const lightBuilders = {
  'fernfall-rainbow': rainbow, 'cooling-embers': embers, 'streetlamp-droplets': lampHalo,
  'meadow-pollen': pollen, 'moon-glitter': moon,
}
