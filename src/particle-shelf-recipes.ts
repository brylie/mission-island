import type { ParticleRecipe } from './particle-recipes.ts'

export const shelfParticleRecipes = {
  'skiff-wake-foam': {
    shape: 'foam', surface: 'ground', rate: 65, life: [.68, 1.65], spread: [.16, 0, .16],
    velocity: [0, 0, -.6], variation: [.19, 0, .48], acceleration: [0, 0, 0],
    size: [.21, .62], growth: 1.8, aspect: 1.6, color: [.81, .97, .95], opacity: .67, fadeIn: .12, spin: 1.5,
  },
  'wading-crescents': {
    shape: 'crescent', surface: 'ground', rate: 46, life: [.32, .64], spread: [.085, 0, .065],
    velocity: [0, 0, .9], variation: [.19, 0, .36], acceleration: [0, 0, -.8],
    size: [.23, .38], growth: 3.35, aspect: 1.52, color: [.8, .99, 1], opacity: .81, fadeIn: .16,
  },
  'hooked-fish-thrash': {
    shape: 'ring', surface: 'ground', rate: 16, life: [.55, 1.03], spread: [.051, 0, .067],
    velocity: [.035, 0, 0], variation: [.055, 0, .06], acceleration: [0, 0, 0],
    size: [.19, .36], growth: 5.2, aspect: 1.19, color: [.73, .97, .98], opacity: .85, fadeIn: .09,
  },
  'submerged-bubble-trail': {
    shape: 'bubble', rate: 25, life: [.72, 1.63], spread: [.28, .092, .13],
    velocity: [-.14, .72, -.35], variation: [.24, .24, .24], acceleration: [0, .33, 0],
    size: [.087, .208], growth: 1.55, aspect: .91, color: [.69, .94, 1], opacity: .88, fadeIn: .085, flutter: .088,
  },
  'eddy-foam-flecks': {
    shape: 'foam', surface: 'ground', rate: 38, life: [1.2, 2.4], spread: [.1, 0, .14],
    velocity: [0, 0, 0], variation: [.028, 0, .04], acceleration: [0, 0, 0],
    size: [.099, .28], growth: 1.45, aspect: 1.85, color: [.82, .98, .92], opacity: .78, fadeIn: .12, spin: 2.2,
  },
  'puddle-strike-rings': {
    shape: 'ring', surface: 'ground', rate: 32, life: [.27, .66], spread: [1.1, 0, .66],
    velocity: [0, 0, 0], variation: [0, 0, 0], acceleration: [0, 0, 0],
    size: [.064, .114], growth: 5.8, aspect: 1, color: [.82, .97, 1], opacity: .9, fadeIn: .15,
  },
  'window-spatter': {
    shape: 'bead', surface: 'vertical', rate: 19, life: [.64, 1.8], spread: [.74, .48, 0],
    velocity: [0, -.095, 0], variation: [0, .07, 0], acceleration: [0, -.63, 0],
    size: [.046, .096], growth: .9, aspect: .82, color: [.68, .9, .96], opacity: .94, fadeIn: .036,
    adhesion: .35, stretch: 3.2,
  },
  'sunbeam-dust': {
    shape: 'mote', rate: 27, life: [1.03, 2.55], spread: [.45, .78, .45],
    velocity: [.36, .14, -.08], variation: [.16, .15, .14], acceleration: [.02, 0, 0],
    size: [.019, .077], growth: .77, aspect: .91, color: [1, .88, .53], opacity: .96, fadeIn: .27,
    flutter: .09, wind: .48,
  },
  'sand-skitter': {
    shape: 'foam', surface: 'ground', rate: 74, life: [.33, .93], spread: [.22, 0, .77],
    velocity: [3.7, 0, .12], variation: [1.1, 0, .38], acceleration: [-3.2, 0, 0],
    size: [.15, .41], growth: 1.95, aspect: 3.1, color: [.84, .62, .36], opacity: .84, fadeIn: .11, wind: 2.3,
  },
  'cold-breath': {
    shape: 'mist', rate: 84, life: [.35, .83], spread: [.035, .026, .032],
    velocity: [0, .19, 1.36], variation: [.34, .25, .38], acceleration: [.38, .48, -1.1],
    size: [.082, .19], growth: 4.6, aspect: 1.32, color: [.83, .94, 1], opacity: .59, fadeIn: .13, wind: .84,
  },
  'seed-parachutes': {
    shape: 'parachute', rate: 17, life: [1.25, 2.65], spread: [.23, .18, .18],
    velocity: [.41, .47, .14], variation: [.16, .19, .21], acceleration: [.33, -.3, .04],
    size: [.13, .25], growth: 1.08, aspect: .86, color: [1, .94, .72], opacity: .89, fadeIn: .13,
    spin: 1.25, flutter: .21, wind: 1.24,
  },
  'wet-fern-shake': {
    shape: 'drop', rate: 104, life: [.24, .62], spread: [.22, .105, .19],
    velocity: [-.95, 1.18, .91], variation: [.63, .66, .68], acceleration: [0, -9.8, 0],
    size: [.054, .134], growth: .69, aspect: .65, color: [.75, .96, .95], opacity: .94, fadeIn: .043,
  },
  'hoe-soil-crumbs': {
    shape: 'clod', rate: 72, life: [.33, .77], spread: [.14, .031, .1],
    velocity: [0, 2.25, -1.25], variation: [.82, .82, .65], acceleration: [0, -9.8, 0],
    size: [.078, .19], growth: .81, aspect: 1.15, color: [.66, .41, .28], fadeTo: [.36, .22, .16],
    opacity: .96, fadeIn: .037, spin: 4.8, bounce: .23,
  },
  'harvest-chaff': {
    shape: 'leaf', rate: 61, life: [.78, 1.62], spread: [.36, .16, .24],
    velocity: [.69, .86, .08], variation: [.53, .48, .43], acceleration: [.1, -1.3, .05],
    size: [.076, .21], growth: .85, aspect: .26, color: [.98, .8, .38], opacity: .96, fadeIn: .052,
    spin: 6.2, flutter: .24, wind: .78,
  },
  'takeoff-feathers': {
    shape: 'feather', rate: 12, life: [1.14, 2.35], spread: [.07, .045, .07],
    velocity: [.32, .61, -.11], variation: [.29, .46, .2], acceleration: [.09, -.91, .035],
    size: [.19, .37], growth: .87, aspect: .47, color: [.95, .91, .8], opacity: .92, fadeIn: .09,
    spin: 2.45, flutter: .26, wind: .59,
  },
  'watering-can-shower': {
    shape: 'drop', rate: 137, life: [.37, .69], spread: [.09, .045, .034],
    velocity: [0, .48, 2.27], variation: [.46, .39, .51], acceleration: [0, -8.9, 0],
    size: [.042, .1], growth: .74, aspect: .53, color: [.72, .94, 1], opacity: .91, fadeIn: .038,
  },
  'sawdust-fan': {
    shape: 'clod', rate: 111, life: [.36, .73], spread: [.064, .024, .09],
    velocity: [1.9, 2.05, -.7], variation: [1.01, .97, .49], acceleration: [0, -9.5, 0],
    size: [.048, .109], growth: .63, aspect: .57, color: [1, .78, .48], opacity: .94, fadeIn: .036, spin: 7.2,
  },
  'crate-landing-grit': {
    shape: 'smoke', rate: 164, life: [.44, .97], spread: [.075, .031, .079],
    velocity: [0, .64, 1.68], variation: [.37, .42, .82], acceleration: [0, -.73, 0],
    size: [.14, .34], growth: 3.4, aspect: 1.62, color: [.75, .63, .47], opacity: .73, fadeIn: .087, spin: 1.65,
  },
  'wet-ash-steam': {
    shape: 'mist', rate: 48, life: [.64, 1.58], spread: [.64, .032, .39],
    velocity: [.09, 1.7, .21], variation: [.38, .5, .43], acceleration: [.29, -.48, 0],
    size: [.16, .32], growth: 5.1, aspect: .72, color: [.93, .98, .96], opacity: .52, fadeIn: .15,
    spin: .62, flutter: .26,
  },
  'ferry-repair-sparks': {
    shape: 'mote', rate: 149, life: [.39, .84], spread: [.046, .042, .052],
    velocity: [2.8, 1.2, 1.3], variation: [1.15, 1.48, .72], acceleration: [0, -12, 0],
    size: [.079, .205], growth: .42, aspect: .34, color: [1, .92, .36], fadeTo: [1, .19, .037],
    opacity: 1, fadeIn: .034, spin: 5.1, bounce: .36,
  },
} satisfies Record<string, ParticleRecipe>

