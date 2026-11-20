import { surfaceFamilies } from '../surface-recipes.ts'

// Groups describe the subject. Workspaces describe the work being done.
export const workspaces = {
  World: ['Island', 'Routes'],
  Ecology: ['Habitats', 'Animals', 'Plants'],
  Construction: ['Starter buildings', 'Saltwind buildings', 'Props', 'Site furnishings'],
  Surfaces: ['Materials', ...surfaceFamilies],
  Effects: ['Effects'],
  Characters: ['Wardrobe', 'NPC interactions'],
  Vehicles: ['Starter vehicles', 'Saltwind vehicles'],
  Mechanics: ['Farming', 'Fishing', 'Physics'],
} as const

export type Workspace = keyof typeof workspaces
export type SubjectGroup = typeof workspaces[Workspace][number]
interface Subject { name: string; group: SubjectGroup; description: string }

export function workspaceOf(group: SubjectGroup): Workspace {
  for (const [name, groups] of Object.entries(workspaces)) {
    if (groups.some(item => item === group)) return name as Workspace
  }
  throw new Error(`Unknown library group: ${group}`)
}

export function libraryResults<T extends Subject>(entries: T[], workspace: Workspace, query: string): T[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return entries.filter(entry => {
    const section = workspaceOf(entry.group)
    if (!words.length) return section === workspace
    const text = [section, entry.group, entry.name, entry.description].join(' ').toLowerCase()
    return words.every(word => text.includes(word))
  })
}
