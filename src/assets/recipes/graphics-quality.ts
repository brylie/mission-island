// Graphics quality tiers. High is the full look on a recent computer; Low keeps
// older computers, such as a laptop with integrated graphics, at 30 fps or more.
// `renderScale` divides the render resolution (1.5 draws about 44% of the pixels),
// and the forest ranges are metres from the camera to the nearest point of a forest
// tile (see highwood-forest.ts).
export const graphicsTiers = {
  high: { renderScale: 1, shadows: true, forestNearM: 80, understoryM: 45 },
  low: { renderScale: 1.5, shadows: false, forestNearM: 40, understoryM: 20 },
} as const

// Automatic starts on High and drops to Low for the rest of the session when the
// average frame stays slower than `slowFrameMs` for `slowSeconds`. It never climbs
// back, so the picture doesn't keep changing.
// 40 ms sits clear of a 30 Hz cap (33.3 ms frames), so a capped browser stays on High.
export const automaticGraphics = { slowFrameMs: 40, slowSeconds: 4, smoothing: 0.05, settleSeconds: 6 } as const
