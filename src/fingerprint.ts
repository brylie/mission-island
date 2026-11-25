// FNV-1a, 32 bits: a short, stable fingerprint of some text, not a security hash.
const fnvOffset = 0x811c9dc5, fnvPrime = 0x01000193, hexBase = 16

export function fingerprint(text: string) {
  let hash = fnvOffset
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), fnvPrime)
  return (hash >>> 0).toString(hexBase)
}
