import { Quaternion } from '@babylonjs/core/Maths/math.vector'
import { cargoTrial, castTrial } from '../assets/recipes/workbench-mechanic-studies'
import { createCargoPhysics } from '../simulation/cargo'
import { castPoint, catchChance, fishIsPulling, initialFishingTension, stepFight } from '../simulation/fishing'
import { castTravelSeconds, biteSeconds } from '../charged-actions'
import { createFishingFloat } from '../assets/fishing'
import { createFlatbed } from '../assets/flatbed'
import { createSupply } from '../assets/props'
import type { Item } from '../protocol'
import { groundHeight, waterLevel } from '../terrain'
import { crateSize, dockEndZ, harborDock, truckStart } from '../world'
import type { Entry } from './subject'

const dock = { x: harborDock.x, z: dockEndZ, heading: Math.PI }
const neutral = { x: 0, z: 0, sprint: false, spray: false, careful: false }
const hz = 30
const percentScale = 100
const halves = 2
const heightDigits = 2

export const mechanicStudies: Entry[] = [
  {
    id: 'cast-trial',
    name: 'Fishing cast & reel',
    group: 'Fishing',
    source: 'src/simulation/fishing.ts',
    duration: castTrial.duration,
    description: 'Compare cast strength and reeling strategies from the end of the harbor dock. Each trial includes a bite.',
    fieldSite: () => ({ name: 'Harbor dock', offset: { ...dock, y: waterLevel } }),
    readout: 'Fishing trial',
    controls: [
      { key: 'power', type: 'range', label: 'Cast strength (%)', ...castTrial.power },
      { key: 'reel', type: 'select', label: 'Reeling strategy', value: 'calm', choices: { calm: 'Reel during calm water', always: 'Always reel', never: 'Let out line' } },
    ],
    create(meshes, _, _error, observe) {
      const bobber = createFishingFloat(meshes)
      // Frame the entire cast, including its farthest landing point.
      meshes.box(...castTrial.extent.position, ...castTrial.extent.size, '#fff', undefined, false).isVisible = false
      return ({ time }, values) => {
        const power = Number(values.power) / percentScale
        const target = castPoint(dock, power)
        if (!target) {
          bobber.setEnabled(false)
          observe('Dry cast')
          return
        }
        const fight = { progress: 0, tension: initialFishingTension, pulling: false }
        const ticks = Math.floor((time - castTravelSeconds - biteSeconds) * hz)
        let outcome
        for (let i = 1; i <= ticks && !outcome; i++) {
          const t = i / hz
          outcome = stepFight(fight, t, values.reel === 'always' || (values.reel === 'calm' && !fishIsPulling(t)), 1 / hz)
        }
        const flight = Math.min(1, time / castTravelSeconds)
        const distance = Math.hypot(target.z - dock.z, target.x - dock.x)
        bobber.setEnabled(true)
        bobber.position.set(0, castTrial.float.restY + (1 - flight) * castTrial.float.flightY + Math.sin(flight * Math.PI) * castTrial.float.arcY, -distance * flight * (1 - castTrial.float.reelTravel * fight.progress))
        const phase = outcome ?? (flight < 1 ? 'Casting' : ticks < 0 ? 'Waiting for bite' : fight.pulling ? 'Fish pulling' : 'Fish calm')
        observe(`${phase} · ${distance.toFixed(1)} m cast · ${Math.round(catchChance(power) * percentScale)}% bite chance\nReeled ${Math.round(fight.progress * percentScale)}% · Tension ${Math.round(fight.tension * percentScale)}%`)
      }
    },
  },
  {
    id: 'cargo-trial',
    name: 'Throw into flatbed',
    group: 'Physics',
    source: 'src/simulation/cargo.ts',
    duration: cargoTrial.duration,
    description: 'Replay a crate throw against the parked truck using the multiplayer cargo physics.',
    fieldSite: () => ({ name: 'Harbor Depot', offset: { ...truckStart, y: 0 } }),
    readout: 'Cargo trial',
    controls: [{ key: 'power', type: 'range', label: 'Throw strength (%)', ...cargoTrial.power, rebuild: true }],
    create(meshes, values, _error, observe) {
      const physics = createCargoPhysics()
      let pose = physics.parkTruck(truckStart)
      const start = { x: truckStart.x - cargoTrial.start.truckOffsetX, z: truckStart.z }
      const item: Item = { ...start, id: 0, kind: 'crate', holder: null, heading: truckStart.heading, y: cargoTrial.start.crateY, onBed: false, delivered: false, rotation: null, spraying: false }
      physics.launch(item, start, groundHeight(start) + item.y, Number(values.power) / percentScale)
      const frames = [{ item: { ...item }, pose }]
      for (let i = 0; i < cargoTrial.duration * hz; i++) {
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
        observe(`${item.onBed ? 'On truck bed' : 'Off truck bed'} · ${Math.max(0, item.y - crateSize / halves - groundHeight(item)).toFixed(heightDigits)} m above terrain`)
      }
      show(0)
      return ({ time }) => show(time)
    },
  },
]
