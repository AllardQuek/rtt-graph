export function shuffle(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function questionStatus(stats, id) {
  const q = stats?.questions?.[id]
  if (!q) return 'unseen'
  if (q.correct > 0) return 'mastered'
  return 'unmastered'
}

export function selectForNode(questionIds, stats, max = 5) {
  const unseen = []
  const unmastered = []
  const mastered = []

  for (const id of questionIds) {
    const status = questionStatus(stats, id)
    if (status === 'mastered') {
      mastered.push(id)
    } else if (status === 'unseen') {
      unseen.push(id)
    } else {
      unmastered.push(id)
    }
  }

  unmastered.sort((a, b) => {
    const qa = stats.questions[a]
    const qb = stats.questions[b]
    return (qa?.lastSeen || 0) - (qb?.lastSeen || 0)
  })

  const candidates = [...unseen, ...unmastered]
  if (candidates.length > 0) {
    return { questions: shuffle(candidates.slice(0, max)), revision: false }
  }

  return { questions: shuffle(mastered).slice(0, max), revision: true }
}

export function selectForRide(allQuestions, stats, count = 10) {
  const ordered = [...allQuestions].sort((a, b) => {
    const statusA = questionStatus(stats, a.id)
    const statusB = questionStatus(stats, b.id)
    // unseen > unmastered > mastered
    const rank = { unseen: 0, unmastered: 1, mastered: 2 }
    if (rank[statusA] !== rank[statusB]) return rank[statusA] - rank[statusB]
    // both unmastered: oldest last-seen first
    if (statusA === 'unmastered') {
      return (stats.questions[a.id]?.lastSeen || 0) - (stats.questions[b.id]?.lastSeen || 0)
    }
    return 0
  })

  return shuffle(ordered.slice(0, count))
}
