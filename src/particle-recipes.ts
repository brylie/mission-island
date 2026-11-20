import { gameplayParticleRecipes } from './particle-gameplay-recipes.ts'
import { shelfParticleRecipes } from './particle-shelf-recipes.ts'
import type { ParticleShape } from './particle-texture.ts'

type Axis = readonly [number, number, number]
type Range = readonly [number, number]
type Tint = readonly [number, number, number]

interface Recipe {
  shape: ParticleShape
  surface?: 'ground' | 'vertical'
  bounce?: number
  adhesion?: number
  stretch?: number
  wingbeat?: number
  rate: number
  life: Range
  spread: Axis
  velocity: Axis
  variation: Axis
  acceleration: Axis
  size: Range
  growth: number
  aspect: number
  color: Tint
  fadeTo?: Tint
  opacity: number
  fadeIn: number
  spin?: number
  tilt?: number
  flutter?: number
  wind?: number
}

export const particleRecipes = {
  'waterfall-spray': {
    shape: 'mist', rate: 64, life: [.85, 1.85], spread: [2.5, .07, .42],
    velocity: [0, 2.8, -2], variation: [1.05, 1.5, .85], acceleration: [0, -2.4, -.35],
    size: [.32, .78], growth: 2.7, aspect: 1.25, color: [.84, .98, .97], opacity: .38, fadeIn: .12,
  },
  'shore-splash': {
    shape: 'drop', rate: 59, life: [.28, .66], spread: [1.7, .015, .12],
    velocity: [0, 1.8, .85], variation: [.55, .85, .55], acceleration: [0, -7.8, 0],
    size: [.055, .15], growth: .7, aspect: .75, color: [.74, .94, 1], opacity: .87, fadeIn: .03,
  },
  'paddle-droplets': {
    shape: 'drop', rate: 75, life: [.23, .62], spread: [.1, .1, .14],
    velocity: [1, 1.1, -1.4], variation: [1.1, .9, 1.1], acceleration: [0, -8.8, 0],
    size: [.045, .12], growth: .72, aspect: .76, color: [.82, .96, 1], opacity: .91, fadeIn: .02,
  },
  'rain-streaks': {
    shape: 'streak', rate: 150, life: [.35, .48], spread: [3.2, .75, 2.5],
    velocity: [1.5, -10.8, .9], variation: [.15, .65, .16], acceleration: [0, 0, 0],
    size: [.22, .6], growth: 1, aspect: .075, color: [.72, .86, .94], opacity: .7, fadeIn: .1,
    wind: 4, tilt: .13,
  },
  'roof-drips': {
    shape: 'drop', rate: 17, life: [.42, .75], spread: [1.52, .008, .035],
    velocity: [0, -.38, 0], variation: [.045, .24, .065], acceleration: [0, -9.8, 0],
    size: [.085, .15], growth: 1.2, aspect: .43, color: [.78, .94, 1], opacity: .94, fadeIn: .06,
  },
  'ground-mist': {
    shape: 'smoke', rate: 15, life: [1.5, 2.85], spread: [1.9, .07, 1.32],
    velocity: [.8, .037, .19], variation: [.28, .013, .11], acceleration: [.14, 0, 0],
    size: [.28, .69], growth: 1.9, aspect: 5.6, color: [.79, .91, .89], opacity: .36, fadeIn: .28,
    wind: 1.4, flutter: .065,
  },
  'windblown-leaves': {
    shape: 'leaf', rate: 22, life: [.95, 2.5], spread: [1.02, .33, .78],
    velocity: [1.25, -.17, .43], variation: [.48, .47, .32], acceleration: [.15, -.55, 0],
    size: [.13, .29], growth: .92, aspect: .67, color: [.94, .68, .26], fadeTo: [.64, .47, .18],
    opacity: .95, fadeIn: .09, spin: 5.4, flutter: .31, wind: 2.2,
  },
  'pollen-motes': {
    shape: 'mote', rate: 25, life: [.9, 2.6], spread: [1.03, .22, .69],
    velocity: [.21, .25, .04], variation: [.19, .17, .2], acceleration: [.09, -.08, 0],
    size: [.05, .121], growth: .89, aspect: 1, color: [1, .91, .43], opacity: .89, fadeIn: .21,
    flutter: .18, wind: .6,
  },
  'track-dust': {
    shape: 'smoke', rate: 62, life: [.47, 1.28], spread: [.21, .035, .23],
    velocity: [1.11, .75, -2.27], variation: [.67, .66, 1.22], acceleration: [-.46, -.47, 1.25],
    size: [.12, .33], growth: 4.7, aspect: 1.24, color: [.71, .57, .4], fadeTo: [.72, .66, .53],
    opacity: .62, fadeIn: .1, spin: 1.7,
  },
  fire: {
    shape: 'mote', rate: 57, life: [.48, 1.42], spread: [.67, .11, .47],
    velocity: [.13, 1.72, 0], variation: [.58, .88, .42], acceleration: [.28, -.52, 0],
    size: [.045, .126], growth: .29, aspect: .62, color: [1, .77, .29], fadeTo: [1, .24, .07],
    opacity: 1, fadeIn: .065, spin: 2.8, flutter: .12,
  },
  'rising-smoke': {
    shape: 'smoke', rate: 36, life: [1.3, 3.1], spread: [.69, .125, .52],
    velocity: [.5, 1.75, .02], variation: [.38, .54, .3], acceleration: [.46, .09, -.05],
    size: [.45, .75], growth: 3.8, aspect: 1, color: [.28, .27, .26], fadeTo: [.54, .57, .57],
    opacity: .42, fadeIn: .27, spin: .65, wind: 1.7,
  },
  extinguisher: {
    shape: 'mist', rate: 155, life: [.28, .52], spread: [0, 0, 0],
    velocity: [0, -.53, 9.6], variation: [1.6, 1.65, 2.4], acceleration: [0, -2.1, 0],
    size: [.13, .23], growth: 4.5, aspect: 1, color: [.96, 1, 1], fadeTo: [.87, .95, .98],
    opacity: .79, fadeIn: .08,
  },
  ...shelfParticleRecipes,
  ...gameplayParticleRecipes,
} satisfies Record<string, Recipe>

export const lookoutParticleHeights = { embers: .31, smoke: .745 }

export type ParticleRecipe = Recipe
