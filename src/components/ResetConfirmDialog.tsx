type Props = {
  onConfirm: () => void
  onCancel: () => void
}

export function ResetConfirmDialog({ onConfirm, onCancel }: Props) {
  return (
    <div className="reset-dialog" role="dialog" aria-labelledby="reset-dialog-title" aria-modal="true">
      <h2 id="reset-dialog-title" className="reset-dialog-title">Reset checklist?</h2>
      <p className="reset-dialog-body">
        This will delete the checklist for this conversation. You can’t undo this.
      </p>
      <div className="reset-dialog-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn-destructive" onClick={onConfirm}>
          Reset checklist
        </button>
      </div>
    </div>
  )
}
