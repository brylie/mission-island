import { brinewickMarketReview } from '../assets/recipes/workbench-place-studies'
import { closingHour, tradingHour, brinewickMarketSubject } from '../second-island/brinewick-market'
import { createBrinewickMarket } from '../second-island/brinewick-market-art'
import { control, type Entry, type Values } from './subject'

function studyWeather(time: number, values: Values) {
  const { setupHour, closingSecondsPerHour, rain } = brinewickMarketReview.weather
  const hour = values.phase === 'setup' ? setupHour : values.phase === 'trading' ? tradingHour + 1 : closingHour + time / closingSecondsPerHour
  return { hour, rain: values.weather === 'rain' ? rain : 0 }
}

export const brinewickMarketStudy: Entry = {
  id: brinewickMarketSubject,
  name: 'Brinewick Fish Market routine',
  group: 'Saltwind buildings',
  source: 'src/second-island/brinewick-market-art.ts',
  description: 'Compare drying nets, the trading display, and covered fish trays. Choose rain during setup to move the net under the awning.',
  readout: 'Market activity',
  duration: brinewickMarketReview.duration,
  angle: brinewickMarketReview.angle,
  ground: brinewickMarketReview.ground,
  fieldSite: () => ({ name: 'Brinewick, Saltwind', saltwindSubject: brinewickMarketSubject, offset: { x: 0, y: 0, z: 0 } }),
  weather: studyWeather,
  controls: [
    control('phase', 'Market phase', 'setup', { setup: 'Morning setup', trading: 'Trading', closing: 'Closing' }),
    control('weather', 'Weather', 'dry', { dry: 'Dry', rain: 'Steady rain' }),
  ],
  create(meshes, _values, _reportError, observe) {
    const market = createBrinewickMarket(meshes)
    return ({ time }, values) => {
      const state = market(time, studyWeather(time, values))
      if (state.phase === 'setup') observe(state.net === 'shelteredRack' ? 'Setup · net under the awning' : 'Setup · net drying outside')
      else if (state.phase === 'trading') observe('Trading · fish on display')
      else observe(state.cover < 1 ? 'Closing · covers settling' : 'Closing · trays covered and baskets stacked')
    }
  },
}
