import turnaround from '../../docs/images/crew-character-turnaround.jpg?url'
import { withReference } from './reference-link'
import { subjectLink } from './subject-link'

// Resolve the illustrated fitting on this host so the same shortcut works in development, on LAN and in a production build.
export const turnaroundUrl = new URL(turnaround, document.baseURI).href

const angles = {
  turnaround: { alpha: Math.PI / 2, x: 0.209 },
  profile: { alpha: 0.015, x: 0.484 },
  back: { alpha: -Math.PI / 2, x: 0.788 },
} as const

export function openCrewFitting() {
  const [subject, params] = location.hash.slice(1).split('?')
  const view = new URLSearchParams(params).get('fitting')
  if (subject !== 'crew' || (view !== 'turnaround' && view !== 'profile' && view !== 'back')) return
  const { alpha, x } = angles[view]
  const setup = subjectLink(location.href, 'crew', false, {
    version: 1,
    name: 'Crew turnaround fitting',
    camera: { alpha, beta: 1.51, radius: 2.85, target: [0, 0.93, 0] },
    options: { state: 'idle', uniform: 'courier', skin: 'medium', hair: 'short', hairColor: 'chestnut', cap: false },
    time: 0.4,
    grid: false,
    wireframe: false,
  }, 'daylight')
  history.replaceState(history.state, '', withReference(setup, turnaroundUrl, undefined, 'Approved crew turnaround. Front, side and rear views of a dock worker with swept dark hair, sea-green shirt, rolled cuffs, navy trousers and deck boots.'))
  return x
}
