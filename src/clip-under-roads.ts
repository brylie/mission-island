// Cuts a mesh to the ground outside the roads. Each triangle is clipped to where a field, one value
// per vertex (the road network's formation distance, negative under a road), is above zero; where
// an edge crosses zero a vertex is added, its attributes interpolated, and shared by the triangles
// either side. The terrain then stops exactly at the road's outline, at its true height, so it
// neither pokes through the road nor dips beside it.

interface VertexLayer { values: number[], size: number }

// Corners in a triangle.
const corners3 = 3
const farM = 1e3

export function clipOutsideRoads(layers: VertexLayer[], indices: readonly number[], field: readonly number[]) {
  const out = layers.map(({ values, size }) => ({ values: values.slice(), size }))
  const kept: number[] = []
  const crossings = new Map<string, number>()
  let count = field.length
  // Far from every road the field is Infinity; any large distance interpolates the same.
  const values = field.map((value) => (Number.isFinite(value) ? value : farM))
  const crossing = (a: number, b: number) => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`
    let index = crossings.get(key)
    if (index === undefined) {
      const t = values[a] / (values[a] - values[b])
      for (const layer of out) {
        for (let k = 0; k < layer.size; k++) layer.values.push(layer.values[a * layer.size + k] + (layer.values[b * layer.size + k] - layer.values[a * layer.size + k]) * t)
      }
      values.push(0)
      crossings.set(key, index = count++)
    }
    return index
  }
  for (let i = 0; i < indices.length; i += corners3) {
    const corners = indices.slice(i, i + corners3)
    if (corners.every((v) => values[v] > 0)) {
      kept.push(...corners)
      continue
    }
    if (corners.every((v) => values[v] <= 0)) continue
    const polygon: number[] = []
    corners.forEach((v, k) => {
      const next = corners[(k + 1) % corners.length]
      if (values[v] > 0) polygon.push(v)
      if ((values[v] > 0) !== (values[next] > 0)) polygon.push(crossing(v, next))
    })
    for (let k = 1; k < polygon.length - 1; k++) kept.push(polygon[0], polygon[k], polygon[k + 1])
  }
  return { layers: out.map((layer) => layer.values), indices: kept }
}
