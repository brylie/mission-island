import type { Snapshot, WildfireNotice } from './protocol'
import { fireSite, finderReading, wildfireSizes } from './wildfire'

const noticeDurationMs = 5200

// The mission panel while a wildfire burns. Before anyone finds it, the crew only knows about the smoke.
export function wildfireCard(state: Pick<Snapshot, 'events'>) {
  const fire = state.events.fire
  if (!fire) return
  const size = wildfireSizes[fire.size]
  if (!fire.located) {
    return {
      label: 'FIRE WATCH',
      title: 'Smoke reported',
      detail: 'Someone has seen smoke rising somewhere on the island.',
      progress: 'Fire located',
      value: 0,
      max: 1,
      text: 'Not yet found',
      instruction: 'Climb the Fire Watch beside Fire Supplies and sight the fire finder, or raise your binoculars with V and mark the flames under the smoke.',
    }
  }
  const reading = finderReading(fire)
  // A growing fire catches new hotspots, so progress counts the ones the crew has put out.
  const caught = fire.hotspots.filter((spot) => spot.caught)
  const value = caught.filter((spot) => spot.heat === 0).length
  return {
    label: 'FIRE WATCH',
    title: `${size.label} · ${fireSite(fire.site).name}`,
    detail: `From the Fire Watch: ${reading.degrees}° (${reading.direction}), about ${reading.metres} m. Pays up to ${size.coins} coins, less as it spreads.`,
    progress: 'Hotspots out',
    value,
    max: caught.length,
    text: `${value} / ${caught.length} hotspots out`,
    instruction: 'Take an extinguisher from any fire station stand and hold left click (or R) near the flames. Press E at a station to refill when it runs dry.',
  }
}

function noticeLabel(notice: WildfireNotice, localId: number) {
  switch (notice.event) {
    case 'smoke': return ['', 'Smoke reported · Climb the Fire Watch to find it']
    case 'located': return ['', `Fire found at ${notice.place} · ${notice.degrees}° (${notice.direction}) from the Fire Watch`]
    case 'bearing': return notice.playerId === localId ? ['', `Fire finder · ${notice.place} · ${notice.degrees}° (${notice.direction}), about ${notice.metres} m`] : undefined
    case 'spread': return ['', `The fire spread at ${notice.place} · ${notice.burning} hotspots burning`]
    case 'out': return [`+${notice.coins} coins`, `${wildfireSizes[notice.size].label} out at ${notice.place} · Crew bank`]
    case 'burned-out': return ['', `The fire at ${notice.place} burned itself out`]
    case 'rained-out': return ['', `Rain put out the fire at ${notice.place}`]
    case 'clear': return notice.playerId === localId ? ['', 'Fire finder · No smoke in sight'] : undefined
  }
}

export function wildfireFeedback(notice: WildfireNotice, localId: number) {
  const label = noticeLabel(notice, localId)
  return label && { key: label[0], label: label[1], until: performance.now() + noticeDurationMs }
}
