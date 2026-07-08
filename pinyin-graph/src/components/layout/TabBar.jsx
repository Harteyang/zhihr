/**
 * TabBar — 选项卡切换
 */
export default function TabBar({ activeTab, onTabChange, tabs }) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
              flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
              ${activeTab === tab.id
                ? 'bg-white text-[#FF9AA2] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
              }
            `}
        >
          {tab.icon && <span className="mr-1.5">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  )
}