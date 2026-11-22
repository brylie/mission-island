type ThighSection = readonly [y: number, centerX: number, halfWidth: number, halfDepth: number, centerZ: number, poseWeight: number]
type TorsoSection = readonly [y: number, halfWidth: number, halfDepth: number, centerZ: number]
type BibPoint = readonly [x: number, y: number, frontZ: number, backZ: number]
type StrapSection = readonly [innerY: number, innerZ: number, outerY: number, outerZ: number]

export const crewSwimsuit = {
  ringSides: 24,
  pelvis: { y: 0.752, z: -0.006, halfWidth: 0.274, halfDepth: 0.175, crotchDrop: 0.107, crotchCurve: 0.75 },

  // Sections near the pelvis follow less of the leg rotation.
  thigh: [
    [0.473, 0.149, 0.119, 0.132, 0.018, 1],
    [0.488, 0.148, 0.123, 0.137, 0.016, 1],
    [0.531, 0.143, 0.126, 0.142, 0.011, 0.89],
    [0.572, 0.140, 0.129, 0.150, 0.005, 0.66],
    [0.615, 0.137, 0.132, 0.156, 0.001, 0.41],
    [0.654, 0.133, 0.135, 0.161, -0.002, 0.19],
  ] satisfies readonly ThighSection[],
  torso: [
    [0.786, 0.265, 0.173, 0.002],
    [0.868, 0.251, 0.168, -0.006],
    [0.948, 0.253, 0.177, -0.009],
    [1.052, 0.277, 0.181, -0.009],
    [1.139, 0.285, 0.168, -0.010],
  ] satisfies readonly TorsoSection[],
  bib: [
    [0, 1.179, 0.158, -0.161],
    [0.088, 1.188, 0.150, -0.151],
    [0.124, 1.207, 0.127, -0.146],
    [0.198, 1.208, 0.122, -0.129],
    [0.249, 1.175, 0.077, -0.092],
    [0.275, 1.161, 0.038, -0.059],
    [0.284, 1.155, -0.010, -0.010],
  ] satisfies readonly BibPoint[],
  strap: {
    front: [10, 9],
    back: [2, 3],
    innerX: 0.124,
    outerX: 0.188,
    profile: [
      [1.242, 0.102, 1.244, 0.110],
      [1.268, 0.089, 1.268, 0.088],
      [1.280, 0.079, 1.278, 0.077],
      [1.290, 0.037, 1.292, 0.038],
      [1.290, -0.010, 1.291, -0.010],
      [1.287, -0.056, 1.281, -0.053],
      [1.276, -0.095, 1.266, -0.086],
      [1.246, -0.128, 1.239, -0.114],
    ] satisfies readonly StrapSection[],
  },
  chestSeam: {
    path: [
      [-0.146, 1.122, 0.132, 0.003, 0.003],
      [-0.079, 1.117, 0.155, 0.005, 0.004],
      [0, 1.115, 0.165, 0.006, 0.004],
      [0.079, 1.117, 0.155, 0.005, 0.004],
      [0.146, 1.122, 0.132, 0.003, 0.003],
    ],
    normal: [0, 0, 1],
  },
} as const
