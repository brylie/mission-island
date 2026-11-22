import { atGate, gateSwingTarget, onBench, toolboxAtGate, toolboxItem, type GateWorld } from './gate-repair.ts'
import type { InteractionOption, InteractionPolicies } from './interactions/definition.ts'
import type { Player, Snapshot } from './protocol.ts'
import type { FavorGuide } from './residents/definition.ts'
import { standing } from './residents/schedule.ts'

// Wren's second repair. After a wet spell the gate leaf swells and catches halfway. The crew swings it
// to check, planes the edge with the toolbox, checks again and tells Wren how it went. Wren takes the
// crew's word: telling Wren it swings clear after seeing it catch is the one way to break a promise.
export const swellFavor = 'wren-swell'
export const swellActions = {
  'check-swing': 'explicit',
  'plane': 'explicit',
} as const satisfies InteractionPolicies
export type SwellAction = keyof typeof swellActions

function checked(state: Pick<Snapshot, 'residents'>) {
  return state.residents.wren?.checked ?? null
}

// What the crew can do at the gate while the repair is under way. Checking comes first; once a swing has
// caught, planing needs the toolbox at the gate.
function swellOptions(state: GateWorld, player: Player): SwellAction[] {
  const { swelling } = state.gateRepair
  if (!swelling || !standing(player) || !atGate(player)) return []
  const held = state.items.find((item) => item.holder === player.id)
  if (held && held.kind !== 'toolbox') return []
  if (swelling === 'swollen' && checked(state) === 'fault' && toolboxAtGate(state)) return ['plane']
  return checked(state) === null ? ['check-swing'] : []
}

export function swellInteractions(state: GateWorld, player: Player): InteractionOption<SwellAction>[] {
  return swellOptions(state, player).map((action) => ({
    action,
    ...gateSwingTarget(),
    key: 'E',
    label: action === 'plane' ? 'Plane the swollen edge' : 'Swing the gate to check it',
  }))
}

// Built from the shared snapshot, so either crewmate knows what the last check showed before reporting back.
export function swellGuide(state: Pick<Snapshot, 'gateRepair' | 'residents' | 'items'>, player: Player): FavorGuide {
  const title = 'Wren’s swollen gate'
  const detail = 'After the wet spell the gate leaf has swollen and catches halfway.'
  const finding = checked(state)
  const toolbox = toolboxItem(state)
  const holding = toolbox?.holder === player.id
    ? 'You have the toolbox.'
    : toolbox?.holder !== null && toolbox?.holder !== undefined
      ? 'Your crewmate has the toolbox.'
      : toolbox && atGate(toolbox)
        ? 'The toolbox is set down by the gate.'
        : toolbox && onBench(toolbox)
          ? 'The toolbox is on Wren’s mending bench.'
          : 'The toolbox was left away from the gate. Talk to Wren to have it put back on the mending bench.'
  if (finding === 'sound') return { title, detail: 'Your crew’s last swing went clear.', next: 'Tell Wren the gate is fixed.' }
  if (finding === 'fault') {
    return { title, detail: 'Your crew’s last swing caught on the swollen edge.', next: `${holding} Plane the edge at the gate, then swing it again. You can also tell Wren it still catches.` }
  }
  return { title, detail, next: state.gateRepair.swelling === 'planed'
    ? 'Swing the gate to check the planed edge.'
    : `${holding} Swing the gate to see where it catches.` }
}
