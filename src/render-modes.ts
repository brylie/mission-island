import type { Camera } from '@babylonjs/core/Cameras/camera'
import { BlackAndWhitePostProcess } from '@babylonjs/core/PostProcesses/blackAndWhitePostProcess'
import { Effect } from '@babylonjs/core/Materials/effect'
import { PostProcess } from '@babylonjs/core/PostProcesses/postProcess'
import '@babylonjs/core/Rendering/depthRendererSceneComponent'
import type { Scene } from '@babylonjs/core/scene'
import { silhouetteShader } from './assets/recipes/debug-overlays'
import type { RenderMode } from './dev-view'

const silhouetteShaderName = 'missionSilhouette'

// Greyscale and silhouette passes for value and shape review. Colour adds nothing.
export function applyRenderMode(scene: Scene, camera: Camera, mode: RenderMode) {
  if (mode === 'greyscale') return new BlackAndWhitePostProcess('Review greyscale', 1, camera)
  if (mode === 'color') return
  Effect.ShadersStore[`${silhouetteShaderName}FragmentShader`] = silhouetteShader.fragment
  const depth = scene.enableDepthRenderer(camera, false)
  const pass = new PostProcess('Review silhouette', silhouetteShaderName, ['farDepth'], ['depthSampler'], 1, camera)
  pass.onApply = (effect) => {
    effect.setTexture('depthSampler', depth.getDepthMap())
    effect.setFloat('farDepth', silhouetteShader.farDepth)
  }
  return pass
}
