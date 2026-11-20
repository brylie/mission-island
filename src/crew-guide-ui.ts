import { fisherName } from './harbor-fisher'
import { jobs } from './jobs'
import type { Player, Snapshot } from './protocol'
import { crewHomes, jobPay, starterPay } from './world'

export function createCrewGuide(dialog: HTMLDialogElement, setDismissed: (dismissed: boolean) => void) {
  const title = dialog.querySelector<HTMLElement>('#guide-title')!
  const note = dialog.querySelector<HTMLElement>('#guide-note')!
  const conversation = dialog.querySelector<HTMLElement>('#fisher-conversation')!
  const greeting = dialog.querySelector<HTMLElement>('#fisher-line')!
  const home = dialog.querySelector<HTMLElement>('#guide-home')!
  const workTitle = dialog.querySelector<HTMLElement>('#guide-work-title')!
  const work = dialog.querySelector<HTMLElement>('#guide-work')!
  const pay = dialog.querySelector<HTMLElement>('#guide-pay')!
  const lead = dialog.querySelector<HTMLElement>('#guide-lead')!
  const toggle = dialog.querySelector<HTMLButtonElement>('#toggle-fisher-lead')!

  function showLead(visible: boolean) {
    lead.hidden = !visible
    toggle.setAttribute('aria-expanded', String(visible))
    toggle.textContent = visible ? 'Put away Mara’s lead' : 'Recall Mara’s lead'
  }

  toggle.addEventListener('click', () => {
    showLead(lead.hidden)
    setDismissed(lead.hidden)
  })

  function update(state: Snapshot, player: Player) {
    if (!dialog.open || note.hidden) return
    const order = state.jobs.active
    const heading = order ? jobs[order.id].title : state.mission === 'complete' ? 'Your next job' : 'Your first shift'
    const direction = order
      ? 'Your crew already has an order. Follow the progress and destination on the mission card.'
      : state.mission === 'complete'
        ? 'The Harbor Job Board is open beside the Harbor Depot freight yard. Walk up and press E to choose an order with your crewmate.'
        : state.mission === 'fire'
          ? 'Pick up the extinguishers at Fire Supplies and head to Forest Lookout. Putting out the fire opens the Harbor Job Board back at the depot.'
          : 'Cross the main road to the Harbor Depot freight yard south of the cottages. One crewmate can load the flatbed from the back with E while the other boards with F. Once loaded, follow the road east to Seabrook. Next comes the lookout fire, then the job board beside the depot.'
    const balance = `Crew bank · ${state.crewCoins} ${state.crewCoins === 1 ? 'coin' : 'coins'}`
    const latest = state.lastStarterPay && starterPay[state.lastStarterPay]
    const receipt = latest
      ? `Last starter payout · ${latest.label} · +${latest.coins} coins.`
      : `Starter pay goes straight into the shared crew bank. Earn ${jobPay.crate} coins per crate, ${jobPay.delivery} extra for finishing the delivery, and ${jobPay.fire} for clearing the lookout fire.`
    for (const [element, value] of [
      [home, crewHomes[player.id].name], [workTitle, heading], [work, direction], [pay, `${balance}. ${receipt}`],
    ] as const) {
      if (element.textContent !== value) element.textContent = value
    }
  }

  return {
    update,
    open(state: Snapshot, player: Player, talking: boolean, dismissed: boolean) {
      title.textContent = talking ? `${fisherName} · Fisher` : 'Crew guide'
      conversation.hidden = !talking
      note.hidden = talking
      if (talking) {
        greeting.textContent = state.mission === 'complete'
          ? '“Thanks for clearing the lookout. You can find more work on the board beside the depot. The ferry ramp down the next gravel turn still needs a crew.”'
          : '“Welcome to the harbor. The depot has a delivery and a lookout shift for your crew. That ramp east of here is the old ferry terminal. We’ll put it back to work someday.”'
      } else {
        showLead(!dismissed)
      }
      dialog.showModal()
      update(state, player)
    },
  }
}
