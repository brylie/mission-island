import { CreateLineSystem } from '@babylonjs/core/Meshes/Builders/linesBuilder'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { PointerEventTypes } from '@babylonjs/core/Events/pointerEvents'
import { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { createCrew, poseCrew } from '../assets/crew'
import { poolSand, roundedPebble } from '../assets/strand'
import { schoolStage } from '../assets/geometry/workbench-school-stage'
import { createSchoolFish } from '../assets/fish'
import { createHarborBoat } from '../assets/waterfront'
import { poolRadius, schoolIsRegrouping } from '../simulation/fish-school'
import type { Point } from '../world'
import { createSchoolTrial, schoolTrailSamples, trialSeconds } from './school-trial'
import { control, type Entry } from './subject'

const seedCount = 10000
const steerDistance = 2
const walkerCycleRate = 1.45
const walkerStrideScale = 0.27
const halves = 2
const firstSeed = Math.floor(Math.random() * seedCount)

const directions: Record<string, [number, number]> = {
  KeyW: [0, 1],
  KeyA: [-1, 0],
  KeyS: [0, -1],
  KeyD: [1, 0],
}

export const schoolStudy: Entry = {
  id: 'fish-school',
  name: 'Fish schooling trial',
  group: 'Habitats',
  source: 'src/simulation/fish-school.ts',
  description: 'Watch the crossing, or click the water to steer. With the view focused, WASD directs the next move. Rewind to try a different approach.',
  readout: 'School observations',
  topView: true,
  duration: trialSeconds,
  ground: schoolStage.ground,
  controls: [
    control('actor', 'Disturbance', 'player', { player: 'Wading player', skiff: 'Paddled skiff' }, true),
    control('side', 'First approach', 'west', { west: 'West edge', east: 'East edge' }, true),
    { key: 'returnPass', label: 'Cross again from the opposite edge', type: 'checkbox', value: false, rebuild: true },
    { key: 'seed', label: 'School seed', type: 'number', min: 0, max: seedCount - 1, step: 1, value: firstSeed, rebuild: true },
    { key: 'nudge', label: 'Nudge fish 1 east by 5 cm', type: 'checkbox', value: false, rebuild: true },
    { key: 'trails', label: 'Show fish trails', type: 'checkbox', value: true },
    { key: 'leaderRing', label: 'Mark regroup leader', type: 'checkbox', value: true },
  ],
  actions: [{
    label: 'Randomize school',
    restart: true,
    enabled: () => true,
    run(values) {
      const offset = 1 + Math.floor(Math.random() * (seedCount - 1))
      values.seed = (Number(values.seed) + offset) % seedCount
    },
  }],
  create(meshes, values, _reportError, observe) {
    const { scene } = meshes
    const trial = createSchoolTrial(Number(values.seed), values.actor === 'skiff' ? 'skiff' : 'player', values.route, Boolean(values.nudge), { side: values.side === 'east' ? 'east' : 'west', returnPass: Boolean(values.returnPass) })
    const { school, actor } = trial
    values.route = JSON.stringify(trial.route)
    const { basin, water: waterShape, stones, trail, leader, crewY, boatY, fishY } = schoolStage
    const sand = meshes.paintSurface('sand', poolSand)
    meshes.cylinder(0, basin.y, 0, basin.diameter, basin.diameter, basin.height, basin.sides, sand)
    const water = meshes.paint(waterShape.color)
    water.alpha = waterShape.opacity
    const surface = meshes.cylinder(0, 0, 0, waterShape.diameter, waterShape.diameter, waterShape.height, waterShape.sides, water, undefined, false)
    surface.isPickable = true
    for (let i = 0; i < stones.count; i++) {
      const angle = i * stones.angleStep
      const radius = stones.radius + stones.ripple * Math.sin(i * stones.rate)
      const width = stones.width + stones.widthVariation * Math.cos(i)
      roundedPebble(meshes, Math.cos(angle) * radius, stones.y, Math.sin(angle) * radius, width, stones.height, stones.depth, angle, i + 1)
    }
    const shoal = meshes.paint('#bce7b7')
    shoal.backFaceCulling = false
    const fish = school.fish.map(() => createSchoolFish(meshes, shoal))
    const startledPaint = meshes.paint('#fff0a3')
    startledPaint.backFaceCulling = false
    const segments = fish.map(() => Array.from({ length: schoolTrailSamples }, () => Vector3.Zero()))
    const trails = CreateLineSystem('School trails', { lines: segments, updatable: true }, scene)
    trails.color = Color3.FromHexString(trail.color)
    trails.alpha = trail.opacity
    trails.isPickable = false
    trails.alwaysSelectAsActiveMesh = true
    const ring = CreateTorus('Regroup leader', leader, scene)
    ring.material = meshes.paint('#ffd46a', true)
    ring.isPickable = false
    const crew = values.actor === 'player' ? createCrew(meshes, 0) : undefined
    const body = crew?.root ?? createHarborBoat(meshes)
    body.position.set(actor.x, crew ? crewY : boatY, actor.z)
    body.rotation.y = actor.heading
    const canvas = scene.getEngine().getRenderingCanvas()
    let routeFull = false
    function steer(point: Point) {
      routeFull = !trial.steer(point)
      if (!routeFull) values.route = JSON.stringify(trial.route)
    }
    scene.onPointerObservable.add((event) => {
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
      steer({ x: actor.x + (dir[0] * right.x - dir[1] * right.z) * steerDistance / length, z: actor.z + (dir[0] * right.z + dir[1] * right.x) * steerDistance / length })
    }
    canvas?.addEventListener('keydown', move)
    scene.onDisposeObservable.addOnce(() => canvas?.removeEventListener('keydown', move))
    return ({ time }, settings) => {
      trial.seek(time)
      body.position.x = actor.x
      body.position.z = actor.z
      body.rotation.y = actor.heading
      if (crew) poseCrew(crew, time * walkerCycleRate, actor.speed * walkerStrideScale, false)
      let startled = 0
      for (const [i, member] of school.fish.entries()) {
        fish[i].position.set(member.x, fishY, member.z)
        fish[i].rotation.y = Math.PI / halves - member.heading
        fish[i].material = settings.trails && member.alarm > 0 ? startledPaint : shoal
        if (member.alarm > 0) startled++
        if (settings.trails) {
          const track = trial.tracks[i]
          segments[i].forEach((v, j) => {
            const p = track[Math.max(0, track.length - segments[i].length + j)] ?? member
            v.set(p.x, trail.y, p.z)
          })
          segments[i][segments[i].length - 1].set(member.x, trail.y, member.z)
        }
      }
      trails.setEnabled(Boolean(settings.trails))
      if (settings.trails) CreateLineSystem('School trails', { lines: segments, instance: trails }, scene)
      ring.setEnabled(Boolean(settings.leaderRing) && school.leader >= 0)
      if (school.leader >= 0) ring.position.copyFrom(fish[school.leader].position)
      const phase = school.leader >= 0
        ? (schoolIsRegrouping(school) ? 'Regrouping around fish ' : 'Following fish ') + (school.leader + 1)
        : startled ? 'Scattering' : school.scattered ? 'Waiting for calm' : 'Cruising'
      observe(routeFull
        ? 'Route full. Rewind to edit an earlier move or reset the trial.'
        : phase + ' · ' + startled + ' of 6 startled · ' + school.encounters + (school.encounters === 1 ? ' disturbance' : ' disturbances'))
    }
  },
}
