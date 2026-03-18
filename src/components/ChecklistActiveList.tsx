import type { ChecklistItem } from '../types/checklist'

type Props = {
  items: ChecklistItem[]
  onToggle: (itemId: string) => void
}

export function ChecklistActiveList({ items, onToggle }: Props) {
  return (
    <ul className="checklist-list" role="list">
      {items.map((item) => (
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
            <span className={`item-text ${item.checked ? 'item-checked' : ''}`}>{item.text}</span>
          </label>
        </li>
      ))}
    </ul>
  )
}
