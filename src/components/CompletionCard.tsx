type Props = {
  conversationLabel: string | null
  onArchive: () => void
  onNewPlan: () => void
}

export function CompletionCard({ conversationLabel, onArchive, onNewPlan }: Props) {
  return (
    <div className="completion-card">
      <div className="completion-card-icon" aria-hidden="true">
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="24" cy="24" r="24" fill="var(--surface-info-bg)" />
          <polyline
            points="13,25 20,33 36,17"
            stroke="var(--accent)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
      <p className="completion-card-title">Plan complete!</p>
      {conversationLabel ? (
        <p className="completion-card-label">{conversationLabel}</p>
      ) : null}
      <div className="completion-card-actions">
        <button
          type="button"
          className="btn-destructive btn-destructive--quiet completion-card-btn"
          onClick={onArchive}
        >
          Archive
        </button>
        <button
          type="button"
          className="btn-primary completion-card-btn"
          onClick={onNewPlan}
        >
          Start new plan
        </button>
      </div>
    </div>
  )
}
