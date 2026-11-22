import type { createCrew } from '../assets/crew'
import type { MeshFactory } from '../island-meshes'
import { apiary, honeyAction, honeyReward } from './long-acre'
import type { HoneyOrder } from './long-acre'
import { createHoneyGear } from './long-acre-art'
import type { MapPoint } from './sites'

const apiaryOfferRange = 17

const messages: Record<HoneyOrder, string> = {
  kit: `Borrow a veil and jar at the gate shelf. The Farmers Market offers ${honeyReward} coins for one jar.`,
  empty: 'Follow the stepping stones around the rail to the covered extractor. Fill the jar at the tap.',
  filled: 'Carry the sealed jar to the honey shelf at Barleycross Farmers Market.',
  delivered: `Honey delivered · ${honeyReward} trial coins earned.`,
}

type Walker = MapPoint & { grounded: boolean }

export function createHoneyDelivery(meshes: MeshFactory, crew: ReturnType<typeof createCrew>, onAdvance: () => void) {
  const panel = document.getElementById('honey-order')!
  const status = document.getElementById('honey-status')!
  const button = document.querySelector<HTMLButtonElement>('#honey-action')!
  const dress = createHoneyGear(meshes, crew)
  let order: HoneyOrder = 'kit'
  let player: Walker | undefined
  let available = false
  dress(order)

  function update(point: Walker, canInteract: boolean) {
    player = point
    available = canInteract
    panel.hidden = !available || (order === 'kit' && Math.hypot(point.x - apiary.x, point.z - apiary.z) > apiaryOfferRange)
    if (panel.hidden) return
    if (status.textContent !== messages[order]) status.textContent = messages[order]
    const action = point.grounded ? honeyAction(order, point) : undefined
    button.hidden = !action
    if (action) {
      const label = action.label + ' [E]'
      if (button.textContent !== label) button.textContent = label
    }
  }

  function interact() {
    if (!player?.grounded || panel.hidden) return
    const action = honeyAction(order, player)
    if (!action) return
    order = action.next
    dress(order)
    update(player, available)
    onAdvance()
  }
  button.addEventListener('click', interact)
  return { update, interact, carrying: () => order === 'empty' || order === 'filled' }
}
