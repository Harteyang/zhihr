/**
 * FeedbackToggle — 练习反馈音效开关
 */
export default function FeedbackToggle({ enabled, onToggle, volume, onVolumeChange, className = '' }) {
  return (
    <div className={`flex items-center gap-2 bg-surface-card/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-divider shadow-sm ${className}`}>
      <button
        onClick={onToggle}
        className={`
          w-8 h-8 rounded-full flex items-center justify-center text-body
          transition-colors duration-150
          ${enabled ? 'bg-state-info/10 text-state-info hover:bg-state-info/20' : 'bg-surface text-content-tertiary hover:bg-divider'}
        `}
        title={enabled ? '关闭音效' : '开启音效'}
        aria-pressed={enabled}
      >
        {enabled ? '🔔' : '🔕'}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={volume}
        onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
        className={`
          w-20 h-1.5 rounded-lg appearance-none cursor-pointer
          ${enabled ? 'accent-state-info' : 'accent-state-disabled'}
        `}
        disabled={!enabled}
        aria-label="反馈音效音量"
      />
    </div>
  )
}
