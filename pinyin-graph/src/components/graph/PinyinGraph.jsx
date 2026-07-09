/**
 * PinyinGraph — 力导向拼音图谱组件
 *
 * 三层层级结构：
 *   声母 (center, fixed) → 韵母 (inner ring) → 拼音 + 汉字 (outer ring)
 *
 * 参考自 KnowledgeGraph.jsx 的力导向布局实现
 */
import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { forceCollide } from 'd3-force-3d'
import { getYunmuCategory, getLayerColor, getLayerTextColor, splitPinyinHanzi } from '../../utils/pinyin-utils'
import { computeYunmuLayout } from '../../utils/yunmu-layout'
import {
  NODE_TYPES, NODE_VALUES,
  FORCE_CONFIG,
  BOUNDARY_PADDING, MIN_READABLE, MIN_ZOOM_FLOOR, MAX_ZOOM,
  YUNMU_EXPAND_RADIUS,
  getShengmuRenderMeta, getYunmuRenderMeta, getPinyinRenderMeta,
} from './graph-config'

// 离屏 Canvas 用于精确测量标签宽度
const labelCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null
const labelCtx = labelCanvas ? labelCanvas.getContext('2d') : null

function measureLabelWidth(text, fontSize, fontWeight = '400') {
  if (!text) return 0
  if (!labelCtx) return String(text).length * fontSize * 0.65
  labelCtx.font = `${fontWeight} ${fontSize}px system-ui, -apple-system, sans-serif`
  return labelCtx.measureText(String(text)).width
}

function getNodeRadius(node, showLabels, scale = 1) {
  let base
  if (node.type === NODE_TYPES.SHENGMU) {
    base = Math.max(36, (node.__labelWidth || 0) / 2 + 12)
  } else if (node.type === NODE_TYPES.YUNMU) {
    base = Math.max(26, (node.__labelWidth || 0) / 2 + 8)
  } else {
    // 拼音节点
    base = !showLabels ? 18 : Math.max(18, (node.__labelWidth || 0) / 2 + 8)
  }
  return base * scale
}

function computeNominalBounds(nodeCount, containerWidth, containerHeight) {
  const baseW = Math.max(containerWidth || 800, 640)
  const baseH = Math.max(containerHeight || 600, 480)
  const scale = 1 + Math.sqrt(Math.max(0, nodeCount - 15)) * 0.10
  return { width: baseW * scale, height: baseH * scale }
}

function forceBoundary(maxRadius, padding = BOUNDARY_PADDING) {
  let nodes
  function force(alpha) {
    for (const n of nodes) {
      if (n.fx != null || n.fy != null) continue
      const r = Math.hypot(n.x, n.y)
      const nodeR = n.__radius ?? 20
      const limit = Math.max(0, maxRadius - padding - nodeR)
      if (r > limit) {
        const angle = Math.atan2(n.y, n.x)
        const k = alpha * 0.5
        n.vx = (n.vx || 0) + (limit * Math.cos(angle) - n.x) * k
        n.vy = (n.vy || 0) + (limit * Math.sin(angle) - n.y) * k
      }
    }
  }
  force.initialize = (n) => { nodes = n }
  return force
}

