import { poseCrew, poseSwimming, swimmingHeight, type createCrew } from './assets/crew'
import { createCrewPositionBuffer } from './crew-position-buffer'
import { createCrewGait } from './crew-gait'
import { moveTo, sampleWalkingGait } from './island-render-pose'
import { walkingHeight } from './terrain'
import type { Item, Player } from './protocol'

function canPlant(player: Player) {
  return player.grounded && !player.swimming && !player.truckSurface && !player.onBed &&
    Math.abs(player.y - walkingHeight(player)) < .14
}

export function createLiveCrewMotion(character: ReturnType<typeof createCrew>) {
  const track = createCrewPositionBuffer()
  const gait = createCrewGait()
  const node = character.root
  node.setEnabled(false)
  let cycle = 0

  function walk(player: Player, held: Item | undefined, time: number, factor: number, delta: number) {
    const wasVisible = node.isEnabled()
    node.rotation.x = 0
    node.rotation.z = 0
    const { x, z } = node.position
    moveTo(node, player, player.swimming ? swimmingHeight(time) : player.y + .05, factor)
    const groundPoint = canPlant(player) && track.sample(delta)
    if (groundPoint) {
      node.position.x = groundPoint.x
      node.position.z = groundPoint.z
    }
    if (player.grounded && !player.onBed && !player.swimming) {
      node.position.y = Math.max(node.position.y, walkingHeight(node.position) + .05)
    }
    const travelled = Math.hypot(node.position.x - x, node.position.z - z)
    const step = wasVisible && travelled < 2 ? travelled : 0
    const speed = step / Math.max(.001, delta)
    const frame = canPlant(player) ? sampleWalkingGait(gait, node, delta) : undefined
    if (!frame) gait.reset()
    if (player.swimming) {
      poseSwimming(character, time, Math.min(1, speed / 3.8), factor)
      return
    }
    cycle += step / 4.8
    const stride = Math.min(.92, speed * .072) * (frame?.amount ?? 1)
    const winding = player.charge?.kind === 'throw' ? player.charge.power : 0
    const blend = wasVisible ? 1 - Math.exp(-delta * 16) : 1
    poseCrew(character, frame ?? cycle, stride, !player.grounded, held?.kind ?? (player.equipped ? 'tool' : undefined),
      Number(Boolean(player.reaching || held?.spraying || player.casting)), blend, winding, player.throwing, player.rightHandRaised)
  }
  function receive(player: Player, time: number) {
    if (player.connected && !player.seat && canPlant(player)) track.push(player, time)
    else track.reset()
  }
  function reset() { track.reset(); gait.reset() }
  function hide() {
    node.setEnabled(false)
    reset()
  }
  return { walk, receive, hide, reset }
}
