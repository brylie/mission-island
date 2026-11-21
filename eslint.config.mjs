import { builtinModules } from 'node:module'
import js from '@eslint/js'
import { fixupPluginRules } from '@eslint/compat'
import { defineConfig } from 'eslint/config'
import security from 'eslint-plugin-security'
import tseslint from 'typescript-eslint'

const plugins = { security: fixupPluginRules(security) }

const secureRules = {
  'no-eval': 'error',
  'no-implied-eval': 'error',
  'no-new-func': 'error',
  'security/detect-child-process': 'error',
  'security/detect-eval-with-expression': 'error',
  'security/detect-new-buffer': 'error',
  'security/detect-non-literal-require': 'error',
  'security/detect-unsafe-regex': 'error',
}

const lineLimit = (max) => ['error', { max, skipBlankLines: true, skipComments: true }]
const complexity = (max) => ['error', max]

// Existing files use their current ceilings until the responsible feature is split out.
const existingLimits = {
  'src/biome-model.ts': { 'max-lines-per-function': lineLimit(174) },
  'src/island-camera.ts': { 'max-lines-per-function': lineLimit(169) },
  'src/main.ts': { 'max-lines': lineLimit(729), complexity: complexity(38) },
  'src/scene.ts': { 'max-lines': lineLimit(361), 'max-lines-per-function': lineLimit(315), complexity: complexity(43) },
  'src/second-island/exteriors.ts': { complexity: complexity(40) },
  'src/second-island/main.ts': { 'max-lines': lineLimit(424), 'max-lines-per-function': lineLimit(391), complexity: complexity(25) },
  'src/second-island/scenery.ts': { 'max-lines': lineLimit(401), complexity: complexity(30) },
  'src/second-island/terrain.ts': { complexity: complexity(33) },
  'src/second-island/vehicles.ts': { complexity: complexity(41) },
  'src/surface-textures.ts': { complexity: complexity(28) },
  'src/workbench/landscape-layout.ts': { 'max-lines-per-function': lineLimit(182) },
  'src/workbench/landscape-map.ts': { 'max-lines': lineLimit(440), 'max-lines-per-function': lineLimit(371) },
  'src/workbench/landscape-studies.ts': { 'max-lines-per-function': lineLimit(203) },
  'src/workbench/main.ts': { 'max-lines': lineLimit(669) },
  'src/workbench/stage.ts': { 'max-lines-per-function': lineLimit(180), complexity: complexity(40) },
}

const platformImports = {
  regex: '^(node:|ws(?:/|$)|vite(?:/|$))|^(?:' + builtinModules.join('|') + ')$',
  message: 'Keep Node, Vite, and WebSocket imports inside host adapters.',
}

const browserImports = [
  platformImports,
  { regex: '(^|/)server/', message: 'Use browser-safe code from src/simulation for shared gameplay and physics.' },
]

const presentationImports = {
  regex: '^@babylonjs/|(^|/)(assets|workbench|second-island)/|(^|/)(main|scene|island-world|island-meshes|browser-storage|[^/]+-ui)([.]ts)?$',
  message: 'Depend on shared rules and world data from simulation code.',
}

export default defineConfig(
  { ignores: ['dist/**', 'coverage/**'] },
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: { parserOptions: { projectService: true } },
    plugins,
    rules: {
      ...secureRules,
      'max-lines': lineLimit(350),
      'max-lines-per-function': lineLimit(140),
      complexity: complexity(24),
      'max-depth': ['error', 5],
      'no-constant-binary-expression': 'error',
    },
  },
  {
    files: ['**/*.mjs'],
    extends: [js.configs.recommended],
    plugins,
    rules: secureRules,
  },
  {
    files: ['test/**/*.mjs'],
    rules: { 'max-lines': lineLimit(350) },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: browserImports }],
    },
  },
  {
    files: ['src/simulation/**/*.ts', 'src/worlds/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [...browserImports, presentationImports] }],
    },
  },
  {
    files: ['server/**/*.ts'],
    ignores: ['server/multiplayer.ts', 'server/socket-sessions.ts', 'server/save.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        platformImports,
        presentationImports,
        { regex: '(^|/)(multiplayer|socket-sessions)([.]ts)?$', message: 'Keep host transport outside the simulation.' },
        { regex: '(^|/)(commands|save)([.]ts)?$', allowTypeImports: true, message: 'Use contract types at the boundary and keep decoding or persistence in the adapters.' },
      ] }],
    },
  },
  ...Object.entries(existingLimits).map(([file, rules]) => ({ files: [file], rules })),
)
