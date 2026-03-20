import type { ChecklistRecord } from '../../types/checklist'
import { ArchivedChecklistSection } from '../ArchivedChecklistSection'
import { ChecklistActiveList } from '../ChecklistActiveList'
import { ChecklistMetaStrip } from '../ChecklistMetaStrip'
import { libraryDisplayTitle } from '../../lib/library/library-query'
import { useState } from 'react'

type Props = {
  record: ChecklistRecord
  onBack: () => void
  onToggleItem: (itemId: string) => void
  onOpenChatInNewTab: (url: string) => void
}

export function LibraryChecklistDetail({
  record,
  onBack,
  onToggleItem,
  onOpenChatInNewTab,
}: Props) {
  const [archivedCollapsed, setArchivedCollapsed] = useState(true)
  const activeItems = record.items.filter((i) => !i.archived).sort((a, b) => a.order - b.order)
  const archivedItems = record.items.filter((i) => i.archived).sort((a, b) => a.order - b.order)
  const completedCount = activeItems.filter((i) => i.checked).length
  const totalCount = activeItems.length
  const title = libraryDisplayTitle(record)

  return (
    <div className="library-detail">
      <div className="library-detail-top">
        <button type="button" className="btn-secondary library-back" onClick={onBack}>
          ← Library
        </button>
        <div className="library-detail-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onOpenChatInNewTab(record.sourceChatUrl)}
          >
            Open original chat
          </button>
        </div>
      </div>
      <h2 className="library-detail-title">{title}</h2>
      <ChecklistMetaStrip completedCount={completedCount} totalCount={totalCount} mergeSummary={null} />
      <ChecklistActiveList items={activeItems} onToggle={onToggleItem} />
      <ArchivedChecklistSection
        items={archivedItems}
        collapsed={archivedCollapsed}
        onToggleCollapsed={() => setArchivedCollapsed(!archivedCollapsed)}
      />
      <p className="library-detail-hint">
        Merge and reset stay on Current chat when you’re in that saved thread.
      </p>
    </div>
  )
}
