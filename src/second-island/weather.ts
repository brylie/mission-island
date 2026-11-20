import type { Weather } from '../protocol'
import { weatherAt } from '../weather'

export const saltwindLiveWeather = (seconds: number) => weatherAt(seconds + 100)
export const saltwindRainAt = (seconds: number) => saltwindLiveWeather(seconds).rain

const surveyWeather: Record<string, Weather> = {
  morning: { hour: 6.8, rain: 0 },
  daylight: { hour: 13, rain: 0 },
  rain: { hour: 15, rain: .85 },
  dusk: { hour: 17.6, rain: 0 },
  night: { hour: 23, rain: 0 },
}

export const saltwindWeather = (preset: string, time: number) => surveyWeather[preset] ?? saltwindLiveWeather(time)
