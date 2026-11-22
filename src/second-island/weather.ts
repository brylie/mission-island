import type { Weather } from '../protocol'
import { weatherAt } from '../weather'

const saltwindWeatherOffsetSeconds = 100
const surveyMorningHour = 6.8
const surveyDaylightHour = 13
const surveyRainHour = 15
const surveyRainIntensity = 0.85
const surveyDuskHour = 17.6
const surveyNightHour = 23

export const saltwindLiveWeather = (seconds: number) => weatherAt(seconds + saltwindWeatherOffsetSeconds)
export const saltwindRainAt = (seconds: number) => saltwindLiveWeather(seconds).rain

const surveyWeather: Record<string, Weather> = {
  morning: { hour: surveyMorningHour, rain: 0 },
  daylight: { hour: surveyDaylightHour, rain: 0 },
  rain: { hour: surveyRainHour, rain: surveyRainIntensity },
  dusk: { hour: surveyDuskHour, rain: 0 },
  night: { hour: surveyNightHour, rain: 0 },
}

export const saltwindWeather = (preset: string, time: number) => surveyWeather[preset] ?? saltwindLiveWeather(time)
