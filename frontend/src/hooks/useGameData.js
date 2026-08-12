import { useEffect, useState } from 'react'

export function useGameData() {
  const [data, setData] = useState({ loading: true, questions: [], graph: null, error: null })

  useEffect(() => {
    Promise.all([
      fetch('/questions-tagged.json').then(r => r.json()),
      fetch('/concept-graph.json').then(r => r.json()),
    ])
      .then(([questions, graph]) => setData({ loading: false, questions, graph, error: null }))
      .catch(err => setData({ loading: false, questions: [], graph: null, error: err.message }))
  }, [])

  return data
}
