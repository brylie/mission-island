// Colours, sizes and sampling grids for the dev and playtest debug overlays.
// Runtime samplers in src/debug-overlays/ read these; add a layer's look here, beside its data.

export const overlayLift = { ground: 0.18, line: 0.25, marker: 0.4, arrow: 0.9 } as const

// Corner signs and triangle order for one flat overlay cell.
export const overlayQuad = { corners: [[-1, -1], [1, -1], [1, 1], [-1, 1]], indices: [0, 1, 2, 0, 2, 3] } as const

export const overlayRefresh = { liveSeconds: 0.25 } as const

export const slopeOverlay = {
  cellM: 3,
  sampleStepM: 0.5,
  // Slope in degrees mapped onto a green-to-red ramp. Steeper cells read as harder walking or erosion risk.
  ramp: [[0, '#2f9e44'], [12, '#94d82d'], [24, '#fcc419'], [36, '#f76707'], [50, '#c92a2a']],
} as const

export const habitatOverlay = {
  patchRadiusM: 0.9,
  colors: { clover: '#69db7c', grass: '#d8f5a2', trees: '#2b8a3e', logs: '#a9714b', stones: '#adb5bd', foxgloves: '#e599f7' },
  fallback: '#ced4da',
  boundaryColor: '#20c997',
  boundaryRadiusM: 14,
} as const

// Highwood's dominant habitat per cell, in the order of highwoodHabitatIds:
// pinewood, edge, heath, ridge, wet, bracken, birch, shore.
export const highwoodHabitatOverlay = {
  cellM: 4,
  ramp: [[0, '#2b8a3e'], [1, '#a9e34b'], [2, '#cc5de8'], [3, '#868e96'], [4, '#339af0'], [5, '#e8590c'], [6, '#f1f3f5'], [7, '#ffe066']],
} as const

export const solidsOverlay = { walking: '#4dabf7', cargo: '#f783ac' } as const

export const corridorOverlay = { road: '#adb5bd', footpath: '#e8d5b5', centre: '#ffffff' } as const

export const protectedOverlay = {
  launch: '#ff922b',
  meadow: '#fab005',
  approach: '#ffe066',
  returnTrail: '#ffa94d',
  launchClearanceM: 7,
} as const

export const wildfireOverlay = {
  cold: '#ff922b',
  burnt: '#868e96',
  hot: '#e03131',
  next: '#7048e8',
  wind: '#74c0fc',
  hotspotRadiusM: 1.2,
  nextRingM: 1.8,
  windArrowM: 12,
  siteRingM: 4,
} as const

export const sightlineOverlay = { seen: '#40c057', hidden: '#fa5252', sampleStepM: 1, eyeHeightM: 1.6, clearanceM: 0.3 } as const

export const animalOverlay = {
  colors: { wandering: '#ced4da', grazing: '#69db7c', seeking: '#c0eb75', fleeing: '#ffa8a8', sheltering: '#748ffc', watching: '#ffd8a8', patrolling: '#ffc078', chasing: '#e03131' },
  fallback: '#ffffff',
  markerM: 0.6,
  headingM: 1.6,
  trailLength: 90,
  trailStepM: 0.2,
} as const

export const perfReadout = {
  refreshMs: 500,
  decimals: 1,
  style: { position: 'fixed', right: '8px', bottom: '8px', zIndex: '50', padding: '4px 8px', font: '12px/1.3 ui-monospace, monospace', color: '#f8f9fa', background: 'rgb(0 0 0 / 60%)', borderRadius: '4px', pointerEvents: 'none' },
} as const

// Silhouettes paint the sky white and everything nearer than the far plane black, for value and shape reviews.
export const silhouetteShader = {
  farDepth: 0.999,
  fragment: `precision highp float;
varying vec2 vUV;
uniform sampler2D depthSampler;
uniform float farDepth;
void main(void) {
  float depth = texture2D(depthSampler, vUV).r;
  gl_FragColor = depth >= farDepth ? vec4(1.0) : vec4(0.0, 0.0, 0.0, 1.0);
}`,
} as const
