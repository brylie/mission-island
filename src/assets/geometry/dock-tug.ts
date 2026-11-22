export const dockTugFinishes = {
  enamel: '#498477',
  cream: '#e5cd97',
  rubber: '#333d3e',
  iron: '#526260',
  deckBoards: '#b8966a',
  step: '#85765e',
  seat: '#594f43',
  backrest: '#685647',
  taillight: '#c4684e',
  headlight: '#f3d99d',
  windshield: '#a7d2cf',
} as const

type Center = readonly [x: number, y: number, z: number]
type DockTugBoxSize = readonly [width: number, height: number, depth: number]
type CylinderSize = readonly [topDiameter: number, bottomDiameter: number, length: number, sides: number]
export interface DockTugBox {
  center: Center
  size: DockTugBoxSize
  finish: keyof typeof dockTugFinishes
}

export const dockTugChassis = {
  frame: { center: [0, 0.42, -0.09], size: [1.04, 0.16, 1.91], finish: 'iron' },
  cargoBed: { center: [0, 0.60, -0.67], size: [1.26, 0.27, 1.03], finish: 'enamel' },
  deck: { center: [0, 0.766, -0.67], size: [1.29, 0.068, 1.06], finish: 'deckBoards' },
  rails: { x: [-0.62, 0.62], y: 0.87, z: -0.655, size: [0.064, 0.16, 1.05] satisfies DockTugBoxSize },
  tailgate: { center: [0, 0.87, -1.177], size: [1.282, 0.162, 0.082], finish: 'enamel' },
  bulkhead: { center: [0, 0.89, -0.16], size: [1.19, 0.22, 0.065], finish: 'enamel' },
} as const

export const dockTugDriver = {
  step: { center: [0, 0.50, 0.30], size: [0.99, 0.08, 0.81], finish: 'step' },
  pedestal: { center: [0, 0.67, 0.01], size: [0.53, 0.27, 0.35], finish: 'enamel' },
  seat: { center: [0, 0.83, 0.02], size: [0.59, 0.105, 0.43], finish: 'seat' },
  backrest: { center: [0, 0.99, -0.155], size: [0.57, 0.29, 0.085], finish: 'backrest', rake: -0.11 },
} as const

type BonnetSection = [z: number, centerY: number, halfWidth: number, halfHeight: number]
const bonnetSections: BonnetSection[] = [
  [0.59, 0.76, 0.43, 0.26],
  [0.76, 0.76, 0.50, 0.27],
  [0.98, 0.74, 0.49, 0.22],
  [1.11, 0.71, 0.45, 0.17],
  [1.14, 0.71, 0.39, 0.14],
]

export const dockTugBodywork = {
  bonnet: { sections: bonnetSections, sides: 16, roundness: 0.46 },
  bumper: { center: [0, 0.54, 1.15], size: [0.91, 0.084, 0.12], finish: 'cream' },
  grille: { levels: [0.65, 0.69, 0.73], z: 1.146, size: [0.29, 0.014, 0.017] satisfies DockTugBoxSize },
  rear: {
    x: [-0.52, 0.52],
    taillight: { y: 0.67, z: -1.196, size: [0.17, 0.075, 0.028] satisfies DockTugBoxSize },
    fender: { y: 0.546, z: -0.71, size: [0.23, 0.07, 0.69] satisfies DockTugBoxSize },
  },
  headlights: {
    x: [-0.281, 0.281],
    y: 0.786,
    casing: { z: 1.141, size: [0.138, 0.15, 0.078, 12] satisfies CylinderSize },
    lens: { z: 1.188, size: [0.112, 0.112, 0.024, 12] satisfies CylinderSize },
  },
} as const

export const dockTugCab = {
  windshieldRake: 0.12,
  posts: {
    x: [-0.446, 0.446],
    y: 1.34,
    front: { z: 0.73, size: [0.048, 0.99, 0.054] satisfies DockTugBoxSize },
    rear: { z: -0.12, size: [0.045, 0.99, 0.050] satisfies DockTugBoxSize },
  },
  windshield: { center: [0, 1.55, 0.768] satisfies Center, size: [0.855, 0.41, 0.037] satisfies DockTugBoxSize, opacity: 0.34 },
  sill: { center: [0, 1.347, 0.742], size: [0.91, 0.051, 0.066], finish: 'cream' },
  roof: { center: [0, 1.842, 0.28], size: [1.03, 0.087, 1.11], finish: 'cream' },
  roofLining: { center: [0, 1.805, 0.28], size: [0.97, 0.043, 1.04], finish: 'enamel' },
  steering: {
    rake: -0.37,
    column: { center: [0, 1.02, 0.58] satisfies Center, size: [0.042, 0.046, 0.43, 8] satisfies CylinderSize },
    wheel: { center: [0, 1.214, 0.50] satisfies Center, size: [0.30, 0.27, 0.039, 14] satisfies CylinderSize },
  },
} as const

export const dockTugRunningGear = {
  axleHeight: 0.26,
  rearWheels: { x: [-0.55, 0.55], z: -0.72 },
  frontWheelZ: 0.86,
  fork: { x: [-0.13, 0.13], y: 0.12, size: [0.038, 0.26, 0.054] satisfies DockTugBoxSize },
  tire: [0.52, 0.52, 0.161, 18] satisfies CylinderSize,
  rim: { offsetX: 0.089, size: [0.26, 0.26, 0.043, 14] satisfies CylinderSize },
  cap: { offsetX: 0.115, size: [0.11, 0.11, 0.014, 10] satisfies CylinderSize },
} as const
