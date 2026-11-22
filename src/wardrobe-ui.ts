import {
  appearancePartKeys,
  appearanceParts,
  defaultAppearance,
  isEveryday,
  outfitRequirement,
  readAppearance,
  skinTones,
  uniforms,
  wearsSwimsuit,
} from './crew-appearance'
import type { CrewAppearance, Uniform } from './crew-appearance'
import { clothingCatalog, clothingIds, ownsClothing, shopItemFor, type ClothingId } from './clothing-catalog'
import type { ClothingPurchaseResult, Player, Snapshot } from './protocol'
import anglerThumb from './assets/harbor-angler.webp'
import coralThumb from './assets/coral-shirt.webp'
import swimsuitThumb from './assets/lagoon-swimsuit.webp'
import { createWardrobePreview } from './wardrobe-preview'
import { farmingQualified } from './farm-orders'
import { pieceSlots } from './wardrobe-stock'

const swatchPreviewSize = 88

function control<T extends HTMLElement>(dialog: HTMLDialogElement, selector: string) {
  return dialog.querySelector<T>(selector)!
}

function optionList(choices: Readonly<Record<string, string>>) {
  return Object.entries(choices).map(([value, label]) => new Option(label, value))
}

export function createWardrobe(dialog: HTMLDialogElement, apply: (appearance: CrewAppearance) => void) {
  const form = control<HTMLFormElement>(dialog, 'form')
  const uniform = control<HTMLSelectElement>(dialog, '[name=uniform]')
  const skin = control<HTMLSelectElement>(dialog, '[name=skin]')
  const canvas = control<HTMLCanvasElement>(dialog, 'canvas')
  const front = control<HTMLButtonElement>(dialog, '[data-view=front]')
  const back = control<HTMLButtonElement>(dialog, '[data-view=back]')
  const applyButton = control<HTMLButtonElement>(dialog, '[type=submit]')
  const availability = control(dialog, '#outfit-requirement')
  const everyday = control<HTMLFieldSetElement>(dialog, '#everyday-pieces')
  const previewStatus = control(dialog, '#wardrobe-preview-status')
  let preview: ReturnType<typeof createWardrobePreview> | undefined
  let draft = defaultAppearance
  let mission: Snapshot['mission'] = 'delivery'
  let qualifiedFarmer = false
  let owned: ClothingId[] = []
  uniform.append(...optionList(Object.fromEntries(Object.entries(uniforms).map(([id, outfit]) => [id, outfit.name]))))
  skin.append(...optionList(Object.fromEntries(Object.entries(skinTones).map(([id, tone]) => [id, tone.name]))))

  for (const key of appearancePartKeys) {
    const { label, choices } = appearanceParts[key]
    const row = document.createElement('label')
    const caption = document.createElement('span')
    caption.textContent = label
    const select = document.createElement('select')
    select.name = key
    select.append(...optionList({ default: 'Crew default', ...choices }))
    row.append(caption, select)
    control(dialog, key === 'shirt' || key === 'hat' || key === 'trousers' || key === 'shoes' ? '#everyday-pieces' : '#personal-parts').append(row)
  }
  const pieceSelects = pieceSlots.map((slot) => ({ slot, field: control<HTMLSelectElement>(dialog, `[name=${slot}]`) }))
  const trousers = control<HTMLSelectElement>(dialog, '[name=trousers]')

  function refreshAccess() {
    for (const option of uniform.options) {
      const id = option.value as Uniform
      const locked = outfitRequirement(id, mission, owned.includes('angler'), qualifiedFarmer)
      option.textContent = id === 'default' ? 'Everyday clothes' : uniforms[id].name + (locked ? ' · Locked' : '')
    }
    for (const { slot, field } of pieceSelects) {
      for (const option of field.options) {
        const item = shopItemFor(slot, option.value)
        if (item) option.textContent = clothingCatalog[item].name + (owned.includes(item) ? '' : ' · Locked')
      }
    }
    const item = isEveryday(draft.uniform)
      ? pieceSelects
          .filter(({ field }) => !field.disabled)
          .map(({ slot }) => shopItemFor(slot, draft[slot]))
          .find((id) => id && !owned.includes(id))
      : undefined
    const reason = outfitRequirement(draft.uniform, mission, owned.includes('angler'), qualifiedFarmer)
      ?? (item ? `Buy the ${clothingCatalog[item].name} at the Seabrook clothing counter.` : undefined)
    const note = wearsSwimsuit(draft)
      ? 'The swimsuit covers your top and bottoms.'
      : isEveryday(draft.uniform) ? '' : 'Your everyday clothes are saved for when you change back.'
    availability.textContent = reason ?? note
    applyButton.disabled = Boolean(reason)
  }

  function refreshDraft() {
    // Disabled everyday selects still hold the pieces to restore after wearing a work outfit.
    draft = readAppearance(Object.fromEntries(Array.from(form.querySelectorAll('select'), (select) => [select.name, select.value])))
    everyday.disabled = !isEveryday(draft.uniform)
    trousers.disabled = wearsSwimsuit(draft)
    refreshAccess()
    preview?.show(draft)
  }

  function update(state: Snapshot, player: Player) {
    const next = clothingIds.filter((id) => ownsClothing(player, id))
    const farmAccess = farmingQualified(state.farmWork.progress.stage)
    if (state.mission === mission && next.join() === owned.join() && farmAccess === qualifiedFarmer) return
    mission = state.mission
    qualifiedFarmer = farmAccess
    owned = next
    if (dialog.open) refreshAccess()
  }

  function open(state: Snapshot, player: Player) {
    update(state, player)
    const saved = player.appearance ?? defaultAppearance
    for (const select of form.querySelectorAll<HTMLSelectElement>('select')) {
      select.value = saved[select.name as keyof CrewAppearance] ?? 'default'
    }
    refreshDraft()
    previewStatus.hidden = true
    front.disabled = back.disabled = false
    dialog.showModal()
    try {
      preview = createWardrobePreview(canvas, player.appearanceBase ?? player.id)
      preview.show(draft)
    }
    catch {
      previewStatus.hidden = false
      front.disabled = back.disabled = true
    }
  }

  form.addEventListener('change', refreshDraft)
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    if (applyButton.disabled) return
    apply(draft)
    dialog.close()
  })
  control(dialog, '[data-close]').addEventListener('click', () => dialog.close())
  front.addEventListener('click', () => preview?.view(false))
  back.addEventListener('click', () => preview?.view(true))
  dialog.addEventListener('close', () => {
    preview?.dispose()
    preview = undefined
  })
  return { open, update }
}

