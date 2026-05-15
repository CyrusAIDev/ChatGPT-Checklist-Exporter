import { useState } from 'react'
import type { User } from '@supabase/supabase-js'

type Props = {
  busy: boolean
  onMergeLatest: () => void
  onResetClick: () => void
  onExport: () => Promise<void>
  onShare: () => Promise<'ok' | 'too_large'>
  shareWarning: string | null
  authUser: User | null
  onOrganize: () => void
  organizeBusy: boolean
  smartMerge: boolean
  onToggleSmartMerge: () => void
}

export function ChecklistActionBar({
  busy,
  onMergeLatest,
  onResetClick,
  onExport,
  onShare,
  shareWarning,
  authUser,
  onOrganize,
  organizeBusy,
  smartMerge,
  onToggleSmartMerge,
}: Props) {
  const [exportCopied, setExportCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const handleExport = async () => {
    await onExport()
    setExportCopied(true)
    setTimeout(() => setExportCopied(false), 1500)
  }

  const handleShare = async () => {
    const result = await onShare()
    if (result === 'ok') {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 1500)
    }
  }

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
        <button
          type="button"
          className={`smart-merge-btn${smartMerge && authUser ? ' smart-merge-btn--on' : ''}${!authUser ? ' btn-tool--locked' : ''}`}
          onClick={authUser ? onToggleSmartMerge : undefined}
          disabled={!authUser}
          title={
            !authUser
              ? 'Sign in to enable smart merge'
              : smartMerge
                ? '🪄 Smart merge on — AI will regroup after each merge'
                : 'Smart merge off — click to enable AI regrouping'
          }
          aria-label="Toggle AI smart merge"
          aria-pressed={smartMerge}
        >
          🪄
          {!authUser && <span className="pro-badge">Pro</span>}
        </button>
      </div>

      <div className="checklist-action-secondary">
        <div className="checklist-action-tools">
          <span className="tooltip-anchor">
            <button
              type="button"
              className="btn-tool"
              onClick={handleExport}
              disabled={busy}
              aria-label="Export checklist as Markdown"
            >
              Export
            </button>
            {exportCopied && (
              <span className="tooltip" role="status">
                Copied!
              </span>
            )}
          </span>
          <span className="tooltip-anchor">
            <button
              type="button"
              className="btn-tool"
              onClick={handleShare}
              disabled={busy}
              aria-label="Share checklist as URL"
            >
              Share
            </button>
            {linkCopied && (
              <span className="tooltip" role="status">
                Link copied!
              </span>
            )}
          </span>
          <span className="tooltip-anchor">
            <button
              type="button"
              className={`btn-tool${!authUser ? ' btn-tool--locked' : ''}`}
              onClick={authUser ? onOrganize : undefined}
              disabled={busy || organizeBusy || !authUser}
              title={!authUser ? 'Sign in to unlock' : undefined}
              aria-label="Organize checklist with AI"
            >
              {organizeBusy
                ? 'Organizing…'
                : !authUser
                  ? <>🪄 Organize <span className="pro-badge">Pro</span></>
                  : '🪄 Organize'}
            </button>
          </span>
        </div>
        <button
          type="button"
          className="btn-destructive btn-destructive--quiet"
          onClick={onResetClick}
          disabled={busy}
        >
          Reset
        </button>
      </div>

      {shareWarning && (
        <p className="checklist-share-warning" role="alert">
          {shareWarning}
        </p>
      )}
    </div>
  )
}
