import { farmOrders, farmOrderStatus, type FarmWork } from './farm-orders'
import type { ServerMessage, Snapshot } from './protocol'
import { barrowPickupName, produceCounter } from './worlds/starter/farm-order-sites'

const counterMarkerRadius = 5
const barrowMarkerBorderRadius = 5.5
const barrowMarkerFillRadius = 3.4

export function updateFarmHud(element: HTMLElement, orders: FarmWork) {
  const text = farmOrderStatus(orders)
  if (element.textContent !== text) element.textContent = text
  element.hidden = text === ''
}

export function farmFeedback(message: Extract<ServerMessage, { type: 'farm-pay' | 'barrow-returned' }>) {
  if (message.type !== 'farm-pay') return {
    key: '',
    label: `Barrow returned to the ${barrowPickupName}`,
  }
  return { key: `+${message.coins} coins`, label: `${farmOrders[message.id].title} complete · Crew bank` }
}

export function drawFarmMap({ farmWork }: Snapshot, dot: (x: number, z: number, color: string, radius: number) => void) {
  const { progress, barrow } = farmWork
  if (progress.stage === 'starter' || progress.stage === 'harvest') dot(produceCounter.x, produceCounter.z, '#f3bd78', counterMarkerRadius)
  if (barrow) {
    dot(barrow.x, barrow.z, '#234244', barrowMarkerBorderRadius)
    dot(barrow.x, barrow.z, '#f3bd78', barrowMarkerFillRadius)
  }
}
