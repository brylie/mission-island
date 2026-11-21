import { createWayfindingOrbs } from './assets/wayfinding-orbs'
import { deliveryWaypoints, loadedDeliveryRoute } from './delivery-wayfinding'
import type { MeshFactory } from './island-meshes'
import type { Snapshot } from './protocol'

export function createDeliveryWayfindingView(meshes: MeshFactory) {
  const routes = Object.entries(deliveryWaypoints).map(([id, points]) => {
    const orbs = createWayfindingOrbs(meshes, 'Delivery route ' + id, '#ffc66d', 0.38)
    orbs.setPath(points)
    orbs.setEnabled(false)
    return { id, orbs }
  })
  return (state: Snapshot | undefined) => {
    const active = loadedDeliveryRoute(state)
    for (const { id, orbs } of routes) orbs.setEnabled(id === active)
  }
}
