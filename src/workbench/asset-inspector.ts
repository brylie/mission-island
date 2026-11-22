import { habitatCodex } from '../biome-recipe'
import { applyRelatedOptions, createInspectorSelect, type Control, type Entry, type Values } from './subject'

interface InspectorState {
  asset: Entry
  values: Values
  onIsland: boolean
  supportsSunShafts: boolean
}

interface InspectorControls {
  current: () => InspectorState
  change: (control: Control, value: Values[string], save?: boolean) => void
  remember: () => void
  restart: () => void
}

export function createAssetInspector(inspector: HTMLElement, panel: HTMLElement, { current, change, remember, restart }: InspectorControls) {
  function render() {
    const { asset, values, onIsland, supportsSunShafts } = current()
    refreshActions()
    inspector.replaceChildren()
    let group = ''
    for (const control of asset.controls ?? []) {
      if (onIsland && control.key === 'shape') continue
      const organism = asset.id === 'biome' ? habitatCodex.find((item) => item.key === control.key) : undefined
      const heading = organism?.group ?? 'Conditions'
      if (asset.id === 'biome' && heading !== group) {
        group = heading
        const title = document.createElement('h3')
        title.className = 'codex-group'
        title.textContent = group
        inspector.append(title)
      }
      const row = document.createElement('label')
      const name = document.createElement('span')
      name.textContent = control.label
      name.id = `asset-setting-${control.key}`

      if (control.type === 'select') {
        row.className = 'row'
        const select = createInspectorSelect(control, values, name.id)
        select.addEventListener('change', () => change(control, select.value))
        row.append(name, select)
      }
      else {
        const input = document.createElement('input')
        input.type = control.type
        input.setAttribute('aria-labelledby', name.id)
        if ((control.key === 'sunShafts' || control.key === 'shaftIntensity') && !supportsSunShafts) {
          input.disabled = true
          row.title = 'Volumetric sunlight requires WebGL 2 with shadow map filtering.'
        }
        if (control.type === 'checkbox') {
          row.className = 'checkbox-row'
          input.checked = Boolean(values[control.key])
          input.addEventListener('change', () => change(control, input.checked))
          row.append(input, name)
        }
        else {
          if (control.type === 'number') {
            row.className = 'row'
            input.min = String(control.min)
            input.max = String(control.max)
            input.step = String(control.step)
            input.value = String(values[control.key])
            input.addEventListener('input', () => {
              const next = input.valueAsNumber
              if (!control.rebuild && Number.isFinite(next) && next >= control.min && next <= control.max) change(control, next, false)
            })
            input.addEventListener('change', () => {
              const next = control.step === 1 ? Math.round(input.valueAsNumber) : input.valueAsNumber
              input.value = String(Number.isFinite(next) ? Math.max(control.min, Math.min(control.max, next)) : values[control.key])
              change(control, input.valueAsNumber)
            })
            row.append(name, input)
          }
          else if (control.type === 'range') {
            row.className = 'range-row'
            input.min = String(control.min)
            input.max = String(control.max)
            input.step = String(control.step)
            input.value = String(values[control.key])
            const value = document.createElement('output')
            value.textContent = input.value
            input.addEventListener('input', () => {
              value.textContent = input.value
              if (!control.rebuild) change(control, input.valueAsNumber, false)
            })
            if (control.rebuild) {
              input.addEventListener('change', () => change(control, input.valueAsNumber))
            }
            else {
              input.addEventListener('change', remember)
            }
            row.append(name, value, input)
          }
          else {
            row.className = 'row'
            input.value = String(values[control.key])
            if (control.rebuild) input.addEventListener('change', () => change(control, input.value))
            else {
              input.addEventListener('input', () => change(control, input.value, false))
              input.addEventListener('change', remember)
            }
            row.append(name, input)
          }
        }
      }
      inspector.append(row)
      if (organism) {
        const note = document.createElement('p')
        note.className = 'codex-note'
        note.id = 'note-' + organism.key
        note.textContent = organism.note
        row.querySelector('input')?.setAttribute('aria-describedby', note.id)
        inspector.append(note)
      }
    }
  }

  function refreshActions() {
    const { asset, values } = current()
    panel.replaceChildren()
    for (const action of asset.actions ?? []) {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = action.label
      button.disabled = !action.enabled(values)
      button.addEventListener('click', () => {
        action.run(current().values)
        if (action.restart) restart()
        render()
        remember()
        panel.querySelector<HTMLButtonElement>('button:enabled')?.focus()
      })
      panel.append(button)
    }
  }

  function optionChanged(key: string) {
    const { asset, values } = current()
    if (asset.relatedOptions) applyRelatedOptions(inspector, asset, values, key)
    if (asset.actions) refreshActions()
  }

  return { render, optionChanged }
}
