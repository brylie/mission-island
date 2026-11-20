import process from 'node:process'
import { URL } from 'node:url'
import { parseArgs } from 'node:util'
import { fitCrop, readCrop } from '../src/workbench/reference-crop.ts'
import { readReference, withReference } from '../src/workbench/reference-link.ts'

const usage = 'Usage: npm run --silent workbench:reference -- WORKBENCH_URL IMAGE_URL [--crop zoom,x,y] [--description "Detail to compare"]'
try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { crop: { type: 'string' }, description: { type: 'string' }, help: { type: 'boolean' } },
  })
  if (values.help) {
    process.stdout.write(usage + '\n')
  } else {
    if (positionals.length !== 2) throw new Error(usage)
    const base = new URL(positionals[0])
    if (!/^https?:$/.test(base.protocol) || !base.hash.slice(1).split('?')[0]) throw new Error('Use a Workbench URL with a subject such as #clover.')
    const ref = readReference(positionals[1])
    if (!ref) throw new Error('Use a direct HTTP(S) image URL or Wikimedia Commons File page.')
    const crop = readCrop(values.crop)
    if (values.crop !== undefined && crop === fitCrop) throw new Error('Crop needs zoom above 1 through 8 and x,y between 0 and 1. Omit --crop to fit.')
    process.stdout.write(withReference(base.href, ref.source, crop, values.description) + '\n')
  }
} catch (error) {
  process.stderr.write(error.message + '\n')
  process.exitCode = 1
}
