import { landscapeShotPresets, shellglassShots, shellglassView } from '../assets/recipes/workbench-landscape-views'
import { lookoutRecoverySubject } from '../lookout-recovery'
import { brinewickMarketSubject } from '../second-island/brinewick-market'
import { longAcreSubject } from '../second-island/long-acre'
import { shellglassCycle } from '../shellglass-tide'
import { driftwoodShallows } from '../simulation/driftwood-school'
import { falls, groundHeight } from '../terrain'
import type { Point } from '../world'
import { liftSites } from '../worlds/starter/lift'
import { highwoodHeroViews } from '../worlds/starter/layout/hero-views'

interface LandscapeView {
  label: string
  focus: Point & { height: number }
  alpha: number
  beta: number
  radius: number
  hour: number
  time: number
  rain?: number
}

// A hero view's eye and target become the orbit camera's angles and radius.
function heroView({ label, eye, target, hour, rain }: typeof highwoodHeroViews[number]): LandscapeView {
  // The focus height is metres above the ground, like the other landscape views.
  const focus = { x: target.x, z: target.z, height: target.above }
  const dx = eye.x - focus.x, dy = groundHeight(eye) + eye.above - groundHeight(target) - target.above, dz = eye.z - focus.z
  const radius = Math.hypot(dx, dy, dz)
  return { label, focus, alpha: Math.atan2(dz, dx), beta: Math.acos(dy / radius), radius, hour, time: 0, rain }
}

const farmThermal = liftSites.find(({ id }) => id === 'farm-fields') ?? liftSites[0]

const { focusHeight: driftwoodHeight, ...driftwood } = landscapeShotPresets['driftwood-fish']
const { focusHeight: farmHeight, ...farm } = landscapeShotPresets['farm-thermal-gulls']
const { focusHeight: fernfallHeight, ...fernfall } = landscapeShotPresets['fernfall-overlook']

function shellglassShot({ label, hour, phase }: { label: string, hour?: number, phase: number }): LandscapeView {
  return { ...shellglassView, label, hour: hour ?? shellglassView.hour, time: shellglassCycle * phase }
}

export const landscapeViews: Readonly<Record<string, LandscapeView>> = {
  'pinewoods-sunrise': landscapeShotPresets['pinewoods-sunrise'],
  'harbor-gulls': landscapeShotPresets['harbor-gulls'],
  'ferry-approach': landscapeShotPresets['ferry-approach'],
  'ferry-yard': landscapeShotPresets['ferry-yard'],
  'harbor-sunset': landscapeShotPresets['harbor-sunset'],
  'driftwood-fish': { ...driftwood, focus: { ...driftwoodShallows, height: driftwoodHeight } },
  'seabrook-market-runoff': landscapeShotPresets['seabrook-market-runoff'],
  'shellglass-rising': shellglassShot(shellglassShots.rising),
  'shellglass-retreating': shellglassShot(shellglassShots.retreating),
  'shellglass-low': shellglassShot(shellglassShots.low),
  'shellglass-night': shellglassShot(shellglassShots.night),
  'farm-thermal-gulls': { ...farm, focus: { x: farmThermal.x, z: farmThermal.z, height: groundHeight(farmThermal) + farmHeight } },
  'fernfall-overlook': { ...fernfall, focus: { ...falls, height: fernfallHeight } },
  ...Object.fromEntries(highwoodHeroViews.map((view) => [view.id, heroView(view)])),
}

export const scenicChoices = [...Object.entries(landscapeViews).map(([id, view]) => [id, view.label]), [longAcreSubject, 'Long Acre Fields pollinators'], [brinewickMarketSubject, 'Brinewick Fish Market routine'], [lookoutRecoverySubject, 'Forest Lookout recovery']]

export function openFieldView(id: string) {
  if (id !== longAcreSubject && id !== brinewickMarketSubject && id !== lookoutRecoverySubject) return false
  location.hash = id + '?stage=island'
  return true
}
