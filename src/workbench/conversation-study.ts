import { createCrew, poseCrew } from '../assets/crew'
import { jobs, orderContribution } from '../jobs'
import { walkingHeight } from '../terrain'
import type { Entry, Values } from './subject'

const job = jobs['market-fish']
const maxApproachDistance = 4
const counter = { x: 40.5, z: 6.8 }
const withinReach = (v: Values) => Number(v.distance) <= 2.5
const contribution = (v: Values) => orderContribution(
  { jobs: { active: { id: 'market-fish', progress: Number(v.delivered) }, completed: 0 } },
  { fish: Number(v.fish), carrots: 0 })

export const conversationStudy: Entry = {
  id: 'market-conversation', name: 'Fishmonger conversation', group: 'NPC interactions', source: 'src/workbench/conversation-study.ts',
  description: 'Rehearse a shared fish order with a stand-in shopkeeper. Set the approach distance and the fish in hand.',
  readout: 'Conversation rehearsal', duration: 6,
  fieldSite: () => ({ name: 'Seabrook Market', offset: { ...counter, y: walkingHeight(counter) } }),
  controls: [
    { type: 'range', key: 'distance', label: 'Distance to shopkeeper (m)', min: 1, max: maxApproachDistance, step: .1, value: 1.5 },
    { type: 'number', key: 'fish', label: 'Fish in hand', min: 0, max: 5, step: 1, value: 1 },
    { type: 'number', key: 'delivered', label: 'Fish delivered', min: 0, max: job.quantity, step: 1, value: 0 },
    { type: 'select', key: 'phase', label: 'Conversation state', value: 'ready',
      choices: { ready: 'Before greeting', offered: 'Order offered', active: 'Order accepted', complete: 'Order fulfilled' } },
  ],
  actions: [
    { label: 'Talk', enabled: v => withinReach(v) && v.phase === 'ready', run(v) { v.phase = 'offered' } },
    { label: 'Accept order', enabled: v => withinReach(v) && v.phase === 'offered', run(v) { v.phase = 'active'; v.delivered = 0 } },
    { label: 'Hand over fish', enabled: v => withinReach(v) && v.phase === 'active' && Boolean(contribution(v)),
      run(v) {
        const count = contribution(v)?.quantity ?? 0
        v.fish = Number(v.fish) - count
        v.delivered = Number(v.delivered) + count
        if (v.delivered >= job.quantity) v.phase = 'complete'
      } },
  ],
  create(meshes, _values, _error, observe) {
    const shopper = createCrew(meshes, 0), keeper = createCrew(meshes, 1)
    keeper.setAppearance({ uniform: 'angler', skin: 'warm' })
    // The stage measures the actors before playback applies the selected distance.
    shopper.root.position.z = maxApproachDistance
    shopper.root.rotation.y = Math.PI
    return ({ time }, v) => {
      shopper.root.position.z = Number(v.distance)
      shopper.blink(time)
      keeper.blink(time)
      poseCrew(keeper, time, 0, false, undefined, v.phase === 'offered' ? .8 : 0, 1)
      if (!withinReach(v)) observe('Approach the shopkeeper to speak.')
      else if (v.phase === 'ready') observe('The fishmonger is ready to talk.')
      else if (v.phase === 'offered') observe(`“Could you bring me ${job.quantity} fish for the market? I can pay ${job.coins} coins.”`)
      else if (v.phase === 'complete') observe(`“Thank you! That fills the order.” · ${job.coins} coins in this rehearsal`)
      else observe(`Shared order · ${v.delivered} of ${job.quantity} fish received`)
    }
  },
}
