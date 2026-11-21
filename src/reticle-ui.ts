import type { Interaction } from './interaction-options'
import { interactions } from './interaction-options'
import type { Player, Snapshot } from './protocol'
import { aimedInteraction, type AimRay } from './reticle-target'

// A tooltip over whatever the reticle is on, naming it and the key that acts on it.
export function createReticleFocus(markers: HTMLElement, reticle: HTMLElement | null) {
  const tip = document.createElement('div')
  tip.className = 'target-tip'
  tip.setAttribute('aria-hidden', 'true')
  const name = document.createElement('strong')
  const key = document.createElement('kbd')
  const label = document.createElement('span')
  tip.append(name, key, label)
  tip.hidden = true
  markers.append(tip)
  let focus: Interaction | undefined

  return {
    tip,
    focus: () => focus,
    update(state: Snapshot, player: Player | undefined, ray: AimRay | undefined) {
      focus = player ? aimedInteraction(interactions(state, player), ray, focus) : undefined
      tip.hidden = !focus
      reticle?.toggleAttribute('data-on-target', Boolean(focus))
      if (focus) {
        name.textContent = focus.name
        key.textContent = focus.key
        key.hidden = !focus.key
        label.textContent = focus.label
      }
      return focus
    },
  }
}
