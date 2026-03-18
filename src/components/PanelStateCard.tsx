import type { ReactNode } from 'react'

export type PanelStateTone = 'default' | 'info' | 'muted' | 'hold'

type Props = {
  title?: string
  children: ReactNode
  actions?: ReactNode
  tone?: PanelStateTone
}

const toneClass: Record<PanelStateTone, string> = {
  default: '',
  info: 'state-card--tone-info',
  muted: 'state-card--tone-muted',
  hold: 'state-card--tone-hold',
}

export function PanelStateCard({ title, children, actions, tone = 'default' }: Props) {
  const tc = toneClass[tone]
  return (
    <div className={tc ? `state-card ${tc}` : 'state-card'}>
      {title ? <h2 className="state-card-title">{title}</h2> : null}
      <div className="state-card-body">{children}</div>
      {actions ? <div className="state-actions">{actions}</div> : null}
    </div>
  )
}
