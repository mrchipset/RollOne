type AnimationToggleProps = {
  enabled: boolean
  onChange: (enabled: boolean) => void
}

/** 投掷动画开关。使用 ARIA switch 语义，读写无障碍。 */
export function AnimationToggle({ enabled, onChange }: AnimationToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <span id="roll-animation-label" className="text-sm text-slate-500">
        投掷动画
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-labelledby="roll-animation-label"
        onClick={() => onChange(!enabled)}
        className={[
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full',
          'transition-colors duration-150',
          enabled ? 'bg-indigo-600' : 'bg-slate-300',
        ].join(' ')}
      >
        <span
          className={[
            'inline-block h-5 w-5 rounded-full bg-white shadow',
            'transition-transform duration-150',
            enabled ? 'translate-x-[1.375rem]' : 'translate-x-0.5',
          ].join(' ')}
        />
      </button>
    </div>
  )
}

