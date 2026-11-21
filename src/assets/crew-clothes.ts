import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { MeshFactory } from '../island-meshes'
import { crewHipHeight } from '../world'
import { garment, sweptDetail } from './crew-shapes'
import { createSwimArm } from './crew-swim-arm'
import { createSwimsuit } from './crew-swimsuit'

export function createCrewClothes(meshes: MeshFactory, root: TransformNode) {
  const blank = '#f1d6a2'
  const skin: Mesh[] = [], cloth: Mesh[] = [], trim: Mesh[] = [], trousers: Mesh[] = [], shoes: Mesh[] = []
  const shorts: Mesh[] = [], shortCuffs: Mesh[] = []
  const bareFeet: Mesh[] = [], bareLimbs: Mesh[] = [], shirtedSkin: Mesh[] = []
  const swimCalves: Mesh[] = [], swimBareFeet: Mesh[] = []
  const arms: TransformNode[] = [], legs: TransformNode[] = [], shoulders: Mesh[] = []
  const swimArms: ReturnType<typeof createSwimArm>[] = []
  const form = (parent: TransformNode, name: string, rows: Parameters<typeof garment>[4], soft = 0.88) =>
    garment(meshes, parent, name, blank, rows, soft)
  for (const s of [-1, 1]) {
    const leg = new TransformNode('Hip', meshes.scene)
    leg.parent = root
    leg.position.set(s * 0.18, crewHipHeight, 0.02)
    legs.push(leg)
    const inward = -s * 0.032
    trousers.push(form(leg, 'Twill trouser leg', [
      [-0.465, inward, 0, 0.108, 0.111],
      [-0.415, inward, -0.002, 0.114, 0.116],
      [-0.348, inward, -0.007, 0.116, 0.121],
      [-0.308, inward, 0.001, 0.119, 0.126],
      [-0.271, inward, 0.009, 0.120, 0.129],
      [-0.213, inward, 0.013, 0.124, 0.137],
      [-0.09, -s * 0.029, 0.002, 0.136, 0.154],
      [0.034, -s * 0.038, -0.010, 0.13, 0.146],
      [0.083, -s * 0.044, -0.010, 0.136, 0.143],
      [0.149 + s * 0.002, -s * 0.052, -0.014, 0.134, 0.122],
    ]))
    trousers.push(form(leg, 'Folded trouser hem', [[-0.466, inward, 0.001, 0.111, 0.116], [-0.46, inward, 0, 0.115, 0.119], [-0.408, inward, -0.001, 0.117, 0.122]]))
    shorts.push(form(leg, 'Deck shorts', [
      [-0.222, inward, 0.009, 0.119, 0.131],
      [-0.170, inward, 0.012, 0.125, 0.142],
      [-0.090, -s * 0.029, 0.002, 0.136, 0.154],
      [0.034, -s * 0.038, -0.010, 0.130, 0.146],
      [0.149, -s * 0.052, -0.014, 0.134, 0.122],
    ]))
    shortCuffs.push(form(leg, 'Rolled shorts cuff', [
      [-0.237, inward, 0.008, 0.118, 0.132],
      [-0.230, inward, 0.009, 0.124, 0.138],
      [-0.193, inward, 0.011, 0.127, 0.143],
    ]))
    shoes.push(form(leg, 'Oiled leather boot', [
      [-0.646, inward, 0.044, 0.119, 0.174],
      [-0.624, inward, 0.05, 0.126, 0.181],
      [-0.585, inward, 0.058, 0.123, 0.177],
      [-0.554, inward, 0.038, 0.118, 0.159],
      [-0.521, inward, 0.007, 0.107, 0.124],
      [-0.445, inward, -0.005, 0.102, 0.103],
    ]))
    shoes.push(form(leg, 'Boot outsole', [[-0.678, inward, 0.044, 0.116, 0.171], [-0.67, inward, 0.044, 0.121, 0.178], [-0.645, inward, 0.044, 0.123, 0.177]], 0.71))
    const foot: Parameters<typeof garment>[4] = [
      [-0.677, inward, 0.045, 0.085, 0.13],
      [-0.654, inward, 0.053, 0.10, 0.143],
      [-0.615, inward, 0.047, 0.097, 0.131],
      [-0.56, inward, 0, 0.082, 0.074],
    ]
    bareFeet.push(form(leg, 'Bare foot', [...foot, [-0.427, inward, -0.004, 0.083, 0.082]]))
    const calf: Parameters<typeof garment>[4] = [
      [-0.507, inward, -0.004, 0.077, 0.081],
      [-0.433, inward, -0.008, 0.086, 0.095],
      [-0.319, inward, -0.009, 0.103, 0.103],
      [-0.174, inward, 0.009, 0.104, 0.111],
    ]
    swimCalves.push(form(leg, 'Calf above swimming shoes', [[-0.571, inward, 0, 0.071, 0.072], ...calf]))
    swimBareFeet.push(form(leg, 'Bare calf and foot', [...foot, ...calf]))

    const arm = new TransformNode('Shoulder', meshes.scene)
    arm.parent = root
    arm.position.set(s * 0.36, 1.19, 0.03)
    arms.push(arm)
    // Keep a rounded shoulder across the rotating sleeve and the stationary torso.
    shoulders.push(meshes.sphere(s * 0.311, 1.156, -0.006, 0.203, 0.157, 0.196, blank, root, false, 16))
    cloth.push(form(arm, 'Sloping shirt sleeve', [
      [-0.279, s * 0.053, -0.013, 0.084, 0.095],
      [-0.223, s * 0.042, -0.025, 0.09, 0.101],
      [-0.129, s * 0.019, -0.038, 0.095, 0.109],
      [-0.078, -s * 0.007, -0.037, 0.102, 0.119],
      [-0.012, -s * 0.042, -0.035, 0.103, 0.119],
      [0.038, -s * 0.081, -0.034, 0.094, 0.104],
      [0.068, -s * 0.148, -0.030, 0.047, 0.056],
    ]))
    trim.push(form(arm, 'Rolled cuff', [[-0.306, s * 0.060, -0.009, 0.086, 0.096], [-0.298, s * 0.059, -0.010, 0.09, 0.101], [-0.248, s * 0.049, -0.018, 0.094, 0.104], [-0.242, s * 0.048, -0.019, 0.09, 0.101]]))
    const forearm: Parameters<typeof garment>[4] = [
      [-0.608, s * 0.090, 0.037, 0.025, 0.035],
      [-0.590, s * 0.103, 0.041, 0.053, 0.055],
      [-0.552, s * 0.112, 0.029, 0.067, 0.061],
      [-0.502, s * 0.105, 0.014, 0.066, 0.070],
      [-0.468, s * 0.094, 0.006, 0.054, 0.063],
      [-0.426, s * 0.083, -0.003, 0.064, 0.074],
      [-0.334, s * 0.069, -0.011, 0.074, 0.080],
      [-0.265, s * 0.052, -0.014, 0.079, 0.087],
    ]
    shirtedSkin.push(form(arm, 'Shirted forearm and palm', forearm))
    const swimArm = createSwimArm(meshes, root, arm, s, blank, forearm)
    swimArms.push(swimArm)
    bareLimbs.push(swimArm.mesh)
    skin.push(sweptDetail(meshes, arm, 'Opposing thumb', blank, [
      [s * 0.097, -0.479, 0.052, 0.017, 0.018],
      [s * 0.071, -0.494, 0.069, 0.031, 0.027],
      [s * 0.055, -0.520, 0.081, 0.028, 0.024],
      [s * 0.050, -0.548, 0.073, 0.022, 0.020],
      [s * 0.053, -0.558, 0.065, 0.013, 0.012],
    ], [0, 0, 1]))
  }
  const seat = form(root, 'Trouser seat', [[0.771, 0, -0.008, 0.226, 0.126], [0.794, 0, -0.010, 0.256, 0.154], [0.832, 0, -0.014, 0.253, 0.151]])
  const torso = form(root, 'Canvas shirt body', [
    [0.774, 0, 0.005, 0.290, 0.204],
    [0.783, 0, 0.006, 0.302, 0.211],
    [0.813, 0, 0.005, 0.301, 0.21],
    [0.889, 0, -0.001, 0.281, 0.195],
    [0.929, 0, -0.011, 0.261, 0.183],
    [1.061, 0, -0.012, 0.275, 0.19],
    [1.17, 0, -0.015, 0.281, 0.182],
    [1.214, 0, -0.013, 0.281, 0.163],
    [1.249, 0, -0.012, 0.231, 0.145],
    [1.276, 0, 0.002, 0.135, 0.111],
  ])
  const yoke = sweptDetail(meshes, root, 'Back yoke seam', blank, [
    [-0.224, 1.097, -0.140, 0.001, 0.001],
    [-0.145, 1.085, -0.179, 0.003, 0.002],
    [0, 1.080, -0.204, 0.003, 0.002],
    [0.145, 1.085, -0.179, 0.003, 0.002],
    [0.224, 1.097, -0.140, 0.001, 0.001],
  ], [0, 0, -1], 6)
  const swimsuit = createSwimsuit(meshes, root, legs, blank)
  // The exposed skin across the collarbone fills the neckline and joins the deltoids.
  bareLimbs.push(form(root, 'Swim shoulder and collarbone line', [
    [1.154, 0, -0.013, 0.247, 0.138],
    [1.199, 0, -0.017, 0.286, 0.141],
    [1.230, 0, -0.017, 0.283, 0.126],
    [1.252, 0, -0.013, 0.261, 0.116],
    [1.269, 0, -0.008, 0.226, 0.104],
    [1.280, 0, 0.002, 0.174, 0.095],
    [1.286, 0, 0.008, 0.111, 0.092],
  ], 0.95))
  for (const part of bareLimbs) part.receiveShadows = false
  skin.push(form(root, 'Neck', [[1.188, 0, 0.012, 0.12, 0.10], [1.24, 0, 0.01, 0.123, 0.103], [1.369, 0, 0.012, 0.116, 0.111]]))
  cloth.push(form(root, 'Neckband', [[1.211, 0, 0.002, 0.146, 0.121], [1.258, 0, -0.005, 0.147, 0.115], [1.295, 0, -0.004, 0.126, 0.104]]))
  // The two broad collar points follow the shoulder slope. Visible faces have their own folded edge.
  for (const s of [-1, 1]) {
    const coords = [s * 0.014, 1.213, 0.163, s * 0.095, 1.289, 0.095, s * 0.174, 1.226, 0.135, s * 0.131, 1.153, 0.166]
    const indices = [0, 1, 2, 0, 2, 3]
    const collar = meshes.surface('Turned collar', coords, s > 0 ? indices : indices.reverse(), blank, root)
    collar.name = 'Folded canvas collar'
    cloth.push(collar)
    // Show the underside when the camera looks up under a collar point.
    cloth.push(meshes.surface('Collar underside', coords.map((n, i) => i % 3 === 2 ? n - 0.002 : n), indices.slice().reverse(), blank, root))
  }
  const inset = meshes.surface('Linen undershirt', [-0.085, 1.267, 0.138, 0.085, 1.267, 0.138, 0.0, 1.186, 0.178], [0, 1, 2], '#efe0c4', root)
  const pocket = form(root, 'Stitched pocket', [[0.921, -0.136, 0.153, 0.043, 0.016], [0.94, -0.136, 0.150, 0.067, 0.025], [1.033, -0.136, 0.149, 0.068, 0.027]])
  pocket.position.z = 0.011
  pocket.rotation.y = -0.035
  cloth.push(pocket)
  for (const [y, z] of [[0.824, 0.211], [0.932, 0.179], [1.044, 0.181], [1.157, 0.170]]) {
    trim.push(meshes.sphere(0.004, y, z, 0.029, 0.029, 0.012, blank, root, false, 7))
  }
  const swimSeam = sweptDetail(meshes, root, 'Swimsuit chest seam', blank, [
    [-0.146, 1.122, 0.132, 0.003, 0.003],
    [-0.079, 1.117, 0.155, 0.005, 0.004],
    [0, 1.115, 0.165, 0.006, 0.004],
    [0.079, 1.117, 0.155, 0.005, 0.004],
    [0.146, 1.122, 0.132, 0.003, 0.003],
  ], [0, 0, 1])
  meshes.shadows.removeShadowCaster(swimSeam, false)
  return { seat, shorts, shortCuffs, arms, legs, skin, cloth, trim, torso, inset, yoke, trousers, shoes, bareFeet, bareLimbs, swimsuit, swimSeam, shoulders, shirtedSkin, swimArms, swimCalves, swimBareFeet }
}
