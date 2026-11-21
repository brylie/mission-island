// Small, marked pickups sit off the paths. The edging runs just outside the ferry gravel.
export const materialSources = {
  timber: { x: -27.9, z: 12.5, name: 'Marked windfall', landmark: 'Meadow Slope Path' },
  stone: { x: 45.5, z: -27, name: 'Loose surface stone', landmark: 'Splitstone Strand' },
} as const

export const sampleTray = { x: -28.1, z: -25.2 }
export const repairSite = { x: -28.8, z: -22.6, name: 'Ferry Approach Edging' }
export const repairChoices = {
  timber: { x: -28.1, z: -23.85 },
  stone: { x: -28.1, z: -21.35 },
} as const
export const edgingSections = [{ x: -29.24, z: -23.22 }, { x: -29.24, z: -21.98 }] as const
