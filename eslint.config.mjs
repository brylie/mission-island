import { builtinModules } from 'node:module'
import js from '@eslint/js'
import { fixupPluginRules } from '@eslint/compat'
import stylistic from '@stylistic/eslint-plugin'
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

const correctnessRules = {
  'array-callback-return': ['error', { checkForEach: true, allowVoid: true }],
  'default-case-last': 'error',
  'eqeqeq': ['error', 'always', { null: 'ignore' }],
  'no-constructor-return': 'error',
  'no-duplicate-imports': ['error', { allowSeparateTypeImports: true }],
  'no-extend-native': 'error',
  'no-param-reassign': 'error',
  'no-promise-executor-return': 'error',
  'no-self-compare': 'error',
  'no-sequences': ['error', { allowInParentheses: false }],
  'no-template-curly-in-string': 'error',
  'no-unmodified-loop-condition': 'error',
  'no-unreachable-loop': 'error',
  'prefer-object-has-own': 'error',
  'prefer-regex-literals': 'error',
}

const lineLimit = (max) => ['error', { max, skipBlankLines: true, skipComments: true }]
const complexity = (max) => ['error', max]

const noMagicNumbers = {
  detectObjects: true,
  ignore: [-1, 0, 1],
  ignoreArrayIndexes: true,
  ignoreEnums: true,
  ignoreNumericLiteralTypes: true,
  ignoreTypeIndexes: true,
  enforceConst: true,
}

const authoredWorldLayouts = ['src/worlds/saltwind/layout/routes.ts']

// Preserve exact ceilings for existing hotspots until the responsible feature is split out.
const existingLimits = {
  'src/assets/crew-clothes.ts': { 'max-lines-per-function': lineLimit(161) },
  'src/assets/crew.ts': { 'max-lines-per-function': lineLimit(165) },
  'src/biome-model.ts': { 'max-lines-per-function': lineLimit(199) },
  'src/island-camera.ts': { 'max-lines-per-function': lineLimit(169) },
  'src/main.ts': { 'max-lines': lineLimit(731), 'complexity': complexity(38) },
  'src/assets/particle-shelf-recipes.ts': { 'max-lines': lineLimit(463) },
  'src/scene.ts': { 'max-lines': lineLimit(339), 'max-lines-per-function': lineLimit(295), 'complexity': complexity(43) },
  'src/second-island/exteriors.ts': { complexity: complexity(40) },
  'src/second-island/main.ts': { 'max-lines': lineLimit(446), 'max-lines-per-function': lineLimit(412), 'complexity': complexity(25) },
  'src/second-island/ore-hauling.ts': { 'max-lines-per-function': lineLimit(162) },
  'src/second-island/scenery.ts': { 'max-lines': lineLimit(401), 'complexity': complexity(30) },
  'src/second-island/terrain.ts': { complexity: complexity(33) },
  'src/second-island/vehicles.ts': { complexity: complexity(41) },
  'src/assets/surface-textures.ts': { complexity: complexity(28) },
  'src/workbench/landscape-layout.ts': { 'max-lines-per-function': lineLimit(193) },
  'src/workbench/landscape-map.ts': { 'max-lines': lineLimit(459), 'max-lines-per-function': lineLimit(379) },
  'src/workbench/landscape-studies.ts': { 'max-lines-per-function': lineLimit(207) },
  'src/workbench/main.ts': { 'max-lines': lineLimit(696) },
  'src/workbench/reference-pane.ts': { 'max-lines-per-function': lineLimit(142) },
  'src/workbench/stage.ts': { 'max-lines-per-function': lineLimit(180), 'complexity': complexity(40) },
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
  regex: '^@babylonjs/|(^|/)(workbench|second-island)/|(^|/)assets/(?!geometry/[a-z0-9-]+[.]ts$)|(^|/)(main|scene|island-world|island-meshes|browser-storage|[^/]+-ui)([.]ts)?$',
  message: 'Depend on shared rules, world data, and geometry definitions from simulation code.',
}