export const particleAccents = {
  'wading-drops': {
    ...shelfParticleRecipes['wet-fern-shake'], rate: 48, spread: [.13, .022, .061],
    velocity: [0, .72, .77], variation: [.28, .52, .55], size: [.048, .11],
  },
  'fish-spray': {
    ...shelfParticleRecipes['wet-fern-shake'], rate: 145, spread: [.12, .03, .14],
    velocity: [0, 2.8, -.22], variation: [1.5, 1.05, 1.8], size: [.063, .16],
  },
  'surface-pops': {
    ...shelfParticleRecipes['puddle-strike-rings'], rate: 17, life: [.16, .29], spread: [.23, 0, .27],
    size: [.05, .089], growth: 3.4,
  },
  'puddle-rain': {
    shape: 'streak', rate: 49, life: [.41, .56], spread: [1.18, .27, .59],
    velocity: [.57, -5.6, -.1], variation: [.12, .32, .1], acceleration: [0, 0, 0],
    size: [.19, .42], growth: 1.03, aspect: .085, color: [.8, .9, 1], opacity: .48, fadeIn: .16, tilt: .12,
  },
  'chaff-dust': {
    shape: 'mist', rate: 27, life: [.76, 1.48], spread: [.3, .11, .27],
    velocity: [.66, .38, .16], variation: [.31, .23, .29], acceleration: [.17, -.15, 0],
    size: [.1, .26], growth: 3, aspect: 1.41, color: [.83, .68, .36], opacity: .42, fadeIn: .14, wind: .71,
  },
  'garden-splashes': {
    ...shelfParticleRecipes['puddle-strike-rings'], rate: 36, life: [.19, .39], spread: [.33, 0, .19],
    size: [.052, .09], growth: 2.5, color: [.68, .91, .9],
  },
  'mill-dust': {
    shape: 'smoke', rate: 34, life: [1, 1.75], spread: [.076, .05, .09],
    velocity: [1.18, .49, -.32], variation: [.45, .46, .31], acceleration: [-.43, .08, .21],
    size: [.14, .31], growth: 4.15, aspect: 1.48, color: [.84, .7, .46], opacity: .52, fadeIn: .18,
  },
  'sand-haze': {
    shape: 'mist', rate: 32, life: [.37, .92], spread: [.21, .033, .66],
    velocity: [3.3, .13, .12], variation: [.88, .16, .39], acceleration: [-3.1, -.21, 0],
    size: [.12, .3], growth: 2.4, aspect: 3.8, color: [1, .88, .59], opacity: .48, fadeIn: .095, wind: 2.2,
  },
  'fading-embers': {
    shape: 'mote', rate: 25, life: [.25, .57], spread: [.54, .04, .3],
    velocity: [.17, .35, .06], variation: [.24, .26, .27], acceleration: [.09, -.81, 0],
    size: [.04, .105], growth: .45, aspect: .82, color: [1, .45, .15], fadeTo: [.69, .25, .12],
    opacity: .88, fadeIn: .095,
  },
  'crate-grains': {
    ...shelfParticleRecipes['hoe-soil-crumbs'], rate: 89, life: [.22, .58], spread: [.04, .02, .04],
    velocity: [0, 1.05, 2.01], variation: [.53, .53, .61], size: [.035, .095],
    color: [.82, .7, .49], fadeTo: [.57, .49, .37],
  },
} satisfies Record<string, ParticleRecipe>
