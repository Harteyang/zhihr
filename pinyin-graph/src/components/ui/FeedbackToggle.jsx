/**
 * FeedbackToggle — 练习反馈音效开关
 */
export default function FeedbackToggle({ enabled, onToggle, volume, onVolumeChange, className = '' }) {
  return (
    <div className={`flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-gray-200 shadow-sm ${className}`}>
      <button
        onClick={onToggle}
        className={`
          w-8 h-8 rounded-full flex items-center justify-center text-base
          transition-colors duration-150
          ${enabled ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}
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
          ${enabled ? 'accent-blue-500' : 'accent-gray-300'}
        `}
        disabled={!enabled}
        aria-label="反馈音效音量"
      />
    </div>
  )
}
