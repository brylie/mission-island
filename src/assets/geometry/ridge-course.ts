const rackPost = { x: 0.74, height: 1.16, width: 0.14, depth: 0.14 } as const
const rackBeam = { y: 1.09, width: 1.74, height: 0.14, depth: 0.27 } as const
export const ridgeRackGeometry = {
  postHeight: rackPost.height,
  beamDepth: rackBeam.depth,
  supportBoxes: [[rackPost.x * 2 + rackPost.width, rackBeam.depth, rackPost.height]],
} as const

const windsockPole = { baseDiameter: 0.09, height: 2.64 } as const
export const ridgeWindsockGeometry = { pole: windsockPole, supportBoxes: [[windsockPole.baseDiameter, windsockPole.baseDiameter, windsockPole.height]] } as const

const landingSignPost = { width: 0.15, depth: 0.15, height: 1.26 } as const
const landingSignFace = { width: 1.44, depth: 0.19, height: 0.51, centreY: 1.29 } as const
export const ridgeLandingSignGeometry = {
  post: landingSignPost,
  face: landingSignFace,
  supportBoxes: [[landingSignPost.width, landingSignPost.depth, landingSignPost.height], [landingSignFace.width, landingSignFace.depth, landingSignFace.centreY + landingSignFace.height / 2]],
} as const

export const ridgeCoursePaint = { spruce: '#56483b', orange: '#f58b47', cream: '#ffe9b8', blue: '#287282', marked: '#84eed9' } as const

export const ridgeCourseTrim = {
  rack: { post: rackPost, beam: rackBeam, cushion: [0, 0.81, 0, 0.78, 0.24, 0.16] },
  windsock: {
    pole: { topDiameter: 0.05, segments: 8 },
    bands: { count: 5, y: 2.55, drop: 0.018, z: 0.13, spacing: 0.2, tip: 0.32, base: 0.36, taper: 0.043, length: 0.208, segments: 12 },
  },
  landingRing: { segments: 64, width: 0.38, raised: 0.045 },
  signStripe: { z: 0.105, size: [0.83, 0.1, 0.031] },
} as const

// Rendering and flight clearance use these same four sail vertices.
export const ridgeWing = {
  nose: { x: 0, y: 1.94, z: 0.98 },
  left: { x: -1.8, y: 1.78, z: -0.78 },
  keel: { x: 0, y: 1.91, z: -0.52 },
  right: { x: 1.8, y: 1.78, z: -0.78 },
} as const

export const ridgeGliderTrim = {
  sail: { front: [0, 1, 2, 0, 2, 3], back: [2, 1, 0, 3, 2, 0], finish: '#d76838' },
  strut: { center: [0.24, 1.52, 0.39], size: [0.035, 0.7, 0.035], splay: 0.31 },
  shoulderStrap: { center: [0.16, 1.2, -0.21], size: [0.074, 0.43, 0.067] },
  controlBar: [0, 1.19, 0.39, 0.68, 0.045, 0.045],
  harnessSeat: [0, 0.95, -0.14, 0.43, 0.12, 0.26],
} as const
