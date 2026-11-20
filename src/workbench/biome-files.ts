import { parseRecipeFile, presets, serializeRecipe, type BiomeRecipe } from './biome-recipe'

export function bindBiomeRecipes(current: () => BiomeRecipe, apply: (recipe: BiomeRecipe) => void) {
  const select = document.querySelector<HTMLSelectElement>('#biome-preset')!
  const file = document.querySelector<HTMLInputElement>('#biome-file')!
  const status = document.querySelector<HTMLElement>('#biome-file-status')!
  for (const label of Object.keys(presets)) select.add(new Option(label, label))
  document.querySelector('#biome-apply')!.addEventListener('click', () => {
    const preset = Object.entries(presets).find(([label]) => label === select.value)
    if (preset) apply(preset[1])
    status.textContent = ''
  })
  document.querySelector('#biome-export')!.addEventListener('click', () => {
    const recipe = current()
    const url = URL.createObjectURL(new Blob([serializeRecipe(recipe)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'biome-' + recipe.seed + '.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  })
  document.querySelector('#biome-import')!.addEventListener('click', () => file.click())
  file.addEventListener('change', () => {
    const chosen = file.files?.[0]
    if (!chosen) return
    file.value = ''
    if (chosen.size > 65536) { status.textContent = 'Choose a recipe smaller than 64 KB.'; return }
    void chosen.text().then(text => {
      apply(parseRecipeFile(text))
      status.textContent = 'Opened ' + chosen.name
    }).catch((error: unknown) => {
      status.textContent = error instanceof SyntaxError ? 'The file contains invalid JSON.' : error instanceof Error ? error.message : 'Unable to open recipe.'
    })
  })
}
