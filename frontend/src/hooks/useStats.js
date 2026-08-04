import { useEffect, useState } from 'react'

const KEY = 'spf-riding-v2'

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

export function useStats() {
  const [stats, setStats] = useState(() => ({
    clearedNodes: [],
    bestRun: 0,
    totalCorrect: 0,
    totalAnswered: 0,
    ...load(),
  }))

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(stats))
  }, [stats])

  const clearNode = (nodeId) => {
    setStats(prev => ({
      ...prev,
      clearedNodes: [...new Set([...prev.clearedNodes, nodeId])],
    }))
  }

  const recordAnswer = (correct) => {
    setStats(prev => ({
      ...prev,
      totalAnswered: prev.totalAnswered + 1,
      totalCorrect: prev.totalCorrect + (correct ? 1 : 0),
    }))
  }

  const recordRun = (score) => {
    setStats(prev => ({
      ...prev,
      bestRun: Math.max(prev.bestRun, score),
    }))
  }

  return { stats, clearNode, recordAnswer, recordRun }
}
