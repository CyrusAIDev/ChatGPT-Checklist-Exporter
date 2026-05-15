import { useEffect, useRef } from 'react'
import type { CleanupSuggestion } from '../lib/ai/cleanup'

type Props = {
  suggestions: CleanupSuggestion[]
  onToggle: (itemId: string) => void
  onAcceptAll: () => void
  onRejectAll: () => void
  onApply: () => void
  onDiscard: () => void
  applying: boolean
}

export function CleanupDiffPanel({
  suggestions,
  onToggle,
  onAcceptAll,
  onRejectAll,
  onApply,
  onDiscard,
  applying,
}: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)

  // Focus the close button on mount for keyboard accessibility
  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  // Escape key closes the panel
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !applying) onDiscard()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [applying, onDiscard])

  const acceptedCount = suggestions.filter(s => s.accepted).length
  const changedCount = suggestions.filter(s => s.original !== s.proposed).length

  return (
    <div className="cleanup-backdrop" onClick={applying ? undefined : onDiscard}>
      <div
        className="cleanup-panel"
        role="dialog"
        aria-labelledby="cleanup-panel-title"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="cleanup-panel-header">
          <div>
            <h2 className="cleanup-panel-title" id="cleanup-panel-title">
              ✨ Clean up suggestions
            </h2>
            <p className="cleanup-panel-sub">
              {changedCount === 0
                ? 'No changes suggested.'
                : `${changedCount} suggestion${changedCount !== 1 ? 's' : ''} — review and apply`}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="cleanup-close-btn"
            onClick={onDiscard}
            disabled={applying}
            aria-label="Discard suggestions"
          >
            ×
          </button>
        </div>

        {/* Accept / Reject all shortcuts */}
        {changedCount > 0 && (
          <div className="cleanup-shortcuts">
            <button
              type="button"
              className="cleanup-shortcut-btn"
              onClick={onAcceptAll}
              disabled={applying}
            >
              Accept all
            </button>
            <span className="cleanup-shortcut-sep">·</span>
            <button
              type="button"
              className="cleanup-shortcut-btn"
              onClick={onRejectAll}
              disabled={applying}
            >
              Reject all
            </button>
          </div>
        )}

        {/* Diff list */}
        <div className="cleanup-diff-list">
          {suggestions.map(s => {
            const noChange = s.original === s.proposed
            return (
              <div
                key={s.itemId}
                className={`cleanup-diff-row${!s.accepted && !noChange ? ' cleanup-diff-row--rejected' : ''}`}
              >
                {/* Pill toggle — hidden for no-change rows */}
                {!noChange && (
                  <label className="cleanup-toggle-label" title={s.accepted ? 'Click to reject' : 'Click to accept'}>
                    <input
                      type="checkbox"
                      className="cleanup-toggle-input"
                      checked={s.accepted}
                      onChange={() => onToggle(s.itemId)}
                      disabled={applying}
                    />
                    <span className="cleanup-toggle-track" />
                  </label>
                )}

                {/* Text diff */}
                <div className={`cleanup-diff-texts${noChange ? ' cleanup-diff-texts--nochange' : ''}`}>
                  {noChange ? (
                    <span className="cleanup-diff-nochange">{s.original}</span>
                  ) : (
                    <>
                      <span className="cleanup-diff-original">{s.original}</span>
                      <span className="cleanup-diff-arrow" aria-hidden="true">→</span>
                      <span className="cleanup-diff-proposed">{s.proposed}</span>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="cleanup-panel-footer">
          <button
            type="button"
            className="cleanup-apply-btn"
            onClick={onApply}
            disabled={applying || acceptedCount === 0}
          >
            {applying ? 'Applying…' : `Apply ${acceptedCount} change${acceptedCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
