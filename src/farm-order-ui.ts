import { farmOrders, farmOrderStatus, type FarmWork } from './farm-orders'
import type { ServerMessage, Snapshot } from './protocol'
import { barrowPickupName, produceCounter } from './worlds/starter/farm-order-sites'

export function updateFarmHud(element: HTMLElement, orders: FarmWork) {
  const text = farmOrderStatus(orders)
  if (element.textContent !== text) element.textContent = text
  element.hidden = text === ''
}

export function farmFeedback(message: Extract<ServerMessage, { type: 'farm-pay' | 'barrow-returned' | 'barrow-parked' }>) {
  if (message.type !== 'farm-pay') return {
    key: '',
    label: message.type === 'barrow-returned' ? `Barrow returned to the ${barrowPickupName}` : 'Barrow parked at the obstruction',
  }
  return { key: `+${message.coins} coins`, label: `${farmOrders[message.id].title} complete · Crew bank` }
}

export function drawFarmMap({ farmWork }: Snapshot, dot: (x: number, z: number, color: string, radius: number) => void) {
  const { progress, barrow } = farmWork
  if (progress.stage === 'starter' || progress.stage === 'harvest') dot(produceCounter.x, produceCounter.z, '#f3bd78', 5)
  if (barrow) {
    dot(barrow.x, barrow.z, '#234244', 5.5)
    dot(barrow.x, barrow.z, '#f3bd78', 3.4)
  }
}
