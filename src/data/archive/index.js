import catalog from './catalog.json'
import tasks from './tasks.json'
import previews from './preview.json'
import finalTickets14 from './fizteh-2025-26-11-1-4.json'
import finalTickets56 from './fizteh-2025-26-11-5-6.json'

export const organizerArchive = 'https://olymp-online.mipt.ru/page/primery-zadanij'
export const seasons = [...new Set(catalog.map(([, season]) => season))]
export const taskCount = catalog.reduce((total, row) => total + row[5], 0)

const pilotGroups = ['11-1-4', '11-5-6', '10-1-4', '10-5-6', '9-1-2', '9-3-4']
const finalContent = {
  '2025-26-zakl-11-var-1-4': finalTickets14,
  '2025-26-zakl-11-var-5-6': finalTickets56,
}

export const seasonPath = (season) => '/archive/fizteh/' + season.replace('/', '-')
export const variantPath = (variant) => '/archive/fizteh/' + variant.id

export function archiveVariant([slug, season, stage, grade, label, count]) {
  const suffix = slug.startsWith('2024-25-zakl-') ? slug.slice(13).replace('-var-', '-') : ''
  const offset = pilotGroups.indexOf(suffix)
  const finalTasks = finalContent[slug]
  const local = finalTasks
    ? finalTasks.map((content, index) => ({ ...previews[slug][index], ...content, id: slug + '-' + (index + 1) }))
    : offset === -1 ? [] : tasks.slice(offset * 5, offset * 5 + 5)
  const tickets = slug.match(/-var-(\d+(?:-\d+)?)$/)?.[1]
  return {
    id: offset === -1 ? slug : '2024-25-final-' + suffix,
    season, stage, grade, count,
    label: tickets ? (tickets.includes('-') ? 'Билеты ' : 'Билет ') + tickets.replace('-', '–') : label,
    tasks: local.map((task, i) => ({ ...task, number: i + 1 })),
    preview: previews[slug] ?? [],
    official: offset === -1 ? [] : [
      ...(grade === 11 ? [] : [['условия', 'tasks'], ['с решениями', 'sol']]),
      ['критерии', 'krit'],
    ].map(([title, type]) => [title, 'https://tasks.olimpiada.ru/upload/files/tasks/394/2024/394-' + type + '-phys-' + grade + '-final-24-25.pdf']),
  }
}

export const variants = catalog.map(archiveVariant)
