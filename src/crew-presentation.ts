import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { carryPose } from './rescue-gear'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { inSkiff } from './actions'
import { createFarmTools, poseCrew, poseSkiffCrew, poseSwimming, skiffCrewSeats, swimmingHeight, type createCrew } from './assets/crew'
import { carrierShift, countFootfalls, groundTravel } from './audio/gait'
import type { createIslandAudio } from './audio/island-audio'
import { aimFishingRod, createFishingGear, updateFishingLine } from './fishing-line-view'
import type { MeshFactory } from './island-meshes'
import { moveTo, walkGait } from './island-render-pose'
import * as rendering from './island-render-settings'
import type { Player, Snapshot } from './protocol'
import type { createRidgeAviationView } from './ridge-aviation-view'
import { routeContactHeight } from './route-contact'
import { walkingHeight } from './terrain'
import type { Point } from './world'

type CrewRig = ReturnType<typeof createCrew>
type Footsteps = ReturnType<typeof createIslandAudio>['footsteps']
type PosePilot = ReturnType<typeof createRidgeAviationView>['pose']

interface CrewFrame {
  time: number
  delta: number
  factor: number
  viewer: number
  truckStep: Point
}

export function createCrewPresentation(meshes: MeshFactory, crew: CrewRig[], boat: TransformNode, posePilot: PosePilot, footsteps: Footsteps) {
  const cycles = crew.map(() => 0)
  const farmTools = crew.map((character) => createFarmTools(meshes, character))
  const skiffGear = createFishingGear(meshes.scene, meshes, crew)

  function updateOnFoot(state: Snapshot, player: Player, character: CrewRig, wasVisible: boolean, frame: CrewFrame) {
    const { time, factor, delta, truckStep, viewer } = frame
    const { id } = player
    const node = character.root
    node.rotation.x = 0
    node.rotation.z = 0
    const pushing = state.farmWork.barrow?.handler === id
    const { x, z } = node.position
    moveTo(node, player, player.swimming ? swimmingHeight(time + id) : player.y + rendering.crewGroundClearance, factor)
    if (player.grounded && !player.onBed && !player.swimming) {
      const floor = pushing ? routeContactHeight(node.position) : walkingHeight(node.position)
      node.position.y = Math.max(node.position.y, floor + rendering.crewGroundClearance)
    }
    // Riding the truck bed moves the crew without walking.
    const step = wasVisible ? groundTravel({ x, z }, node.position, carrierShift(player, truckStep)) : 0
    const held = state.items.find((item) => item.holder === id)
    const gait = walkGait(step, delta, pushing)
    const footfalls = countFootfalls(cycles[id], cycles[id] += gait.cycles)
    footsteps(footfalls, player, node.position, step / Math.max(delta, rendering.minimumSpeedSampleSeconds), id === viewer)
    const winding = player.charge?.kind === 'throw' ? player.charge.power : 0
    if (player.swimming) poseSwimming(character, time + id, Math.min(1, step / Math.max(rendering.minimumSpeedSampleSeconds, delta * rendering.swimStrokeSpeed)), factor)
    else poseCrew(character, cycles[id], gait.stride, !player.grounded, (held && carryPose(held.kind)) ?? (pushing ? 'barrow' : player.equipped ? 'tool' : undefined), Number(Boolean(player.reaching || held?.spraying || player.casting)), wasVisible ? 1 - Math.exp(-delta * rendering.crewPoseResponse) : 1, winding, player.throwing, player.rightHandRaised)
  }

  function update(state: Snapshot, frame: CrewFrame) {
    const { time, factor } = frame
    for (const [id, character] of crew.entries()) {
      const node = character.root
      const player = state.players.find((entry) => entry.id === id)
      const { gear, bobber, line } = skiffGear[id]
      const boating = player?.connected && inSkiff(player.seat)
      bobber.isVisible = line.isVisible = Boolean(player?.connected && player.casting)
      if (!player?.connected || (player.seat && !boating)) {
        node.setEnabled(false)
        continue
      }
      const seatIndex = player.seat === 'port' ? 0 : 1
      const rod = player.equipped === 'fishing-rod' && !player.rowing
      const gripIndex = boating ? seatIndex : rod ? 0 : -1
      gear.forEach((tool, index) => {
        tool.grip.setEnabled(gripIndex === index)
        tool.rod.setEnabled(rod)
        tool.paddle.setEnabled(!rod)
      })
      const { hoe, can } = farmTools[id]
      hoe.setEnabled(!boating && player.equipped === 'hoe')
      can.setEnabled(!boating && player.equipped === 'watering-can')
      const wasVisible = node.isEnabled()
      character.setAppearance(player.appearance, { base: player.appearanceBase })
      character.blink(time)
      if (posePilot(state, player, character, factor)) continue
      if (boating) {
        const side = seatIndex === 0 ? -1 : 1
        Vector3.TransformCoordinatesToRef(skiffCrewSeats[seatIndex], boat.computeWorldMatrix(true), node.position)
        node.rotation.copyFrom(boat.rotation)
        node.setEnabled(true)
        const stroke = player.rowing ? Math.sin(time * rendering.rowingCadence + id * rendering.crewStrokePhase) : 0
        poseSkiffCrew(character, stroke, side, rod, wasVisible ? factor : 1)
        if (!rod) gear[seatIndex].alignPaddle()
      }
      else {
        updateOnFoot(state, player, character, wasVisible, frame)
      }
      if (rod) aimFishingRod(player, skiffGear[id], gripIndex)
      updateFishingLine(player, skiffGear[id], gripIndex, time)
    }
  }

  return { farmTools, skiffGear, update }
}
