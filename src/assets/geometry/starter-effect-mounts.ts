type ShelfBox = readonly [
  x: number,
y: number,
z: number,
  width: number,
height: number,
depth: number,
color: string,
]

export const jobBoardLanternShelf = [
  [0.04, -0.026, -0.044, 0.37, 0.049, 0.31, '#79664c'],
  [0.065, -0.14, -0.094, 0.128, 0.225, 0.09, '#675b46'],
] as const satisfies readonly ShelfBox[]
