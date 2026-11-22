const oneCoin = 1
const twoCoins = 2
const threeCoins = 3
const fourCoins = 4
const fiveCoins = 5
const sixCoins = 6

export const shopHats = {
  'gull-cap': { name: 'Gull Captain’s Hat', price: twoCoins, color: '#f4e9d3', trim: '#e7a33f', detail: '#365666' },
  'moon-hat': { name: 'Moonpool Bucket Hat', price: twoCoins, color: '#4a4674', trim: '#c4ddde', detail: '#888fc4' },
  'jelly-hat': { name: 'Jellybell Bonnet', price: threeCoins, color: '#c184c2', trim: '#f7cada', detail: '#79538d' },
  'reed-crown': { name: 'Reedlight Crown', price: twoCoins, color: '#6e9353', trim: '#edce67', detail: '#41694a' },
  'buoy-hat': { name: 'Buoy Bobble Hat', price: oneCoin, color: '#c95e47', trim: '#f4e8cb', detail: '#773e54' },
  'picnic-boater': { name: 'Picnic Straw Boater', price: threeCoins, color: '#e8c985', trim: '#c26b63', detail: '#976d49' },
  'bramble-beret': { name: 'Bramble Beret', price: fourCoins, color: '#93567c', trim: '#c991a8', detail: '#57394e' },
  'dock-flatcap': { name: 'Dockside Flat Cap', price: twoCoins, color: '#718687', trim: '#a5b2a5', detail: '#475660' },
  'fern-felt': { name: 'Fernwalk Felt Hat', price: fiveCoins, color: '#799968', trim: '#e4ba72', detail: '#426451' },
  'rain-brim': { name: 'Buttercup Rain Hat', price: fourCoins, color: '#e9b958', trim: '#f8d586', detail: '#956e45' },
} as const

export const shopTops = {
  'squid-coat': { name: 'Squid Slicker', price: threeCoins, color: '#784f89', trim: '#edb6dd', detail: '#49335d', sleeveless: false },
  'star-knit': { name: 'Star Chart Sweater', price: twoCoins, color: '#344771', trim: '#f7d678', detail: '#728bb6', sleeveless: false },
  'kelp-vest': { name: 'Kelpwing Vest', price: twoCoins, color: '#43886c', trim: '#c0d77d', detail: '#265f56', sleeveless: true },
  'beacon-top': { name: 'Beacon Jersey', price: oneCoin, color: '#bc534e', trim: '#f7dfaf', detail: '#443d59', sleeveless: false },
  'fox-knit': { name: 'Dune Fox Pullover', price: twoCoins, color: '#d58046', trim: '#f6dfb2', detail: '#914434', sleeveless: false },
  'picnic-check': { name: 'Picnic Check Shirt', price: fourCoins, color: '#d97c70', trim: '#f7dbbb', detail: '#a65351', sleeveless: false },
  'bramble-cardigan': { name: 'Bramble Argyle Cardigan', price: sixCoins, color: '#845473', trim: '#ecc6ac', detail: '#53384e', sleeveless: false },
  'dock-jacket': { name: 'Dockside Chore Jacket', price: fiveCoins, color: '#507c99', trim: '#e7bb78', detail: '#36536b', sleeveless: false },
  'fern-gilet': { name: 'Fernwalk Gilet', price: threeCoins, color: '#72895a', trim: '#d5c49a', detail: '#465c47', sleeveless: true },
  'squall-knit': { name: 'Passing Squall Sweater', price: fourCoins, color: '#759aab', trim: '#f4e1c0', detail: '#425d77', sleeveless: false },
} as const

export const shopBottoms = {
  'crab-cargo': { name: 'Crabpot Cargo Pants', price: twoCoins, color: '#546c59', trim: '#c9a36d', detail: '#3e5149', short: false },
  'cloud-pants': { name: 'Cloud Puff Trousers', price: threeCoins, color: '#87b6cd', trim: '#e5eff2', detail: '#6185a5', short: false },
  'tide-cuffs': { name: 'Tide Chart Culottes', price: twoCoins, color: '#837ab5', trim: '#d7c9ef', detail: '#5c577f', short: true },
  'salt-shorts': { name: 'Pink Salt Shorts', price: oneCoin, color: '#c45c82', trim: '#f8bad5', detail: '#943864', short: true },
  'sail-pants': { name: 'Signal Sail Trousers', price: twoCoins, color: '#d5a34d', trim: '#ffe2a4', detail: '#5a6c76', short: false },
  'oat-culottes': { name: 'Oat Linen Culottes', price: twoCoins, color: '#d4b78a', trim: '#ecd6a9', detail: '#98815e', short: true },
  'plum-pleats': { name: 'Plum Pleated Trousers', price: fourCoins, color: '#87647c', trim: '#ad8297', detail: '#604a64', short: false },
  'rail-denim': { name: 'Rail Stripe Jeans', price: fourCoins, color: '#597a8c', trim: '#9bb3b4', detail: '#395867', short: false },
  'fern-shorts': { name: 'Bracken Trail Shorts', price: twoCoins, color: '#9f8659', trim: '#d5ba87', detail: '#675d45', short: true },
  'night-flares': { name: 'Midnight Flares', price: fiveCoins, color: '#4e546e', trim: '#d1ad7d', detail: '#373e59', short: false },
} as const

export const shopShoes = {
  'kelp-boots': { name: 'Kelp Coil Boots', price: threeCoins, color: '#47765e', trim: '#b4d17c', detail: '#315744', open: false },
  'crab-clogs': { name: 'Crab Claw Clogs', price: twoCoins, color: '#c9584c', trim: '#f29869', detail: '#673c3b', open: false },
  'moth-shoes': { name: 'Luna Moth Slippers', price: twoCoins, color: '#8570a9', trim: '#d5e69c', detail: '#5e4f77', open: false },
  'shell-shoes': { name: 'Shellstrap Sandals', price: oneCoin, color: '#956e57', trim: '#f6dfb5', detail: '#694c43', open: true },
  'light-tops': { name: 'Lighthouse High-Tops', price: twoCoins, color: '#e1c494', trim: '#b95043', detail: '#3a5667', open: false },
  'ribbon-flats': { name: 'Ribbon Espadrilles', price: threeCoins, color: '#cc8a84', trim: '#fcddbc', detail: '#a77e56', open: false },
  'penny-loafers': { name: 'Chestnut Penny Loafers', price: fourCoins, color: '#965e4a', trim: '#edc579', detail: '#543e38', open: false },
  'quay-sneakers': { name: 'Quayside Canvas Sneakers', price: twoCoins, color: '#5c8991', trim: '#f8e4bf', detail: '#375869', open: false },
  'bracken-hikers': { name: 'Bracken Hiking Boots', price: fiveCoins, color: '#9d7952', trim: '#e0af60', detail: '#584c42', open: false },
  'puddle-wellies': { name: 'Buttercup Wellies', price: sixCoins, color: '#d9ac4e', trim: '#ffe398', detail: '#685842', open: false },
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
