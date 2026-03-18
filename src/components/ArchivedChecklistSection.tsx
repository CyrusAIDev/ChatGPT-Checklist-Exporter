import type { ChecklistItem } from '../types/checklist'

type Props = {
  items: ChecklistItem[]
  collapsed: boolean
  onToggleCollapsed: () => void
}

export function ArchivedChecklistSection({ items, collapsed, onToggleCollapsed }: Props) {
  if (items.length === 0) return null
  const count = items.length
  const countLabel = `${count} removed`

  return (
    <section className="archived-section" aria-label="Archived checklist items">
      <div className="archived-section-top">
        <div className="archived-section-titles">
          <span className="archived-section-label">Removed after merge</span>
          <span className="archived-section-hint">Not on your active list</span>
        </div>
        <button
          type="button"
          className="archived-toggle"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
        >
          <span className="archived-toggle-chevron" aria-hidden="true">
            {collapsed ? '▸' : '▾'}
          </span>
          <span className="archived-toggle-text">
            {collapsed ? `Show ${countLabel}` : 'Hide'}
          </span>
        </button>
      </div>
      {!collapsed && (
        <ul className="archived-list-inner" role="list">
          {items.map((item) => (
            <li key={item.id} className="archived-row">
              <span className="item-text item-archived">{item.text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
