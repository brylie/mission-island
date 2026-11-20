import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { MeshFactory } from '../island-meshes'
import { garment, sweptDetail } from './crew-shapes'

export function createCrewClothes(meshes: MeshFactory, root: TransformNode) {
  const blank = '#f1d6a2'
  const skin: Mesh[] = [], cloth: Mesh[] = [], trim: Mesh[] = [], trousers: Mesh[] = [], shoes: Mesh[] = []
  const bareFeet: Mesh[] = [], bareLimbs: Mesh[] = [], swimCloth: Mesh[] = []
  const arms: TransformNode[] = [], legs: TransformNode[] = []
  const form = (parent: TransformNode, name: string, rows: Parameters<typeof garment>[4], soft = .88) =>
    garment(meshes, parent, name, blank, rows, soft)
  for (const s of [-1, 1]) {
    const leg = new TransformNode('Hip', meshes.scene)
    leg.parent = root
    leg.position.set(s * .18, .68, .02)
    legs.push(leg)
    const inward = -s * .032
    trousers.push(form(leg, 'Twill trouser leg', [
      [-.465, inward, 0, .108, .111], [-.415, inward, -.002, .114, .116], [-.315, inward, -.005, .117, .123],
      [-.213, inward, .013, .124, .137], [-.09, -s * .029, .002, .136, .154], [.034, -s * .038, -.010, .13, .146], [.083, -s * .044, -.010, .136, .143], [.149 + s * .002, -s * .052, -.014, .134, .122],
    ]))
    trousers.push(form(leg, 'Folded trouser hem', [[-.466, inward, .001, .111, .116], [-.46, inward, 0, .115, .119], [-.408, inward, -.001, .117, .122]]))
    shoes.push(form(leg, 'Oiled leather boot', [
      [-.646, inward, .044, .119, .174], [-.624, inward, .05, .126, .181], [-.585, inward, .058, .123, .177],
      [-.554, inward, .038, .118, .159], [-.521, inward, .007, .107, .124], [-.445, inward, -.005, .102, .103],
    ]))
    shoes.push(form(leg, 'Boot outsole', [[-.678, inward, .044, .116, .171], [-.67, inward, .044, .121, .178], [-.645, inward, .044, .123, .177]], .71))
    bareFeet.push(form(leg, 'Bare foot', [[-.677, inward, .045, .085, .13], [-.654, inward, .053, .10, .143], [-.615, inward, .047, .097, .131], [-.56, inward, 0, .082, .074], [-.427, inward, -.004, .083, .082]]))
    swimCloth.push(form(leg, 'Swim shorts', [[-.214, inward, .005, .125, .136], [-.135, inward, .006, .133, .147], [.085, -s * .032, -.012, .148, .158]]))
    bareLimbs.push(form(leg, 'Calf', [[-.603, inward, 0, .077, .079], [-.433, inward, -.008, .082, .092], [-.319, inward, -.009, .103, .103], [-.174, inward, .009, .104, .111]]))

    const arm = new TransformNode('Shoulder', meshes.scene)
    arm.parent = root
    arm.position.set(s * .36, 1.19, .03)
    arms.push(arm)
    cloth.push(form(arm, 'Sloping shirt sleeve', [
      [-.279, s * .053, -.013, .084, .095], [-.223, s * .042, -.025, .09, .101], [-.129, s * .019, -.038, .095, .109],
      [-.078, -s * .007, -.037, .102, .119], [-.012, -s * .042, -.035, .103, .119],
      [.038, -s * .081, -.034, .094, .104], [.068, -s * .148, -.030, .047, .056],
    ]))
    trim.push(form(arm, 'Rolled cuff', [[-.306, s * .060, -.009, .086, .096], [-.298, s * .059, -.010, .09, .101], [-.248, s * .049, -.018, .094, .104], [-.242, s * .048, -.019, .09, .101]]))
    bareLimbs.push(form(arm, 'Upper arm', [[-.378, s * .061, -.010, .074, .076], [-.22, s * .043, -.026, .079, .091], [-.095, -s * .008, -.023, .093, .105], [-.015, -s * .055, -.018, .085, .104]]))
    skin.push(form(arm, 'Forearm and palm', [
      [-.608, s * .090, .037, .025, .035], [-.590, s * .103, .041, .053, .055], [-.552, s * .112, .029, .067, .061],
      [-.502, s * .105, .014, .066, .070], [-.468, s * .094, .006, .054, .063], [-.426, s * .083, -.003, .064, .074], [-.334, s * .069, -.010, .076, .081], [-.265, s * .052, -.014, .075, .081],
    ]))
    skin.push(sweptDetail(meshes, arm, 'Opposing thumb', blank, [
      [s * .097, -.479, .052, .017, .018], [s * .071, -.494, .069, .031, .027],
      [s * .055, -.520, .081, .028, .024], [s * .050, -.548, .073, .022, .020], [s * .053, -.558, .065, .013, .012],
    ], [0, 0, 1]))
  }
  trousers.push(form(root, 'Trouser seat', [[.771, 0, -.008, .226, .126], [.794, 0, -.010, .256, .154], [.832, 0, -.014, .253, .151]]))
  const torso = form(root, 'Canvas shirt body', [
    [.774, 0, .005, .290, .204], [.783, 0, .006, .302, .211], [.813, 0, .005, .301, .21], [.889, 0, -.001, .281, .195],
    [.929, 0, -.011, .261, .183], [1.061, 0, -.012, .275, .19], [1.17, 0, -.015, .281, .182],
    [1.214, 0, -.013, .281, .163], [1.249, 0, -.012, .231, .145], [1.276, 0, .002, .135, .111],
  ])
  const yoke = sweptDetail(meshes, root, 'Back yoke seam', blank, [
    [-.224, 1.097, -.140, .001, .001], [-.145, 1.085, -.179, .003, .002],
    [0, 1.080, -.204, .003, .002], [.145, 1.085, -.179, .003, .002], [.224, 1.097, -.140, .001, .001],
  ], [0, 0, -1], 6)
  swimCloth.push(form(root, 'Swimsuit body', [
    [.64, 0, 0, .268, .173], [.736, 0, .004, .277, .189], [.88, 0, -.006, .238, .167],
    [1.044, 0, -.009, .258, .18], [1.138, 0, -.005, .242, .16], [1.21, 0, 0, .163, .115], [1.23, 0, .004, .119, .105],
  ]))
  skin.push(form(root, 'Neck', [[1.188, 0, .012, .12, .10], [1.24, 0, .01, .123, .103], [1.369, 0, .012, .116, .111]]))
  cloth.push(form(root, 'Neckband', [[1.211, 0, .002, .146, .121], [1.258, 0, -.005, .147, .115], [1.295, 0, -.004, .126, .104]]))
  // The two broad collar points follow the shoulder slope. Visible faces have their own folded edge.
  for (const s of [-1, 1]) {
    const coords = [s * .014, 1.213, .163, s * .095, 1.289, .095, s * .174, 1.226, .135, s * .131, 1.153, .166]
    const indices = [0, 1, 2, 0, 2, 3]
    const collar = meshes.surface('Turned collar', coords, s > 0 ? indices : indices.reverse(), blank, root)
    collar.name = 'Folded canvas collar'
    cloth.push(collar)
    // Show the underside when the camera looks up under a collar point.
    cloth.push(meshes.surface('Collar underside', coords.map((n, i) => i % 3 === 2 ? n - .002 : n), indices.slice().reverse(), blank, root))
  }
  const inset = meshes.surface('Linen undershirt', [-.085, 1.267, .138, .085, 1.267, .138, .0, 1.186, .178], [0, 1, 2], '#efe0c4', root)
  const pocket = form(root, 'Stitched pocket', [[.921, -.136, .153, .043, .016], [.94, -.136, .150, .067, .025], [1.033, -.136, .149, .068, .027]])
  pocket.position.z = .011
  pocket.rotation.y = -.035
  cloth.push(pocket)
  for (const [y, z] of [[.824, .211], [.932, .179], [1.044, .181], [1.157, .170]]) {
    trim.push(meshes.sphere(.004, y, z, .029, .029, .012, blank, root, false, 7))
  }
  const swimSeam = meshes.sphere(0, 1.124, .17, .247, .022, .021, blank, root, false, 9)
  return { arms, legs, skin, cloth, trim, torso, inset, yoke, trousers, shoes, bareFeet, bareLimbs, swimCloth, swimSeam }
}
