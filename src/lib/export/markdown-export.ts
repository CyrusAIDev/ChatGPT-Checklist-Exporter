import type { ChecklistRecord } from '../../types/checklist'
import { libraryDisplayTitle } from '../library/library-query'

/**
 * Generates a Markdown string from a checklist record.
 * Archived items are excluded. Items are rendered in order.
 *
 * Format:
 *   # Title
 *   > Exported from Living Checklist · Date
 *
 *   - [x] Completed item
 *   - [ ] Incomplete item
 */
export function generateMarkdownExport(record: ChecklistRecord): string {
  const title = libraryDisplayTitle(record)
  const date = new Date(record.updatedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const activeItems = record.items
    .filter((i) => !i.archived)
    .sort((a, b) => a.order - b.order)

  const itemLines = activeItems.map((i) => {
    const check = i.checked ? 'x' : ' '
    // Use only the first line of multi-line items for the checklist marker
    const firstLine = i.text.split('\n')[0].trim()
    return `- [${check}] ${firstLine}`
  })

  const lines: string[] = [
    `# ${title}`,
    `> Exported from Living Checklist · ${date}`,
    '',
    ...itemLines,
  ]

  return lines.join('\n')
}
