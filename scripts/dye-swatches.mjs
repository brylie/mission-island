import { writeFileSync } from 'node:fs'
import process from 'node:process'
import { URL } from 'node:url'
import { dyeSwatchesSource } from '../src/dye-palette.ts'

const target = new URL('../src/assets/recipes/dye-swatches.ts', import.meta.url)
writeFileSync(target, dyeSwatchesSource())
process.stdout.write(`Wrote ${target.pathname}\n`)
