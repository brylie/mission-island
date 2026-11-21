import { oreNames } from '../ore-contracts'
import { stockpiles } from '../second-island/stockpiles'
import { createOreLoad } from '../assets/quarry'
import { vehiclePlacement } from '../second-island/scenery'
import { groundHeight as saltwindGround } from '../second-island/terrain'
import { createExterior } from '../second-island/exteriors'
import { buildings as saltwindBuildings } from '../second-island/lots'
import { createSaltwindVehicle, vehicleSpecs } from '../second-island/vehicles'
import type { VehicleId } from '../second-island/vehicles'
import { control, range, type Entry } from './subject'

export const saltwindAssets: Entry[] = [
  ...(Object.entries(vehicleSpecs) as [VehicleId, typeof vehicleSpecs[VehicleId]][]).map(([id, spec]): Entry => ({
    id: `saltwind-${id}`,
    name: spec.name,
    group: 'Saltwind vehicles',
    source: id === 'hauler' ? 'src/assets/ore-hauler.ts' : 'src/second-island/vehicles.ts',
    description: `${spec.width} m wide · ${spec.length} m long · +Z forward. Staged exterior.`,
    fieldSite: () => {
      const offset = vehiclePlacement(id)
      return { name: 'Saltwind', offset, heading: offset.heading, saltwindSubject: id }
    },
    controls: id === 'hauler' ? [control('ore', 'Truck bed', 'empty', { empty: 'Empty', ...oreNames }, true)] : undefined,
    create(meshes, values) {
      const root = createSaltwindVehicle(meshes, id)
      const load = id === 'hauler' && stockpiles.find((pile) => pile.id === values.ore)
      if (load) createOreLoad(meshes, root, load.id)
    },
  })),
  ...saltwindBuildings.map((building): Entry => ({
    id: `saltwind-${building.site}`,
    name: building.site.split('-').map((word) => word[0].toUpperCase() + word.slice(1)).join(' '),
    group: 'Saltwind buildings',
    source: 'src/second-island/exteriors.ts',
    description: `${building.width} × ${building.depth} m footprint. Front entry faces local +Z.`,
    fieldSite: () => ({ name: 'Saltwind', saltwindSubject: building.site, heading: building.facing, offset: { ...building, y: saltwindGround(building.x, building.z) } }),
    controls: [
      range('width', 'Building width (m)', building.width, building.width * 0.85, building.width * 1.3, 0.1, true),
      control('roof', 'Roof form', 'original', { original: 'As built', flat: 'Flat roof', gable: 'Gabled roof' }, true),
      control('tower', 'Tower', 'original', { original: 'As built', none: 'None', school: 'Flag tower', fire: 'Hose tower', church: 'Steeple' }, true),
      { type: 'checkbox', key: 'canopy', label: 'Street canopy', value: building.kind === 'market' || building.kind === 'shop', rebuild: true },
      { type: 'color', key: 'wall', label: 'Wall color', value: building.wall, rebuild: true },
      { type: 'color', key: 'roofColor', label: 'Roof color', value: building.roof, rebuild: true },
    ],
    create(meshes, v) {
      const roof = v.roof === 'flat' || v.roof === 'gable' ? v.roof : undefined
      const tower = v.tower === 'school' || v.tower === 'fire' || v.tower === 'church' || v.tower === 'none' ? v.tower : undefined
      createExterior(meshes, { ...building, width: Number(v.width), wall: String(v.wall), roof: String(v.roofColor) }, undefined, { roof, tower, canopy: Boolean(v.canopy) })
    },
  })),
]
