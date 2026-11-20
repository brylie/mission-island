import { Quaternion } from '@babylonjs/core/Maths/math.vector'
import { createCargoPhysics } from '../../server/cargo'
import { castPoint, catchChance, stepFight } from '../../server/fishing'
import { castTravelSeconds, biteSeconds } from '../charged-actions'
import { createFlatbed, createSupply } from '../island-assets'
import type { Item } from '../protocol'
import { groundHeight, waterLevel } from '../terrain'
import { crateSize, dockEndZ, harborDock, truckStart } from '../world'
import type { Entry } from './subject'

const dock = { x: harborDock.x, z: dockEndZ, heading: Math.PI }
const neutral = { x: 0, z: 0, sprint: false, spray: false, careful: false }
const hz = 30

export const mechanicStudies: Entry[] = [
  {
    id: 'cast-trial', name: 'Fishing cast & reel', group: 'Fishing', source: 'server/fishing.ts', duration: 27,
    description: 'Compare cast strength and reeling strategies from the end of the harbor dock. Each trial includes a bite.',
    fieldSite: () => ({ name: 'Harbor dock', offset: { ...dock, y: waterLevel } }),
    readout: 'Fishing trial', controls: [
      { key: 'power', type: 'range', label: 'Cast strength (%)', min: 0, max: 100, step: 1, value: 75 },
      { key: 'reel', type: 'select', label: 'Reeling strategy', value: 'calm', choices: { calm: 'Reel during calm water', always: 'Always reel', never: 'Let out line' } },
    ],
    create(meshes, _, _error, observe) {
      const bobber = meshes.sphere(0, .09, 0, .18, .22, .18, '#ed9358')
      // Frame the entire cast, including its farthest landing point.
      meshes.box(0, .1, -6.2, .2, .2, 12.4, '#fff', undefined, false).isVisible = false
      return ({ time }, values) => {
        const power = Number(values.power) / 100
        const target = castPoint(dock, power)
        if (!target) { bobber.setEnabled(false); observe('Dry cast'); return }
        const fight = { progress: 0, tension: .25, pulling: false }
        const ticks = Math.floor((time - castTravelSeconds - biteSeconds) * hz)
        let outcome
        for (let i = 1; i <= ticks && !outcome; i++) {
          const t = i / hz
          outcome = stepFight(fight, t, values.reel === 'always' || (values.reel === 'calm' && t % 3.1 <= 1.7), 1 / hz)
        }
        const flight = Math.min(1, time / castTravelSeconds)
        const distance = Math.hypot(target.z - dock.z, target.x - dock.x)
        bobber.setEnabled(true)
        bobber.position.set(0, .09 + (1 - flight) * 1.2 + Math.sin(flight * Math.PI) * 1.25, -distance * flight * (1 - .88 * fight.progress))
        const phase = outcome ?? (flight < 1 ? 'Casting' : ticks < 0 ? 'Waiting for bite' : fight.pulling ? 'Fish pulling' : 'Fish calm')
        observe(`${phase} · ${distance.toFixed(1)} m cast · ${Math.round(catchChance(power) * 100)}% bite chance\nReeled ${Math.round(fight.progress * 100)}% · Tension ${Math.round(fight.tension * 100)}%`)
      }
    },
  },
  {
    id: 'cargo-trial', name: 'Throw into flatbed', group: 'Physics', source: 'server/cargo.ts', duration: 3,
    description: 'Replay a crate throw against the parked truck using the multiplayer cargo physics.',
    fieldSite: () => ({ name: 'Harbor Depot', offset: { ...truckStart, y: 0 } }), readout: 'Cargo trial',
    controls: [{ key: 'power', type: 'range', label: 'Throw strength (%)', min: 0, max: 100, step: 5, value: 55, rebuild: true }],
    create(meshes, values, _error, observe) {
      const physics = createCargoPhysics()
      let pose = physics.parkTruck(truckStart)
      const start = { x: truckStart.x - 5.5, z: truckStart.z }
      const item: Item = { ...start, id: 0, kind: 'crate', holder: null, heading: truckStart.heading, y: 1.35,
        onBed: false, delivered: false, rotation: null, spraying: false }
      physics.launch(item, start, groundHeight(start) + item.y, Number(values.power) / 100)
      const frames = [{ item: { ...item }, pose }]
      for (let i = 0; i < 3 * hz; i++) {
        pose = physics.step([item], pose, neutral, 1 / hz)
        frames.push({ item: { ...item }, pose })
      }
      const truck = createFlatbed(meshes).root
      const crate = createSupply(meshes, 'crate')
      crate.rotationQuaternion = Quaternion.Identity()
      function show(time: number) {
        const { item, pose } = frames[Math.min(frames.length - 1, Math.floor(time * hz))]
        truck.position.set(pose.x - truckStart.x, pose.y, pose.z - truckStart.z)
        truck.rotation.set(pose.pitch, pose.heading, pose.roll)
        crate.position.set(item.x - truckStart.x, item.y, item.z - truckStart.z)
        const q = item.rotation ?? Quaternion.FromEulerAngles(0, item.heading, 0)
        crate.rotationQuaternion!.set(q.x, q.y, q.z, q.w)
        observe(`${item.onBed ? 'On truck bed' : 'Off truck bed'} · ${Math.max(0, item.y - crateSize / 2 - groundHeight(item)).toFixed(2)} m above terrain`)
      }
      show(0)
      return ({ time }) => show(time)
    },
  },
]
