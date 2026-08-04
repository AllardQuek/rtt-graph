import { useMemo, useState } from 'react'
import { useGameData } from './hooks/useGameData'
import { useStats } from './hooks/useStats'
import { RoadNetwork } from './components/RoadNetwork'
import { Runner } from './components/Runner'
import { NodeChallenge } from './components/NodeChallenge'
import './App.css'

const TABS = [
  { key: 'road', label: 'Course Map', title: 'Explore the connected riding concepts and clear junctions' },
  { key: 'runner', label: 'Free Ride', title: 'Ride through random hazards without stopping' },
  { key: 'junction', label: 'Junction Drill', title: 'Focus on one junction at a time' },
]

function Loading() {
  return (
    <div className="app-loading">
      <div className="loader-ring" />
      <p>Loading course data...</p>
    </div>
  )
}

function App() {
  const { loading, questions, graph, nlpGraph, error } = useGameData()
  const { stats, clearNode, recordAnswer, recordRun } = useStats()
  const [tab, setTab] = useState('road')
  const [graphKey, setGraphKey] = useState('keyword')
  const [activeNode, setActiveNode] = useState(null)
  const [runnerNode, setRunnerNode] = useState(null)

  const activeGraph = graphKey === 'keyword' ? graph : nlpGraph

  const allRunnerQuestions = useMemo(() => {
    return [...questions].sort(() => Math.random() - 0.5).slice(0, 10)
  }, [questions])

  if (loading) return <Loading />
  if (error) return <div className="app-loading">Failed to load data: {error}</div>

  const accuracy = stats.totalAnswered ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) : 0
  const clearedInActive = activeGraph
    ? activeGraph.nodes.filter(n => stats.clearedNodes.includes(n.id)).length
    : 0

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <h1>Riding Theory</h1>
          <span className="badge" title="Prototype — scoring and features may change">BETA</span>
        </div>
        <nav className="app-tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              data-tip={t.title}
              className={tab === t.key ? 'active' : ''}
              onClick={() => {
                setTab(t.key)
                setActiveNode(null)
                setRunnerNode(null)
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="graph-switch">
          <span data-tip="Switch between the hand-curated keyword graph and the NLP-extracted graph">Graph</span>
          <button className={graphKey === 'keyword' ? 'active' : ''} onClick={() => setGraphKey('keyword')}>
            Keyword
          </button>
          <button className={graphKey === 'nlp' ? 'active' : ''} onClick={() => setGraphKey('nlp')}>
            NLP
          </button>
        </div>
        <div className="app-stats">
          <div className="stat" data-tip="Percentage of all questions answered correctly across Course Map and races">
            <span>ACC</span>{accuracy}%
          </div>
          <div className="stat" data-tip="Junctions fully cleared (3 correct answers) out of all junctions">
            <span>CLEARED</span>{clearedInActive}/{activeGraph?.nodes.length || 0}
          </div>
          <div className="stat" data-tip="Highest score achieved in Free Ride or Junction Drill">
            <span>BEST RUN</span>{stats.bestRun}
          </div>
        </div>
      </header>

      <main className="app-body">
        {tab === 'road' && (
          <RoadNetwork
            key={graphKey}
            graph={activeGraph}
            stats={stats}
            onActivate={setActiveNode}
            title="Course Map"
            subtitle="Explore the connected map of riding knowledge. Clear junctions to master the course."
          />
        )}

        {tab === 'runner' && (
          <Runner
            questions={allRunnerQuestions}
            onDone={recordRun}
            onClose={() => {}}
            onAnswer={recordAnswer}
            showClose={false}
            title="Free Ride"
          />
        )}

        {tab === 'junction' && (
          <RoadNetwork
            key={graphKey}
            graph={activeGraph}
            stats={stats}
            onActivate={setRunnerNode}
            title="Junction Drill"
            subtitle="Pick a junction and ride it. Clear the road to open the next stretch."
            variant="rush"
          />
        )}
      </main>

      {activeNode && (
        <NodeChallenge
          node={activeNode}
          allQuestions={questions}
          onAnswer={recordAnswer}
          onClose={() => setActiveNode(null)}
          onClear={(id) => {
            clearNode(id)
            setActiveNode(null)
          }}
        />
      )}

      {runnerNode && (
        <div className="runner-modal">
          <Runner
            questions={[...questions]
              .filter(q => runnerNode.questionIds.includes(q.id))
              .sort(() => Math.random() - 0.5)
              .slice(0, 5)}
            onDone={(score) => {
              recordRun(score)
              setRunnerNode(null)
            }}
            onClose={() => setRunnerNode(null)}
            onAnswer={recordAnswer}
            showClose={true}
            title={runnerNode.label}
          />
        </div>
      )}
    </div>
  )
}

export default App
