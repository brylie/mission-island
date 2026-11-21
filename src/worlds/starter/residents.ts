import type { ResidentDefinition } from '../../residents/definition.ts'
import { bram } from './residents/bram.ts'
import { ines } from './residents/ines.ts'
import { mara } from './residents/mara.ts'
import { wren } from './residents/wren.ts'

// Starter Island's residents. Order is stable: the index is each resident's interaction subject.
// Records are saved by id, so a new resident can be added anywhere without a save migration.
export const starterResidents: readonly ResidentDefinition[] = [mara, wren, ines, bram]

export function starterResident(id: string) {
  return starterResidents.find((resident) => resident.id === id)
}
