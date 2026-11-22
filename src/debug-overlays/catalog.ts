import { animalLayer, sightlineLayer, wildfireLayer } from './live-layers.ts'
import { createOverlayRegistry } from './registry.ts'
import { corridorLayer, habitatLayer, protectedLayer, slopeLayer, solidsLayer } from './world-layers.ts'

// Every debug overlay the game, the Workbench and the capture CLI can show. Add a layer here to publish it everywhere.
export const debugOverlays = createOverlayRegistry([
  slopeLayer,
  habitatLayer,
  solidsLayer,
  corridorLayer,
  protectedLayer,
  wildfireLayer,
  sightlineLayer,
  animalLayer,
])
