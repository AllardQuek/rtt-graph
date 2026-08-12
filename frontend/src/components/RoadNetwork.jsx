import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const LAYOUT_TIPS = {
  circular: 'Nodes arranged by topic in a wheel — good for spotting colour groups.',
  force: 'Physics-based layout where connected nodes pull together — shows related concepts.',
  spread: 'Loose force layout with equal edge strength — emphasises separation.',
}

function BikeIcon({ x, y, color = '#00f0ff' }) {
  return (
    <g transform={`translate(${x - 9}, ${y - 9})`}>
      <circle cx="3" cy="12" r="3" fill={color} />
      <circle cx="15" cy="12" r="3" fill={color} />
      <path
        d="M3 12 L9 6 L15 12 M9 6 L7 2 M9 6 L11 2"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  )
}

export function RoadNetwork({ graph, stats, onActivate, title, subtitle, variant = 'road' }) {
  const svgRef = useRef(null)
  const dragMoved = useRef(false)
  const viewRef = useRef({ x: -50, y: -50, w: 1100, h: 1100 })

  const [layout, setLayout] = useState('circular')
  const [nodes, setNodes] = useState(graph.nodes)
  const [view, setView] = useState({ x: -50, y: -50, w: 1100, h: 1100 })
  const [selectedId, setSelectedId] = useState(null)
  const [panDrag, setPanDrag] = useState(null)
  const [nodeDrag, setNodeDrag] = useState(null)

  useEffect(() => {
    viewRef.current = view
  }, [view])

  useEffect(() => {
    const positions = graph.layouts?.[layout] || {}
    setNodes(graph.nodes.map(n => ({
      ...n,
      x: positions[n.id]?.x ?? n.x,
      y: positions[n.id]?.y ?? n.y,
    })))
  }, [graph, layout])

  const nodesById = useMemo(() => {
    const map = new Map()
    nodes.forEach(n => map.set(n.id, n))
    return map
  }, [nodes])

  const nodeList = nodes
  const edgeList = graph.edges

  const visibleIds = useMemo(() => {
    const max = view.w < 500 ? 40 : view.w < 800 ? 28 : view.w < 1200 ? 18 : 10
    const sorted = [...nodes].sort((a, b) => b.count - a.count)
    return new Set(sorted.slice(0, max).map(n => n.id))
  }, [nodes, view.w])

  const activeIds = useMemo(() => {
    if (!selectedId) return new Set()
    const ids = new Set([selectedId])
    edgeList.forEach(e => {
      if (e.source === selectedId) ids.add(e.target)
      if (e.target === selectedId) ids.add(e.source)
    })
    return ids
  }, [selectedId, edgeList])

  const ptToSvg = (clientX, clientY) => {
    const svg = svgRef.current
    const v = viewRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const scaleX = v.w / rect.width
    const scaleY = v.h / rect.height
    return {
      x: v.x + (clientX - rect.left) * scaleX,
      y: v.y + (clientY - rect.top) * scaleY,
    }
  }

  const startPan = (e) => {
    if (e.target.classList.contains('node-target') || nodeDrag) return
    setPanDrag({ sx: e.clientX, sy: e.clientY, x: view.x, y: view.y })
  }

  const startNodeDrag = (e, n) => {
    e.stopPropagation()
    const pt = ptToSvg(e.clientX, e.clientY)
    dragMoved.current = false
    setNodeDrag({ id: n.id, startX: n.x, startY: n.y, mouseX: pt.x, mouseY: pt.y })
    setSelectedId(n.id)
  }

  const onPointerMove = (e) => {
    if (nodeDrag) {
      const pt = ptToSvg(e.clientX, e.clientY)
      const dx = pt.x - nodeDrag.mouseX
      const dy = pt.y - nodeDrag.mouseY
      dragMoved.current = true
      setNodes(prev =>
        prev.map(n =>
          n.id === nodeDrag.id ? { ...n, x: nodeDrag.startX + dx, y: nodeDrag.startY + dy } : n
        )
      )
      return
    }
    if (!panDrag) return
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const dx = ((e.clientX - panDrag.sx) / rect.width) * view.w
    const dy = ((e.clientY - panDrag.sy) / rect.height) * view.h
    setView(v => ({ ...v, x: panDrag.x - dx, y: panDrag.y - dy }))
  }

  const endDrag = () => {
    setPanDrag(null)
    setNodeDrag(null)
  }

  const zoom = (e) => {
    const svg = svgRef.current
    const v = viewRef.current
    if (!svg) return
    const delta = Math.min(Math.max(e.deltaY, -120), 120)
    if (delta === 0) return
    const rect = svg.getBoundingClientRect()
    const mx = v.x + (e.clientX - rect.left) * (v.w / rect.width)
    const my = v.y + (e.clientY - rect.top) * (v.h / rect.height)
    const factor = Math.exp(delta * 0.0015)
    const newW = Math.max(200, Math.min(2200, v.w * factor))
    const newH = (newW / v.w) * v.h
    setView({
      x: mx - (mx - v.x) * (newW / v.w),
      y: my - (my - v.y) * (newH / v.h),
      w: newW,
      h: newH,
    })
  }

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const handler = (e) => {
      e.preventDefault()
      zoom(e)
    }
    svg.addEventListener('wheel', handler, { passive: false })
    return () => svg.removeEventListener('wheel', handler)
  }, [])

  const activate = useCallback((node) => {
    setSelectedId(node.id)
    onActivate(node)
  }, [onActivate])

  const handleNodeClick = (n) => {
    if (dragMoved.current) {
      dragMoved.current = false
      return
    }
    activate(n)
  }

  const moveToNode = useCallback((id) => {
    setSelectedId(id)
    const n = nodesById.get(id)
    if (!n || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const aspect = rect.height / rect.width
    const w = view.w
    const h = w * aspect
    setView({ x: n.x - w / 2, y: n.y - h / 2, w, h })
  }, [nodesById, view.w])

  useEffect(() => {
    const handler = (e) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) return
      if (!selectedId) {
        if (nodeList.length) moveToNode(nodeList[0].id)
        return
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        const n = nodesById.get(selectedId)
        if (n) activate(n)
        return
      }
      const cur = nodesById.get(selectedId)
      const dir = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key]
      let best = null
      let bestScore = Infinity
      const [dx, dy] = dir
      nodeList.forEach(n => {
        if (n.id === selectedId) return
        const vx = n.x - cur.x
        const vy = n.y - cur.y
        const dot = vx * dx + vy * dy
        const dist = Math.hypot(vx, vy)
        if (dot > 0 && dist > 20) {
          const score = dist / (dot / dist + 0.3)
          if (score < bestScore) {
            bestScore = score
            best = n
          }
        }
      })
      if (best) moveToNode(best.id)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedId, nodeList, nodesById, moveToNode, activate])

  const selectedNode = selectedId ? nodesById.get(selectedId) : null
  const bikeColor = selectedNode
    ? selectedNode.color
    : (variant === 'rush' ? '#ff0055' : '#00f0ff')
  const connectionCount = selectedId
    ? edgeList.filter(e => e.source === selectedId || e.target === selectedId).length
    : 0

  return (
    <div className={`road-network ${variant}`}>
      <div className="map-overlay">
        <h2>{title}</h2>
        <p>{subtitle}</p>
        <div className="map-hints">
          Drag empty space to pan · Scroll to zoom · Drag a junction to move it · Click to {variant === 'rush' ? 'race' : 'challenge'}
        </div>
        {graph.layouts && (
          <div className="layout-switch">
            <span>Layout</span>
            {Object.keys(graph.layouts).map(name => (
              <button
                key={name}
                data-tip={LAYOUT_TIPS[name] || ''}
                className={layout === name ? 'active' : ''}
                onClick={() => setLayout(name)}
              >
                {name[0].toUpperCase() + name.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>
      {selectedNode && (
        <div className="node-info">
          <div className="node-info-title" style={{ color: selectedNode.color }}>{selectedNode.label}</div>
          <div className="node-info-row"><span>Topic</span>{selectedNode.topic}</div>
          <div className="node-info-row"><span>Mastered</span>{selectedNode.questionIds.filter(id => stats.questions[id]?.correct > 0).length}/{selectedNode.questionIds.length}</div>
          <div className="node-info-row"><span>Links</span>{connectionCount}</div>
          <div className="node-info-row"><span>Source</span>{selectedNode.category}</div>
        </div>
      )}
      <svg
        ref={svgRef}
        className="road-svg"
        width="100%"
        height="100%"
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        onMouseDown={startPan}
        onMouseMove={onPointerMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        tabIndex={0}
      >
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="strong-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g className="edges">
          {edgeList.map((e, i) => {
            const edgeActive = !selectedId || e.source === selectedId || e.target === selectedId
            return (
              <line
                key={i}
                className={edgeActive ? '' : 'dim'}
                x1={nodesById.get(e.source).x}
                y1={nodesById.get(e.source).y}
                x2={nodesById.get(e.target).x}
                y2={nodesById.get(e.target).y}
                stroke={e.color}
                strokeOpacity={0.25 + Math.min(e.weight * 0.08, 0.5)}
                strokeWidth={1 + Math.min(e.weight, 4)}
                opacity={edgeActive ? 1 : 0.08}
              />
            )
          })}
        </g>
        <g className="nodes">
          {selectedId && nodesById.get(selectedId) && (
            <BikeIcon
              x={nodesById.get(selectedId).x}
              y={nodesById.get(selectedId).y}
              color={bikeColor}
            />
          )}
          {nodeList.map(n => {
            const mastered = n.questionIds.filter(id => stats.questions[id]?.correct > 0).length
            const isComplete = mastered === n.questionIds.length
            const frac = n.questionIds.length ? mastered / n.questionIds.length : 0
            const ringR = n.r + 9
            const circ = 2 * Math.PI * ringR
            const dash = frac * circ
            const isSelected = selectedId === n.id
            const isActive = !selectedId || activeIds.has(n.id)
            const dim = selectedId && !isActive
            const showLabel = isActive || visibleIds.has(n.id)
            const color = n.color
            const fillOpacity = isSelected ? (isComplete ? 0.28 : 0.5) : (isComplete ? 0.15 : 0.28)
            const strokeWidth = isSelected ? (isComplete ? 2 : 3) : (isComplete ? 1 : 2)
            const strokeOpacity = isComplete ? (isSelected ? 0.45 : 0.3) : 1
            const glowRadius = isSelected ? 14 : 6
            const nodeFilter = isComplete ? undefined : `drop-shadow(0 0 ${glowRadius}px ${color})`
            return (
              <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
                <circle
                  className="node-glow"
                  r={n.r + 6}
                  fill="none"
                  stroke={color}
                  strokeOpacity={isSelected ? 0.6 : 0.25}
                  strokeWidth={1}
                  filter="url(#glow)"
                  opacity={isComplete ? 0 : (dim ? 0.15 : 1)}
                  pointerEvents="none"
                />
                <circle
                  className="node-progress"
                  r={ringR}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray={`${dash} ${circ}`}
                  transform="rotate(-90)"
                  opacity={0.9}
                  pointerEvents="none"
                />
                <circle
                  className={`node-hit ${isSelected ? 'selected' : ''} ${isComplete ? 'cleared' : ''}`}
                  r={n.r}
                  cx={0}
                  cy={0}
                  fill={color}
                  fillOpacity={fillOpacity}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeOpacity={strokeOpacity}
                  opacity={dim ? 0.2 : 1}
                  style={{ filter: nodeFilter }}
                  pointerEvents="none"
                />
                <circle
                  className={`node-target ${isSelected ? 'selected' : ''} ${isComplete ? 'cleared' : ''}`}
                  r={n.r + 14}
                  cx={0}
                  cy={0}
                  onMouseDown={e => startNodeDrag(e, n)}
                  onClick={() => handleNodeClick(n)}
                  onMouseEnter={() => setSelectedId(n.id)}
                  onMouseLeave={() => !nodeDrag && setSelectedId(null)}
                  onFocus={() => setSelectedId(n.id)}
                  tabIndex={0}
                  role="button"
                  aria-label={n.label}
                />
                <text
                  className={`node-label ${isSelected ? 'selected' : ''} ${showLabel ? 'visible' : ''} ${dim ? 'dim' : ''}`}
                  y={n.r + 14}
                  textAnchor="middle"
                >
                  {n.label}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
