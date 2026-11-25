import { previewRoadLayouts } from '../roads'
import { landscapeStudy } from './landscape-study'
import { designerRoads, openRoadDesigner } from './road-designer'
import type { Entry } from './subject'

// The road designer opens over the live island. The island is graded with the draft
// roads each time it is built, so "Preview roads in 3D" shows the cut and fill.
export const roadDesignerStudy: Entry = {
  ...landscapeStudy,
  id: 'road-designer',
  name: 'Road designer',
  source: 'src/workbench/road-designer.ts',
  description: 'Lay out graded roads: place dots, bend stretches, watch each road find its grade through the terrain, then save the layout to the source tree.',
  readout: undefined,
  actions: [{ label: 'Preview roads in 3D', restart: true, enabled: () => true, run: () => {} }],
  create(meshes, values, reportError, observe, field) {
    previewRoadLayouts(designerRoads())
    openRoadDesigner()
    return landscapeStudy.create(meshes, values, reportError, observe, field)
  },
}
