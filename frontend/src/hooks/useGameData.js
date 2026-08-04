import { useEffect, useState } from 'react'

export function useGameData() {
  const [data, setData] = useState({ loading: true, questions: [], graph: null, nlpGraph: null, error: null })

  useEffect(() => {
    Promise.all([
      fetch('/questions-tagged.json').then(r => r.json()),
      fetch('/concept-graph.json').then(r => r.json()),
      fetch('/concept-graph-nlp.json').then(r => r.json()),
    ])
      .then(([questions, graph, nlpGraph]) => setData({ loading: false, questions, graph, nlpGraph, error: null }))
      .catch(err => setData({ loading: false, questions: [], graph: null, nlpGraph: null, error: err.message }))
  }, [])

  return data
}
