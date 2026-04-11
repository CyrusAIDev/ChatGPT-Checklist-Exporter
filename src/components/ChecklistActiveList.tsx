import type { ChecklistItem, ChecklistSourceStructure } from '../types/checklist'

type Props = {
  items: ChecklistItem[]
  onToggle: (itemId: string) => void
  /** Omitted or non-ordered: no step column. */
  sourceStructure?: ChecklistSourceStructure
}

export function ChecklistActiveList({ items, onToggle, sourceStructure }: Props) {
  const ordered = sourceStructure === 'ordered'
  return (
    <ul className="checklist-list" role="list">
      {items.map((item, index) => (
        <li
          key={item.id}
          className={`checklist-item ${item.checked ? 'checklist-item--done' : ''}`}
        >
          <label className={`checklist-item-row ${ordered ? 'checklist-item-row--ordered' : ''}`}>
            {ordered ? (
              <span className="checklist-step-num" aria-hidden="true">
                {index + 1}.
              </span>
            ) : null}
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
