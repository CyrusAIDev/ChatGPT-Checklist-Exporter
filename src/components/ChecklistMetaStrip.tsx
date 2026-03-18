import type { MergeSummary } from '../lib/merge/merge-checklist'

type Props = {
  completedCount: number
  totalCount: number
  mergeSummary: MergeSummary | null
}

export function ChecklistMetaStrip({ completedCount, totalCount, mergeSummary }: Props) {
  const showProgress = totalCount > 0
  if (!showProgress && !mergeSummary) return null

  return (
    <p className="checklist-meta-strip" aria-live="polite">
      {showProgress && (
        <span className="checklist-meta-progress">
          {completedCount} of {totalCount} done
        </span>
      )}
      {mergeSummary && (
        <span className="checklist-meta-merge">
          {showProgress ? ' · ' : null}
          {mergeSummary.matched} matched · +{mergeSummary.added} · {mergeSummary.archived} archived
        </span>
      )}
    </p>
  )
}
