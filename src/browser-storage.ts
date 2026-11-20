type StorageArea = 'localStorage' | 'sessionStorage'

export function readStorage(area: StorageArea, key: string) {
  try {
    return window[area].getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(area: StorageArea, key: string, value: string | null) {
  try {
    if (value === null) window[area].removeItem(key)
    else window[area].setItem(key, value)
  } catch {
    // Keep playing with the current page's preferences and crew token.
  }
}
