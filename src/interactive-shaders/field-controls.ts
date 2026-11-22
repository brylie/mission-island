import { interactiveStudies } from './catalog'
import type { StudyInspection } from './island-effects'

export function fieldStudyControls(panel: HTMLElement, siteSelect: HTMLSelectElement, changed: () => void, events: AddEventListenerOptions) {
  const controls = panel.querySelector<HTMLElement>('#shader-study-controls')!
  const heading = panel.querySelector<HTMLElement>('#shader-response-label')!
  const input = panel.querySelector<HTMLInputElement>('#shader-response')!
  const baseline = panel.querySelector<HTMLButtonElement>('#shader-baseline')!
  const preset = panel.querySelector<HTMLButtonElement>('#shader-preset')!
  const workbench = panel.querySelector<HTMLAnchorElement>('#shader-workbench')!
  const group = document.createElement('optgroup')
  group.label = 'More interactive studies'
  for (const study of interactiveStudies) group.append(new Option(study.name + ' · ' + study.field.site, study.id))
  siteSelect.append(group)

  let selected: typeof interactiveStudies[number] | undefined
  function setValue(value: number) {
    input.value = String(value)
    changed()
  }

  input.addEventListener('input', changed, events)
  baseline.addEventListener('click', () => setValue(0), events)
  preset.addEventListener('click', () => {
    if (selected) setValue(selected.value)
  }, events)

  return {
    select(id: string) {
      selected = interactiveStudies.find((study) => study.id === id)
      controls.hidden = !selected
      if (!selected) return
      heading.textContent = selected.control
      baseline.textContent = selected.baseline
      preset.textContent = selected.preset
      workbench.href = 'workbench.html#' + selected.id
      input.value = String(selected.fieldDefault ?? selected.value)
      return selected.field
    },
    inspection(): StudyInspection | undefined {
      if (selected) return { id: selected.id, value: input.valueAsNumber }
    },
    dispose() { group.remove() },
  }
}
