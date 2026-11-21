import { cleanCrewName } from './crew-appearance'

// The first-join prompt for a game name. Skipping it is remembered per crew token.
export function openJoinName(dialog: HTMLDialogElement, input: HTMLInputElement, placeholder: string) {
  input.value = ''
  input.setCustomValidity('')
  input.placeholder = placeholder
  dialog.showModal()
}

export function bindJoinName(dialog: HTMLDialogElement, input: HTMLInputElement, submit: (name: string) => void, skip: () => void) {
  input.addEventListener('input', () => input.setCustomValidity(''))
  const part = (selector: string) => {
    const found = dialog.querySelector(selector)
    if (!found) throw new Error(`Missing ${selector} in the join-name dialog`)
    return found
  }
  part('#join-name-form').addEventListener('submit', (event) => {
    const name = cleanCrewName(input.value)
    if (!name) {
      event.preventDefault()
      input.setCustomValidity('Enter a game name or choose Skip for now.')
      input.reportValidity()
      return
    }
    submit(name)
  })
  dialog.addEventListener('cancel', skip)
  part('#skip-join-name').addEventListener('click', () => {
    skip()
    dialog.close()
  })
}
