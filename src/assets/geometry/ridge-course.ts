const loanRack = { postHeight: 1.16, beamDepth: 0.27 } as const
export const ridgeRackGeometry = { ...loanRack, supportBoxes: [[1.62, loanRack.beamDepth, loanRack.postHeight]] } as const

const windsockPole = { baseDiameter: 0.09, height: 2.64 } as const
export const ridgeWindsockGeometry = { pole: windsockPole, supportBoxes: [[windsockPole.baseDiameter, windsockPole.baseDiameter, windsockPole.height]] } as const

const landingSignPost = { width: 0.15, depth: 0.15, height: 1.26 } as const
const landingSignFace = { width: 1.44, depth: 0.19, height: 0.51, centreY: 1.29 } as const
export const ridgeLandingSignGeometry = {
  post: landingSignPost,
  face: landingSignFace,
  supportBoxes: [[landingSignPost.width, landingSignPost.depth, landingSignPost.height], [landingSignFace.width, landingSignFace.depth, 1.545]],
} as const
