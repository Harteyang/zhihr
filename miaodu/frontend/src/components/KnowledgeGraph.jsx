import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { forceCollide } from 'd3-force-3d'

const BOOK_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#84cc16',
  '#6366f1',
]

const MIN_READABLE = 0.7
const MIN_ZOOM_FLOOR = 0.25

function getBookColor(bookId) {
  return BOOK_COLORS[(Math.abs(bookId) || 0) % BOOK_COLORS.length]
}

function truncate(str, maxLen) {
  if (!str) return ''
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 1) + '…'
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

function getRenderMeta(type) {
  if (type === 'query') return { fontSize: 16, fontWeight: '700', maxChars: 20 }
  if (type === 'book') return { fontSize: 12, fontWeight: '700', maxChars: 16 }
  return { fontSize: 10, fontWeight: '400', maxChars: 12 }
}

const labelCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null
const labelCtx = labelCanvas ? labelCanvas.getContext('2d') : null

function measureLabelWidth(text, fontSize, fontWeight = '400') {
  if (!text) return 0
  if (!labelCtx) return String(text).length * fontSize * 0.65
  labelCtx.font = `${fontWeight} ${fontSize}px system-ui, -apple-system, sans-serif`
  return labelCtx.measureText(String(text)).width
}

function getNodeRadius(node, showKnowledgeLabels) {
  if (node.__radius != null && node.__showLabels === showKnowledgeLabels) return node.__radius
  const baseR = Math.sqrt(Math.max(1, node.val || 1)) * 3.5
  const labelW = node.__labelWidth || 0
  if (node.type === 'query') {
    return Math.max(baseR, labelW / 2, 10) + 8
  }
  if (node.type === 'book') {
    return Math.max(baseR, labelW / 2, 8) + 6
  }
  if (!showKnowledgeLabels) return baseR + 4
  return Math.max(baseR, labelW / 2, 6) + 6
}

function computeNominalBounds(nodeCount, containerWidth, containerHeight) {
  const baseW = Math.max(containerWidth || 800, 640)
  const baseH = Math.max(containerHeight || 600, 480)
  const scale = 1 + Math.sqrt(Math.max(0, nodeCount - 15)) * 0.10
  return { width: baseW * scale, height: baseH * scale }
}

function forceBoundary(maxRadius, padding = 20) {
  let nodes
  function force(alpha) {
    for (const n of nodes) {
      if (n.fx != null || n.fy != null) continue
      const r = Math.hypot(n.x, n.y)
      const nodeR = n.__radius ?? getNodeRadius(n, n.__showLabels ?? true)
      const limit = Math.max(0, maxRadius - padding - nodeR)
      if (r > limit) {
        const angle = Math.atan2(n.y, n.x)
        const k = alpha * 0.5
        n.vx = (n.vx || 0) + (limit * Math.cos(angle) - n.x) * k
        n.vy = (n.vy || 0) + (limit * Math.sin(angle) - n.y) * k
      }
    }
  }
  force.initialize = (n) => {
    nodes = n
  }
  return force
}

