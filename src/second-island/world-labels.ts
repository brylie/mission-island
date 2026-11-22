import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { Scene } from '@babylonjs/core/scene'
import { landmarks, villages, type MapPoint } from './sites'
import { groundHeight } from './terrain'

const namedPlaceReach = 53
const overviewLabelCount = 4
const closeLabelCount = 6
const overviewLabelHeight = 20
const closeLabelHeight = 6

export function createWorldLabels(scene: Scene, canvas: HTMLCanvasElement, labels: HTMLElement, known: Set<string>) {
  const engine = scene.getEngine(), worldIdentity = Matrix.Identity()
  const worldLabels = landmarks.map((pin) => {
    const label = document.createElement('span')
    label.textContent = pin.name
    label.className = 'world-label'
    label.hidden = true
    labels.append(label)
    return { pin, label }
  })
  return (point: MapPoint, broad: boolean) => {
    const camera = scene.activeCamera!
    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight())
    const ratioX = canvas.clientWidth / viewport.width, ratioY = canvas.clientHeight / viewport.height
    const visible = worldLabels.filter(({ pin }) => broad
      ? villages.some(({ id }) => pin.id === id) || pin.id === 'ferry'
      : known.has(pin.id) && Math.hypot(pin.x - point.x, pin.z - point.z) < namedPlaceReach).slice(0, broad ? overviewLabelCount : closeLabelCount)
    for (const entry of worldLabels) {
      const { pin, label } = entry
      if (!visible.includes(entry)) {
        label.hidden = true
        continue
      }
      const y = groundHeight(pin.x, pin.z) + (broad ? overviewLabelHeight : closeLabelHeight)
      const projected = Vector3.Project(new Vector3(pin.x, y, pin.z), worldIdentity, scene.getTransformMatrix(), viewport)
      label.hidden = projected.z < 0 || projected.z > 1 || projected.x < 0 || projected.x > viewport.width || projected.y < 0 || projected.y > viewport.height
      if (label.hidden) continue
      label.style.left = `${projected.x * ratioX}px`
      label.style.top = `${projected.y * ratioY}px`
    }
  }
}
