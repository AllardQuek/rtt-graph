import { useCallback, useEffect, useRef, useState } from 'react'

const HAZARD_START = 440
const HAZARD_ZONE = 140
const DECISION_TIME = 6
const MAX_LIVES = 3

function cleanOption(text) {
  return text.replace(/^[A-C]\)\s*/, '')
}

function HazardIcon({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path
        d="M24 6 L42 40 H6 Z"
        fill="rgba(255, 0, 85, 0.2)"
        stroke="#ff0055"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <text x="24" y="34" textAnchor="middle" fill="#ff0055" fontSize="26" style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>!</text>
    </svg>
  )
}

function Bike({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <circle cx="12" cy="42" r="8" stroke="#00f0ff" strokeWidth="3" />
      <circle cx="44" cy="42" r="8" stroke="#00f0ff" strokeWidth="3" />
      <path d="M12 42 L28 22 L44 42 M28 22 L24 10 M28 22 L32 10" stroke="#00f0ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="28" cy="22" r="4" fill="#00f0ff" />
    </svg>
  )
}

export function Runner({ getQuestions, plannedCount = 10, onDone, onClose, onAnswer, title = 'Free Ride', showClose = true }) {
  const [game, setGame] = useState({ phase: 'ready' })
  const timerRef = useRef(null)

  const start = () => {
    const questions = getQuestions()
    if (!questions.length) return
    setGame({
      phase: 'running',
      questions,
      index: 0,
      question: questions[0],
      hazardY: HAZARD_START,
      lives: MAX_LIVES,
      score: 0,
      timeLeft: DECISION_TIME,
      selected: null,
      isCorrect: null,
      feedback: null,
      speed: 8,
      speedLevel: 0,
    })
  }

  const goNext = useCallback(() => {
    setGame(prev => {
      const nextIndex = prev.index + 1
      if (nextIndex >= prev.questions.length || prev.lives <= 0) {
        if (onDone) onDone(prev.score)
        return { ...prev, phase: 'over' }
      }
      return {
        ...prev,
        phase: 'running',
        index: nextIndex,
        question: prev.questions[nextIndex],
        hazardY: HAZARD_START,
        timeLeft: DECISION_TIME,
        selected: null,
        isCorrect: null,
        feedback: null,
        speed: 8 + nextIndex * 0.5,
      }
    })
  }, [onDone])

  const applyResult = useCallback((prev, correct, selected) => {
    onAnswer?.(correct, prev.question.id)
    const newLives = correct ? prev.lives : prev.lives - 1
    const newScore = correct ? prev.score + 100 + Math.floor(prev.timeLeft * 15) : prev.score
    const isOver = newLives <= 0 || prev.index >= prev.questions.length - 1
    const feedback = correct
      ? 'Clean pass!'
      : `Hit! Correct: ${prev.question.answer_letter}) ${prev.question.answer_text}`
    if (isOver && onDone) onDone(newScore)
    return {
      ...prev,
      phase: isOver ? 'over' : 'feedback',
      lives: newLives,
      score: newScore,
      selected,
      isCorrect: correct,
      feedback,
    }
  }, [onAnswer, onDone])

  const pick = useCallback((letter) => {
    setGame(prev => {
      if (prev.phase !== 'deciding') return prev
      const correct = letter === prev.question.answer_letter
      return applyResult(prev, correct, letter)
    })
  }, [applyResult])

  useEffect(() => {
    if (game.phase === 'running') {
      const id = setInterval(() => {
        setGame(prev => {
          if (prev.phase !== 'running') return prev
          const newY = prev.hazardY - prev.speed
          if (newY <= HAZARD_ZONE) {
            return { ...prev, phase: 'deciding', hazardY: HAZARD_ZONE, timeLeft: DECISION_TIME }
          }
          return { ...prev, hazardY: newY }
        })
      }, 30)
      return () => clearInterval(id)
    }
  }, [game.phase])

  useEffect(() => {
    if (game.phase === 'deciding') {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setGame(prev => {
          if (prev.phase !== 'deciding') return prev
          if (prev.timeLeft <= 0.12) {
            onAnswer?.(false, prev.question.id)
            const newLives = prev.lives - 1
            const isOver = newLives <= 0 || prev.index >= prev.questions.length - 1
            const feedback = `Too slow! Correct: ${prev.question.answer_letter}) ${prev.question.answer_text}`
            if (isOver && onDone) onDone(prev.score)
            return { ...prev, phase: isOver ? 'over' : 'feedback', lives: newLives, timeLeft: 0, selected: null, isCorrect: false, feedback }
          }
          return { ...prev, timeLeft: prev.timeLeft - 0.1 }
        })
      }, 100)
      return () => clearInterval(timerRef.current)
    }
  }, [game.phase, onAnswer, onDone])

  useEffect(() => {
    if (game.phase === 'feedback') {
      const id = setTimeout(goNext, 1500)
      return () => clearTimeout(id)
    }
  }, [game.phase, game.index, goNext])

  useEffect(() => {
    const handler = (e) => {
      if (game.phase !== 'deciding') return
      const map = { '1': 'A', '2': 'B', '3': 'C', 'a': 'A', 'b': 'B', 'c': 'C' }
      if (map[e.key]) pick(map[e.key])
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [game.phase, pick])

  if (game.phase === 'ready') {
    return (
      <div className="runner-screen ready">
        <h2>{title}</h2>
        <p className="runner-blurb">{plannedCount} hazards ahead. Answer before impact. 1/2/3 or A/B/C to choose.</p>
        <button className="runner-btn" onClick={start}>Start Engine</button>
        {showClose && <button className="runner-btn ghost" onClick={onClose}>Back</button>}
      </div>
    )
  }

  if (game.phase === 'over') {
    return (
      <div className="runner-screen over">
        <h2>Ride Over</h2>
        <div className="runner-score">{game.score}</div>
        <p className="runner-blurb">{game.lives > 0 ? 'All hazards cleared.' : 'You crashed out.'}</p>
        <div className="runner-actions">
          <button className="runner-btn" onClick={start}>Try Again</button>
          {showClose && <button className="runner-btn ghost" onClick={onClose}>Close</button>}
        </div>
      </div>
    )
  }

  const q = game.question
  const deciding = game.phase === 'deciding'
  const feedback = game.phase === 'feedback'
  const total = game.questions?.length ?? plannedCount

  return (
    <div className="runner-screen">
      <div className="runner-hud">
        <div className="hud-block">SCORE <span>{game.score}</span></div>
        <div className="hud-block">LIVES <span>{'◆'.repeat(Math.max(0, game.lives))}</span></div>
        <div className="hud-block">HAZARD <span>{game.index + 1}/{total}</span></div>
      </div>

      <div className="runner-track">
        <div className="speed-lines" />
        <div className="road">
          <div className="lane-markings" />
          <div className="hazard" style={{ top: `${game.hazardY}px` }}>
            <HazardIcon />
          </div>
          <div className="rider-bike">
            <Bike />
          </div>
        </div>
      </div>

      {(deciding || feedback) && (
        <div className="runner-panel">
          <div className="timer-bar">
            <div style={{ width: `${(game.timeLeft / DECISION_TIME) * 100}%` }} />
          </div>
          <h3 className="runner-question">{q.question}</h3>
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
              if (feedback) {
                if (letter === q.answer_letter) cls += ' correct'
                else if (letter === game.selected) cls += ' wrong'
                else cls += ' dim'
              }
              return (
                <button
                  key={letter}
                  className={cls}
                  disabled={feedback}
                  onClick={() => pick(letter)}
                >
                  <span className="opt-key">{letter}</span>
                  <span>{cleanOption(opt)}</span>
                </button>
              )
            })}
          </div>
          {feedback && <div className={`runner-feedback ${game.isCorrect ? 'good' : 'bad'}`}>{game.feedback}</div>}
        </div>
      )}
    </div>
  )
}
