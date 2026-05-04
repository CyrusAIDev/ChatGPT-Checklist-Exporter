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
  const activeItems = items.filter((i) => !i.archived)
  const doneCount = activeItems.filter((i) => i.checked).length
  const totalCount = activeItems.length
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

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
