import { encodeCrop, fitCrop } from './reference-crop.ts'

export function readReference(raw: string) {
  try {
    const url = new URL(raw)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return
    if (url.hostname === 'commons.wikimedia.org') {
      const path = decodeURIComponent(url.pathname)
      const title = path.startsWith('/wiki/') ? path.slice(6) : url.searchParams.get('title')
      if (!title?.startsWith('File:') || !title.slice(5).trim()) return
      const filename = encodeURIComponent(title.slice(5).replaceAll(' ', '_'))
      const source = 'https://commons.wikimedia.org/wiki/File:' + filename
      return { source, image: 'https://commons.wikimedia.org/wiki/Special:FilePath/' + filename + '?width=960', commons: true }
    }
    return { source: url.href, image: url.href, commons: false }
  }
  catch {
    return
  }
}

export function referenceDescription(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 300) : ''
}

export function withReference(link: string, reference: string | null, crop = fitCrop, description = '') {
  const url = new URL(link)
  const [id, query] = url.hash.slice(1).split(/\?(.*)/s)
  const params = new URLSearchParams(query)
  if (reference) params.set('ref', reference)
  else params.delete('ref')
  const alt = referenceDescription(description)
  if (reference && alt) params.set('refAlt', alt)
  else params.delete('refAlt')
  const encoded = reference && encodeCrop(crop)
  if (encoded) params.set('crop', encoded)
  else params.delete('crop')
  url.hash = id + (params.size ? '?' + params.toString() : '')
  return url.href
}
