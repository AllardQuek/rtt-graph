import { useEffect, useState } from 'react'

const KEY = 'spf-riding-v3'

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function defaultStats() {
  return {
    version: 3,
    questions: {},
    bestRun: 0,
    totalCorrect: 0,
    totalAnswered: 0,
  }
}

export function useStats() {
  const [stats, setStats] = useState(() => {
    const saved = load()
    if (saved && saved.version === 3) {
      return { ...defaultStats(), ...saved }
    }
    return defaultStats()
  })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(stats))
  }, [stats])

  const recordAnswer = (correct, questionId) => {
    if (!questionId) return
    setStats(prev => {
      const existing = prev.questions[questionId] || { seen: 0, correct: 0, lastSeen: 0 }
      return {
        ...prev,
        totalAnswered: prev.totalAnswered + 1,
        totalCorrect: prev.totalCorrect + (correct ? 1 : 0),
        questions: {
          ...prev.questions,
          [questionId]: {
            seen: existing.seen + 1,
            correct: existing.correct + (correct ? 1 : 0),
            lastSeen: Date.now(),
          },
        },
      }
    })
  }

  const recordRun = (score) => {
    setStats(prev => ({
      ...prev,
      bestRun: Math.max(prev.bestRun, score),
    }))
  }

  const resetProgress = () => setStats(defaultStats())

  const isMastered = (questionId) => {
    const q = stats.questions[questionId]
    return q ? q.correct > 0 : false
  }

  const masteredCount = (questionIds) => {
    if (!questionIds) return 0
    return questionIds.filter(id => isMastered(id)).length
  }

  const masteredTotal = () => {
    return Object.values(stats.questions).filter(q => q.correct > 0).length
  }

  return { stats, recordAnswer, recordRun, resetProgress, isMastered, masteredCount, masteredTotal }
}
