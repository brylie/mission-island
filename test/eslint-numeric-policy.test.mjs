import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ESLint } from 'eslint'

const eslint = new ESLint()

test('numeric lint checks new runtime, model, and Workbench files by default', async () => {
  for (const file of [
    'src/assets/new-model.ts',
    'src/assets/geometry/nested/new-model.ts',
    'src/workbench/new-study.ts',
    'src/worlds/saltwind/layout/new-logic.ts',
    'src/worlds/starter/layout/new-logic.ts',
    'server/new-service.ts',
  ]) {
    const config = await eslint.calculateConfigForFile(file)
    assert.equal(config.rules['no-magic-numbers'][0], 2, file)
    assert.equal(config.linterOptions.noInlineConfig, true, file)
  }

  const [result] = await eslint.lintText('/* eslint-disable no-magic-numbers */\nexport const model = { radius: 2.5 }\n', {
    filePath: 'src/assets/fishing.ts',
  })
  assert.ok(result.messages.some(({ ruleId }) => ruleId === 'no-magic-numbers'))
})

test('authored numeric data and test cases have explicit exceptions', async () => {
  for (const file of [
    'src/assets/geometry/new-model.ts',
    'src/assets/audio/new-profile.ts',
    'src/assets/effects/new-look.ts',
    'src/assets/recipes/new-recipe.ts',
    'src/worlds/saltwind/layout/brinewick-waterfront.ts',
    'src/worlds/saltwind/layout/routes.ts',
    'src/worlds/saltwind/layout/scenery.ts',
    'src/worlds/saltwind/layout/sites.ts',
    'src/worlds/saltwind/layout/terrain.ts',
    'src/worlds/starter/layout/places.ts',
    'src/worlds/starter/layout/routes.ts',
    'src/worlds/starter/layout/scenery.ts',
    'src/worlds/starter/layout/sites.ts',
    'src/worlds/starter/layout/terrain.ts',
    'src/worlds/starter/layout/wildlife.ts',
    'test/new-case.test.mjs',
  ]) {
    const config = await eslint.calculateConfigForFile(file)
    assert.equal(config.rules['no-magic-numbers']?.[0] ?? 0, 0, file)
  }
})

test('authored data allows numeric tuples and rejects execution and runtime imports', async () => {
  const geometry = 'src/assets/geometry/site-props.ts'
  const authored = await eslint.lintText('export const footprint = [2.5, -3, 0.3] as const\n', { filePath: geometry })
  assert.deepEqual(authored[0].messages, [])

  const operations = await eslint.lintText('export const points = () => [2.5, 4]\n', { filePath: geometry })
  assert.ok(operations[0].messages.some(({ ruleId }) => ruleId === 'no-restricted-syntax'))

  for (const island of ['starter', 'saltwind']) {
    const layout = await eslint.lintText('import { groundHeight } from \'../../../terrain.ts\'\nexport const elevation = groundHeight(2, 4)\n', {
      filePath: `src/worlds/${island}/layout/terrain.ts`,
    })
    assert.ok(layout[0].messages.some(({ ruleId }) => ruleId === 'no-restricted-imports'))
    assert.ok(layout[0].messages.some(({ ruleId }) => ruleId === 'no-restricted-syntax'))
  }

  const imports = await eslint.lintText('import { groundHeight } from \'../../terrain.ts\'\nexport const height = groundHeight({ x: 20, z: 30 })\n', {
    filePath: 'src/assets/recipes/island-lighting.ts',
  })
  assert.ok(imports[0].messages.some(({ ruleId }) => ruleId === 'no-restricted-imports'))
})