const sharedInteractionFiles = [
  'src/interaction-options.ts',
  'src/interactions/**/*.ts',
  'src/farm-orders.ts',
  'src/ferry-repair.ts',
  'src/field-interactions.ts',
  'src/gate-repair.ts',
  'src/gate-swell.ts',
  'src/journal/sightings.ts',
  'src/materials-interactions.ts',
  'src/residents/interactions.ts',
]

export default defineConfig(
  // .claude/ holds agent worktrees: full copies of the repo that git ignores but ESLint would walk.
  { ignores: ['dist/**', 'coverage/**', '.claude/**'] },
  {
    files: ['**/*.{cjs,js,mjs,ts}'],
    extends: [stylistic.configs.recommended],
    linterOptions: { reportUnusedDisableDirectives: 'error', reportUnusedInlineConfigs: 'error' },
    rules: {
      '@stylistic/arrow-parens': ['error', 'always'],
      '@stylistic/linebreak-style': ['error', 'unix'],
    },
  },
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: { parserOptions: { projectService: true } },
    plugins,
    rules: {
      ...secureRules,
      'max-lines': lineLimit(350),
      'max-lines-per-function': lineLimit(140),
      'complexity': complexity(24),
      'max-depth': ['error', 5],
      'no-constant-binary-expression': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-unnecessary-qualifier': 'error',
      '@typescript-eslint/no-unnecessary-template-expression': 'error',
      '@typescript-eslint/no-unnecessary-type-arguments': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
    },
  },
  {
    files: ['**/*.{cjs,js,mjs}'],
    extends: [js.configs.recommended],
    plugins,
    rules: secureRules,
  },
  {
    files: ['**/*.{cjs,js,mjs,ts}'],
    rules: correctnessRules,
  },
  {
    files: ['**/*.{cjs,js,mjs,ts}'],
    ignores: ['test/**'],
    rules: { 'no-script-url': 'error' },
  },
  {
    files: ['test/**/*.mjs'],
    rules: { 'max-lines': lineLimit(350) },
  },
  {
    files: ['**/*.{cjs,js,mjs,ts}'],
    ignores: ['src/assets/**', 'test/**', ...authoredWorldLayouts],
    rules: { 'no-magic-numbers': ['error', noMagicNumbers] },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: browserImports }],
    },
  },
  {
    files: ['src/simulation/**/*.ts', 'src/worlds/**/*.ts', ...sharedInteractionFiles],
    rules: {
      'no-restricted-imports': ['error', { patterns: [...browserImports, presentationImports] }],
    },
  },
  {
    files: ['src/assets/geometry/*.ts', ...authoredWorldLayouts],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ regex: '.', message: 'Geometry and world layout definitions have no module dependencies.' }] }],
      'no-restricted-syntax': ['error', {
        selector: 'CallExpression, NewExpression, ImportExpression',
        message: 'Keep geometry and world layout definitions to constants and types.',
      }],
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
  {
    files: ['src/interaction-options.ts', 'server/game-interactions.ts'],
    rules: {
      '@stylistic/list-style': ['error', {
        overrides: {
          '()': 'off',
          '[]': 'off',
          '{}': 'off',
          '<>': 'off',
          'ArrayExpression': { singleLine: { maxItems: 4 }, multiLine: { minItems: 1 } },
          'ObjectExpression': { singleLine: { spacing: 'always', maxItems: 4 }, multiLine: { minItems: 1 } },
        },
      }],
    },
  },
  {
    files: ['server/**/*.ts', 'src/{interactions,journal,residents,simulation}/**/*.ts'],
    rules: { '@typescript-eslint/switch-exhaustiveness-check': 'error' },
  },
  ...Object.entries(existingLimits).map(([file, rules]) => ({ files: [file], rules })),
)
