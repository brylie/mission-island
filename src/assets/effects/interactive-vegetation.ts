export const dappleFragment = `
    vec2 drift = vec2(sin(clock*.64), cos(clock*.49)) * .33;
    vec2 solar = sunDirection.xz / max(.32, sunDirection.y) * .7;
    vec2 p = worldPoint.xz * 1.5 + drift + solar;
    float gaps = studyNoise(p + vec2(studyNoise(p*.67),studyNoise(p*.69+8.)) * .8);
    float fleck = smoothstep(.53,.69,gaps) * (.65 + .35 * studyNoise(p*4.1));
    vec3 color = mix(vec3(.11,.24,.18),vec3(.97,.87,.52),fleck);
    ink = vec4(color, border * (1. - rain * .6) * response * mix(.38,.53,fleck));
  `

export const reedsFragment = `
    float tip = texCoord.y;
    float vein = softBand(texCoord.x,.5,.091) + .16 * sin(texCoord.x * 82.);
    float against = max(0., dot(normalize(toEye.xz), normalize(-sunDirection.xz)));
    float grazing = pow(against, 4.) * (.63 + .37 * max(0., dot(toEye,-sunDirection)));
    float membrane = smoothstep(.05,.95,tip) * (.48 + .52 * sin(texCoord.x * 3.1416));
    vec3 stem = mix(vec3(.19,.34,.12),vec3(.35,.55,.20), tip) + vein * .055;
    vec3 body = diffuseLight(stem, gl_FrontFacing ? n : -n);
    vec3 transmitted = mix(vec3(.39,.68,.19),vec3(.98,.84,.33),membrane);
    ink = vec4(body + transmitted * grazing * membrane * response * 1.18, 1.);
  `

export const lichenFragment = `
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
  `

export const flowersDeform = `
    float fold = 1. - response;
    vec2 direction = vec2(cos(uv.y*6.283185), sin(uv.y*6.283185));
    p.xz -= direction * (.112 * fold * uv.x);
    p.y += .155 * fold * uv.x;
  `

export const flowersFragment = `
    float radial = texCoord.x;
    vec3 petal = mix(vec3(.91,.51,.13),vec3(1.,.91,.56),smoothstep(.12,.72,radial));
    petal += vec3(.013,.005,.0) * sin(radial * 43.);
    float wrap = .67 + .24 * abs(dot(normalize(vec3(n.x, .73, n.z)), sunDirection));
    ink = vec4(petal * wrap * (.36 + daylight * .72),1.);
  `

export const footprintFragment = `
    vec2 p = texCoord * 2. - 1.;
    float heel = (1. - smoothstep(.49,.89,length((p-vec2(.02,-.37))*vec2(1.54,2.43))));
    float toe = (1. - smoothstep(.45,.89,length((p-vec2(-.08,.30))*vec2(1.27,1.65))));
    float tread = .65 + .35 * sin(p.y * 36. + abs(p.x) * 9.);
    float decay = (1. - smoothstep(.10,.98,detail));
    vec3 sand = mix(vec3(.26,.17,.10),vec3(.53,.39,.22),detail);
    ink = vec4(sand,(toe + heel) * tread * decay * response * .85);
  `
