import { useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { ShareSheet } from './ShareSheet'

type Props = {
  busy: boolean
  onMergeLatest: () => void
  authUser: User | null
  onOrganize: () => void
  organizeBusy: boolean
  smartMerge: boolean
  onToggleSmartMerge: () => void
  onCopyLink: () => Promise<'ok' | 'too_large'>
  onCopyMarkdown: () => Promise<void>
  onCopyPlainText: () => void
  shareWarning: string | null
}

export function ChecklistActionBar({
  busy,
  onMergeLatest,
  authUser,
  onOrganize,
  organizeBusy,
  smartMerge,
  onToggleSmartMerge,
  onCopyLink,
  onCopyMarkdown,
  onCopyPlainText,
  shareWarning,
}: Props) {
  const [shareOpen, setShareOpen] = useState(false)
  const shareAnchorRef = useRef<HTMLDivElement>(null)

  return (
    <div className="checklist-action-bar">
      <div className="checklist-action-row">
        {/* Hero: Organize */}
        <button
          type="button"
          className={`btn-organize${!authUser ? ' btn-organize--locked' : ''}`}
          onClick={authUser ? onOrganize : undefined}
          disabled={busy || organizeBusy || !authUser}
          title={!authUser ? 'Sign in to unlock' : undefined}
          aria-label="Organize checklist with AI"
        >
          {organizeBusy
            ? <><span className="lc-spinner" aria-hidden="true" /> Organizing…</>
            : !authUser
              ? <>&#x1FA84; Organize <span className="pro-badge">Pro</span></>
              : <><span aria-hidden="true">&#x1FA84;</span> Organize</>}
        </button>

        {/* Secondary: Merge */}
        <button
          type="button"
          className="btn-merge"
          onClick={onMergeLatest}
          disabled={busy}
        >
          {busy ? <><span className="lc-spinner" aria-hidden="true" /> Merging…</> : <>Merge</>}
        </button>

        {/* Smart merge toggle */}
        <button
          type="button"
          className={`smart-merge-btn${smartMerge && authUser ? ' smart-merge-btn--on' : ''}${!authUser ? ' btn-tool--locked' : ''}`}
          onClick={authUser ? onToggleSmartMerge : undefined}
          disabled={!authUser}
          title={
            !authUser
              ? 'Sign in to enable smart merge'
              : smartMerge
                ? 'Smart merge on — AI regroups after each merge (click to disable)'
                : 'Auto-regroup items after each merge (click to enable)'
          }
          aria-label="Toggle AI smart merge"
          aria-pressed={smartMerge}
        >
          <span aria-hidden="true">&#x1FA84;</span>
          {!authUser && <span className="pro-badge">Pro</span>}
        </button>

        {/* Share icon */}
        <div className="share-anchor" ref={shareAnchorRef}>
          <button
            type="button"
            className={`btn-share-icon${shareOpen ? ' btn-share-icon--active' : ''}`}
            onClick={() => setShareOpen(p => !p)}
            aria-label="Share or export checklist"
            aria-expanded={shareOpen}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
          </button>
          <ShareSheet
            isOpen={shareOpen}
            onClose={() => setShareOpen(false)}
            onCopyLink={onCopyLink}
            onCopyMarkdown={onCopyMarkdown}
            onCopyPlainText={onCopyPlainText}
            shareWarning={shareWarning}
          />
        </div>
      </div>
    </div>
  )
}
