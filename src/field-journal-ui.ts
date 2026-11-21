import { fieldLeads, fieldSubject, fieldSubjects, rainLead, recordLabel, type FieldJournal, type FieldRecord } from './field-journal'
import { shellglassTideAt } from './shellglass-tide'
import { isNight, weatherAt } from './weather'

function observationContext({ id, seen }: FieldRecord) {
  if (!seen) return 'Earlier discovery'
  const { hour } = weatherAt(seen.time)
  const clock = [Math.floor(hour), Math.floor((hour % 1) * 60)].map(value => String(value).padStart(2, '0')).join(':')
  const conditions = seen.rain >= .65 ? 'Heavy rain' : seen.rain > .05 ? 'Rain' : isNight(hour) ? 'Night' : 'Dry daylight'
  return [clock, conditions, ...(id === 'place:shellglass' ? [shellglassTideAt(seen.time).phase] : [])].join(' · ')
}

export function createFieldJournalUI(dialog: HTMLDialogElement) {
  const progress = dialog.querySelector<HTMLElement>('#journal-progress')!
  const clues = dialog.querySelector<HTMLElement>('#journal-clues')!
  const empty = dialog.querySelector<HTMLElement>('#journal-empty')!
  const records = dialog.querySelector<HTMLElement>('#journal-records')!
  let displayed = ''

  function update(journal: FieldJournal) {
    if (!dialog.open) return
    const key = JSON.stringify(journal)
    if (key === displayed) return
    displayed = key
    const outing = journal.records.filter(entry => fieldSubject(entry.id))
    progress.textContent = `${journal.records.length} observation XP · ${outing.length} / ${Object.keys(fieldSubjects).length} outing records`
    const leads: readonly string[] = journal.heardMara
      ? [...fieldLeads, ...(outing.some(record => record.seen) ? [rainLead] : [])]
      : ['Find Mara at the small fishing dock during the day, or on her porch by the depot trail in the evening.']
    clues.replaceChildren(...leads.map(line => {
      const item = document.createElement('li')
      item.textContent = line
      return item
    }))
    empty.hidden = journal.records.length > 0
    records.replaceChildren(...journal.records.map(record => {
      const item = document.createElement('li')
      const title = document.createElement('strong')
      const context = document.createElement('small')
      title.textContent = recordLabel(record.id)
      const subject = fieldSubject(record.id) ? fieldSubjects[record.id] : undefined
      context.textContent = subject && subject.place !== subject.name
        ? `${subject.place} · ${observationContext(record)}` : observationContext(record)
      item.append(title, context, subject?.detail ?? '')
      return item
    }))
  }

  return { update }
}
