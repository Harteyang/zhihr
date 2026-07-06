import { Fragment } from 'react'

/**
 * 面包屑导航组件
 * @param {Array} items - 导航节点数组 [{ label, onClick?, active? }]
 */
export default function Breadcrumb({ items }) {
  if (!items || items.length === 0) return null

  return (
    <nav className="flex items-center flex-wrap gap-1 text-sm text-gray-500 mb-4 fade-in">
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <Fragment key={i}>
            {i > 0 && (
              <span className="text-gray-300 mx-0.5 select-none">/</span>
            )}
            {item.onClick && !isLast ? (
              <button
                onClick={item.onClick}
                className="hover:text-primary transition-colors truncate max-w-[200px]"
                title={item.label}
              >
                {item.label}
              </button>
            ) : (
              <span
                className={`truncate max-w-[200px] ${item.active ? 'text-gray-900 font-medium' : ''}`}
                title={item.label}
              >
                {item.label}
              </span>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}
