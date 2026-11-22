import assert from 'node:assert/strict'
import test from 'node:test'
import { URL, URLSearchParams } from 'node:url'
import { fitCrop, moveCrop, photoFrame, readCrop } from '../src/workbench/reference-crop.ts'
import { readReference, withReference } from '../src/workbench/reference-link.ts'

test('Commons description pages resolve to a preview with a credit and license source', () => {
  const source = 'https://commons.wikimedia.org/wiki/File:White_clover.jpg'
  const expected = { source, image: 'https://commons.wikimedia.org/wiki/Special:FilePath/White_clover.jpg?width=960', commons: true }
  for (const url of [source, source.replace('File:', 'File%3A'), 'https://commons.wikimedia.org/w/index.php?title=File:White%20clover.jpg']) {
    assert.deepEqual(readReference(url), expected)
  }
})

test('direct images preserve query strings and only load HTTP(S) addresses without credentials', () => {
  const image = 'https://images.example.org/clover.png?w=600&view=leaf'
  assert.deepEqual(readReference(image), { source: image, image, commons: false })
  for (const invalid of ['javascript:alert(1)', 'data:image/png,foo', 'file:///tmp/a.png', 'https://name:pass@example.org/a', '/image', 'https://commons.wikimedia.org/wiki/Category:Clover']) {
    assert.equal(readReference(invalid), undefined)
  }
})

test('add and remove a reference without losing a subject setup, field stage or recipe', () => {
  const photo = 'https://images.example.org/clover.png?size=400&view=leaf'
  for (const base of ['https://island.test/workbench.html#clover?stage=island&setup=%7B%7D', 'https://island.test/workbench.html?recipe=1#biome']) {
    const link = withReference(base, photo)
    assert.equal(new URLSearchParams(new URL(link).hash.split('?')[1]).get('ref'), photo)
    assert.equal(withReference(link, null), base)
  }
})

test('a shared crop survives a setup link round trip and clears on fit or removal', () => {
  const base = 'https://island.test/workbench.html#clover?stage=island'
  const photo = 'https://images.example.org/clover.jpg'
  const crop = { zoom: 3, x: 0.35, y: 0.62 }
  const link = withReference(base, photo, crop)
  const params = new URLSearchParams(new URL(link).hash.split('?')[1])
  assert.deepEqual(readCrop(params.get('crop')), crop)
  assert.equal(withReference(link, photo, fitCrop), withReference(base, photo))
  assert.equal(withReference(link, null, crop), base)
  for (const raw of [null, '8,.9', '0,0,0', 'NaN,.5,.5', '5,.1,Infinity', '3,,0', '25,1,1']) {
    assert.deepEqual(readCrop(raw), fitCrop)
  }
})

test('wheel and pinch retain the image pixel under the pointer while panning stops at image edges', () => {
  const size = { width: 360, height: 240, aspect: 1 }
  const start = { x: 190, y: 100 }, end = { x: 220, y: 115 }
  const before = photoFrame(size, fitCrop)
  assert.deepEqual(before, { width: 240, height: 240, left: 60, top: 0 })
  const zoomed = moveCrop(size, fitCrop, 3, start, end)
  const after = photoFrame(size, zoomed)
  assert.ok(Math.abs((start.x - before.left) / before.width - (end.x - after.left) / after.width) < 1e-9)
  assert.ok(Math.abs((start.y - before.top) / before.height - (end.y - after.top) / after.height) < 1e-9)
  const edge = moveCrop(size, zoomed, 3, end, { x: 10000, y: -10000 })
  const frame = photoFrame(size, edge)
  assert.equal(frame.left, 0)
  assert.equal(frame.top + frame.height, size.height)
  assert.deepEqual(moveCrop(size, edge, 0.5, end, start), fitCrop)
})

test('descriptions round trip as plain text and are removed with the reference', () => {
  const base = 'https://island.test/workbench.html#clover?stage=island'
  const image = 'https://images.example.org/clover.jpg'
  const description = 'Pale flowers & three <leaflets> #clover'
  const link = withReference(base, image, fitCrop, '  ' + description + '  ')
  const getAlt = (href) => new URLSearchParams(new URL(href).hash.split('?')[1]).get('refAlt')
  assert.equal(getAlt(link), description)
  assert.equal(getAlt(withReference(link, image, fitCrop, 'a'.repeat(500))).length, 300)
  assert.equal(getAlt(withReference(link, image)), null)
  assert.equal(withReference(link, null), base)
})
