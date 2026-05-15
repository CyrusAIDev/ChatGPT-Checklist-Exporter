import type { ChecklistItem, ChecklistGroup } from '../types/checklist'

type Props = {
  group: ChecklistGroup
  items: ChecklistItem[]
  onToggle: (itemId: string) => void
  onToggleCollapse: (groupId: string) => void
}

export function ChecklistGroupSection({ group, items, onToggle, onToggleCollapse }: Props) {
  const doneCount = items.filter(i => i.checked).length
  const total = items.length

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
        <ul className="checklist-list group-items" role="list">
          {items.map(item => (
            <li
              key={item.id}
              className={`checklist-item ${item.checked ? 'checklist-item--done' : ''}`}
            >
              <label className="checklist-item-row">
                <span className="checklist-item-check">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => onToggle(item.id)}
                  />
                </span>
                <span className="checklist-item-content">
                  <span className={`item-text ${item.checked ? 'item-checked' : ''}`}>
                    {item.text}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
