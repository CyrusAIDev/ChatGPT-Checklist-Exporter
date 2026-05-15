import { useRef } from 'react'
import type { ChecklistItem, ChecklistGroup } from '../types/checklist'

type ItemRowProps = {
  item: ChecklistItem
  editingItemId: string | null
  onToggle: (id: string) => void
  onStartEdit: (id: string) => void
  onCommitEdit: (id: string, text: string) => void
  onCancelEdit: () => void
}

function ItemRow({ item, editingItemId, onToggle, onStartEdit, onCommitEdit, onCancelEdit }: ItemRowProps) {
  const escapedRef = useRef(false)
  const isEditing = editingItemId === item.id

  return (
    <li className={`checklist-item ${item.checked ? 'checklist-item--done' : ''}`}>
      <label className="checklist-item-row">
        <span className="checklist-item-check">
          <input
            type="checkbox"
            checked={item.checked}
            onChange={() => onToggle(item.id)}
          />
        </span>
        <span className="checklist-item-content">
          {isEditing ? (
            <input
              type="text"
              className="item-edit-input"
              defaultValue={item.text}
              autoFocus
              onBlur={e => {
                if (!escapedRef.current) onCommitEdit(item.id, e.target.value)
                escapedRef.current = false
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.currentTarget.blur() }
                if (e.key === 'Escape') {
                  escapedRef.current = true
                  onCancelEdit()
                }
              }}
            />
          ) : (
            <span
              className={`item-text ${item.checked ? 'item-checked' : ''}`}
              onClick={() => onStartEdit(item.id)}
              title="Click to edit"
            >
              {item.text}
            </span>
          )}
        </span>
      </label>
    </li>
  )
}

type Props = {
  group: ChecklistGroup
  items: ChecklistItem[]
  subgroups: ChecklistGroup[]
  subgroupItems: Record<string, ChecklistItem[]>
  onToggle: (itemId: string) => void
  onToggleCollapse: (groupId: string) => void
  editingItemId: string | null
  onStartEdit: (id: string) => void
  onCommitEdit: (id: string, text: string) => void
  onCancelEdit: () => void
  onAddItem: (groupId: string) => void
}

export function ChecklistGroupSection({
  group,
  items,
  subgroups,
  subgroupItems,
  onToggle,
  onToggleCollapse,
  editingItemId,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onAddItem,
}: Props) {
  const allGroupItems = [
    ...items,
    ...subgroups.flatMap(s => subgroupItems[s.id] ?? []),
  ]
  const doneCount = allGroupItems.filter(i => i.checked).length
  const total = allGroupItems.length

  const itemRowProps = { editingItemId, onToggle, onStartEdit, onCommitEdit, onCancelEdit }

  return (
    <div className="group-section">
      <button
        type="button"
        className="group-header"
        onClick={() => onToggleCollapse(group.id)}
        aria-expanded={!group.collapsed}
      >
        <span className="group-toggle" aria-hidden="true">
          {group.collapsed ? '▶' : '▼'}
        </span>
        <span className="group-name">{group.name}</span>
        <span className={`group-meta ${doneCount === total && total > 0 ? 'group-meta--done' : ''}`}>
          {doneCount}/{total}
        </span>
      </button>

      {!group.collapsed && (
        <div className="group-body">
          {subgroups.map(sub => (
            <div key={sub.id} className="subgroup-section">
              <button
                type="button"
                className="subgroup-header"
                onClick={() => onToggleCollapse(sub.id)}
                aria-expanded={!sub.collapsed}
              >
                <span className="group-toggle" aria-hidden="true">
                  {sub.collapsed ? '▶' : '▼'}
                </span>
                <span className="subgroup-name">{sub.name}</span>
              </button>
              {!sub.collapsed && (
                <>
                  <ul className="checklist-list group-items" role="list">
                    {(subgroupItems[sub.id] ?? []).map(item => (
                      <ItemRow key={item.id} item={item} {...itemRowProps} />
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="btn-add-item"
                    onClick={() => onAddItem(sub.id)}
                  >
                    + Add item
                  </button>
                </>
              )}
            </div>
          ))}

          {items.length > 0 && (
            <ul className="checklist-list group-items" role="list">
              {items.map(item => (
                <ItemRow key={item.id} item={item} {...itemRowProps} />
              ))}
            </ul>
          )}

          <button
            type="button"
            className="btn-add-item"
            onClick={() => onAddItem(group.id)}
          >
            + Add item
          </button>
        </div>
      )}
    </div>
  )
}
