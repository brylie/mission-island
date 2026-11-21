import type { ParticleRecipe } from './particle-recipes.ts'

export const gameplayParticleRecipes = {
  'bobber-bite-dip': {
    shape: 'ring', surface: 'ground', rate: 21, life: [.36, .77], spread: [.035, 0, .055],
    velocity: [.04, 0, .2], variation: [.08, 0, .09], acceleration: [0, 0, 0],
    size: [.075, .14], growth: 6.5, aspect: 1.3, color: [.77, .98, 1], opacity: .86, fadeIn: .1,
  },
  'slipway-tire-sheet': {
    shape: 'drop', rate: 148, life: [.31, .62], spread: [.2, .02, .12],
    velocity: [1.9, 1.53, 1.16], variation: [1.21, .78, 1.35], acceleration: [0, -8.4, 0],
    size: [.056, .14], growth: .68, aspect: .7, color: [.68, .88, .96], opacity: .93, fadeIn: .042,
  },
  'hull-drain-trickle': {
    shape: 'streak', rate: 119, life: [.28, .59], spread: [.026, .015, .029],
    velocity: [0, -.06, 1.12], variation: [.08, .16, .22], acceleration: [0, -8.6, 0],
    size: [.12, .24], growth: .88, aspect: .25, color: [.72, .92, .98], opacity: .88, fadeIn: .04, tilt: .33,
  },
  'mooring-line-shake': {
    shape: 'drop', rate: 129, life: [.29, .63], spread: [.06, .028, .065],
    velocity: [.26, 1.49, .51], variation: [.57, .58, .83], acceleration: [0, -8.65, 0],
    size: [.038, .116], growth: .72, aspect: .71, color: [.73, .94, 1], opacity: .94, fadeIn: .05,
  },
  'boot-drain-trail': {
    shape: 'sole', surface: 'ground', rate: 23, life: [.67, 1.41], spread: [.008, 0, .009],
    velocity: [0, 0, 0], variation: [0, 0, 0], acceleration: [0, 0, 0],
    size: [.285, .34], growth: 1.04, aspect: .53, color: [.21, .31, .32], opacity: .86, fadeIn: .038,
  },
  'lantern-moths': {
    shape: 'moth', rate: 12, life: [1.21, 2.65], spread: [.07, .23, .08],
    velocity: [0, .04, .04], variation: [.095, .19, .09], acceleration: [0, .08, 0],
    size: [.105, .21], growth: .91, aspect: 1.37, color: [1, .83, .55], opacity: .95, fadeIn: .14,
    spin: 5.9, flutter: .23, wingbeat: 37,
  },
  'workshop-vent-steam': {
    shape: 'mist', rate: 53, life: [.83, 1.89], spread: [.074, .022, .066],
    velocity: [0, 1.7, .15], variation: [.31, .61, .32], acceleration: [.49, -.53, .04],
    size: [.13, .31], growth: 5.2, aspect: .86, color: [.84, .96, 1], opacity: .67, fadeIn: .13,
    flutter: .13, wind: 1.72,
  },
  'gate-frost-shake': {
    shape: 'clod', rate: 79, life: [.55, 1.1], spread: [.16, .04, .06],
    velocity: [.2, .42, .64], variation: [.74, .39, .63], acceleration: [0, -6.5, 0],
    size: [.038, .124], growth: .66, aspect: .78, color: [.78, .95, 1], opacity: .96, fadeIn: .036,
    bounce: .22, spin: 4.9,
  },
  'canvas-runoff': {
    shape: 'streak', rate: 105, life: [.26, .68], spread: [.068, .01, .048],
    velocity: [.12, -.56, .42], variation: [.11, .42, .25], acceleration: [0, -9.8, .17],
    size: [.145, .48], growth: .84, aspect: .086, color: [.71, .9, 1], opacity: .84, fadeIn: .04,
  },
  'lantern-snuff-curl': {
    shape: 'smoke', rate: 42, life: [.86, 1.68], spread: [.052, .04, .043],
    velocity: [.045, .77, 0], variation: [.18, .18, .14], acceleration: [.18, -.2, -.15],
    size: [.053, .11], growth: 4.77, aspect: .93, color: [.66, .72, .82], opacity: .48, fadeIn: .19,
    flutter: .13, spin: .5, wind: .98,
  },
  'carrot-pull-crumbs': {
    shape: 'clod', rate: 101, life: [.26, .59], spread: [.12, .08, .095],
    velocity: [.03, .26, .09], variation: [.67, .84, .7], acceleration: [0, -9.8, 0],
    size: [.064, .171], growth: .65, aspect: 1.14, color: [.59, .37, .26], fadeTo: [.4, .26, .2],
    opacity: .97, fadeIn: .045, spin: 5.8, bounce: .24,
  },
  'hive-entrance-traffic': {
    shape: 'bee', rate: 22, life: [.62, 1.41], spread: [.077, .026, .059],
    velocity: [0, .19, 1.26], variation: [.38, .21, .38], acceleration: [.14, -.15, 0],
    size: [.061, .125], growth: 1.06, aspect: 1.57, color: [1, .77, .33], opacity: .97, fadeIn: .08,
    flutter: .094, wingbeat: 51,
  },
  'clover-petal-scatter': {
    shape: 'petal', rate: 65, life: [.54, 1.39], spread: [.21, .13, .14],
    velocity: [.5, .82, .74], variation: [.72, .55, .73], acceleration: [.16, -1.5, -.14],
    size: [.032, .112], growth: .89, aspect: .89, color: [1, .89, .85], fadeTo: [.94, .61, .74],
    opacity: .98, fadeIn: .063, spin: 5.6, flutter: .21, wind: .67,
  },
  'loose-slate-tumble': {
    shape: 'clod', rate: 46, life: [.51, 1.26], spread: [.19, .06, .22],
    velocity: [.68, .07, 1.36], variation: [.55, .36, .47], acceleration: [.08, -7.65, .43],
    size: [.072, .219], growth: .86, aspect: .59, color: [.51, .59, .66], fadeTo: [.32, .39, .46],
    opacity: .97, fadeIn: .054, spin: 5.6, bounce: .36,
  },
  'hedge-clipping-fall': {
    shape: 'leaf', rate: 96, life: [.43, 1.21], spread: [.27, .1, .16],
    velocity: [.2, .26, .62], variation: [.47, .53, .73], acceleration: [.14, -2.9, 0],
    size: [.069, .19], growth: .87, aspect: .31, color: [.73, .84, .39], fadeTo: [.39, .59, .25],
    opacity: .98, fadeIn: .042, spin: 8.3, flutter: .17,
  },
  'gravel-brake-chips': {
    shape: 'clod', rate: 141, life: [.22, .71], spread: [.19, .038, .17],
    velocity: [.84, 1.18, 3.72], variation: [1.32, .7, 1.37], acceleration: [0, -12.3, -.45],
    size: [.036, .128], growth: .74, aspect: .78, color: [.84, .73, .55], fadeTo: [.53, .47, .39],
    opacity: .96, fadeIn: .035, spin: 6, bounce: .33,
  },
  'tailgate-grain-spill': {
    shape: 'clod', rate: 168, life: [.32, .87], spread: [.17, .08, .11],
    velocity: [0, -.38, .79], variation: [.68, .29, .32], acceleration: [0, -9.8, 0],
    size: [.038, .088], growth: .92, aspect: .65, color: [1, .82, .47], opacity: .99, fadeIn: .046,
    spin: 6.3, bounce: .34,
  },
  'hoist-chain-shake': {
    shape: 'clod', rate: 97, life: [.37, .79], spread: [.09, .24, .075],
    velocity: [.2, -.08, .37], variation: [.55, .39, .64], acceleration: [0, -7.8, 0],
    size: [.042, .116], growth: .63, aspect: .9, color: [.81, .53, .31], opacity: .92, fadeIn: .062,
    spin: 7.1, bounce: .21,
  },
  'wash-station-rinse': {
    shape: 'drop', rate: 123, life: [.28, .62], spread: [.24, .075, .2],
    velocity: [-.78, 1.05, .81], variation: [1.07, .56, .76], acceleration: [0, -9.8, 0],
    size: [.063, .144], growth: .7, aspect: .75, color: [.73, .87, .88], opacity: .95, fadeIn: .037,
  },
  'chalk-line-snap': {
    shape: 'mist', rate: 173, life: [.28, .91], spread: [.11, .034, .012],
    velocity: [0, .47, .02], variation: [.24, .22, .33], acceleration: [.03, -.16, 0],
    size: [.064, .14], growth: 3.18, aspect: 1.32, color: [.73, .9, 1], opacity: .64, fadeIn: .055,
  },
} satisfies Record<string, ParticleRecipe>
