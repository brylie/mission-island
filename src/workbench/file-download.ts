const objectUrlLifetimeMs = 1000
const jsonIndentSpaces = 2

export function downloadJsonFile(name: string, contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), objectUrlLifetimeMs)
}

export function exportDraftJson(name: string, value: unknown) {
  downloadJsonFile(name, JSON.stringify(value, null, jsonIndentSpaces) + '\n')
}
