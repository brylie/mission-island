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

export default defineConfig(
  { ignores: ['dist/**', 'coverage/**'] },
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: { parserOptions: { projectService: true } },
    plugins,
    rules: {
      ...secureRules,
      'complexity': ['error', 45],
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
)
