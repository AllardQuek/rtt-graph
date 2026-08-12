import { useEffect, useMemo, useRef, useState } from 'react'
import { selectForNode } from '../lib/selection'

function cleanOption(text) {
  return text.replace(/^[A-C]\)\s*/, '')
}

export function NodeChallenge({ node, allQuestions, stats, onAnswer, onClose }) {
  const questionById = useMemo(() => {
    const map = new Map()
    for (const q of allQuestions) map.set(q.id, q)
    return map
  }, [allQuestions])

  const statsRef = useRef(stats)
  statsRef.current = stats

  const [sessionNo, setSessionNo] = useState(0)
  const [questions, setQuestions] = useState([])
  const [revision, setRevision] = useState(false)

  const [session, setSession] = useState({
    index: 0,
    correct: 0,
    state: 'asking',
    selected: null,
    isCorrect: null,
  })

  useEffect(() => {
    const selected = selectForNode(node.questionIds, statsRef.current, 5)
    setQuestions(selected.questions.map(id => questionById.get(id)).filter(Boolean))
    setRevision(selected.revision)
  }, [node.questionIds, sessionNo, questionById])

  useEffect(() => {
    if (questions.length) {
      setSession({ index: 0, correct: 0, state: 'asking', selected: null, isCorrect: null })
    }
  }, [questions])

  const q = questions[session.index]
  const done = session.state === 'done'

  const mastered = node.questionIds.filter(id => stats.questions[id]?.correct > 0).length
  const totalNode = node.questionIds.length

  const answer = (letter) => {
    if (session.state !== 'asking' || !q) return
    const correct = letter === q.answer_letter
    onAnswer?.(correct, q.id)
    setSession(prev => ({
      ...prev,
      selected: letter,
      isCorrect: correct,
      correct: correct ? prev.correct + 1 : prev.correct,
      state: prev.index + 1 >= questions.length ? 'done' : 'feedback',
    }))
  }

  const next = () => {
    setSession(prev => ({
      ...prev,
      index: prev.index + 1,
      selected: null,
      isCorrect: null,
      state: 'asking',
    }))
  }

  const keepDrilling = () => {
    setSessionNo(prev => prev + 1)
  }

  if (done) {
    return (
      <div className="challenge-overlay">
        <div className="challenge-card">
          <h3>{node.label}</h3>
          {revision ? (
            <p>Revision complete.</p>
          ) : (
            <>
              <p>You got <strong>{session.correct}</strong> / {questions.length} correct this session.</p>
              <p>Node progress: <strong>{mastered}</strong> / {totalNode} mastered.</p>
            </>
          )}
          <div className="runner-actions">
            <button className="runner-btn" onClick={keepDrilling}>
              {mastered === totalNode ? 'Practice again' : 'Keep drilling'}
            </button>
            <button className="runner-btn ghost" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    )
  }

  if (!q) {
    return (
      <div className="challenge-overlay">
        <div className="challenge-card">
          <h3>{node.label}</h3>
          <p>No questions available for this node.</p>
          <button className="runner-btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="challenge-overlay">
      <div className="challenge-card">
        <button className="challenge-close" onClick={onClose}>×</button>
        <h3>{node.label}</h3>
        {revision && <p className="challenge-counter">Revision mode — already mastered</p>}
        <p className="challenge-counter">Question {session.index + 1} / {questions.length} · Node {mastered}/{totalNode} mastered</p>
        <div className="question-text">{q.question}</div>
        <div className="question-source">
          <span>{q.category}</span>
          {q.formUrl && (
            <a href={q.formUrl} target="_blank" rel="noreferrer">
              Official form
            </a>
          )}
        </div>
        <div className="runner-options">
          {q.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i)
            let cls = 'runner-option'
            if (session.state === 'feedback') {
              if (letter === q.answer_letter) cls += ' correct'
              else if (letter === session.selected) cls += ' wrong'
              else cls += ' dim'
            }
            return (
              <button
                key={letter}
                className={cls}
                disabled={session.state === 'feedback'}
                onClick={() => answer(letter)}
              >
                <span className="opt-key">{letter}</span>
                <span>{cleanOption(opt)}</span>
              </button>
            )
          })}
        </div>
        {session.state === 'feedback' && (
          <div className={`runner-feedback ${session.isCorrect ? 'good' : 'bad'}`}>
            {session.isCorrect ? 'Correct!' : `Correct: ${q.answer_letter}) ${q.answer_text}`}
          </div>
        )}
        {session.state === 'feedback' && <button className="runner-btn" onClick={next}>Next</button>}
      </div>
    </div>
  )
}
