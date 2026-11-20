import { createBiomeScenery } from '../biome-scenery'
import { codex, presets, readRecipe } from '../biome-recipe'
import { biomeFrame, createBiome } from '../biome-model'
import type { Control, Entry } from './catalog'

const meadow = presets['Meadow edge']

function controls(): Control[] {
  return [
    { key: 'seed', label: 'Layout seed', type: 'number', value: meadow.seed, min: 0, max: 9999, step: 1, rebuild: true },
    { key: 'ground', label: 'Ground surface', type: 'select', value: meadow.ground, choices: { grass: 'Meadow turf', soil: 'Forest duff', stone: 'Stone and grit' }, rebuild: true },
    { key: 'hour', label: 'Hour of day', type: 'range', value: meadow.hour, min: 0, max: 23, step: 1 },
    { key: 'rain', label: 'Rain (%)', type: 'range', value: meadow.rain, min: 0, max: 100, step: 1 },
    ...codex.map(({ key, label, max }): Control => ({ key, label, type: 'range', min: 0, max, value: meadow[key], step: 1, rebuild: true })),
  ]
}

export const biomeEntry: Entry = {
  id: 'biome', name: 'Biome Composer', group: 'World', source: 'src/biome-model.ts',
  description: 'Compose a 16 m clearing. Replay the same seed to compare feeding, pursuit and shelter.',
  duration: 90, ground: { height: -.6, color: '#394942' }, controls: controls(),
  create(meshes, values) {
    const recipe = readRecipe(values)
    let biome = createBiome(recipe)
    const initial = biome.seek(0)
    const surface = recipe.ground === 'soil' ? meshes.paintSurface('gravel', '#896f50') : meshes.paintSurface(recipe.ground)
    meshes.cylinder(0, -.32, 0, 16.04, 15.8, .54, 36, '#856e50')
    meshes.cylinder(0, -.05, 0, 16, 16.05, .1, 36, surface)
    const pose = createBiomeScenery(meshes, initial, { x: 0, z: 0 }, () => 0)
    const observations = document.getElementById('biome-observations')
    return ({ time }, settings) => {
      if (settings.hour !== recipe.hour || settings.rain !== recipe.rain) {
        recipe.hour = Number(settings.hour)
        recipe.rain = Number(settings.rain)
        biome = createBiome(recipe)
      }
      const state = biome.seek(time)
      const frame = biomeFrame(state)
      pose(frame, time)
      const stock = frame.clover.reduce((sum, amount) => sum + amount, 0)
      const count = (mode: string) => state.hares.filter(a => a.behavior === mode).length
      const available = frame.clover.length ? Math.round(100 * stock / frame.clover.length) + '%' : 'none'
      const chasing = state.foxes.filter(f => f.behavior === 'chasing').length
      const plural = (n: number, word: string) => n + ' ' + word + (n === 1 ? '' : 's')
      const lines = [
        `Clover remaining ${available} · ${count('grazing')} grazing`,
        `${chasing} ${chasing === 1 ? 'fox' : 'foxes'} chasing · ${count('sheltering')} sheltered`,
        `${plural(state.escapes, 'escape')} into cover · ${plural(state.encounters, 'close encounter')}`,
      ].join('\n')
      if (observations && observations.textContent !== lines) observations.textContent = lines
    }
  },
}
