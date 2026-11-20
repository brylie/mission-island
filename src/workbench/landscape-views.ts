import { falls } from '../terrain'
import type { Point } from '../world'

interface LandscapeView {
  label: string
  focus: Point & { height: number }
  alpha: number
  beta: number
  radius: number
  hour: number
  time: number
}

export const landscapeViews: Readonly<Record<string, LandscapeView>> = {
  'pinewoods-sunrise': {
    label: 'Pinewoods sunrise',
    focus: { x: -39.7, z: 19.2, height: 4.05 },
    alpha: 0.43, beta: Math.PI / 2 + 0.025, radius: 14, hour: 6.4, time: 11,
  },
  'harbor-sunset': {
    label: 'Harbor sunset',
    focus: { x: -45, z: -12, height: 0.25 },
    alpha: 2.87, beta: 1.55, radius: 15, hour: 17.4, time: 4,
  },
  'fernfall-overlook': {
    label: 'Fernfall overlook',
    focus: { ...falls, height: 0.25 },
    alpha: -Math.PI / 2, beta: 1.1, radius: 24, hour: 16.5, time: 0,
  },
}
