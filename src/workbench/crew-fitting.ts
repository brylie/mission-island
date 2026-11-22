import { crewTurnaroundReview } from '../assets/recipes/workbench-crew-study'
import turnaround from '../../docs/images/crew-character-turnaround.jpg?url'
import { withReference } from './reference-link'
import { subjectLink } from './subject-link'

// Resolve the illustrated fitting on this host so the same shortcut works in development, on LAN and in a production build.
export const turnaroundUrl = new URL(turnaround, document.baseURI).href

export function openCrewFitting() {
  const [subject, params] = location.hash.slice(1).split('?')
  const view = new URLSearchParams(params).get('fitting')
  if (subject !== 'crew' || (view !== 'turnaround' && view !== 'profile' && view !== 'back')) return
  const { alpha, x } = crewTurnaroundReview.angles[view]
  const setup = subjectLink(location.href, 'crew', false, {
    version: 1,
    name: 'Crew turnaround fitting',
    camera: { alpha, ...crewTurnaroundReview.camera, target: [...crewTurnaroundReview.camera.target] },
    options: { state: 'idle', uniform: 'courier', skin: 'medium', hair: 'short', hairColor: 'chestnut', cap: false },
    time: crewTurnaroundReview.time,
    grid: false,
    wireframe: false,
  }, 'daylight')
  history.replaceState(history.state, '', withReference(setup, turnaroundUrl, undefined, 'Approved crew turnaround. Front, side and rear views of a dock worker with swept dark hair, sea-green shirt, rolled cuffs, navy trousers and deck boots.'))
  return x
}
