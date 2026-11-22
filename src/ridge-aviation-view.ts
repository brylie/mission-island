import { ridgeSurveyClue } from './assets/geometry/ridge-course'
import { createHangGlider, createRidgeCourse, poseHangGliderPilot } from './assets/ridge-glider'
import { createRidgeFlightOrbs } from './assets/ridge-flight-orbs'
import { createRidgeUpdraft } from './assets/ridge-updraft'
import type { createCrew } from './assets/crew'
import { atRidgeRack } from './aviation'
import type { MeshFactory } from './island-meshes'
import { moveTo } from './island-render-pose'
import { createObjectiveMarker } from './objective-marker'
import type { Player, Snapshot } from './protocol'
import { mirrorPoolWillow } from './worlds/starter/sites'

type Rig = ReturnType<typeof createCrew>

export function ridgeCameraMode(state?: Snapshot, player?: Player) {
  if (!player || player.seat) return
  if (state?.aviation.flight?.pilotId === player.id) return 'flight'
  if (atRidgeRack(player)) return 'preflight'
}

export function createRidgeAviationView(meshes: MeshFactory, crew: Rig[]) {
  const { rack, markMeadow } = createRidgeCourse(meshes)
  const showRoute = createRidgeFlightOrbs(meshes)
  const drawUpdraft = createRidgeUpdraft(meshes)
  const wing = createHangGlider(meshes)
  const willow = createObjectiveMarker(meshes, mirrorPoolWillow, ridgeSurveyClue.markerHeight, ridgeSurveyClue.markerColor)
  const orange = meshes.paint(ridgeSurveyClue.signColor, true)
  const clue = meshes.box(...ridgeSurveyClue.signPosition, ...ridgeSurveyClue.signSize, orange, willow, false)
  clue.rotation.y = ridgeSurveyClue.signHeading
  return {
    update(state: Snapshot | undefined, time: number) {
      const aviation = state?.aviation
      const flight = aviation?.flight
      const pilot = flight && crew[flight.pilotId]
      const parent = pilot ? pilot.root : rack
      if (wing.parent !== parent) {
        wing.parent = parent
        wing.position.y = pilot ? 0 : ridgeSurveyClue.rackWingY
      }
      markMeadow(Boolean(aviation?.marked))
      const toWillow = flight?.outing === 'free' || (!flight && aviation?.surveyed)
        ? null
        : flight ? flight.outing === 'survey' && !flight.observed : Boolean(aviation?.qualified)
      showRoute(toWillow, pilot?.root.position)
      drawUpdraft(time, state?.weather.hour, state?.weather.rain)
      willow.setEnabled(flight?.outing === 'survey' && !flight.observed)
    },
    pose(state: Snapshot, player: Player, character: Rig, blend: number) {
      const flight = state.aviation.flight
      if (flight?.pilotId !== player.id) return false
      moveTo(character.root, player, player.y + ridgeSurveyClue.pilotRigClearance, blend)
      character.root.rotation.x += (flight.pitch - character.root.rotation.x) * blend
      character.root.rotation.z += (flight.bank - character.root.rotation.z) * blend
      poseHangGliderPilot(character, blend)
      return true
    },
  }
}
