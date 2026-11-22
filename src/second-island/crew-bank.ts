const requestTimeoutMs = 5000
const refreshIntervalMs = 3000

export function displayCrewBank(bank: HTMLElement) {
  async function refreshBank() {
    try {
      const response = await fetch('/api/crew-bank', { signal: AbortSignal.timeout(requestTimeoutMs) })
      if (!response.ok) throw new Error('Bank unavailable')
      const data: unknown = await response.json()
      if (!data || typeof data !== 'object' || !('crewCoins' in data) || typeof data.crewCoins !== 'number') {
        throw new Error('Invalid crew bank balance')
      }
      const { crewCoins } = data
      bank.textContent = `Crew bank · ${crewCoins} ${crewCoins === 1 ? 'coin' : 'coins'}`
    }
    catch {
      bank.textContent = 'Crew bank · Reconnecting…'
    }
    window.setTimeout(() => void refreshBank(), refreshIntervalMs)
  }
  void refreshBank()
}
