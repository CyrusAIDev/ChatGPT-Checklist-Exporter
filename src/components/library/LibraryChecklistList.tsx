import type { ChecklistRecord } from '../../types/checklist'
import { LibraryChecklistCard } from './LibraryChecklistCard'

type Props = {
  records: ChecklistRecord[]
  search: string
  onSearchChange: (value: string) => void
  onOpenDetail: (conversationId: string) => void
  onOpenChatUrl: (url: string) => void
}

export function LibraryChecklistList({
  records,
  search,
  onSearchChange,
  onOpenDetail,
  onOpenChatUrl,
}: Props) {
  return (
    <div className="library-panel">
      <label className="library-search-label">
        <span className="library-search-sr">Search saved checklists</span>
        <input
          type="search"
          className="library-search-input"
          placeholder="Search by title or task text…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          autoComplete="off"
        />
      </label>

      {records.length === 0 ? (
        <div className="library-empty">
          <p className="library-empty-title">No checklists match</p>
          <p className="library-empty-body">
            {search.trim()
              ? 'Try a different search, or clear the field to see everything.'
              : 'Open ChatGPT, save a thread, and capture from the latest reply to build your first checklist. Saved checklists show up here across conversations.'}
          </p>
        </div>
      ) : (
        <ul className="library-list" role="list">
          {records.map((r) => (
            <li key={r.conversationId}>
              <LibraryChecklistCard
                record={r}
                onOpen={() => onOpenDetail(r.conversationId)}
                onOpenChat={() => onOpenChatUrl(r.sourceChatUrl)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
