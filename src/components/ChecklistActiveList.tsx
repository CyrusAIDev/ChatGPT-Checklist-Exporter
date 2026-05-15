import type { ChecklistItem, ChecklistGroup, ChecklistSourceStructure } from '../types/checklist'
import { ChecklistGroupSection } from './ChecklistGroupSection'

type Props = {
  items: ChecklistItem[]
  groups?: ChecklistGroup[]
  onToggle: (itemId: string) => void
  onToggleGroup?: (groupId: string) => void
  sourceStructure?: ChecklistSourceStructure
  editingItemId: string | null
  onStartEdit: (id: string) => void
  onCommitEdit: (id: string, text: string) => void
  onCancelEdit: () => void
  onAddItem: (groupId: string) => void
}

function OrderedItemBody({ text, checked }: { text: string; checked: boolean }) {
  const parts = text.split(/\n\n/)
  if (parts.length >= 2 && parts[0].trim().length > 0 && parts[0].length <= 220) {
    const rest = parts.slice(1).join('\n\n').trim()
    if (!rest) {
      return <span className={`item-text ${checked ? 'item-checked' : ''}`}>{text}</span>
    }
    return (
      <span className={`item-text item-text--stacked ${checked ? 'item-checked' : ''}`}>
        <span className="item-text-lead">{parts[0].trim()}</span>
        <span className="item-text-rest">{rest}</span>
      </span>
    )
  }
  return <span className={`item-text ${checked ? 'item-checked' : ''}`}>{text}</span>
}

export function ChecklistActiveList({
  items,
  groups,
  onToggle,
  onToggleGroup,
  sourceStructure,
  editingItemId,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onAddItem,
}: Props) {
  const activeItems = items.filter((i) => !i.archived)
  const doneCount = activeItems.filter((i) => i.checked).length
  const totalCount = activeItems.length
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  // ── Grouped mode ────────────────────────────────────────────────────────────
  if (groups && groups.length > 0) {
    const topGroups = [...groups].filter(g => !g.parentId).sort((a, b) => a.order - b.order)
    const subgroupsByParent = groups.reduce<Record<string, ChecklistGroup[]>>((acc, g) => {
      if (g.parentId) {
        acc[g.parentId] = [...(acc[g.parentId] ?? []), g].sort((a, b) => a.order - b.order)
      }
      return acc
    }, {})
    const itemsByGroup = activeItems.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
      if (item.groupId) {
        acc[item.groupId] = [...(acc[item.groupId] ?? []), item].sort((a, b) => a.order - b.order)
      }
      return acc
    }, {})

    const editProps = { editingItemId, onStartEdit, onCommitEdit, onCancelEdit, onAddItem }

    return (
      <div className="checklist-groups">
        {topGroups.map(group => {
          const subgroups = subgroupsByParent[group.id] ?? []
          // Items directly in this top-level group (not in any subgroup)
          const directItems = (itemsByGroup[group.id] ?? []).filter(item => {
            const itemGroup = groups.find(g => g.id === item.groupId)
            return !itemGroup?.parentId || itemGroup.id === group.id
          })
          return (
            <ChecklistGroupSection
              key={group.id}
              group={group}
              items={directItems}
              subgroups={subgroups}
              subgroupItems={itemsByGroup}
              onToggle={onToggle}
              onToggleCollapse={onToggleGroup ?? (() => {})}
              {...editProps}
            />
          )
        })}
        {/* Ungrouped items fallback */}
        {activeItems.filter(i => !i.groupId).length > 0 && (
          <ul className="checklist-list" role="list">
            {activeItems
              .filter(i => !i.groupId)
              .sort((a, b) => a.order - b.order)
              .map(item => (
                <li key={item.id} className={`checklist-item ${item.checked ? 'checklist-item--done' : ''}`}>
                  <label className="checklist-item-row">
                    <span className="checklist-item-check">
                      <input type="checkbox" checked={item.checked} onChange={() => onToggle(item.id)} />
                    </span>
                    <span className="checklist-item-content">
                      <span className={`item-text ${item.checked ? 'item-checked' : ''}`}>{item.text}</span>
                    </span>
                  </label>
                </li>
              ))}
          </ul>
        )}
      </div>
    )
  }

  // ── Flat mode (legacy / pre-organize) ───────────────────────────────────────
  const ordered = sourceStructure === 'ordered'
  return (
    <>
      {totalCount > 0 && (
        <div className="checklist-progress">
          <span className="checklist-progress-label">
            {doneCount} / {totalCount} steps done
          </span>
          <div className="checklist-progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="checklist-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      <ul className={`checklist-list${ordered ? ' checklist-list--ordered' : ''}`} role="list">
        {items.map((item, index) => (
          <li
            key={item.id}
            className={`checklist-item ${item.checked ? 'checklist-item--done' : ''}`}
          >
            <label className={`checklist-item-row ${ordered ? 'checklist-item-row--ordered' : ''}`}>
              {ordered ? (
                <span className="checklist-step-num" aria-hidden="true">
                  {index + 1}
                </span>
              ) : null}
              <span className="checklist-item-check">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => onToggle(item.id)}
                />
              </span>
              <span className="checklist-item-content">
                {ordered ? (
                  <OrderedItemBody text={item.text} checked={item.checked} />
                ) : (
                  <span className={`item-text ${item.checked ? 'item-checked' : ''}`}>{item.text}</span>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </>
  )
}
