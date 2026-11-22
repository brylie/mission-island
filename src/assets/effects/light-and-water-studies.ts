export const boundaryFade = `
vec2 edge = min(texCoord, 1. - texCoord);
float border = smoothstep(0., .15, min(edge.x, edge.y));
`

export const rainbowFragment = `
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
  `

export const embersFragment = `
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
  `

export const lampHaloFragment = `
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
  `

export const pollenDeform = `
    float age = fract(normal.x + clock * (.12 + normal.z * .083));
    p.x += (age-.5) * 3.0;
    p.y += sin(age*3.14159) * (.30 + normal.y*.51);
    p.z += sin(age*4.1+normal.z*15.) * .33;
  `

export const moonFragment = `
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
  `

export const pollenFragment = `
    float glow = 1. - smoothstep(.10,.98,length(texCoord*2.-1.));
    float glimmer = .56 + .44 * sin(clock*3. + worldPoint.x*3.1 + worldPoint.z*4.9);
    float sunlit = .35 + .65 * smoothstep(-.33,1.,dot(-toEye,sunDirection));
    float density = smoothstep(1. - response,1.04 - response,n.x);
    ink = vec4(vec3(1.,.85,.43), glow * density * (.38 + glimmer*.62) * sunlit);
  `

export const wakeFragment = `
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
  `

export const wadingFragment = `
    float radius = length(localPoint.xz);
    float phase = fract(clock * (1.2 + response * .48));
    float first = softBand(radius, mix(.18, 2.15, phase), mix(.06, .135, phase)) * (1. - phase);
    float next = fract(phase + .5);
    float second = softBand(radius, mix(.18, 2.15, next), mix(.06, .135, next)) * (1. - next) * .55;
    float ring = (first + second) * response;
    float broken = .72 + .28 * studyNoise(localPoint.xz * 4.2);
    ink = vec4(vec3(.72,.93,.88), ring * broken * .83);
  `

export const causticsFragment = `
    ${boundaryFade}
    vec2 p = worldPoint.xz * 3.1;
    float t = clock * .92;
    vec2 lens = vec2(sin(p.x + p.y * .75 + t), cos(p.y - p.x * .54 - t * 1.18));
    vec2 fine = sin(p * 1.08 + lens * 1.95 + vec2(t*.95, -t*.78));
    float focus = pow(max(0., 1. - abs(fine.x + fine.y)), 8.);
    float depth = detail - worldPoint.y;
    float bed = smoothstep(.025, .16, depth) * (1. - smoothstep(.45, 1.13, depth));
    ink = vec4(.70,.97,.66, focus * bed * border * response * .62);
  `

export const rainRingsFragment = `
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
  `

export const shearFragment = `
    float lane = texCoord.x * 2. - 1.;
    float speed = mix(.77, 1.6, 1. - lane * lane);
    vec2 p = vec2(lane * 13., localPoint.z * 2.1 - clock * speed * (response * 5.));
    float channels = studyNoise(vec2(p.x, p.y * .34));
    float strands = pow(max(0., sin(p.y * 2.9 + 15. * channels)), 4.);
    float glint = smoothstep(.38,.74, channels) * strands;
    float clearEdge = (1. - smoothstep(.65, 1., abs(lane))) * smoothstep(.0, .12, texCoord.y) * (1. - smoothstep(.78,1.,texCoord.y));
    ink = vec4(mix(vec3(.29,.60,.65), vec3(.88,.98,.94), glint),
      clearEdge * (.31 + glint * .62) * response);
  `
