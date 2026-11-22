export const wayfindingSign = {
  post: { offsetX: 1.45, y: 1.24, size: [0.18, 2.54, 0.17], color: '#987958' },
  board: { y: 2.03, size: [3.91, 1.03, 0.19], color: '#edcf99' },
  face: {
    positions: [-1.87, 1.58, 0.104, 1.87, 1.58, 0.104, 1.87, 2.48, 0.104, -1.87, 2.48, 0.104],
    indices: [0, 2, 1, 0, 3, 2],
    uvs: [1, 0, 0, 0, 0, 1, 1, 1],
  },
  label: {
    width: 512,
    height: 128,
    baseline: 86,
    condensedAfter: 15,
    condensedFont: 'bold 43px Georgia',
    font: 'bold 54px Georgia',
    ink: '#fff1cc',
    background: '#3b6b65',
  },
} as const