export default function PinyinGraph({ data, shengmu, onPlaySound, onNodeClick, onYunmuClick }) {
  const fgRef = useRef(null)
  const wrapperRef = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [showLabels, setShowLabels] = useState(false)
  const [expandedYunmu, setExpandedYunmu] = useState(null)
  const [minZoom, setMinZoom] = useState(MIN_ZOOM_FLOOR)

  const toggleYunmu = useCallback((yunmuId) => {
    setExpandedYunmu((prev) => (prev === yunmuId ? null : yunmuId))
  }, [])

  const fitDoneRef = useRef(false)
  const fitGenerationRef = useRef(0)
  const resizeTimeoutRef = useRef(null)
  const forceConfigRef = useRef({ data: null, labels: null, size: { width: 0, height: 0 } })

  // 容器尺寸监听
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

  // 切换声母时重置展开状态
  useEffect(() => {
    setExpandedYunmu(null)
  }, [shengmu])

  // 构建图谱数据
  const graphData = useMemo(() => {
    if (!data?.length) return { nodes: [], links: [] }

    const activeExpandedYunmu = expandedYunmu

    const nodes = []
    const links = []
    const yunmuMap = new Map()
    const yunmuDataMap = new Map()
    const pinyinMap = new Map()
    const yunmuSet = new Set()

    const sMeta = getShengmuRenderMeta()
    const shengmuNode = {
      id: `sm-${shengmu}`,
      label: shengmu === '零声母' ? '零声母' : shengmu,
      type: NODE_TYPES.SHENGMU,
      val: NODE_VALUES[NODE_TYPES.SHENGMU],
      color: getLayerColor(NODE_TYPES.SHENGMU),
      fx: 0,
      fy: 0,
    }
    shengmuNode.__text = shengmuNode.label
    shengmuNode.__fontSize = sMeta.fontSize
    shengmuNode.__fontWeight = sMeta.fontWeight
    shengmuNode.__labelWidth = measureLabelWidth(shengmuNode.__text, sMeta.fontSize, sMeta.fontWeight)
    shengmuNode.__targetScale = 1
    nodes.push(shengmuNode)

    for (const item of data) {
      if (!yunmuSet.has(item.yunmu)) {
        yunmuSet.add(item.yunmu)
        const yMeta = getYunmuRenderMeta()
        const yunmuNode = {
          id: `ym-${item.yunmu}`,
          label: item.yunmu,
          type: NODE_TYPES.YUNMU,
          val: NODE_VALUES[NODE_TYPES.YUNMU],
          color: getLayerColor(NODE_TYPES.YUNMU),
          category: getYunmuCategory(item.yunmu),
          opacity: 0.85,
        }
        yunmuNode.__text = yunmuNode.label
        yunmuNode.__fontSize = yMeta.fontSize
        yunmuNode.__fontWeight = yMeta.fontWeight
        yunmuNode.__labelWidth = measureLabelWidth(yunmuNode.__text, yMeta.fontSize, yMeta.fontWeight)
        const isExpandedYunmuLink = activeExpandedYunmu === yunmuNode.id
        const isDimmedYunmuLink = activeExpandedYunmu && activeExpandedYunmu !== yunmuNode.id
        yunmuNode.__targetScale = isExpandedYunmuLink ? 1.35 : isDimmedYunmuLink ? 0.7 : 1
        yunmuMap.set(item.yunmu, yunmuNode)
        nodes.push(yunmuNode)

        links.push({
          source: shengmuNode.id,
          target: yunmuNode.id,
          value: 2,
          color: isDimmedYunmuLink
            ? 'rgba(31, 41, 55, 0.05)'
            : isExpandedYunmuLink
              ? 'rgba(31, 41, 55, 0.40)'
              : 'rgba(31, 41, 55, 0.20)',
          width: isDimmedYunmuLink ? 0.5 : isExpandedYunmuLink ? 2 : 1.5,
        })
      }

      if (!yunmuDataMap.has(item.yunmu)) yunmuDataMap.set(item.yunmu, [])
      yunmuDataMap.get(item.yunmu).push(item)
    }

    const yunmuNodes = Array.from(yunmuMap.values())
    const yunmuLabels = yunmuNodes.map((n) => n.label)
    const layoutMap = computeYunmuLayout(yunmuLabels)

    yunmuNodes.forEach((node) => {
      const pos = layoutMap.get(node.label)
      if (!pos) return
      node.x = pos.x
      node.y = pos.y
      node.fx = pos.fx
      node.fy = pos.fy
      node.angle = pos.angle
      node.data = yunmuDataMap.get(node.label) || []
    })

    // 生成拼音节点：全局显示汉字 或 有韵母展开时
    const shouldGeneratePinyin = showLabels || activeExpandedYunmu != null

    if (shouldGeneratePinyin) {
      for (const item of data) {
        const yunmuId = `ym-${item.yunmu}`
        const isInExpandedBranch = activeExpandedYunmu === yunmuId
        const isGloballyVisible = showLabels && activeExpandedYunmu == null
        const isVisible = isInExpandedBranch || isGloballyVisible

        if (!isVisible && activeExpandedYunmu != null) continue

        const pMeta = getPinyinRenderMeta()
        const key = `py-${item.yunmu}-${item.shengdiao}`
        const pinyinNode = {
          id: key,
          label: item.pinyin,
          type: NODE_TYPES.PINYIN,
          val: NODE_VALUES[NODE_TYPES.PINYIN],
          color: getLayerColor(NODE_TYPES.PINYIN),
          pinyin: item.pinyin,
          hanzi: item.hanzi,
          zuci: item.zuci,
          liju: item.liju,
          shengdiao: item.shengdiao,
          yunmu: item.yunmu,
          shengmu: item.shengmu,
          opacity: isInExpandedBranch ? 1 : 0.9,
        }
        pinyinNode.__pairs = splitPinyinHanzi(item.pinyin, item.hanzi)
        pinyinNode.__fontSize = pMeta.fontSize
        pinyinNode.__fontWeight = pMeta.fontWeight
        pinyinNode.__targetScale = isInExpandedBranch ? 1.25 : 1
        pinyinNode.__labelWidth = Math.max(
          ...pinyinNode.__pairs.map((pair) =>
            Math.max(
              measureLabelWidth(pair.pinyin, pMeta.fontSize, pMeta.fontWeight),
              measureLabelWidth(pair.hanzi, pMeta.fontSize + 2, '600')
            )
          )
        )
        pinyinMap.set(key, pinyinNode)
        nodes.push(pinyinNode)

        links.push({
          source: `ym-${item.yunmu}`,
          target: key,
          value: 1,
          color: isInExpandedBranch ? 'rgba(255, 154, 162, 0.50)' : 'rgba(150, 150, 150, 0.12)',
          width: isInExpandedBranch ? 1.5 : 0.5,
        })
      }

      const pinyinByYunmu = new Map()
      for (const item of data) {
        const key = `py-${item.yunmu}-${item.shengdiao}`
        const node = pinyinMap.get(key)
        if (!node) continue
        if (!pinyinByYunmu.has(item.yunmu)) pinyinByYunmu.set(item.yunmu, [])
        pinyinByYunmu.get(item.yunmu).push(node)
      }

      for (const [yunmu, pyNodes] of pinyinByYunmu) {
        const yunmuNode = yunmuMap.get(yunmu)
        if (!yunmuNode) continue
        const yunmuId = `ym-${yunmu}`
        const isExpanded = activeExpandedYunmu === yunmuId
        const count = pyNodes.length

        pyNodes.sort((a, b) => a.shengdiao - b.shengdiao)

        if (isExpanded) {
          // 扇形放射展开：以韵母为中心，向外均匀分布
          const span = Math.min(Math.PI / 1.5, Math.PI / Math.max(1, count - 1) * count)
          const startAngle = (yunmuNode.angle || 0) - span / 2
          const expandRadius = YUNMU_EXPAND_RADIUS

          pyNodes.forEach((node, i) => {
            const t = count === 1 ? 0.5 : i / (count - 1)
            const angle = startAngle + t * span
            node.fx = yunmuNode.x + expandRadius * Math.cos(angle)
            node.fy = yunmuNode.y + expandRadius * Math.sin(angle)
          })
        } else {
          // 常规环形分布
          const baseRadius = Math.hypot(yunmuNode.x, yunmuNode.y)
          const span = Math.min(Math.PI / 4, Math.PI / count)
          const startAngle = (yunmuNode.angle || 0) - span / 2

          pyNodes.forEach((node, i) => {
            const t = count === 1 ? 0.5 : i / (count - 1)
            const angle = startAngle + t * span
            const radius = baseRadius + 100 + (node.shengdiao || 1) * 15
            node.x = radius * Math.cos(angle)
            node.y = radius * Math.sin(angle)
            node.fx = null
            node.fy = null
          })
        }
      }
    }

    return { nodes, links }
  }, [data, shengmu, showLabels, expandedYunmu])

  // 力模拟配置
  useEffect(() => {
    if (!fgRef.current || !graphData.nodes.length || size.width === 0 || size.height === 0) return
    const fg = fgRef.current
    const prev = forceConfigRef.current
    const dataChanged = graphData !== prev.data
    const labelsChanged = showLabels !== prev.labels
    const sizeChanged = size.width !== prev.size.width || size.height !== prev.size.height
    const needsFullConfig = dataChanged || labelsChanged || !prev.data

    if (labelsChanged || dataChanged) {
      for (const n of graphData.nodes) {
        n.__showLabels = showLabels
        n.__radius = getNodeRadius(n, showLabels)
      }
    }

    if (needsFullConfig) {
      const charge = fg.d3Force('charge')
      if (charge) {
        charge.strength((n) => {
          if (n.type === NODE_TYPES.SHENGMU) return -500
          if (n.type === NODE_TYPES.YUNMU) return -250
          return showLabels ? -100 : -60
        })
      }

      fg.d3Force(
        'collide',
        forceCollide((n) => n.__radius ?? getNodeRadius(n, showLabels))
          .strength(0.7)
          .iterations(2)
      )

      const nominal = computeNominalBounds(graphData.nodes.length, size.width, size.height)
      const maxRadius = (Math.min(nominal.width, nominal.height) / 2) * 0.92
      fg.d3Force('boundary', forceBoundary(maxRadius, BOUNDARY_PADDING))
      fg.d3Force('center', null)

      // 边距离
      fg.d3Force('link')?.distance((link) => {
        if (link.source?.type === NODE_TYPES.SHENGMU) return 160
        return showLabels ? 130 : 100
      })

      fg.d3ReheatSimulation()
      fitDoneRef.current = false
    } else if (sizeChanged) {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current)
      resizeTimeoutRef.current = setTimeout(() => {
        if (!fgRef.current || !graphData.nodes.length) return
        const nominal = computeNominalBounds(graphData.nodes.length, size.width, size.height)
        const maxRadius = (Math.min(nominal.width, nominal.height) / 2) * 0.92
        fgRef.current.d3Force('boundary', forceBoundary(maxRadius, BOUNDARY_PADDING))
        fgRef.current.d3ReheatSimulation()
        fitDoneRef.current = false
      }, 200)
    }

    forceConfigRef.current = { data: graphData, labels: showLabels, size }

    return () => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current)
    }
  }, [graphData, showLabels, size.width, size.height])

  // 节点点击热区：使用与视觉渲染一致的半径，确保命中区域匹配可视节点大小
  // react-force-graph-2d 在 nodeCanvasObject 模式下默认用 nodeRelSize 做命中检测，
  // 远小于实际绘制的节点半径，导致点击不响应。nodePointerAreaPaint 是官方机制。
  const nodePointerAreaPaint = useCallback((node, color, ctx) => {
    if (!isFinite(node.x) || !isFinite(node.y)) return
    const radius = node.__radius ?? getNodeRadius(node, showLabels, node.__targetScale ?? 1)
    if (!isFinite(radius) || radius <= 0) return
    ctx.beginPath()
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false)
    ctx.fillStyle = color
    ctx.fill()
  }, [showLabels])

  // 自定义节点绘制
  const nodeCanvasObject = useCallback((node, ctx) => {
    // 平滑插值到目标半径，实现 300-500ms 的缩放动画
    const targetRadius = getNodeRadius(node, showLabels, node.__targetScale ?? 1)
    if (node.__radius == null || !isFinite(node.__radius)) {
      node.__radius = targetRadius
    }
    node.__radius += (targetRadius - node.__radius) * 0.18
    const radius = node.__radius
    let opacity = node.opacity ?? 1
    const isExpandedYunmu = expandedYunmu === node.id && node.type === NODE_TYPES.YUNMU
    const isPinyinInExpandedBranch =
      node.type === NODE_TYPES.PINYIN && expandedYunmu === `ym-${node.yunmu}`

    if (!isFinite(node.x) || !isFinite(node.y)) return

    // 展开态下，未选中的韵母节点淡化
    if (expandedYunmu && node.type === NODE_TYPES.YUNMU && !isExpandedYunmu) {
      opacity *= 0.4
    }

    // 展开态下，未展开分支的拼音节点不绘制
    if (expandedYunmu && node.type === NODE_TYPES.PINYIN && !isPinyinInExpandedBranch) return

    // 绘制节点（带与颜色匹配的柔和阴影）
    ctx.save()
    ctx.globalAlpha = opacity
    let shadowBlur = node.type === NODE_TYPES.SHENGMU ? 14 : node.type === NODE_TYPES.YUNMU ? 10 : 8
    const shadowOffsetY = node.type === NODE_TYPES.SHENGMU ? 4 : 3
    // 选中分支增强阴影，突出当前焦点
    if (isExpandedYunmu || isPinyinInExpandedBranch) shadowBlur += 5
    ctx.shadowColor = (node.color || '#999999') + '66'
    ctx.shadowBlur = shadowBlur
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = shadowOffsetY

    ctx.beginPath()
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false)

    // 渐变填充
    const gradient = ctx.createRadialGradient(node.x - radius * 0.3, node.y - radius * 0.3, 0, node.x, node.y, radius)
    gradient.addColorStop(0, node.color)
    gradient.addColorStop(1, node.type === NODE_TYPES.SHENGMU ? node.color : node.color + 'cc')
    ctx.fillStyle = gradient
    ctx.fill()
    ctx.restore()

    // 描边
    if (node.type === NODE_TYPES.SHENGMU) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 3
      ctx.stroke()
    } else if (node.type === NODE_TYPES.YUNMU) {
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // 展开的韵母节点添加白色高亮描边
    if (isExpandedYunmu) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 3
      ctx.stroke()
    }

    ctx.globalAlpha = 1

    const fontSize = node.__fontSize
    const fontWeight = node.__fontWeight
    if (!fontSize) return

    // 拼音节点标签：全局显示汉字，或属于当前展开的韵母时绘制
    if (node.type === NODE_TYPES.PINYIN && !showLabels && !isPinyinInExpandedBranch) return

    // 拼音节点：上下结构，拼音在汉字正上方
    if (node.type === NODE_TYPES.PINYIN && node.__pairs?.length) {
      const available = Math.max(4, radius * 2 - 12)
      const pairs = node.__pairs
      const colPadding = 4
      const lineGap = 2

      // 测量列宽
      const colWidths = pairs.map((pair) =>
        Math.max(
          measureLabelWidth(pair.pinyin, fontSize, fontWeight),
          measureLabelWidth(pair.hanzi, fontSize + 2, '600')
        ) + colPadding
      )
      const totalW = colWidths.reduce((a, b) => a + b, 0)
      const totalH = fontSize + (fontSize + 2) + lineGap

      // 自动缩小字号以适应节点
      let finalFontSize = fontSize
      let finalHanziFontSize = fontSize + 2
      if (totalW > available || totalH > available) {
        const scale = Math.min(available / totalW, available / totalH)
        finalFontSize = Math.max(9, Math.floor(fontSize * scale))
        finalHanziFontSize = Math.max(10, finalFontSize + 1)
      }

      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // 根据状态选择文字颜色：淡化态使用低对比灰，正常态使用层级配色文字
      const isDimmed = expandedYunmu && !isPinyinInExpandedBranch
      const textColor = isDimmed ? '#6B7280' : getLayerTextColor(NODE_TYPES.PINYIN)
      const needsDarkShadow = textColor.toLowerCase() === '#ffffff'

      ctx.save()
      if (needsDarkShadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
        ctx.shadowBlur = 2
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 1
      }
      ctx.fillStyle = textColor

      let currentX = node.x - totalW / 2
      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i]
        const colW = colWidths[i]
        const cx = currentX + colW / 2

        // 拼音（上）
        ctx.font = `${fontWeight} ${finalFontSize}px system-ui, -apple-system, sans-serif`
        ctx.fillText(pair.pinyin, cx, node.y - totalH / 2 + finalFontSize / 2)

        // 汉字（下）
        ctx.font = `600 ${finalHanziFontSize}px system-ui, -apple-system, sans-serif`
        ctx.fillText(pair.hanzi, cx, node.y + totalH / 2 - finalHanziFontSize / 2)

        currentX += colW
      }
      ctx.restore()
      return
    }

    // 声母 / 韵母节点：单行居中
    const text = node.__text
    if (!text) return

    ctx.font = `${fontWeight} ${fontSize}px system-ui, -apple-system, sans-serif`
    const textMetrics = ctx.measureText(text)
    const textW = textMetrics.width

    // 若文字宽度超过可用直径，自动缩小字号以保证完全位于节点内部
    const available = Math.max(4, radius * 2 - 10)
    let finalFontSize = fontSize
    if (textW > available) {
      finalFontSize = Math.max(9, Math.floor(fontSize * (available / textW)))
      ctx.font = `${fontWeight} ${finalFontSize}px system-ui, -apple-system, sans-serif`
    }

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // 根据状态选择文字颜色，确保 WCAG AA 对比度
    const isDimmed = expandedYunmu && node.type === NODE_TYPES.YUNMU && !isExpandedYunmu
    const textColor = isDimmed ? '#6B7280' : getLayerTextColor(node.type)
    const needsDarkShadow = textColor.toLowerCase() === '#ffffff'

    ctx.save()
    if (needsDarkShadow) {
      // 仅浅色文字需要暗色阴影以增强可读性
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
      ctx.shadowBlur = 2
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 1
    }
    ctx.fillStyle = textColor
    ctx.fillText(text, node.x, node.y)
    ctx.restore()
  }, [showLabels, expandedYunmu])

  // 边宽度：优先使用数据中的 width，否则按层级默认
  const linkWidth = useCallback((link) => {
    if (link.width != null) return link.width
    if (link.source?.type === NODE_TYPES.SHENGMU) return 1.5
    return 1
  }, [])

  // 点击节点
  const handleNodeClick = useCallback((node) => {
    if (node.type === NODE_TYPES.SHENGMU) {
      setShowLabels((prev) => !prev)
      return
    }
    if (node.type === NODE_TYPES.PINYIN && onNodeClick) {
      onNodeClick(node)
    }
    if (node.type === NODE_TYPES.YUNMU) {
      toggleYunmu(node.id)
      if (onYunmuClick) onYunmuClick(node)
    }
  }, [onNodeClick, onYunmuClick, toggleYunmu])

  // 引擎停止 → 自动适配视图
  const handleEngineStop = useCallback(() => {
    if (!fgRef.current || fitDoneRef.current) return
    const fg = fgRef.current
    const gen = ++fitGenerationRef.current
    fg.zoomToFit(400, 20)
    fitDoneRef.current = true
    setTimeout(() => {
      if (fitGenerationRef.current !== gen || !fgRef.current) return
      const z = fgRef.current.zoom()
      setMinZoom(Math.max(Math.min(z, MIN_READABLE), MIN_ZOOM_FLOOR))
    }, 450)
  }, [])

  const handleFitView = useCallback(() => {
    if (fgRef.current) fgRef.current.zoomToFit(400, 20)
  }, [])

  const handleReset = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.centerAt(0, 0, 400)
      fgRef.current.zoom(1, 400)
    }
  }, [])

  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-[400px] md:h-[600px] text-gray-400 text-sm">
        暂无拼音数据
      </div>
    )
  }

  return (
    <div className="relative bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {/* 工具栏 */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2">
        <button
          onClick={handleFitView}
          className="px-3 py-1.5 bg-white/90 backdrop-blur text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm transition-colors"
        >
          适应视图
        </button>
        <button
          onClick={handleReset}
          className="px-3 py-1.5 bg-white/90 backdrop-blur text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm transition-colors"
        >
          重置
        </button>
        <button
          onClick={() => setShowLabels(v => !v)}
          className="px-3 py-1.5 bg-white/90 backdrop-blur text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm transition-colors"
        >
          {showLabels ? '隐藏汉字' : '显示汉字'}
        </button>
      </div>

      <div ref={wrapperRef} className="h-[58vh] md:h-[62vh] min-h-[360px] max-h-[720px] w-full">
        {size.width > 0 && size.height > 0 && (
          <ForceGraph2D
            ref={fgRef}
            width={size.width}
            height={size.height}
            graphData={graphData}
            nodeCanvasObject={nodeCanvasObject}
            nodePointerAreaPaint={nodePointerAreaPaint}
            linkWidth={linkWidth}
            linkColor={(link) => link.color || '#e5e7eb'}
            linkDistance={100}
            linkDirectionalArrowLength={0}
            minZoom={minZoom}
            maxZoom={MAX_ZOOM}
            warmupTicks={FORCE_CONFIG.warmupTicks}
            cooldownTicks={FORCE_CONFIG.cooldownTicks}
            d3VelocityDecay={FORCE_CONFIG.velocityDecay}
            onNodeClick={handleNodeClick}
            onEngineStop={handleEngineStop}
            enableNodeDrag={false}
            enableZoomPanInteraction={true}
            backgroundColor="rgba(0,0,0,0)"
          />
        )}
      </div>
    </div>
  )
}