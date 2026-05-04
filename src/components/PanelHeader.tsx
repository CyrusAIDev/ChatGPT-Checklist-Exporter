export type ActiveOrigin = 'chatgpt' | 'claude' | 'other'

type Props = {
  activeOrigin?: ActiveOrigin
}

export function PanelHeader({ activeOrigin }: Props) {
  const eyebrow =
    activeOrigin === 'claude'
      ? 'For Claude'
      : activeOrigin === 'chatgpt'
        ? 'For ChatGPT'
        : 'Living Checklist'

  return (
    <header className={`sidepanel-header sidepanel-header--${activeOrigin ?? 'other'}`}>
      <p className="header-eyebrow">{eyebrow}</p>
      <h1 className="header-title">Living checklist</h1>
      <p className="header-support">
        From the latest assistant message. Merge when the plan updates.
      </p>
    </header>
  )
}
