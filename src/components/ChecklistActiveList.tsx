import type { ChecklistItem, ChecklistSourceStructure } from '../types/checklist'

type Props = {
  items: ChecklistItem[]
  onToggle: (itemId: string) => void
  /** Omitted or non-ordered: no step column. */
  sourceStructure?: ChecklistSourceStructure
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

export function ChecklistActiveList({ items, onToggle, sourceStructure }: Props) {
  const ordered = sourceStructure === 'ordered'
  return (
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
  )
}
