type Props = {
  onConfirm: () => void
  onCancel: () => void
}

export function ResetConfirmDialog({ onConfirm, onCancel }: Props) {
  return (
    <div
      className="reset-dialog"
      role="dialog"
      aria-labelledby="reset-dialog-title"
      aria-describedby="reset-dialog-desc"
      aria-modal="true"
    >
      <h2 id="reset-dialog-title" className="reset-dialog-title">
        Clear this conversation’s checklist?
      </h2>
      <p id="reset-dialog-desc" className="reset-dialog-body">
        Deletes the checklist stored for this chat on this device. You can capture a new one anytime.
      </p>
      <div className="reset-dialog-risk" role="group" aria-label="Destructive action">
        <span className="reset-dialog-risk-label">Cannot be undone</span>
      </div>
      <div className="reset-dialog-actions">
        <button type="button" className="btn-secondary btn-secondary--dialog" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn-reset-confirm" onClick={onConfirm}>
          Clear checklist
        </button>
      </div>
    </div>
  )
}
