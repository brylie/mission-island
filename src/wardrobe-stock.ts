export const shopHats = {
  'gull-cap': { name: 'Gull Captain’s Hat', price: 2, color: '#f4e9d3', trim: '#e7a33f', detail: '#365666' },
  'moon-hat': { name: 'Moonpool Bucket Hat', price: 2, color: '#4a4674', trim: '#c4ddde', detail: '#888fc4' },
  'jelly-hat': { name: 'Jellybell Bonnet', price: 3, color: '#c184c2', trim: '#f7cada', detail: '#79538d' },
  'reed-crown': { name: 'Reedlight Crown', price: 2, color: '#6e9353', trim: '#edce67', detail: '#41694a' },
  'buoy-hat': { name: 'Buoy Bobble Hat', price: 1, color: '#c95e47', trim: '#f4e8cb', detail: '#773e54' },
} as const

export const shopTops = {
  'squid-coat': { name: 'Squid Slicker', price: 3, color: '#784f89', trim: '#edb6dd', detail: '#49335d', sleeveless: false },
  'star-knit': { name: 'Star Chart Sweater', price: 2, color: '#344771', trim: '#f7d678', detail: '#728bb6', sleeveless: false },
  'kelp-vest': { name: 'Kelpwing Vest', price: 2, color: '#43886c', trim: '#c0d77d', detail: '#265f56', sleeveless: true },
  'beacon-top': { name: 'Beacon Jersey', price: 1, color: '#bc534e', trim: '#f7dfaf', detail: '#443d59', sleeveless: false },
  'fox-knit': { name: 'Dune Fox Pullover', price: 2, color: '#d58046', trim: '#f6dfb2', detail: '#914434', sleeveless: false },
} as const

export const shopBottoms = {
  'crab-cargo': { name: 'Crabpot Cargo Pants', price: 2, color: '#546c59', trim: '#c9a36d', detail: '#3e5149', short: false },
  'cloud-pants': { name: 'Cloud Puff Trousers', price: 3, color: '#87b6cd', trim: '#e5eff2', detail: '#6185a5', short: false },
  'tide-cuffs': { name: 'Tide Chart Culottes', price: 2, color: '#837ab5', trim: '#d7c9ef', detail: '#5c577f', short: true },
  'salt-shorts': { name: 'Pink Salt Shorts', price: 1, color: '#c45c82', trim: '#f8bad5', detail: '#943864', short: true },
  'sail-pants': { name: 'Signal Sail Trousers', price: 2, color: '#d5a34d', trim: '#ffe2a4', detail: '#5a6c76', short: false },
} as const

export const shopShoes = {
  'kelp-boots': { name: 'Kelp Coil Boots', price: 3, color: '#47765e', trim: '#b4d17c', detail: '#315744', open: false },
  'crab-clogs': { name: 'Crab Claw Clogs', price: 2, color: '#c9584c', trim: '#f29869', detail: '#673c3b', open: false },
  'moth-shoes': { name: 'Luna Moth Slippers', price: 2, color: '#8570a9', trim: '#d5e69c', detail: '#5e4f77', open: false },
  'shell-shoes': { name: 'Shellstrap Sandals', price: 1, color: '#956e57', trim: '#f6dfb5', detail: '#694c43', open: true },
  'light-tops': { name: 'Lighthouse High-Tops', price: 2, color: '#e1c494', trim: '#b95043', detail: '#3a5667', open: false },
} as const

export const stockedPieces = { hat: shopHats, shirt: shopTops, trousers: shopBottoms, shoes: shopShoes } as const
export type PieceSlot = keyof typeof stockedPieces
export const pieceSlots: PieceSlot[] = ['hat', 'shirt', 'trousers', 'shoes']
export type StockId<Slot extends PieceSlot = PieceSlot> = Slot extends PieceSlot ? keyof typeof stockedPieces[Slot] : never

export function stockChoices<T extends Record<string, { readonly name: string }>>(group: T) {
  return Object.fromEntries(Object.entries(group).map(([id, { name }]) => [id, name])) as { [Id in keyof T]: T[Id]['name'] }
}

export function isStockPiece<Slot extends PieceSlot>(slot: Slot, id: string | undefined): id is StockId<Slot> {
  return id !== undefined && Object.hasOwn(stockedPieces[slot], id)
}
