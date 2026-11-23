import { inSkiff } from './actions'
import type { Player } from './protocol'

// The crew panel: one row per crew slot with the crewmate's name and what they are doing.
export function showCrewRoster(rows: HTMLElement[], count: HTMLElement, connected: Player[], localId: number) {
  count.textContent = `${connected.length} / ${rows.length}`
  rows.forEach((row, index) => {
    const player = connected.find((entry) => entry.id === index)
    row.dataset.online = String(Boolean(player))
    const title = row.querySelector('span')
    if (title) title.textContent = player?.name || `Crew ${index + 1}`
    const role = row.querySelector('small')
    if (role) role.textContent = player ? crewActivity(player, index === localId) : 'Open'
  })
}

function crewActivity(player: Player, local: boolean) {
  if (player.sleeping) return 'Turning in'
  if (player.seat === 'driver') return 'Driving'
  if (player.seat === 'passenger') return 'Riding'
  if (inSkiff(player.seat)) return 'Afloat'
  return local ? 'You' : 'Online'
}