const starterThumbnails = {
  'angler': { src: anglerThumb, alt: 'Shirt, trousers, cap, and shoes displayed separately' },
  'coral-shirt': { src: coralThumb, alt: 'Coral shirt with pale collar and cuffs' },
  'lagoon-swimsuit': { src: swimsuitThumb, alt: 'Teal one-piece swimsuit with short legs' },
}
const collectionThumbnails = import.meta.glob<string>('./assets/clothing/*.webp', { eager: true, query: '?url', import: 'default' })

function thumbnail(id: ClothingId) {
  if (id === 'angler' || id === 'coral-shirt' || id === 'lagoon-swimsuit') return starterThumbnails[id]
  return { src: collectionThumbnails[`./assets/clothing/${id}.webp`], alt: `${clothingCatalog[id].name} shown by itself` }
}

function coinAmount(coins: number) {
  return `${coins} ${coins === 1 ? 'coin' : 'coins'}`
}

export function createClothingCounter(dialog: HTMLDialogElement, buy: (id: ClothingId) => void) {
  const owner = control(dialog, '#counter-owner')
  const balance = control(dialog, '#counter-balance')
  const note = control(dialog, '#counter-note')
  const stock = control(dialog, '#counter-stock')
  const category = control<HTMLSelectElement>(dialog, '#counter-category')
  const pending = new Set<ClothingId>()
  const rows = clothingIds.map((id) => {
    const { name, price, slot } = clothingCatalog[id]
    const { src, alt } = thumbnail(id)
    const card = document.createElement('li')
    card.className = 'counter-item'
    const image = new Image(swatchPreviewSize, swatchPreviewSize)
    image.src = src
    image.alt = alt
    const details = document.createElement('div')
    const heading = document.createElement('h3')
    heading.textContent = name
    const button = document.createElement('button')
    button.type = 'button'
    button.dataset.clothingItem = id
    button.addEventListener('click', () => {
      pending.add(id)
      button.disabled = true
      buy(id)
    })
    details.append(heading, button)
    card.append(image, details)
    stock.append(card)
    return { id, slot, card, button, name, price, label: `Buy for ${coinAmount(price)}` }
  })
  category.addEventListener('change', () => {
    for (const { slot, card } of rows) card.hidden = category.value !== 'all' && category.value !== slot
    stock.scrollTop = 0
  })

  function update(state: Snapshot, player: Player, atCounter: boolean) {
    if (!dialog.open) return
    const text = `Crew bank · ${coinAmount(state.crewCoins)}`
    if (balance.textContent !== text) balance.textContent = text
    for (const { id, button, name, price, label } of rows) {
      const owned = ownsClothing(player, id)
      const text = owned ? 'Owned' : label
      if (owned) pending.delete(id)
      button.disabled = owned || pending.has(id) || !atCounter || state.crewCoins < price
      if (button.textContent === text) continue
      button.textContent = text
      button.setAttribute('aria-label', owned ? `${name} owned` : `Buy ${name} for ${coinAmount(price)}`)
    }
  }

  function open(state: Snapshot, player: Player, atCounter: boolean) {
    owner.textContent = `Purchases go to ${player.name || `Crew ${player.id + 1}`} (you)`
    note.textContent = ''
    pending.clear()
    dialog.showModal()
    update(state, player, atCounter)
  }

  control(dialog, '[data-close]').addEventListener('click', () => dialog.close())
  return { open, update, result(id: ClothingId, result: ClothingPurchaseResult) {
    if (result !== 'bought') pending.delete(id)
    const { name, price } = clothingCatalog[id]
    const results: Record<ClothingPurchaseResult, string> = {
      'bought': `${name} was added to your wardrobe.`,
      'already-owned': `${name} is already in your wardrobe.`,
      'insufficient-funds': `The crew bank needs ${coinAmount(price)} to buy ${name}.`,
      'away': 'Step up to the clothing counter with your hands free.',
    }
    note.textContent = results[result]
  } }
}
