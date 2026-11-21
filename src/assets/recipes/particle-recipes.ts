import { gameplayParticleRecipes } from './particle-gameplay-recipes.ts'
import { shelfParticleRecipes } from './particle-shelf-recipes.ts'
import type { ParticleShape } from '../particle-texture.ts'

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
    shape: 'mist',
    rate: 64,
    life: [0.85, 1.85],
    spread: [2.5, 0.07, 0.42],
    velocity: [0, 2.8, -2],
    variation: [1.05, 1.5, 0.85],
    acceleration: [0, -2.4, -0.35],
    size: [0.32, 0.78],
    growth: 2.7,
    aspect: 1.25,
    color: [0.84, 0.98, 0.97],
    opacity: 0.38,
    fadeIn: 0.12,
  },
  'shore-splash': {
    shape: 'drop',
    rate: 59,
    life: [0.28, 0.66],
    spread: [1.7, 0.015, 0.12],
    velocity: [0, 1.8, 0.85],
    variation: [0.55, 0.85, 0.55],
    acceleration: [0, -7.8, 0],
    size: [0.055, 0.15],
    growth: 0.7,
    aspect: 0.75,
    color: [0.74, 0.94, 1],
    opacity: 0.87,
    fadeIn: 0.03,
  },
  'paddle-droplets': {
    shape: 'drop',
    rate: 75,
    life: [0.23, 0.62],
    spread: [0.1, 0.1, 0.14],
    velocity: [1, 1.1, -1.4],
    variation: [1.1, 0.9, 1.1],
    acceleration: [0, -8.8, 0],
    size: [0.045, 0.12],
    growth: 0.72,
    aspect: 0.76,
    color: [0.82, 0.96, 1],
    opacity: 0.91,
    fadeIn: 0.02,
  },
  'rain-streaks': {
    shape: 'streak',
    rate: 150,
    life: [0.35, 0.48],
    spread: [3.2, 0.75, 2.5],
    velocity: [1.5, -10.8, 0.9],
    variation: [0.15, 0.65, 0.16],
    acceleration: [0, 0, 0],
    size: [0.22, 0.6],
    growth: 1,
    aspect: 0.075,
    color: [0.72, 0.86, 0.94],
    opacity: 0.7,
    fadeIn: 0.1,
    wind: 4,
    tilt: 0.13,
  },
  'roof-drips': {
    shape: 'drop',
    rate: 17,
    life: [0.42, 0.75],
    spread: [1.52, 0.008, 0.035],
    velocity: [0, -0.38, 0],
    variation: [0.045, 0.24, 0.065],
    acceleration: [0, -9.8, 0],
    size: [0.085, 0.15],
    growth: 1.2,
    aspect: 0.43,
    color: [0.78, 0.94, 1],
    opacity: 0.94,
    fadeIn: 0.06,
  },
  'ground-mist': {
    shape: 'smoke',
    rate: 15,
    life: [1.5, 2.85],
    spread: [1.9, 0.07, 1.32],
    velocity: [0.8, 0.037, 0.19],
    variation: [0.28, 0.013, 0.11],
    acceleration: [0.14, 0, 0],
    size: [0.28, 0.69],
    growth: 1.9,
    aspect: 5.6,
    color: [0.79, 0.91, 0.89],
    opacity: 0.36,
    fadeIn: 0.28,
    wind: 1.4,
    flutter: 0.065,
  },
  'windblown-leaves': {
    shape: 'leaf',
    rate: 22,
    life: [0.95, 2.5],
    spread: [1.02, 0.33, 0.78],
    velocity: [1.25, -0.17, 0.43],
    variation: [0.48, 0.47, 0.32],
    acceleration: [0.15, -0.55, 0],
    size: [0.13, 0.29],
    growth: 0.92,
    aspect: 0.67,
    color: [0.94, 0.68, 0.26],
    fadeTo: [0.64, 0.47, 0.18],
    opacity: 0.95,
    fadeIn: 0.09,
    spin: 5.4,
    flutter: 0.31,
    wind: 2.2,
  },
  'pollen-motes': {
    shape: 'mote',
    rate: 25,
    life: [0.9, 2.6],
    spread: [1.03, 0.22, 0.69],
    velocity: [0.21, 0.25, 0.04],
    variation: [0.19, 0.17, 0.2],
    acceleration: [0.09, -0.08, 0],
    size: [0.05, 0.121],
    growth: 0.89,
    aspect: 1,
    color: [1, 0.91, 0.43],
    opacity: 0.89,
    fadeIn: 0.21,
    flutter: 0.18,
    wind: 0.6,
  },
  'track-dust': {
    shape: 'smoke',
    rate: 62,
    life: [0.47, 1.28],
    spread: [0.21, 0.035, 0.23],
    velocity: [1.11, 0.75, -2.27],
    variation: [0.67, 0.66, 1.22],
    acceleration: [-0.46, -0.47, 1.25],
    size: [0.12, 0.33],
    growth: 4.7,
    aspect: 1.24,
    color: [0.71, 0.57, 0.4],
    fadeTo: [0.72, 0.66, 0.53],
    opacity: 0.62,
    fadeIn: 0.1,
    spin: 1.7,
  },
  'fire': {
    shape: 'mote',
    rate: 57,
    life: [0.48, 1.42],
    spread: [0.67, 0.11, 0.47],
    velocity: [0.13, 1.72, 0],
    variation: [0.58, 0.88, 0.42],
    acceleration: [0.28, -0.52, 0],
    size: [0.045, 0.126],
    growth: 0.29,
    aspect: 0.62,
    color: [1, 0.77, 0.29],
    fadeTo: [1, 0.24, 0.07],
    opacity: 1,
    fadeIn: 0.065,
    spin: 2.8,
    flutter: 0.12,
  },
  'rising-smoke': {
    shape: 'smoke',
    rate: 36,
    life: [1.3, 3.1],
    spread: [0.69, 0.125, 0.52],
    velocity: [0.5, 1.75, 0.02],
    variation: [0.38, 0.54, 0.3],
    acceleration: [0.46, 0.09, -0.05],
    size: [0.45, 0.75],
    growth: 3.8,
    aspect: 1,
    color: [0.28, 0.27, 0.26],
    fadeTo: [0.54, 0.57, 0.57],
    opacity: 0.42,
    fadeIn: 0.27,
    spin: 0.65,
    wind: 1.7,
  },
  'extinguisher': {
    shape: 'mist',
    rate: 155,
    life: [0.28, 0.52],
    spread: [0, 0, 0],
    velocity: [0, -0.53, 9.6],
    variation: [1.6, 1.65, 2.4],
    acceleration: [0, -2.1, 0],
    size: [0.13, 0.23],
    growth: 4.5,
    aspect: 1,
    color: [0.96, 1, 1],
    fadeTo: [0.87, 0.95, 0.98],
    opacity: 0.79,
    fadeIn: 0.08,
  },
  ...shelfParticleRecipes,
  ...gameplayParticleRecipes,
} satisfies Record<string, Recipe>

export const lookoutParticleHeights = { embers: 0.31, smoke: 0.745 }

export type ParticleRecipe = Recipe
