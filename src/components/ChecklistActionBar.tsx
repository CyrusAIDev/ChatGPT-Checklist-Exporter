import { useState } from 'react'

type Props = {
  busy: boolean
  onMergeLatest: () => void
  onResetClick: () => void
  onExport: () => Promise<void>
  onShare: () => Promise<'ok' | 'too_large'>
  shareWarning: string | null
}

export function ChecklistActionBar({
  busy,
  onMergeLatest,
  onResetClick,
  onExport,
  onShare,
  shareWarning,
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
        </div>
        <button
          type="button"
          className="btn-destructive btn-destructive--quiet"
          onClick={onResetClick}
          disabled={busy}
        >
          Reset checklist
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
