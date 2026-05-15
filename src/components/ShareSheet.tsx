import { useEffect, useRef, useState } from 'react'

type Props = {
  isOpen: boolean
  onClose: () => void
  onCopyLink: () => Promise<'ok' | 'too_large'>
  onCopyMarkdown: () => Promise<void>
  onCopyPlainText: () => void
  shareWarning: string | null
}

export function ShareSheet({ isOpen, onClose, onCopyLink, onCopyMarkdown, onCopyPlainText, shareWarning }: Props) {
  const [feedback, setFeedback] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) setFeedback(null)
  }, [isOpen])

  const flash = (msg: string) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 1800)
  }

  const handleCopyLink = async () => {
    const result = await onCopyLink()
    if (result === 'too_large') {
      flash('Too large — use Markdown instead')
    } else {
      flash('Link copied!')
    }
  }

  const handleCopyMarkdown = async () => {
    await onCopyMarkdown()
    flash('Markdown copied!')
  }

  const handleCopyPlainText = () => {
    onCopyPlainText()
    flash('Text copied!')
  }

  if (!isOpen) return null

  return (
    <div className="share-sheet" ref={containerRef} role="dialog" aria-label="Share options">
      {feedback ? (
        <p className="share-sheet-feedback" role="status">{feedback}</p>
      ) : (
        <>
          <button type="button" className="share-sheet-item" onClick={handleCopyLink}>
            <span className="share-sheet-icon" aria-hidden="true">🔗</span>
            <span>Copy link</span>
          </button>
          <button type="button" className="share-sheet-item" onClick={handleCopyMarkdown}>
            <span className="share-sheet-icon" aria-hidden="true">↓</span>
            <span>Copy as Markdown</span>
          </button>
          <button type="button" className="share-sheet-item" onClick={handleCopyPlainText}>
            <span className="share-sheet-icon" aria-hidden="true">≡</span>
            <span>Copy as plain text</span>
          </button>
        </>
      )}
      {shareWarning && (
        <p className="share-sheet-warning">{shareWarning}</p>
      )}
    </div>
  )
}
