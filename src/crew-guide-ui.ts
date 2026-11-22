import { crateDriverXp, haulerUnlockXp } from './ore-contracts'
import { tallyLines } from './ferry-repair'
import { jobs } from './jobs'
import type { Player, Snapshot } from './protocol'
import { createResidentConversation } from './resident-conversation-ui'
import { favorGuides } from './residents/favors'
import { crewHomes, jobPay, starterPay } from './world'
import { starterResident, starterResidents } from './worlds/starter/residents'

function favorTitle(receipt: Snapshot['lastFavorPay']) {
  return receipt && starterResident(receipt.resident)?.favors.find((favor) => favor.id === receipt.favor)?.title
}

export function createCrewGuide(dialog: HTMLDialogElement, setDismissed: (dismissed: boolean) => void, act: Parameters<typeof createResidentConversation>[1]) {
  const title = dialog.querySelector<HTMLElement>('#guide-title')!
  const note = dialog.querySelector<HTMLElement>('#guide-note')!
  const conversation = dialog.querySelector<HTMLElement>('#resident-conversation')!
  const talk = createResidentConversation(dialog, act)
  const favors = dialog.querySelector<HTMLElement>('#guide-favors')!
  const home = dialog.querySelector<HTMLElement>('#guide-home')!
  const workTitle = dialog.querySelector<HTMLElement>('#guide-work-title')!
  const work = dialog.querySelector<HTMLElement>('#guide-work')!
  const pay = dialog.querySelector<HTMLElement>('#guide-pay')!
  const lead = dialog.querySelector<HTMLElement>('#guide-lead')!
  const toggle = dialog.querySelector<HTMLButtonElement>('#toggle-fisher-lead')!
  let shownFavors = ''

  function showLead(visible: boolean) {
    lead.hidden = !visible
    toggle.setAttribute('aria-expanded', String(visible))
    toggle.textContent = visible ? 'Put away Mara’s lead' : 'Recall Mara’s lead'
  }

  toggle.addEventListener('click', () => {
    showLead(lead.hidden)
    setDismissed(lead.hidden)
  })

  function showFavors(state: Snapshot, player: Player) {
    const entries = favorGuides(starterResidents, state, player)
    const key = JSON.stringify(entries)
    if (key === shownFavors) return
    shownFavors = key
    favors.replaceChildren(...entries.map(({ title: heading, detail, next }) => {
      const section = document.createElement('section')
      const [h3, first, second] = [document.createElement('h3'), document.createElement('p'), document.createElement('p')]
      h3.textContent = heading
      first.textContent = detail
      second.textContent = next
      section.append(h3, first, second)
      return section
    }))
  }

  function update(state: Snapshot, player: Player) {
    if (!dialog.open) return
    // A conversation follows shared progress, so a finding from a crewmate's swing appears while it is open.
    if (note.hidden) return talk.refresh(state, player)
    const order = state.jobs.active
    const heading = order ? jobs[order.id].title : state.mission === 'complete' ? 'Your next job' : 'Your first shift'
    const direction = order
      ? 'Your crew already has an order. Follow the progress and destination on the mission card.'
      : state.mission === 'complete'
        ? 'The Harbor Job Board is open beside Harbor Depot. Walk up and press E to choose an order with your crewmate. Four finished orders open the ferry repair.'
        : state.mission === 'fire'
          ? 'Pick up the extinguishers at Fire Supplies and head to Forest Lookout. Putting out the fire opens the Harbor Job Board back at the depot.'
          : 'Cross the depot lane to the Harbor Depot crate stack south of the cottages. One crewmate can load the flatbed from the back with E while the other boards with F. Once loaded, follow the road east to Seabrook. Next comes the lookout fire, then the job board beside the depot.'
    const balance = `Crew bank · ${state.crewCoins} ${state.crewCoins === 1 ? 'coin' : 'coins'}`
    const latest = state.lastStarterPay && starterPay[state.lastStarterPay]
    const receipt = latest
      ? `Last starter payout · ${latest.label} · +${latest.coins} coins.`
      : `Starter pay goes straight into the shared crew bank. Earn ${jobPay.crate} coins per crate, ${jobPay.delivery} extra for finishing the delivery, and ${jobPay.fire} for clearing the lookout fire.`
    const xp = player.deliveryXp ?? 0
    const certification = xp >= haulerUnlockXp
      ? 'Certified to drive the Slatecliff ore truck.'
      : `Slatecliff ore truck certification takes ${haulerUnlockXp} driver XP. Earn ${crateDriverXp} XP for each crate you haul by truck and your crew delivers.`
    const kept = favorTitle(state.lastFavorPay)
    const favorPay = kept ? ` Last favor · ${kept} · +${state.lastFavorPay!.coins} coins.` : ''
    for (const [element, value] of [
      [home, crewHomes[player.id].name],
      [workTitle, heading],
      [work, direction],
      [pay, `${balance}. ${receipt}${favorPay} ${xp} driver XP. ${certification}`],
    ] as const) {
      if (element.textContent !== value) element.textContent = value
    }
    showFavors(state, player)
  }

  return {
    update,
    open(state: Snapshot, player: Player, talking: string | false, dismissed: boolean) {
      // The ferry tally board opens in the same dialog as a conversation, without a resident to answer.
      const board = talking === 'tally' ? tallyLines(state) : undefined
      const speaking = board ? talk.board(board.lines) && board.title : talking ? talk.show(state, player, talking) : undefined
      title.textContent = speaking || 'Crew guide'
      conversation.hidden = !speaking
      note.hidden = Boolean(speaking)
      if (!speaking) showLead(!dismissed)
      dialog.showModal()
      update(state, player)
    },
  }
}
