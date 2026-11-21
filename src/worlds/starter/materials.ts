// Small, marked pickups sit off the paths. The edging runs just outside the east shoulder of Harbor Depot road,
// between Wren's mending bench and the ferry freight yard.
export const materialSources = {
  timber: { x: -27.9, z: 12.5, name: 'Marked windfall', landmark: 'Meadow Slope Path' },
  stone: { x: 45.5, z: -27, name: 'Loose surface stone', landmark: 'Splitstone Strand' },
} as const

export const sampleTray = { x: -22.2, z: -18 }
export const repairSite = { x: -25.5, z: -17.6, name: 'Ferry Approach Edging' }
export const repairChoices = {
  timber: { x: -24.4, z: -18.6 },
  stone: { x: -24.4, z: -17.2 },
} as const
export const edgingSections = [{ x: -25.99, z: -18.24 }, { x: -25.86, z: -17 }] as const
