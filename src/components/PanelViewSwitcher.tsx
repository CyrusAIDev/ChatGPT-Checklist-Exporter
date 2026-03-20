type Props = {
  value: 'chat' | 'library'
  onChange: (next: 'chat' | 'library') => void
}

export function PanelViewSwitcher({ value, onChange }: Props) {
  return (
    <div className="panel-view-switcher" role="tablist" aria-label="Panel section">
      <button
        type="button"
        role="tab"
        className={`panel-view-tab ${value === 'chat' ? 'panel-view-tab--active' : ''}`}
        aria-selected={value === 'chat'}
        onClick={() => onChange('chat')}
      >
        Current chat
      </button>
      <button
        type="button"
        role="tab"
        className={`panel-view-tab ${value === 'library' ? 'panel-view-tab--active' : ''}`}
        aria-selected={value === 'library'}
        onClick={() => onChange('library')}
      >
        Library
      </button>
    </div>
  )
}
