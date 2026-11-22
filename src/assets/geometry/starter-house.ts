export const houseRoofRise = 1.65

const cream = '#fff3d0'
export const starterHouseModel = {
  foundation: { centerY: 0.12, edgeAllowance: 0.35, height: 0.25 },
  roof: {
    sideOverhang: 0.35,
    depthOverhang: 0.3,
    slope: { endRecess: 0.025, thickness: 0.19 },
    fascia: { rise: 0.06, widthAllowance: 0.1, height: 0.16, depth: 0.16, setback: 0.03 },
    gable: { inset: 0.22, triangles: [0, 2, 1, 3, 5, 4] },
    ridge: { rise: 0.01, widthAllowance: 0.07, height: 0.14, depth: 0.17 },
  },
  door: { centerY: 1.25, outset: 0.04, size: [1.26, 2.48, 0.13], color: '#395951' },
  windows: {
    sideFraction: 0.31,
    heightRatio: 0.61,
    frame: { outset: 0.04, size: [1.24, 1.03, 0.15], color: cream },
    glazing: { outset: 0.13, size: [0.96, 0.77, 0.06], color: '#4c7a83' },
    mullion: { outset: 0.17, size: [0.075, 0.8, 0.045], color: cream },
  },
  chimney: { houseMinimumWidth: 5, xRatio: 0.26, rise: 1.08, z: 0.6, size: [0.55, 1.55, 0.52], color: '#925c4b' },
} as const