export default function KnowledgeGraph({ results, query, onViewBook }) {
  const fgRef = useRef(null)
  const wrapperRef = useRef(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [showKnowledgeLabels, setShowKnowledgeLabels] = useState(true)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [minZoom, setMinZoom] = useState(MIN_ZOOM_FLOOR)
  const fitDoneRef = useRef(false)
  const fitGenerationRef = useRef(0)
  const resizeTimeoutRef = useRef(null)
  const forceConfigRef = useRef({ graph: null, labels: null, size: { width: 0, height: 0 } })

  useEffect(() => {
    const updateSize = () => {
      if (!wrapperRef.current) return
      const { width, height } = wrapperRef.current.getBoundingClientRect()
      setSize({ width, height })
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  const graphData = useMemo(() => {
    if (!results?.length || !query) return { nodes: [], links: [] }

    const nodes = []
    const links = []
    const bookMap = new Map()
    const kpMap = new Map()

    // 第一层级：搜索词中心节点，固定在画布原点
    const queryNode = {
      id: 'query-center',
      label: query,
      type: 'query',
      val: 24,
      color: '#1f2937',
      fx: 0,
      fy: 0,
    }
    const qMeta = getRenderMeta('query')
    queryNode.__text = truncate(queryNode.label, qMeta.maxChars)
    queryNode.__fontSize = qMeta.fontSize
    queryNode.__fontWeight = qMeta.fontWeight
    queryNode.__labelWidth = measureLabelWidth(queryNode.__text, qMeta.fontSize, qMeta.fontWeight)
    nodes.push(queryNode)

    // 第二层级：书籍节点
    for (const item of results) {
      if (!item.book_id) continue
      if (!bookMap.has(item.book_id)) {
        const bookNode = {
          id: `book-${item.book_id}`,
          label: item.book_title || `书籍 #${item.book_id}`,
          type: 'book',
          bookId: item.book_id,
          author: item.book_author || '',
          val: 14,
          color: getBookColor(item.book_id),
        }
        const bMeta = getRenderMeta('book')
        bookNode.__text = truncate(bookNode.label, bMeta.maxChars)
        bookNode.__fontSize = bMeta.fontSize
        bookNode.__fontWeight = bMeta.fontWeight
        bookNode.__labelWidth = measureLabelWidth(bookNode.__text, bMeta.fontSize, bMeta.fontWeight)
        bookMap.set(item.book_id, bookNode)
        nodes.push(bookNode)
      }
    }

    // 书籍节点内环初始化，并记录扇区角度
    const bookNodes = nodes.filter((n) => n.type === 'book')
    const bookCount = bookNodes.length
    const bookRadius = 120
    const angleStep = (2 * Math.PI) / Math.max(1, bookCount)
    bookNodes.forEach((node, i) => {
      const angle = i * angleStep - Math.PI / 2
      node.x = bookRadius * Math.cos(angle)
      node.y = bookRadius * Math.sin(angle)
      node.angle = angle
    })

    // 搜索词 -> 书籍
    for (const bookNode of bookNodes) {
      links.push({
        source: 'query-center',
        target: bookNode.id,
        value: 3,
        strength: 4,
        color: 'rgba(31, 41, 55, 0.22)',
      })
    }

    // 第三层级：知识点节点
    for (const item of results) {
      const level = item.level || 3
      const val = Math.max(3, 8 - level)
      const kpNode = {
        id: `kp-${item.id}`,
        label: item.title || '未命名知识点',
        type: 'knowledge',
        bookId: item.book_id,
        bookTitle: item.book_title || '',
        author: item.book_author || '',
        chapter: item.chapter || '',
        level,
        content: item.content || '',
        parentId: item.parent_id,
        sortOrder: item.sort_order,
        val,
        color: getBookColor(item.book_id),
      }
      const kMeta = getRenderMeta('knowledge')
      kpNode.__text = truncate(kpNode.label, kMeta.maxChars)
      kpNode.__fontSize = kMeta.fontSize
      kpNode.__fontWeight = kMeta.fontWeight
      kpNode.__labelWidth = measureLabelWidth(kpNode.__text, kMeta.fontSize, kMeta.fontWeight)
      kpMap.set(item.id, kpNode)
      nodes.push(kpNode)

      // 书籍 -> 知识点
      links.push({
        source: `book-${item.book_id}`,
        target: `kp-${item.id}`,
        value: 1,
        strength: 1,
        color: 'rgba(150, 150, 150, 0.25)',
      })
    }

    const kpList = Array.from(kpMap.values())

    // 按书籍分组知识点，并在对应书籍扇区的外环初始化位置
    const kpByBook = new Map()
    for (const kp of kpList) {
      if (!kpByBook.has(kp.bookId)) kpByBook.set(kp.bookId, [])
      kpByBook.get(kp.bookId).push(kp)
    }
    for (const [bookId, kps] of kpByBook) {
      const book = bookMap.get(bookId)
      if (!book) continue
      const count = kps.length
      const span = Math.min(angleStep * 0.8, Math.PI / 2.5)
      const startAngle = book.angle - span / 2

      kps.sort((a, b) => {
        if (a.chapter !== b.chapter) return String(a.chapter).localeCompare(String(b.chapter))
        return (a.sortOrder || 0) - (b.sortOrder || 0)
      })

      kps.forEach((kp, i) => {
        const t = count === 1 ? 0.5 : i / (count - 1)
        const angle = startAngle + t * span
        const radius = 230 + (kp.level || 3) * 22
        kp.x = radius * Math.cos(angle)
        kp.y = radius * Math.sin(angle)
      })
    }

    // 父子关系
    for (const kp of kpList) {
      if (kp.parentId && kp.parentId !== 0 && kpMap.has(kp.parentId)) {
        links.push({
          source: `kp-${kp.parentId}`,
          target: kp.id,
          value: 2,
          strength: 3,
          color: 'rgba(59, 130, 246, 0.5)',
        })
      }
    }

    // 同章节知识点链式连接（弱化显示）
    const byBookChapter = new Map()
    for (const kp of kpList) {
      const key = `${kp.bookId}|${kp.chapter}`
      if (!byBookChapter.has(key)) byBookChapter.set(key, [])
      byBookChapter.get(key).push(kp)
    }
    for (const group of byBookChapter.values()) {
      group.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      for (let i = 1; i < group.length; i++) {
        links.push({
          source: group[i - 1].id,
          target: group[i].id,
          value: 1,
          strength: 2,
          color: 'rgba(150, 150, 150, 0.12)',
        })
      }
    }

    return { nodes, links }
  }, [results, query])

  // 力模拟参数配置、边界约束与防抖 resize 适配
  useEffect(() => {
    if (!fgRef.current || !graphData.nodes.length || size.width === 0 || size.height === 0) return
    const fg = fgRef.current
    const nodeCount = graphData.nodes.length
    const prev = forceConfigRef.current
    const graphChanged = graphData !== prev.graph
    const labelsChanged = showKnowledgeLabels !== prev.labels
    const sizeChanged = size.width !== prev.size.width || size.height !== prev.size.height
    const needsFullConfig = graphChanged || labelsChanged || !prev.graph

    if (labelsChanged || graphChanged) {
      for (const n of graphData.nodes) {
        n.__showLabels = showKnowledgeLabels
        n.__radius = getNodeRadius(n, showKnowledgeLabels)
      }
    }

    if (needsFullConfig) {
      const charge = fg.d3Force('charge')
      if (charge) {
        charge.strength((n) => {
          if (n.type === 'query') return -400
          if (n.type === 'book') return -200
          return showKnowledgeLabels ? -80 : -40
        })
      }

      fg.d3Force(
        'collide',
        forceCollide((n) => n.__radius ?? getNodeRadius(n, showKnowledgeLabels))
          .strength(0.7)
          .iterations(2)
      )

      const nominal = computeNominalBounds(nodeCount, size.width, size.height)
      const maxRadius = (Math.min(nominal.width, nominal.height) / 2) * 0.92
      fg.d3Force('boundary', forceBoundary(maxRadius, 24))

      // 移除默认 center force，避免与边界约束冲突；搜索词固定在原点已提供中心锚定
      fg.d3Force('center', null)

      fg.d3ReheatSimulation()
      fitDoneRef.current = false
    } else if (sizeChanged) {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current)
      resizeTimeoutRef.current = setTimeout(() => {
        if (!fgRef.current || !graphData.nodes.length) return
        const nominal = computeNominalBounds(graphData.nodes.length, size.width, size.height)
        const maxRadius = (Math.min(nominal.width, nominal.height) / 2) * 0.92
        fgRef.current.d3Force('boundary', forceBoundary(maxRadius, 24))
        fgRef.current.d3ReheatSimulation()
        fitDoneRef.current = false
      }, 200)
    }

    forceConfigRef.current = { graph: graphData, labels: showKnowledgeLabels, size }

    return () => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current)
    }
  }, [graphData, showKnowledgeLabels, size.width, size.height])

  const nodeCanvasObject = useCallback(
    (node, ctx) => {
      const radius = Math.sqrt(Math.max(1, node.val || 1)) * 3.5
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false)
      ctx.fillStyle = node.color
      ctx.fill()

      if (node.type === 'book' || node.type === 'query') {
        ctx.strokeStyle = 'rgba(0,0,0,0.12)'
        ctx.lineWidth = node.type === 'query' ? 3 : 2
        ctx.stroke()
      }

      // 搜索词和书籍标签始终显示；知识点标签受 showKnowledgeLabels 控制
      if (node.type !== 'knowledge' || showKnowledgeLabels) {
        const text = node.__text
        const fontSize = node.__fontSize
        const fontWeight = node.__fontWeight
        if (!text || !fontSize) return

        ctx.font = `${fontWeight} ${fontSize}px system-ui, -apple-system, sans-serif`
        const textMetrics = ctx.measureText(text)
        const textW = textMetrics.width
        const textH = fontSize
        const padX = 4
        const padY = 2

        let labelX = node.x
        let labelY = node.y
        let baseline
        let align = 'center'

        if (node.type === 'query') {
          labelY = node.y - radius - 4
          baseline = 'bottom'
        } else if (node.type === 'book') {
          const angle = Math.atan2(node.y, node.x)
          const gap = radius + 5
          const absCos = Math.abs(Math.cos(angle))
          const absSin = Math.abs(Math.sin(angle))
          if (absCos > absSin) {
            align = Math.cos(angle) >= 0 ? 'left' : 'right'
            baseline = 'middle'
          } else {
            align = 'center'
            baseline = Math.sin(angle) >= 0 ? 'top' : 'bottom'
          }
          labelX = node.x + gap * Math.cos(angle)
          labelY = node.y + gap * Math.sin(angle)
        } else {
          labelY = node.y + radius + 4
          baseline = 'top'
        }

        ctx.textAlign = align
        ctx.textBaseline = baseline

        // 白底圆角背景，防止连线穿过文字
        ctx.save()
        ctx.fillStyle = 'rgba(255,255,255,0.92)'
        const bgW = textW + padX * 2
        const bgH = textH + padY * 2
        let bgX, bgY
        if (align === 'left') {
          bgX = labelX - padX
          bgY = baseline === 'middle' ? labelY - bgH / 2 : labelY - padY
        } else if (align === 'right') {
          bgX = labelX - bgW + padX
          bgY = baseline === 'middle' ? labelY - bgH / 2 : labelY - padY
        } else {
          bgX = labelX - bgW / 2
          if (baseline === 'bottom') bgY = labelY - bgH + padY
          else if (baseline === 'top') bgY = labelY - padY
          else bgY = labelY - bgH / 2
        }
        if (ctx.roundRect) {
          ctx.beginPath()
          ctx.roundRect(bgX, bgY, bgW, bgH, 4)
          ctx.fill()
        } else {
          ctx.fillRect(bgX, bgY, bgW, bgH)
        }
        ctx.restore()

        ctx.fillStyle = node.type === 'query' ? '#111827' : '#374151'
        ctx.fillText(text, labelX, labelY)
      }
    },
    [showKnowledgeLabels]
  )

  const handleNodeClick = useCallback(
    (node) => {
      if (node.type === 'query') return
      setSelectedNode(node)
      if (node.type === 'book' && onViewBook) {
        onViewBook(node.label)
      }
    },
    [onViewBook]
  )

  const linkDistance = useCallback(
    (link) => {
      if (link.strength === 4) return 180
      if (link.strength === 3) return 55
      if (link.strength === 2) return showKnowledgeLabels ? 75 : 55
      return showKnowledgeLabels ? 95 : 70
    },
    [showKnowledgeLabels]
  )

  const linkWidth = useCallback((link) => {
    if (link.strength === 4) return 2.5
    if (link.strength === 3) return 2
    if (link.strength === 2) return 1.5
    return 1
  }, [])

  const handleEngineStop = useCallback(() => {
    if (!fgRef.current || fitDoneRef.current) return
    const fg = fgRef.current
    const gen = ++fitGenerationRef.current
    fg.zoomToFit(400, 20)
    fitDoneRef.current = true
    setTimeout(() => {
      if (fitGenerationRef.current !== gen) return
      const z = fg.zoom()
      setMinZoom(clamp(Math.min(z, MIN_READABLE), MIN_ZOOM_FLOOR, 1))
    }, 450)
  }, [])

  const handleFitView = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400, 20)
    }
  }, [])

  const handleReset = useCallback(() => {
    setSelectedNode(null)
    if (fgRef.current) {
      fgRef.current.centerAt(0, 0, 400)
      fgRef.current.zoom(1, 400)
    }
  }, [])

  if (!results?.length) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200">
        暂无数据可生成图谱
      </div>
    )
  }

  return (
    <div className="relative bg-white rounded-lg border border-gray-200 overflow-hidden fade-in">
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2">
        <button
          onClick={handleFitView}
          className="px-3 py-1.5 bg-white/90 backdrop-blur text-xs font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 shadow-sm"
        >
          适应视图
        </button>
        <button
          onClick={handleReset}
          className="px-3 py-1.5 bg-white/90 backdrop-blur text-xs font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 shadow-sm"
        >
          重置
        </button>
        <button
          onClick={() => setShowKnowledgeLabels((v) => !v)}
          className="px-3 py-1.5 bg-white/90 backdrop-blur text-xs font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 shadow-sm"
        >
          {showKnowledgeLabels ? '隐藏知识点标签' : '显示知识点标签'}
        </button>
      </div>

      {results.length > 300 && (
        <div className="absolute top-3 right-3 z-10 px-3 py-1.5 bg-amber-50 text-amber-700 text-xs rounded-md border border-amber-100">
          结果较多（{results.length} 条），已启用 Canvas 渲染保证流畅性
        </div>
      )}

      <div ref={wrapperRef} className="h-[400px] md:h-[600px] w-full">
        {size.width > 0 && size.height > 0 && (
          <ForceGraph2D
            ref={fgRef}
            width={size.width}
            height={size.height}
            graphData={graphData}
            nodeLabel="label"
            nodeColor="color"
            nodeVal="val"
            nodeRelSize={4}
            nodeCanvasObject={nodeCanvasObject}
            linkWidth={linkWidth}
            linkColor={(link) => link.color || '#999'}
            linkDistance={linkDistance}
            linkDirectionalArrowLength={0}
            minZoom={minZoom}
            maxZoom={10}
            warmupTicks={60}
            cooldownTicks={120}
            d3VelocityDecay={0.38}
            onNodeClick={handleNodeClick}
            onEngineStop={handleEngineStop}
            enableNodeDrag={true}
            enableZoomPanInteraction={true}
            backgroundColor="#ffffff"
          />
        )}
      </div>

      {selectedNode && selectedNode.type === 'knowledge' && (
        <div className="absolute bottom-3 right-3 z-10 w-64 md:w-80 bg-white/95 backdrop-blur border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
              {selectedNode.label}
            </h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
          <div className="space-y-1.5 text-xs text-gray-600">
            <p>
              <span className="text-gray-400">书籍：</span>
              {selectedNode.bookTitle || '未知'}
              {selectedNode.author && ` / ${selectedNode.author}`}
            </p>
            <p>
              <span className="text-gray-400">章节：</span>
              {selectedNode.chapter || '—'}
            </p>
            <p>
              <span className="text-gray-400">层级：</span>
              {selectedNode.level}
            </p>
            {selectedNode.content && (
              <p className="line-clamp-6 whitespace-pre-line leading-relaxed">
                {selectedNode.content}
              </p>
            )}
          </div>
          {onViewBook && selectedNode.bookTitle && (
            <button
              onClick={() => onViewBook(selectedNode.bookTitle)}
              className="mt-3 w-full px-3 py-1.5 bg-primary text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
            >
              查看书籍详情
            </button>
          )}
        </div>
      )}
    </div>
  )
}
