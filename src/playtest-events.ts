import { wildfireSizes, type FireSiteId, type WildfireSize } from './wildfire.ts'
import { starterFireSites } from './worlds/starter/layout/fire-sites.ts'

// Island events a live playtest can start on demand, so a tester can play through one without waiting
// for the host's schedule. A choice left out is drawn the way the schedule would draw it.
export const fireIntensities = {
  mild: 'Mild: quick to put out',
  fierce: 'Fierce: slow to put out',
} as const
export type FireIntensity = keyof typeof fireIntensities

export interface WildfireChoice {
  size?: WildfireSize
  site?: FireSiteId
  intensity?: FireIntensity
  // Skip the search: the fire starts already found, with its ring and map pin showing.
  located?: boolean
}

export type PlaytestEvent =
  | { type: 'wildfire' } & WildfireChoice
  | { type: 'end-wildfire' }

export const fireSizeChoices = Object.entries(wildfireSizes).map(([id, { label }]) => ({ id: id as WildfireSize, label }))
export const fireSiteChoices = starterFireSites.map(({ id, name }) => ({ id, label: name }))
export const fireIntensityChoices = Object.entries(fireIntensities).map(([id, label]) => ({ id: id as FireIntensity, label }))

function pick<T extends string>(params: URLSearchParams, key: string, choices: readonly { id: T }[]): T | undefined | false {
  const value = params.get(key)
  if (value === null || value === '') return undefined
  return choices.find((choice) => choice.id === value)?.id ?? false
}

export function playtestEventQuery(event: PlaytestEvent) {
  const params = new URLSearchParams({ type: event.type })
  if (event.type !== 'wildfire') return params
  for (const key of ['size', 'site', 'intensity'] as const) if (event[key]) params.set(key, event[key])
  if (event.located) params.set('located', '1')
  return params
}

// Reads an event from a request's query. Unknown types and choices are refused rather than drawn.
export function readPlaytestEvent(params: URLSearchParams): PlaytestEvent | undefined {
  const type = params.get('type')
  if (type === 'end-wildfire') return { type }
  if (type !== 'wildfire') return
  const size = pick(params, 'size', fireSizeChoices)
  const site = pick(params, 'site', fireSiteChoices)
  const intensity = pick(params, 'intensity', fireIntensityChoices)
  const located = params.get('located')
  if (size === false || site === false || intensity === false || (located !== null && located !== '1')) return
  return { type, ...(size && { size }), ...(site && { site }), ...(intensity && { intensity }), ...(located && { located: true }) }
}
