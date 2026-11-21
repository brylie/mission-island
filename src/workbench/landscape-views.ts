import { lookoutRecoverySubject } from '../lookout-recovery'
import { brinewickMarketSubject } from '../second-island/brinewick-market'
import { longAcreSubject } from '../second-island/long-acre'
import { shellglassCycle } from '../shellglass-tide'
import { driftwoodShallows } from '../simulation/driftwood-school'
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

const shellglassView = {
  focus: { x: 45.35, z: -33.65, height: .49 },
  alpha: 2.11, beta: 1.09, radius: 7.45, hour: 13,
}

export const landscapeViews: Readonly<Record<string, LandscapeView>> = {
  'pinewoods-sunrise': {
    label: 'Pinewoods sunrise',
    focus: { x: -39.7, z: 19.2, height: 4.05 },
    alpha: 0.43, beta: Math.PI / 2 + 0.025, radius: 14, hour: 6.4, time: 11,
  },
  'harbor-gulls': {
    label: 'Harbor gulls at the pilings',
    focus: { x: -44.5, z: -34, height: .9 },
    alpha: -2.41, beta: 1.31, radius: 12.5, hour: 12, time: 33.5,
  },
  'harbor-sunset': {
    label: 'Harbor sunset',
    focus: { x: -45, z: -12, height: 0.25 },
    alpha: 2.87, beta: 1.55, radius: 15, hour: 17.4, time: 4,
  },
  'driftwood-fish': {
    label: 'Driftwood fish shallows',
    focus: { ...driftwoodShallows, height: 1.6 },
    alpha: 1.9, beta: .77, radius: 9.5, hour: 12, time: 0,
  },
  'seabrook-market-runoff': {
    label: 'Seabrook Market runoff',
    focus: { x: 38.72, z: 5.65, height: 1.60 },
    alpha: 1.92, beta: 1.17, radius: 7.4, hour: 13.5, time: 102.48,
  },
  'shellglass-rising': { ...shellglassView, label: 'Shellglass rising tide', time: shellglassCycle * .36 },
  'shellglass-retreating': { ...shellglassView, label: 'Shellglass retreating tide', time: shellglassCycle * .76 },
  'shellglass-low': { ...shellglassView, label: 'Shellglass low water', time: shellglassCycle * .96 },
  'shellglass-night': { ...shellglassView, label: 'Shellglass plankton at night', hour: 23, time: shellglassCycle * .96 },
  'fernfall-overlook': {
    label: 'Fernfall overlook',
    focus: { ...falls, height: 0.25 },
    alpha: -Math.PI / 2, beta: 1.1, radius: 24, hour: 16.5, time: 0,
  },
}

export const scenicChoices = [...Object.entries(landscapeViews).map(([id, view]) => [id, view.label]),
  [longAcreSubject, 'Long Acre Fields pollinators'],
  [brinewickMarketSubject, 'Brinewick Fish Market routine'],
  [lookoutRecoverySubject, 'Forest Lookout recovery']]

export function openFieldView(id: string) {
  if (id !== longAcreSubject && id !== brinewickMarketSubject && id !== lookoutRecoverySubject) return false
  location.hash = id + '?stage=island'
  return true
}
