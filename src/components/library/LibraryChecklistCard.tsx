import type { ChecklistRecord } from '../../types/checklist'
import {
  checklistProgressCounts,
  libraryDisplayTitle,
} from '../../lib/library/library-query'

type Props = {
  record: ChecklistRecord
  onOpen: () => void
  onOpenChat: () => void
}

function formatUpdated(ts: number): string {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function LibraryChecklistCard({ record, onOpen, onOpenChat }: Props) {
  const { activeTotal, activeCompleted, archivedTotal } = checklistProgressCounts(record)
  const title = libraryDisplayTitle(record)
  return (
    <article className="library-card">
      <button type="button" className="library-card-main" onClick={onOpen}>
        <h2 className="library-card-title">{title}</h2>
        <p className="library-card-meta">
          {activeCompleted}/{activeTotal} done
          {archivedTotal > 0 ? ` · ${archivedTotal} archived` : ''} · {activeTotal} active items
        </p>
        <p className="library-card-updated">Updated {formatUpdated(record.updatedAt)}</p>
      </button>
      <div className="library-card-actions">
        <button type="button" className="btn-secondary library-card-link" onClick={onOpenChat}>
          Open original chat
        </button>
      </div>
    </article>
  )
}
