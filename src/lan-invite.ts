export function bindLanInvite(dialog: HTMLDialogElement) {
  const address = dialog.querySelector<HTMLInputElement>('#lan-address')!
  const networks = dialog.querySelector<HTMLSelectElement>('#lan-networks')!
  const copy = dialog.querySelector<HTMLButtonElement>('#copy-lan')!
  const status = dialog.querySelector<HTMLElement>('#lan-status')!
  networks.addEventListener('change', () => {
    address.value = networks.value
    address.hidden = true
    status.textContent = ''
  })

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address.value)
    }
    catch {
      // Browsers on plain HTTP LAN addresses may only allow selection-based copying.
      address.hidden = false
      address.focus()
      address.select()
      status.textContent = 'Copy the selected address and send it to your crewmate.'
      try {
        if (!document.execCommand('copy')) return
      }
      catch { return }
      address.hidden = !networks.hidden
      copy.focus()
    }
    status.textContent = 'LAN link copied.'
  }
  copy.addEventListener('click', () => void copyAddress())

  return async function refreshLanInvite() {
    copy.disabled = true
    status.textContent = 'Finding the LAN address…'
    try {
      const response = await fetch('/api/lan-invite', { cache: 'no-store' })
      if (!response.ok) throw new Error('Host unavailable')
      const result: unknown = await response.json()
      const links = Array.isArray(result) ? result.filter((link): link is string => typeof link === 'string') : []
      networks.replaceChildren(...links.map((link) => new Option(link, link)))
      networks.hidden = links.length < 2
      const selected = links.find((link) => new URL(link).origin === location.origin) ?? links[0]
      networks.value = address.value = selected ?? ''
      address.hidden = !networks.hidden || !selected
      copy.disabled = !selected
      status.textContent = selected ? '' : 'This host has no LAN address. Check its Wi-Fi connection and LAN binding.'
    }
    catch {
      address.hidden = networks.hidden = true
      status.textContent = 'Could not reach the host. Reopen Options to try again.'
    }
  }
}
