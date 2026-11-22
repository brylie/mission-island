import { landscapeControls } from '../assets/recipes/workbench-landscape-views'
import { studioCamera } from '../assets/recipes/workbench-stage'
import { previewDriftwood } from './driftwood-preview'
import { landscapeDuration } from '../playtest-link'
import { createJuniperHabitat } from '../juniper-habitat'
import { poseFloating } from '../assets/waterfront'
import { createIslandWorld } from '../island-world'
import { falls, tidePool } from '../terrain'
import { dryMarketRainAge, marketRunoffPreview } from '../market-runoff'
import { draftFeatures } from './site-drafts'
import { range, type Entry } from './subject'

const halves = 2
const marketAgeStepSeconds = 0.1
const buoyPhaseStride = 1.67
const tideReadoutRadius = 27
const percentScale = 100

export const landscapeStudy: Entry = {
  id: 'landscape',
  name: 'Landscape Workbench',
  group: 'Island',
  source: 'src/island-world.ts',
  description: 'Focus on map coordinates in metres, orbit and pan, and inspect scenery under different skies.',
  readout: 'Shellglass tide',
  landscape: true,
  duration: landscapeDuration,
  angle: -Math.PI / halves,
  controls: [
    { type: 'number', key: 'x', label: 'Focus X (m)', value: falls.x, ...landscapeControls.coordinateLimits },
    { type: 'number', key: 'z', label: 'Focus Z (m)', value: falls.z, ...landscapeControls.coordinateLimits },
    { type: 'number', key: 'focusHeight', label: 'Focus above ground (m)', value: studioCamera.landscapeFocusHeight, ...landscapeControls.focusLimits },
    range('hour', 'Island hour', ...landscapeControls.hour),
    range('rain', 'Rain intensity', ...landscapeControls.rain),
    range('marketRainAge', 'Market · seconds since rain stopped', dryMarketRainAge, 0, dryMarketRainAge, marketAgeStepSeconds),
    { type: 'checkbox', key: 'sunShafts', label: 'Volumetric sunlight', value: true },
    range('shaftIntensity', 'Sun shaft intensity (%)', ...landscapeControls.shaftIntensity),
  ],
  create(meshes, _values, _reportError, observe) {
    const school = previewDriftwood()
    const world = createIslandWorld(meshes, { features: draftFeatures() })
    let habitat = createJuniperHabitat()
    let previousSky = ''
    return ({ time, delta, rate, camera, light, rain, seek }, settings) => {
      poseFloating(world.boat, time)
      world.buoys.forEach((buoy, index) => void poseFloating(buoy, time, index * buoyPhaseStride))
      const weather = { hour: Number(settings.hour), rain }
      const frame = { time: Number(settings.clockStart ?? 0) + time, delta: delta * rate, seek, weather, camera, threats: [] }
      const sky = weather.hour + '/' + rain
      if (previousSky !== sky) habitat = createJuniperHabitat()
      previousSky = sky
      world.juniper(habitat(time, weather, []), time)
      const runoff = marketRunoffPreview(rain, Number(settings.marketRainAge))
      const tide = world.updateEnvironment(frame, light, true, runoff, { driftwood: school(time) })
      observe(Math.hypot(camera.x - tidePool.x, camera.z - tidePool.z) < tideReadoutRadius
        ? `${tide.phase} · ${Math.round(tide.fraction * percentScale)}% of cycle`
        : '')
    }
  },
}
