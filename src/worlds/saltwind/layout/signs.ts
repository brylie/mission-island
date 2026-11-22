const quarterTurn = Math.PI / 2

export const wayfindingSigns = [
  { x: -265, z: -228, name: 'BRINEWICK FERRY', heading: Math.PI },
  { x: -283, z: -113, name: 'BRINEWICK', heading: Math.PI },
  { x: 189.7, z: 28.9, name: 'LONG ACRE APIARY', heading: quarterTurn },
  { x: 129, z: -58, name: 'BARLEYCROSS', heading: -quarterTurn },
  { x: -10, z: 161, name: 'ALDERWATCH', heading: quarterTurn },
] as const
