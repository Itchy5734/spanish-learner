// ─────────────────────────────────────────────────────────
//  src/pages/StudentDashboard.js
//  The home screen for logged-in students.
//  Shows their stats, assignments, and lets them start a game.
// ─────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

export default function StudentDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const [stats,       setStats]       = useState(null)
  const [assignments, setAssignments] = useState([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (profile) loadData()
  }, [profile])

  async function loadData() {
    setLoading(true)

    // ── Load progress stats ────────────────
    const { data: progressData } = await supabase
      .from('progress')
      .select('correct, hints_used')
      .eq('user_id', profile.id)

    const total   = progressData?.length || 0
    const correct = progressData?.filter(p => p.correct).length || 0
    const hints   = progressData?.reduce((sum, p) => sum + (p.hints_used || 0), 0) || 0

    setStats({ total, correct, hints,
      pct: total > 0 ? Math.round((correct / total) * 100) : 0 })

    // ── Load active assignments ────────────
    const { data: assignData } = await supabase
      .from('assignments')
      .select('*')
      .eq('student_id', profile.id)
      .eq('completed', false)
      .order('created_at', { ascending: false })

    setAssignments(assignData || [])
    setLoading(false)
  }

  if (loading) return <Loading />

  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🇪🇸 Spanish Learner</h1>
          <p style={styles.subtitle}>Welcome back, {profile?.name}!</p>
        </div>
        <button style={styles.signOutBtn} onClick={signOut}>Sign Out</button>
      </div>

      {/* Stats row */}
      <div style={styles.statsRow}>
        <StatCard label="Questions Done" value={stats?.total || 0}    icon="📝" />
        <StatCard label="Correct"        value={`${stats?.pct || 0}%`} icon="✅" />
        <StatCard label="Hints Used"     value={stats?.hints || 0}    icon="💡" />
      </div>

      {/* Assignments from tutor */}
      {assignments.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📋 Assignments from your tutor</h2>
          {assignments.map(a => (
            <div key={a.id} style={styles.assignCard}>
              <div>
                <strong style={{ color: '#f5a623' }}>{a.topic}</strong>
                <span style={styles.badge}>
                  {a.difficulty === 1 ? 'Easy' : a.difficulty === 2 ? 'Medium' : 'Hard'}
                </span>
              </div>
              {a.note && <p style={styles.assignNote}>{a.note}</p>}
              {a.due_date && (
                <p style={styles.assignDue}>Due: {new Date(a.due_date).toLocaleDateString()}</p>
              )}
              <button style={styles.playBtn}
                onClick={() => navigate(`/game?topic=${a.topic}&difficulty=${a.difficulty}&assignment=${a.id}`)}>
                Start Assignment ▶
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Game mode cards */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>🎮 Practice</h2>
        <div style={styles.modeGrid}>

          <ModeCard
            icon="🔤" title="Sentence Builder"
            desc="Arrange words into the correct Spanish sentence"
            active onClick={() => navigate('/game')}
          />
          <ModeCard icon="📇" title="Flashcards"
            desc="Vocabulary practice" active={false} />
          <ModeCard icon="🔘" title="Multiple Choice"
            desc="Pick the correct translation" active={false} />
          <ModeCard icon="✏️" title="Fill in the Blank"
            desc="Complete the sentence" active={false} />

        </div>
      </div>

    </div>
  )
}

// ── Sub-components ────────────────────────────────────────

function StatCard({ label, value, icon }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIcon}>{icon}</div>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  )
}

function ModeCard({ icon, title, desc, active, onClick }) {
  return (
    <div style={{ ...styles.modeCard, opacity: active ? 1 : 0.5 }}
      onClick={active ? onClick : undefined}
      role={active ? 'button' : undefined}>
      <div style={{ fontSize: 36 }}>{icon}</div>
      <div style={styles.modeTitle}>{title}</div>
      <div style={styles.modeDesc}>{desc}</div>
      {active
        ? <div style={styles.playTag}>PLAY ▶</div>
        : <div style={styles.soonTag}>COMING SOON</div>}
    </div>
  )
}

function Loading() {
  return (
    <div style={{ ...styles.page, alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#8888aa' }}>Loading...</p>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────
const styles = {
  page:       { minHeight: '100vh', background: '#1a1a2e', padding: '0 0 40px',
                fontFamily: 'Helvetica, sans-serif' },
  header:     { background: '#e94560', padding: '20px 32px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title:      { color: 'white', fontFamily: 'Georgia,serif', fontSize: 26, margin: 0 },
  subtitle:   { color: 'rgba(255,255,255,0.8)', margin: '4px 0 0', fontSize: 14 },
  signOutBtn: { background: 'rgba(0,0,0,0.2)', border: 'none', color: 'white',
                padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
  statsRow:   { display: 'flex', gap: 16, padding: '24px 32px 8px', flexWrap: 'wrap' },
  statCard:   { background: '#16213e', borderRadius: 12, padding: '20px 28px',
                textAlign: 'center', flex: 1, minWidth: 120 },
  statIcon:   { fontSize: 28, marginBottom: 6 },
  statValue:  { color: '#f5a623', fontSize: 28, fontWeight: 700 },
  statLabel:  { color: '#8888aa', fontSize: 12, marginTop: 4 },
  section:    { padding: '20px 32px' },
  sectionTitle: { color: '#eaeaea', fontFamily: 'Georgia,serif',
                  fontSize: 20, marginBottom: 14 },
  assignCard: { background: '#16213e', borderRadius: 12, padding: '16px 20px',
                marginBottom: 12 },
  badge:      { background: '#0f3460', color: '#f5a623', fontSize: 11,
                padding: '2px 8px', borderRadius: 20, marginLeft: 10 },
  assignNote: { color: '#8888aa', fontSize: 13, margin: '8px 0 4px' },
  assignDue:  { color: '#e94560', fontSize: 12, margin: '4px 0 8px' },
  playBtn:    { background: '#e94560', border: 'none', color: 'white',
                padding: '8px 18px', borderRadius: 8, cursor: 'pointer',
                fontSize: 13, fontWeight: 600, marginTop: 8 },
  modeGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 16 },
  modeCard:   { background: '#16213e', borderRadius: 14, padding: '24px 20px',
                textAlign: 'center', cursor: 'pointer', transition: 'transform 0.15s' },
  modeTitle:  { color: '#f5a623', fontWeight: 700, fontSize: 15, margin: '10px 0 6px' },
  modeDesc:   { color: '#8888aa', fontSize: 12 },
  playTag:    { color: '#e94560', fontSize: 12, fontWeight: 700, marginTop: 12 },
  soonTag:    { color: '#444466', fontSize: 11, marginTop: 12 }
}
