export const starterBuildingReview = {
  angle: -0.98,
  names: ['Harbor Depot', 'Harbor workshop', 'Seabrook house', 'Seabrook brick house', 'Seabrook cottage', 'Seabrook shop', 'Seabrook teal house', 'Fire supplies', 'Forest Lookout', 'Amber crew home', 'Blue crew home'],
} as const

export const saltwindBuildingWidth = { minimumScale: 0.85, maximumScale: 1.3, step: 0.1 } as const

export const roadReview = {
  angle: 1.03,
  widthLimits: [3, 12, 0.2],
  pathWidth: [1, 0.5, 1.8, 0.05],
  walkwayNames: ['North neighborhood', 'South neighborhood', 'House entrance', 'East houses'],
} as const

export const flatbedReview = { duration: 4, steering: [28, -45, 45, 1], wheelHalfTurnsPerSecond: 4 } as const

export const skiffReview = { duration: 8, bobPhase: 0.5, bobHeight: 0.048 } as const

export const coastalModelReview = {
  foxgloveSeed: [7, 1, 25, 1],
  netShedAngle: -0.65,
  tug: { steering: [15, -35, 35, 1], wheelRate: 3 },
} as const
