export const pilingFragment = `
    vec2 bark = vec2(texCoord.x * 35., localPoint.y * 2.);
    float fibers = .63 * studyNoise(bark) + .37 * studyNoise(bark * vec2(2.31,.38));
    float wet = 1. - smoothstep(detail-.025,detail+.08,worldPoint.y);
    float stain = worldPoint.y - detail - (.055 + .13 * studyNoise(vec2(texCoord.x * 13.,4.)));
    float salt = softBand(stain,.16,.31) * smoothstep(.36,.68,fibers) * (1. - wet) * response;
    float crystals = smoothstep(.70,.85,studyNoise(worldPoint.xz * 50. + worldPoint.y * 13.));
    vec3 timber = mix(vec3(.24,.13,.07),vec3(.61,.42,.24),fibers) * (1. - wet * .53);
    timber = mix(timber,vec3(.89,.86,.69) + crystals * .1, smoothstep(.07,.42,salt));
    ink = vec4(diffuseLight(timber,n),1.);
  `

export const awningDeform = `
    float sag = pow(max(0.,sin(uv.x * 3.141593) * sin(uv.y * 3.141593)),1.6);
    p.y -= sag * response * .38;
  `

export const awningFragment = `
    float pocket = pow(max(0.,sin(texCoord.x * 3.141593) * sin(texCoord.y * 3.141593)),2.2);
    float stripe = step(.46,fract(texCoord.x*7.));
    float weave = .94 + .032 * sin(texCoord.x*420.) + .026 * sin(texCoord.y*297.);
    vec3 canvas = mix(vec3(.91,.73,.48),vec3(.57,.29,.20),stripe) * weave;
    float pond = smoothstep(.28,.81,pocket*response);
    float sheen = pow(max(0.,1.-abs(dot(toEye,n))),3.);
    vec3 color = diffuseLight(canvas * (1. - pond*.48),gl_FrontFacing ? n : -n);
    ink = vec4(color + vec3(.37,.49,.51) * pond * sheen * .39,1.);
  `

export const windowFragment = `
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
  `

export const reflectorsFragment = `
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
  `

export const ropeFragment = `
    float plies = pow(.5 + .5*sin(18.85*(texCoord.y + texCoord.x*6.)),4.);
    float bristles = studyNoise(vec2(texCoord.x*63.,texCoord.y*99. + texCoord.x*41.));
    vec3 base = mix(vec3(.35,.23,.105),vec3(.71,.56,.32),.54 + .32*plies) + bristles*.095;
    float azimuth = texCoord.x * 18.85;
    vec3 tangent = normalize(vec3(-sin(azimuth),.07,cos(azimuth)));
    vec3 halfAngle = normalize(toEye + sunDirection);
    float shine = pow(max(0.,1.-abs(dot(halfAngle,tangent))),17.) * max(0.,dot(n,halfAngle));
    ink = vec4(diffuseLight(base,n) + vec3(1.,.79,.43) * shine*response*(.24+.53*plies),1.);
  `
