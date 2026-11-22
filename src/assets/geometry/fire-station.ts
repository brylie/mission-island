// A roadside fire station: a low plinth for one extinguisher, a post and a hooded sign behind it.
const plinth = { width: 0.62, depth: 0.56, height: 0.12 } as const
const post = { width: 0.12, depth: 0.12, height: 2.05, z: -0.36 } as const

export const fireStationGeometry = {
  plinth: { ...plinth, color: '#a39c86' },
  plinthTrim: { width: 0.66, depth: 0.6, height: 0.03, color: '#f2e6c8' },
  post: { ...post, color: '#8b6746' },
  sign: { width: 0.75, height: 0.5, depth: 0.04, y: 1.58, z: post.z + 0.08, color: '#d4513d' },
  // A cream extinguisher pictogram: body, head and nozzle.
  signBand: { width: 0.16, height: 0.26, depth: 0.012, y: 1.54, color: '#fff3d0' },
  signHead: { width: 0.2, height: 0.06, y: 1.71, nozzle: 0.12 },
  hood: { width: 0.88, depth: 0.3, height: 0.05, y: 1.9, z: post.z + 0.1, tilt: 0.28, color: '#3f5d5a' },
  // The extinguisher rests on the plinth.
  restTop: plinth.height,
  supportBoxes: [[plinth.width, plinth.depth, plinth.height], [post.width + 0.1, post.depth + 0.1, post.height, 0, post.z]],
} as const
