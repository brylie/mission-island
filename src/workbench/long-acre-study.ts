import { daySeconds } from '../weather'
import { longAcreSubject } from '../second-island/long-acre'
import { createLongAcreGarden } from '../second-island/long-acre-art'
import { control, range } from './subject'
import type { Entry, Values } from './subject'

function studyWeather(_time: number, values: Values) {
  return { hour: 10.5, rain: values.shower === 'rain' ? .82 : 0 }
}

export const longAcreStudy: Entry = {
  id: longAcreSubject, name: 'Long Acre Fields pollinators', group: 'Animals',
  source: 'src/second-island/long-acre-art.ts',
  description: 'Compare dry flights, hive shelter, and the first returns to the sheltered clover beside the crop rows.',
  readout: 'Pollinator activity',
  duration: 17,
  angle: .32,
  ground: { height: 17, color: '#7e975f' },
  fieldSite: () => ({ name: 'Long Acre Fields, Saltwind', saltwindSubject: longAcreSubject, offset: { x: 0, y: 0, z: 0 } }),
  weather: studyWeather,
  controls: [
    control('shower', 'Weather', 'dry', { dry: 'Dry morning', rain: 'Sustained rain', recovery: 'After rain' }),
    range('day', 'Island day', 0, 0, 6, 1),
  ],
  create(meshes, _values, _reportError, observe) {
    const garden = createLongAcreGarden(meshes)
    return ({ time, delta, camera }, values) => {
      const dawn = Number(values.day) * daySeconds
      const weather = studyWeather(time, values)
      const rainAt = (at: number) => values.shower === 'recovery' && at < dawn ? .82 : weather.rain
      const view = garden({ time: dawn + time, delta, camera, weather, threats: [] }, false, rainAt)
      if (view) observe(`${view.phase} · ${view.visiting} feeding · ${view.flying} flying`)
    }
  },
}
