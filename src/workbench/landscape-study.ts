import { previewDriftwood } from './driftwood-preview'
import { landscapeDuration } from '../playtest-link'
import { createJuniperHabitat } from '../juniper-habitat'
import { poseFloating } from '../assets/waterfront'
import { createIslandWorld } from '../island-world'
import { falls } from '../terrain'
import { nightLighting } from '../weather'
import { dryMarketRainAge, marketRunoffPreview } from '../market-runoff'
import { draftFeatures } from './site-drafts'
import { range, type Entry } from './subject'

export const landscapeStudy: Entry = {
  id: 'landscape', name: 'Landscape Workbench', group: 'Island', source: 'src/island-world.ts',
  description: 'Focus on map coordinates in metres, orbit and pan, and inspect scenery under different skies.',
  landscape: true, duration: landscapeDuration, angle: -Math.PI / 2,
  controls: [
    { type: 'number', key: 'x', label: 'Focus X (m)', value: falls.x, min: -500, max: 500, step: 0.1 },
    { type: 'number', key: 'z', label: 'Focus Z (m)', value: falls.z, min: -500, max: 500, step: 0.1 },
    { type: 'number', key: 'focusHeight', label: 'Focus above ground (m)', value: 0.25, min: -5, max: 80, step: 0.05 },
    range('hour', 'Island hour', 16.5, 0, 24, 0.1),
    range('rain', 'Rain intensity', 0, 0, 1, 0.01),
    range('marketRainAge', 'Market · seconds since rain stopped', dryMarketRainAge, 0, dryMarketRainAge, .1),
    { type: 'checkbox', key: 'sunShafts', label: 'Volumetric sunlight', value: true },
    range('shaftIntensity', 'Sun shaft intensity (%)', 100, 0, 150, 5),
  ],
  create(meshes) {
    const school = previewDriftwood()
    const world = createIslandWorld(meshes, { features: draftFeatures() })
    let habitat = createJuniperHabitat()
    let previousSky = ''
    return ({ time, delta, rate, camera, light, rain, seek }, settings) => {
      world.northernScenery.update(camera, true)
      poseFloating(world.boat, time)
      world.buoys.forEach((buoy, index) => poseFloating(buoy, time, index * 1.67))
      const weather = { hour: Number(settings.hour), rain }
      const frame = { time: Number(settings.clockStart ?? 0) + time, delta: delta * rate, seek, weather, camera, threats: [] }
      const sky = weather.hour + '/' + rain
      if (previousSky !== sky) habitat = createJuniperHabitat()
      previousSky = sky
      world.juniper(habitat(time, weather, []), time)
      world.wildlife(frame, school(time))
      world.phenomena(frame)
      world.marketShower(frame.time, camera, marketRunoffPreview(rain, Number(settings.marketRainAge)))
      world.lights(camera, nightLighting(Number(settings.hour)))
      world.water.pose(time, light, rain)
    }
  },
}
