import { useState } from 'react'
import { useGameData } from './hooks/useGameData'
import { useStats } from './hooks/useStats'
import { RoadNetwork } from './components/RoadNetwork'
import { Runner } from './components/Runner'
import { NodeChallenge } from './components/NodeChallenge'
import { selectForNode, selectForRide } from './lib/selection'
import './App.css'

const TABS = [
  { key: 'road', label: 'Course Map', title: 'Explore the connected riding concepts and master junctions' },
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
  const { loading, questions, graph, error } = useGameData()
  const { stats, recordAnswer, recordRun, masteredTotal } = useStats()
  const [tab, setTab] = useState('road')
  const [activeNode, setActiveNode] = useState(null)
  const [runnerNode, setRunnerNode] = useState(null)

  if (loading) return <Loading />
  if (error) return <div className="app-loading">Failed to load data: {error}</div>

  const accuracy = stats.totalAnswered ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) : 0
  const totalMastered = masteredTotal()

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
        <div className="app-stats">
          <div className="stat" data-tip="Percentage of all questions answered correctly across Course Map and races">
            <span>ACC</span>{accuracy}%
          </div>
          <div className="stat" data-tip="Questions answered correctly at least once out of the full bank">
            <span>MASTERED</span>{totalMastered}/{questions.length}
          </div>
          <div className="stat" data-tip="Highest score achieved in Free Ride or Junction Drill">
            <span>BEST RUN</span>{stats.bestRun}
          </div>
        </div>
      </header>

      <main className="app-body">
        {tab === 'road' && (
          <RoadNetwork
            graph={graph}
            stats={stats}
            onActivate={setActiveNode}
            title="Course Map"
            subtitle="Explore the connected map of riding knowledge. Clear junctions to master the course."
          />
        )}

        {tab === 'runner' && (
          <Runner
            getQuestions={() => selectForRide(questions, stats, 10)}
            plannedCount={10}
            onDone={recordRun}
            onClose={() => {}}
            onAnswer={recordAnswer}
            showClose={false}
            title="Free Ride"
          />
        )}

        {tab === 'junction' && (
          <RoadNetwork
            graph={graph}
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
          stats={stats}
          onAnswer={recordAnswer}
          onClose={() => setActiveNode(null)}
        />
      )}

      {runnerNode && (
        <div className="runner-modal">
          <Runner
            getQuestions={() => selectForNode(runnerNode.questionIds, stats, 5).questions.map(id => questions.find(q => q.id === id)).filter(Boolean)}
            plannedCount={5}
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
