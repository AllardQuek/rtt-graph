import { useMemo, useState } from 'react'

function cleanOption(text) {
  return text.replace(/^[A-C]\)\s*/, '')
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

export function NodeChallenge({ node, allQuestions, onAnswer, onClose, onClear }) {
  const questions = useMemo(() => {
    const qs = allQuestions.filter(q => node.questionIds.includes(q.id))
    return shuffle(qs).slice(0, Math.min(3, qs.length))
  }, [node, allQuestions])

  const [session, setSession] = useState({
    index: 0,
    correct: 0,
    state: 'asking',
    selected: null,
    isCorrect: null,
  })

  const q = questions[session.index]
  const done = session.state === 'done'

  const answer = (letter) => {
    if (session.state !== 'asking') return
    const correct = letter === q.answer_letter
    onAnswer?.(correct)
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

  const finish = () => {
    if (session.correct === questions.length) onClear(node.id)
    onClose()
  }

  if (done) {
    return (
      <div className="challenge-overlay">
        <div className="challenge-card">
          <h3>{node.label} cleared!</h3>
          <p>You got <strong>{session.correct}</strong> / {questions.length} correct.</p>
          <button className="runner-btn" onClick={finish}>Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="challenge-overlay">
      <div className="challenge-card">
        <button className="challenge-close" onClick={onClose}>×</button>
        <h3>{node.label}</h3>
        <p className="challenge-counter">Question {session.index + 1} / {questions.length}</p>
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
