type Props = {
  busy: boolean
  onMergeLatest: () => void
  onResetClick: () => void
}

export function ChecklistActionBar({ busy, onMergeLatest, onResetClick }: Props) {
  return (
    <div className="checklist-action-bar">
      <div className="checklist-action-primary">
        <button
          type="button"
          className="btn-primary btn-primary--lead"
          onClick={onMergeLatest}
          disabled={busy}
        >
          {busy ? 'Merging…' : 'Merge latest'}
        </button>
      </div>
      <div className="checklist-action-secondary">
        <button
          type="button"
          className="btn-destructive btn-destructive--quiet"
          onClick={onResetClick}
          disabled={busy}
        >
          Reset checklist
        </button>
      </div>
    </div>
  )
}
