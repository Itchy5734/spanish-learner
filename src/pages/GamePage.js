// ─────────────────────────────────────────────────────────
//  src/pages/GamePage.js
//  The sentence builder game.
//  Loads questions from Supabase, saves progress on each answer.
// ─────────────────────────────────────────────────────────

import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

export default function GamePage() {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const [params]    = useSearchParams()

  // URL params: ?topic=food&difficulty=1&assignment=uuid
  const topicFilter      = params.get('topic')
  const difficultyFilter = params.get('difficulty')
  const assignmentId     = params.get('assignment')

  // ── Session state ──────────────────────
  const [questions,  setQuestions]  = useState([])
  const [idx,        setIdx]        = useState(0)
  const [sessionId,  setSessionId]  = useState(null)
  const [score,      setScore]      = useState(0)
  const [hintsTotal, setHintsTotal] = useState(0)
  const [mistakes,   setMistakes]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [done,       setDone]       = useState(false)

  // ── Per-question state ─────────────────
  const [correctWords,  setCorrectWords]  = useState([])
  const [tileWords,     setTileWords]     = useState([])
  const [tileUsed,      setTileUsed]      = useState([])
  const [answerWords,   setAnswerWords]   = useState([])
  const [selectedTile,  setSelectedTile]  = useState(null)
  const [passed,        setPassed]        = useState(false)
  const [firstTry,      setFirstTry]      = useState(true)
  const [hintCount,     setHintCount]     = useState(0)
  const [feedback,      setFeedback]      = useState(null) // {text, color}
  const [slotColors,    setSlotColors]    = useState([])

  // ── Load questions on mount ────────────
  useEffect(() => { loadQuestions() }, [])

  async function loadQuestions() {
    let query = supabase
      .from('questions')
      .select('*')
      .eq('type', 'sentence_builder')
      .eq('active', true)

    if (topicFilter)      query = query.eq('topic', topicFilter)
    if (difficultyFilter) query = query.eq('difficulty', parseInt(difficultyFilter))

    const { data, error } = await query
    if (error || !data?.length) {
      setFeedback({ text: 'No questions found. Ask your tutor to add some!', color: '#f5a623' })
      setLoading(false)
      return
    }

    // Shuffle questions
    const shuffled = [...data].sort(() => Math.random() - 0.5)
    setQuestions(shuffled)

    // Create a session record in the database
    const { data: session } = await supabase
      .from('sessions')
      .insert({ user_id: profile.id, total: shuffled.length })
      .select()
      .single()
    setSessionId(session?.id)

    setLoading(false)
    setupQuestion(shuffled[0])
  }

  // ── Set up a single question ───────────
  const setupQuestion = useCallback((q) => {
    const words = q.spanish.split(' ')
    setCorrectWords(words)

    const all = [...words, ...(q.distractors || [])].sort(() => Math.random() - 0.5)
    setTileWords(all)
    setTileUsed(new Array(all.length).fill(false))
    setAnswerWords(new Array(words.length).fill(null))
    setSelectedTile(null)
    setPassed(false)
    setFirstTry(true)
    setHintCount(0)
    setFeedback(null)
    setSlotColors(new Array(words.length).fill('#2a2a4a'))
  }, [])

  // ── Tile click: select it ──────────────
  function handleTile(i) {
    if (tileUsed[i] || passed) return
    setSelectedTile(i)
  }

  // ── Slot click: place selected tile ───
  function handleSlot(i) {
    if (passed) return

    let newTileUsed    = [...tileUsed]
    let newAnswerWords = [...answerWords]

    // Return existing word in this slot
    if (answerWords[i] !== null) {
      const word = answerWords[i]
      const tileIdx = tileWords.findIndex((w, j) => w === word && tileUsed[j])
      if (tileIdx !== -1) newTileUsed[tileIdx] = false
      newAnswerWords[i] = null
    }

    // Place selected tile
    if (selectedTile !== null) {
      newAnswerWords[i]        = tileWords[selectedTile]
      newTileUsed[selectedTile] = true
      setSelectedTile(null)
    }

    setTileUsed(newTileUsed)
    setAnswerWords(newAnswerWords)
    setSlotColors(newAnswerWords.map(w =>
      w !== null ? '#1b4f72' : '#2a2a4a'
    ))
  }

  // ── Clean word for comparison ──────────
  function clean(w) { return (w || '').replace(/[¿?.,!¡]/g, '').toLowerCase().trim() }

  // ── Check answer ───────────────────────
  async function checkAnswer() {
    if (answerWords.includes(null)) {
      setFeedback({ text: 'Fill all the boxes first! 📝', color: '#f5a623' })
      return
    }

    const isCorrect = answerWords.every((w, i) => clean(w) === clean(correctWords[i]))

    if (isCorrect) {
      setPassed(true)
      const earnedPoint = firstTry && hintCount === 0
      if (earnedPoint) setScore(s => s + 1)

      setFeedback({ text: `🎉 ¡Correcto! Well done, ${profile.name}!`, color: '#2ecc71' })
      setSlotColors(correctWords.map(() => '#145a32'))

      // Save progress to database
      await supabase.from('progress').insert({
        user_id:     profile.id,
        question_id: questions[idx].id,
        correct:     true,
        hints_used:  hintCount,
        attempts:    firstTry ? 1 : 2
      })

    } else {
      setFirstTry(false)
      setFeedback({ text: `❌ Not quite, ${profile.name} — try again!`, color: '#e94560' })
      setSlotColors(answerWords.map((w, i) =>
        clean(w) === clean(correctWords[i]) ? '#145a32' : '#7b241c'
      ))

      // Record mistake once
      const q = questions[idx]
      if (!mistakes.find(m => m.id === q.id)) {
        setMistakes(prev => [...prev, {
          id:      q.id,
          english: q.english,
          given:   answerWords.join(' '),
          correct: q.spanish
        }])
        // Save incorrect attempt
        await supabase.from('progress').insert({
          user_id:     profile.id,
          question_id: q.id,
          correct:     false,
          hints_used:  hintCount,
          attempts:    1
        })
      }
    }
  }

  // ── Use a hint ─────────────────────────
  function useHint() {
    if (passed) return

    let newAnswerWords = [...answerWords]
    let newTileUsed    = [...tileUsed]
    let hintGiven      = false

    for (let i = 0; i < correctWords.length; i++) {
      if (newAnswerWords[i] === null || clean(newAnswerWords[i]) !== clean(correctWords[i])) {
        // Return wrong word if present
        if (newAnswerWords[i] !== null) {
          const j = tileWords.findIndex((w, k) => w === newAnswerWords[i] && newTileUsed[k])
          if (j !== -1) newTileUsed[j] = false
        }
        // Place correct word
        const j = tileWords.findIndex((w, k) => clean(w) === clean(correctWords[i]) && !newTileUsed[k])
        if (j !== -1) {
          newAnswerWords[i] = tileWords[j]
          newTileUsed[j]    = true
          hintGiven = true
        }
        break
      }
    }

    if (hintGiven) {
      setAnswerWords(newAnswerWords)
      setTileUsed(newTileUsed)
      setHintCount(h => h + 1)
      setHintsTotal(h => h + 1)
      setSlotColors(newAnswerWords.map(w => w !== null ? '#8e44ad' : '#2a2a4a'))
    } else {
      setFeedback({ text: 'Looking correct — hit Check Answer!', color: '#f5a623' })
    }
  }

  // ── Clear answer ───────────────────────
  function clearAnswer() {
    if (passed) return
    setTileUsed(new Array(tileWords.length).fill(false))
    setAnswerWords(new Array(correctWords.length).fill(null))
    setSlotColors(new Array(correctWords.length).fill('#2a2a4a'))
    setSelectedTile(null)
    setFeedback(null)
  }

  // ── Next question ──────────────────────
  async function nextQuestion() {
    const nextIdx = idx + 1
    if (nextIdx >= questions.length) {
      // Session complete — update session record
      if (sessionId) {
        await supabase.from('sessions')
          .update({ score, completed: true, completed_at: new Date().toISOString() })
          .eq('id', sessionId)
      }
      // Mark assignment complete if applicable
      if (assignmentId) {
        await supabase.from('assignments')
          .update({ completed: true })
          .eq('id', assignmentId)
      }
      setDone(true)
    } else {
      setIdx(nextIdx)
      setupQuestion(questions[nextIdx])
    }
  }

  // ── Results screen ─────────────────────
  if (done) {
    const total = questions.length
    const pct   = Math.round((score / total) * 100)
    return (
      <div style={styles.page}>
        <div style={styles.resultsCard}>
          <div style={{ fontSize: 52 }}>🏆</div>
          <h2 style={styles.resultsTitle}>Session Complete!</h2>
          <p style={styles.resultsName}>Well done, {profile.name}!</p>
          <p style={styles.resultsScore}>{score} / {total} correct  ({pct}%)</p>
          <p style={{ color: '#8888aa', fontSize: 13 }}>Hints used: {hintsTotal}</p>
          <p style={{ color: '#2ecc71', fontSize: 18, fontWeight: 700, margin: '16px 0' }}>
            {pct === 100 ? '¡Perfecto! Full marks!' :
             pct >= 70   ? '¡Muy bien! Great work!' :
             pct >= 40   ? '¡Buen intento! Keep going!' :
                           'Practice makes perfect! 💪'}
          </p>

          {mistakes.length > 0 && (
            <div style={styles.mistakesList}>
              <p style={{ color: '#e94560', fontWeight: 700, marginBottom: 10 }}>
                Mistakes to review:
              </p>
              {mistakes.map((m, i) => (
                <div key={i} style={styles.mistakeCard}>
                  <p style={{ color: '#f5a623', margin: '0 0 4px' }}>{m.english}</p>
                  <p style={{ color: '#e94560', margin: '0 0 2px', fontSize: 13 }}>
                    You: {m.given}
                  </p>
                  <p style={{ color: '#2ecc71', margin: 0, fontSize: 13 }}>
                    Correct: {m.correct}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button style={styles.btnGold}   onClick={() => navigate('/')}>
              Back to Dashboard
            </button>
            <button style={styles.btnAccent} onClick={() => { setDone(false); setIdx(0); setScore(0); setHintsTotal(0); setMistakes([]); setupQuestion(questions[0]) }}>
              Play Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) return <div style={styles.page}><p style={{ color: '#8888aa', margin: 'auto' }}>Loading questions...</p></div>

  const q = questions[idx]

  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/')}>← Dashboard</button>
        <h1 style={styles.headerTitle}>Sentence Builder</h1>
        <span style={styles.progress}>
          {idx + 1} / {questions.length}  |  Score: {score}
        </span>
      </div>

      {/* English sentence */}
      <div style={styles.challengePanel}>
        <p style={styles.challengeLabel}>Translate this sentence:</p>
        <p style={styles.challengeText}>{q?.english}</p>
        {topicFilter && (
          <span style={styles.topicBadge}>
            {topicFilter} · {difficultyFilter === '1' ? 'Easy' : difficultyFilter === '2' ? 'Medium' : 'Hard'}
          </span>
        )}
      </div>

      {/* Answer slots */}
      <p style={styles.instrLabel}>Click a tile then click a box to place it:</p>
      <div style={styles.slotsRow}>
        {correctWords.map((_, i) => (
          <button key={i} style={{ ...styles.slot, background: slotColors[i] || '#2a2a4a' }}
            onClick={() => handleSlot(i)}>
            {answerWords[i] || '___'}
          </button>
        ))}
      </div>

      {/* Feedback */}
      {feedback && (
        <p style={{ ...styles.feedback, color: feedback.color }}>{feedback.text}</p>
      )}

      {/* Word bank */}
      <p style={styles.instrLabel}>Word bank:</p>
      <div style={styles.tilesRow}>
        {tileWords.map((word, i) => (
          <button key={i}
            style={{
              ...styles.tile,
              background: tileUsed[i] ? '#222240'
                : selectedTile === i ? '#e94560'
                : '#0f3460',
              color: tileUsed[i] ? '#555577' : 'white',
              cursor: tileUsed[i] ? 'default' : 'pointer'
            }}
            onClick={() => handleTile(i)}
            disabled={tileUsed[i]}>
            {word}
          </button>
        ))}
      </div>

      {/* Control buttons */}
      <div style={styles.btnRow}>
        <button style={styles.btnGold}   onClick={checkAnswer}>✅ Check Answer</button>
        <button style={styles.btnPurple} onClick={useHint}>💡 Hint {hintCount > 0 ? `(${hintCount})` : ''}</button>
        <button style={styles.btnDark}   onClick={clearAnswer}>🔄 Clear</button>
        <button style={{
          ...styles.btnNext,
          background: passed ? '#f5a623' : '#222240',
          color:      passed ? '#1a1a2e' : '#555577',
          cursor:     passed ? 'pointer'  : 'default'
        }} onClick={passed ? nextQuestion : undefined}
          disabled={!passed}>
          Next ➡️
        </button>
      </div>

    </div>
  )
}

// ── Styles ────────────────────────────────────────────────
const S = { fontFamily: 'Helvetica, sans-serif' }
const styles = {
  page:           { minHeight: '100vh', background: '#1a1a2e', ...S, paddingBottom: 40 },
  header:         { background: '#e94560', padding: '14px 24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle:    { color: 'white', fontFamily: 'Georgia,serif', fontSize: 22, margin: 0 },
  backBtn:        { background: 'rgba(0,0,0,0.2)', border: 'none', color: 'white',
                    padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
  progress:       { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  challengePanel: { background: '#16213e', margin: '20px 24px 8px',
                    borderRadius: 12, padding: '20px 24px', textAlign: 'center' },
  challengeLabel: { color: '#8888aa', fontSize: 13, margin: '0 0 8px' },
  challengeText:  { color: '#f5a623', fontFamily: 'Georgia,serif',
                    fontSize: 26, margin: 0, fontWeight: 700 },
  topicBadge:     { background: '#0f3460', color: '#8888aa', fontSize: 11,
                    padding: '4px 12px', borderRadius: 20, display: 'inline-block', marginTop: 10 },
  instrLabel:     { color: '#8888aa', fontSize: 12, textAlign: 'center',
                    margin: '14px 0 6px' },
  slotsRow:       { display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
                    gap: 8, padding: '0 24px' },
  slot:           { minWidth: 90, padding: '12px 10px', border: '2px solid #2a3a5a',
                    borderRadius: 10, color: '#eaeaea', fontSize: 14, fontWeight: 700,
                    cursor: 'pointer', transition: 'background 0.15s' },
  feedback:       { textAlign: 'center', fontSize: 18, fontWeight: 700,
                    fontFamily: 'Georgia,serif', margin: '14px 0 0' },
  tilesRow:       { display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
                    gap: 8, padding: '0 24px' },
  tile:           { minWidth: 90, padding: '12px 10px', border: 'none',
                    borderRadius: 10, fontSize: 14, fontWeight: 700,
                    transition: 'background 0.15s' },
  btnRow:         { display: 'flex', justifyContent: 'center', gap: 10,
                    padding: '20px 24px 0', flexWrap: 'wrap' },
  btnGold:        { background: '#f5a623', border: 'none', color: '#1a1a2e',
                    padding: '11px 20px', borderRadius: 10, fontWeight: 700,
                    cursor: 'pointer', fontSize: 14 },
  btnPurple:      { background: '#8e44ad', border: 'none', color: 'white',
                    padding: '11px 20px', borderRadius: 10, fontWeight: 700,
                    cursor: 'pointer', fontSize: 14 },
  btnDark:        { background: '#0f3460', border: 'none', color: '#eaeaea',
                    padding: '11px 20px', borderRadius: 10, fontWeight: 700,
                    cursor: 'pointer', fontSize: 14 },
  btnAccent:      { background: '#e94560', border: 'none', color: 'white',
                    padding: '11px 20px', borderRadius: 10, fontWeight: 700,
                    cursor: 'pointer', fontSize: 14 },
  btnNext:        { padding: '11px 20px', border: 'none', borderRadius: 10,
                    fontWeight: 700, fontSize: 14, transition: 'all 0.2s' },
  resultsCard:    { maxWidth: 520, margin: '60px auto', background: '#16213e',
                    borderRadius: 16, padding: '40px 32px', textAlign: 'center' },
  resultsTitle:   { color: '#f5a623', fontFamily: 'Georgia,serif',
                    fontSize: 28, margin: '12px 0 8px' },
  resultsName:    { color: '#eaeaea', fontSize: 18, margin: '0 0 8px' },
  resultsScore:   { color: '#eaeaea', fontSize: 22, fontWeight: 700 },
  mistakesList:   { background: '#0f2040', borderRadius: 10, padding: 16,
                    marginTop: 16, textAlign: 'left' },
  mistakeCard:    { background: '#16213e', borderRadius: 8, padding: '10px 14px',
                    marginBottom: 8 }
}
