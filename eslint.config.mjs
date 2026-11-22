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

const defaultModuleLineLimit = 350
const defaultFunctionLineLimit = 140
const defaultComplexityLimit = 24
const defaultNestingDepthLimit = 5
const inlineInteractionItemLimit = 4

const noMagicNumbers = {
  detectObjects: true,
  ignore: [-1, 0, 1],
  ignoreArrayIndexes: true,
  ignoreEnums: true,
  ignoreNumericLiteralTypes: true,
  ignoreTypeIndexes: true,
  enforceConst: true,
}

const authoredWorldLayouts = [
  'src/worlds/saltwind/layout/brinewick-waterfront.ts',
  'src/worlds/saltwind/layout/quarry.ts',
  'src/worlds/saltwind/layout/routes.ts',
  'src/worlds/saltwind/layout/scenery.ts',
  'src/worlds/saltwind/layout/signs.ts',
  'src/worlds/saltwind/layout/sites.ts',
  'src/worlds/saltwind/layout/terrain.ts',
  'src/worlds/starter/layout/island-generation.ts',
  'src/worlds/starter/layout/fire-sites.ts',
  'src/worlds/starter/layout/places.ts',
  'src/worlds/starter/layout/routes.ts',
  'src/worlds/starter/layout/scenery.ts',
  'src/worlds/starter/layout/sites.ts',
  'src/worlds/starter/layout/terrain.ts',
  'src/worlds/starter/layout/wildlife.ts',
]

const independentAuthoredData = ['src/assets/{audio,effects,geometry}/*.ts', ...authoredWorldLayouts]
const authoredRecipes = ['src/assets/recipes/*.ts']
const authoredData = [...independentAuthoredData, ...authoredRecipes]

const executableDataSyntax = [
  'Program > :not(ImportDeclaration, ExportNamedDeclaration, VariableDeclaration, TSInterfaceDeclaration, TSTypeAliasDeclaration)',
  'ExportNamedDeclaration > :not(VariableDeclaration, TSInterfaceDeclaration, TSTypeAliasDeclaration)',
  'VariableDeclaration[kind!="const"]',
  'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression, ClassDeclaration, ClassExpression',
  'CallExpression, NewExpression, ImportExpression, TaggedTemplateExpression, AwaitExpression',
  'AssignmentExpression, UpdateExpression, UnaryExpression[operator="delete"]',
].join(', ')

// Preserve exact ceilings for existing hotspots until the responsible feature is split out.
const crewBuilderFunctionLineLimit = 165
const biomeModelFunctionLineLimit = 199
const islandCameraFunctionLineLimit = 169
const starterEntryModuleLineLimit = 602
const starterEntryComplexityLimit = 38
const starterSceneFunctionLineLimit = 248
const saltwindEntryModuleLineLimit = 446
const saltwindEntryFunctionLineLimit = 412
const saltwindEntryComplexityLimit = 25
const oreHaulingFunctionLineLimit = 162
const landscapeLayoutFunctionLineLimit = 193
const landscapeMapFunctionLineLimit = 271
const landscapeStudiesFunctionLineLimit = 207
const workbenchEntryModuleLineLimit = 589
const workbenchReferenceFunctionLineLimit = 142
const workbenchStageFunctionLineLimit = 180
const workbenchStageComplexityLimit = 40

const existingLimits = {
  'src/assets/crew.ts': { 'max-lines-per-function': lineLimit(crewBuilderFunctionLineLimit) },
  'src/biome-model.ts': { 'max-lines-per-function': lineLimit(biomeModelFunctionLineLimit) },
  'src/island-camera.ts': { 'max-lines-per-function': lineLimit(islandCameraFunctionLineLimit) },
  'src/main.ts': {
    'max-lines': lineLimit(starterEntryModuleLineLimit),
    'complexity': complexity(starterEntryComplexityLimit),
  },
  'src/scene.ts': {
    'max-lines-per-function': lineLimit(starterSceneFunctionLineLimit),
  },
  'src/second-island/main.ts': {
    'max-lines': lineLimit(saltwindEntryModuleLineLimit),
    'max-lines-per-function': lineLimit(saltwindEntryFunctionLineLimit),
    'complexity': complexity(saltwindEntryComplexityLimit),
  },
  'src/second-island/ore-hauling.ts': { 'max-lines-per-function': lineLimit(oreHaulingFunctionLineLimit) },
  'src/workbench/landscape-layout.ts': { 'max-lines-per-function': lineLimit(landscapeLayoutFunctionLineLimit) },
  'src/workbench/landscape-map.ts': {
    'max-lines-per-function': lineLimit(landscapeMapFunctionLineLimit),
  },
  'src/workbench/landscape-studies.ts': { 'max-lines-per-function': lineLimit(landscapeStudiesFunctionLineLimit) },
  'src/workbench/main.ts': { 'max-lines': lineLimit(workbenchEntryModuleLineLimit) },
  'src/workbench/reference-pane.ts': { 'max-lines-per-function': lineLimit(workbenchReferenceFunctionLineLimit) },
  'src/workbench/stage.ts': {
    'max-lines-per-function': lineLimit(workbenchStageFunctionLineLimit),
    'complexity': complexity(workbenchStageComplexityLimit),
  },
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
    linterOptions: { noInlineConfig: true },
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
      'max-lines': lineLimit(defaultModuleLineLimit),
      'max-lines-per-function': lineLimit(defaultFunctionLineLimit),
      'complexity': complexity(defaultComplexityLimit),
      'max-depth': ['error', defaultNestingDepthLimit],
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
    rules: { 'max-lines': lineLimit(defaultModuleLineLimit) },
  },
  {
    files: ['**/*.{cjs,js,mjs,ts}'],
    ignores: ['test/**', ...authoredData],
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
    files: authoredData,
    rules: {
      'no-restricted-syntax': ['error', {
        selector: executableDataSyntax,
        message: 'Keep authored geometry, recipes, effects, audio, and world layouts to constant data and types.',
      }],
    },
  },
  {
    files: independentAuthoredData,
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ regex: '.', message: 'Keep this authored data independent of module dependencies.' }] }],
    },
  },
  {
    files: authoredRecipes,
    rules: {
      'no-restricted-imports': ['error', { patterns: [{
        regex: '^(?![.]/[a-z0-9-]+[.]ts$)',
        allowTypeImports: true,
        message: 'Import recipe values only from another authored recipe file in this folder.',
      }] }],
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
          'ArrayExpression': { singleLine: { maxItems: inlineInteractionItemLimit }, multiLine: { minItems: 1 } },
          'ObjectExpression': { singleLine: { spacing: 'always', maxItems: inlineInteractionItemLimit }, multiLine: { minItems: 1 } },
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
