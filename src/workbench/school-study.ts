import { CreateLineSystem } from '@babylonjs/core/Meshes/Builders/linesBuilder'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { PointerEventTypes } from '@babylonjs/core/Events/pointerEvents'
import { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { createCrew, poseCrew } from '../assets/crew'
import { poolSand, roundedPebble } from '../assets/strand'
import { createSchoolFish } from '../assets/fish'
import { createHarborBoat } from '../assets/waterfront'
import { poolRadius } from '../simulation/fish-school'
import type { Point } from '../world'
import { createSchoolTrial, trialSeconds } from './school-trial'
import { control, type Entry } from './subject'

const seedCount = 10000
const firstSeed = Math.floor(Math.random() * seedCount)

const directions: Record<string, [number, number]> = {
  KeyW: [0, 1], KeyA: [-1, 0], KeyS: [0, -1], KeyD: [1, 0],
}

export const schoolStudy: Entry = {
  id: 'fish-school', name: 'Fish schooling trial', group: 'Habitats', source: 'src/simulation/fish-school.ts',
  description: 'Watch the crossing, or click the water to steer. With the view focused, WASD directs the next move. Rewind to try a different approach.',
  readout: 'School observations', topView: true, duration: trialSeconds, ground: { height: -1.1, color: '#485b57' },
  controls: [
    control('actor', 'Disturbance', 'player', { player: 'Wading player', skiff: 'Paddled skiff' }, true),
    control('side', 'First approach', 'west', { west: 'West edge', east: 'East edge' }, true),
    { key: 'returnPass', label: 'Cross again from the opposite edge', type: 'checkbox', value: false, rebuild: true },
    { key: 'seed', label: 'School seed', type: 'number', min: 0, max: 9999, step: 1, value: firstSeed, rebuild: true },
    { key: 'nudge', label: 'Nudge fish 1 east by 5 cm', type: 'checkbox', value: false, rebuild: true },
    { key: 'trails', label: 'Show fish trails', type: 'checkbox', value: true },
    { key: 'leaderRing', label: 'Mark regroup leader', type: 'checkbox', value: true },
  ],
  actions: [{
    label: 'Randomize school', restart: true, enabled: () => true,
    run(values) {
      const offset = 1 + Math.floor(Math.random() * (seedCount - 1))
      values.seed = (Number(values.seed) + offset) % seedCount
    },
  }],
  create(meshes, values, _reportError, observe) {
    const { scene } = meshes
    const trial = createSchoolTrial(Number(values.seed), values.actor === 'skiff' ? 'skiff' : 'player', values.route,
      Boolean(values.nudge), { side: values.side === 'east' ? 'east' : 'west', returnPass: Boolean(values.returnPass) })
    const { school, actor } = trial
    values.route = JSON.stringify(trial.route)
    const sand = meshes.paintSurface('sand', poolSand)
    meshes.cylinder(0, -.74, 0, 16, 16, .55, 64, sand)
    const water = meshes.paint('#4d9fa6')
    water.alpha = .20
    const surface = meshes.cylinder(0, 0, 0, 16, 16, .015, 64, water, undefined, false)
    surface.isPickable = true
    for (let i = 0; i < 15; i++) {
      const angle = i * 2.4, radius = 6.6 + .48 * Math.sin(i * 3.1)
      roundedPebble(meshes, Math.cos(angle) * radius, -.49, Math.sin(angle) * radius,
        .58 + .3 * Math.cos(i), .32, .42, angle, i + 1)
    }
    const shoal = meshes.paint('#bce7b7')
    shoal.backFaceCulling = false
    const fish = school.fish.map(() => createSchoolFish(meshes, shoal))
    const startledPaint = meshes.paint('#fff0a3')
    startledPaint.backFaceCulling = false
    const segments = fish.map(() => Array.from({ length: 10 }, () => Vector3.Zero()))
    const trails = CreateLineSystem('School trails', { lines: segments, updatable: true }, scene)
    trails.color = Color3.FromHexString('#b7d7cd')
    trails.alpha = .65
    trails.isPickable = false
    trails.alwaysSelectAsActiveMesh = true
    const ring = CreateTorus('Regroup leader', { diameter: 1.05, thickness: .045, tessellation: 40 }, scene)
    ring.material = meshes.paint('#ffd46a', true)
    ring.isPickable = false
    const crew = values.actor === 'player' ? createCrew(meshes, 0) : undefined
    const body = crew?.root ?? createHarborBoat(meshes)
    body.position.set(actor.x, crew ? -.44 : .02, actor.z)
    body.rotation.y = actor.heading
    const canvas = scene.getEngine().getRenderingCanvas()
    let routeFull = false
    function steer(point: Point) {
      routeFull = !trial.steer(point)
      if (!routeFull) values.route = JSON.stringify(trial.route)
    }
    scene.onPointerObservable.add(event => {
      if (event.event.button !== 0) return
      const point = event.pickInfo?.pickedPoint
      if (event.pickInfo?.pickedMesh !== surface || !point || Math.hypot(point.x, point.z) > poolRadius) return
      steer(point)
    }, PointerEventTypes.POINTERTAP)
    function move(event: KeyboardEvent) {
      const dir = directions[event.code], camera = scene.activeCamera
      if (!dir || !camera || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
      event.preventDefault()
      const right = camera.getDirection(Vector3.Right())
      const length = Math.hypot(right.x, right.z) || 1
      steer({ x: actor.x + (dir[0] * right.x - dir[1] * right.z) * 2 / length,
        z: actor.z + (dir[0] * right.z + dir[1] * right.x) * 2 / length })
    }
    canvas?.addEventListener('keydown', move)
    scene.onDisposeObservable.addOnce(() => canvas?.removeEventListener('keydown', move))
    return ({ time }, settings) => {
      trial.seek(time)
      body.position.x = actor.x
      body.position.z = actor.z
      body.rotation.y = actor.heading
      if (crew) poseCrew(crew, time * 1.45, actor.speed * .27, false)
      let startled = 0
      for (const [i, member] of school.fish.entries()) {
        fish[i].position.set(member.x, -.09, member.z)
        fish[i].rotation.y = Math.PI / 2 - member.heading
        fish[i].material = settings.trails && member.alarm > 0 ? startledPaint : shoal
        if (member.alarm > 0) startled++
        if (settings.trails) {
          const track = trial.tracks[i]
          segments[i].forEach((v, j) => {
            const p = track[Math.max(0, track.length - segments[i].length + j)] ?? member
            v.set(p.x, -.14, p.z)
          })
          segments[i][segments[i].length - 1].set(member.x, -.14, member.z)
        }
      }
      trails.setEnabled(Boolean(settings.trails))
      if (settings.trails) CreateLineSystem('School trails', { lines: segments, instance: trails }, scene)
      ring.setEnabled(Boolean(settings.leaderRing) && school.leader >= 0)
      if (school.leader >= 0) ring.position.copyFrom(fish[school.leader].position)
      const phase = school.leader >= 0 ? 'Following fish ' + (school.leader + 1)
        : startled ? 'Scattering' : school.scattered ? 'Waiting for calm' : 'Cruising'
      observe(routeFull ? 'Route full. Rewind to edit an earlier move or reset the trial.'
        : phase + ' · ' + startled + ' of 6 startled · ' + school.encounters + (school.encounters === 1 ? ' disturbance' : ' disturbances'))
    }
  },
}
