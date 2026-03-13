// ─────────────────────────────────────────────────────────
//  src/pages/TutorDashboard.js
//  Full tutor control panel:
//  - See all students and their progress
//  - Add / edit / delete questions
//  - Generate questions with AI
//  - Set assignments for individual students
// ─────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { generateQuestions } from '../lib/ai'

// ── Tab names ─────────────────────────────────────────────
const TABS = ['Students', 'Questions', 'AI Generator', 'Assignments']

export default function TutorDashboard() {
  const { profile, signOut } = useAuth()
  const [tab, setTab] = useState('Students')

  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🇪🇸 Tutor Dashboard</h1>
          <p style={styles.subtitle}>Welcome, {profile?.name}</p>
        </div>
        <button style={styles.signOutBtn} onClick={signOut}>Sign Out</button>
      </div>

      {/* Tab bar */}
      <div style={styles.tabBar}>
        {TABS.map(t => (
          <button key={t}
            style={{ ...styles.tabBtn, ...(tab === t ? styles.tabActive : {}) }}
            onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={styles.content}>
        {tab === 'Students'    && <StudentsTab />}
        {tab === 'Questions'   && <QuestionsTab tutorId={profile?.id} />}
        {tab === 'AI Generator'&& <AITab tutorId={profile?.id} />}
        {tab === 'Assignments' && <AssignmentsTab tutorId={profile?.id} />}
      </div>

    </div>
  )
}


// ══════════════════════════════════════════════════════════
//  TAB: STUDENTS
//  Shows all students with their progress stats.
// ══════════════════════════════════════════════════════════
function StudentsTab() {
  const [students, setStudents] = useState([])
  const [selected, setSelected] = useState(null)   // selected student detail
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { loadStudents() }, [])

  async function loadStudents() {
    // Get all student profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('name')

    if (!profiles) { setLoading(false); return }

    // For each student, get their progress summary
    const withStats = await Promise.all(profiles.map(async (s) => {
      const { data: prog } = await supabase
        .from('progress')
        .select('correct, hints_used')
        .eq('user_id', s.id)

      const total   = prog?.length || 0
      const correct = prog?.filter(p => p.correct).length || 0
      return { ...s, total, correct,
        pct: total > 0 ? Math.round((correct / total) * 100) : 0 }
    }))

    setStudents(withStats)
    setLoading(false)
  }

  if (loading) return <p style={styles.dim}>Loading students...</p>
  if (!students.length) return <p style={styles.dim}>No students have signed up yet.</p>

  return (
    <div>
      <h2 style={styles.tabTitle}>All Students ({students.length})</h2>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              {['Name','Questions Done','Correct','Score','Joined','Detail'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map(s => (
              <tr key={s.id} style={styles.tr}>
                <td style={styles.td}>{s.name}</td>
                <td style={styles.td}>{s.total}</td>
                <td style={styles.td}>{s.correct}</td>
                <td style={styles.td}>
                  <span style={{ color: s.pct >= 70 ? '#2ecc71' : s.pct >= 40 ? '#f5a623' : '#e94560' }}>
                    {s.pct}%
                  </span>
                </td>
                <td style={styles.td}>{new Date(s.created_at).toLocaleDateString()}</td>
                <td style={styles.td}>
                  <button style={styles.smallBtn} onClick={() => setSelected(s)}>
                    View →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Student detail modal */}
      {selected && (
        <StudentDetail student={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

function StudentDetail({ student, onClose }) {
  const [detail, setDetail] = useState([])

  useEffect(() => {
    supabase
      .from('progress')
      .select('*, questions(english, spanish)')
      .eq('user_id', student.id)
      .order('completed_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setDetail(data || []))
  }, [student])

  return (
    <div style={styles.modal}>
      <div style={styles.modalBox}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ color: '#f5a623', margin: 0 }}>{student.name} — Recent Activity</h3>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
          <div style={styles.miniStat}>
            <div style={{ color: '#f5a623', fontSize: 22, fontWeight: 700 }}>{student.total}</div>
            <div style={{ color: '#8888aa', fontSize: 11 }}>Total Done</div>
          </div>
          <div style={styles.miniStat}>
            <div style={{ color: '#2ecc71', fontSize: 22, fontWeight: 700 }}>{student.pct}%</div>
            <div style={{ color: '#8888aa', fontSize: 11 }}>Accuracy</div>
          </div>
        </div>
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {detail.map((p, i) => (
            <div key={i} style={styles.detailRow}>
              <span style={{ color: p.correct ? '#2ecc71' : '#e94560', marginRight: 8 }}>
                {p.correct ? '✅' : '❌'}
              </span>
              <span style={{ color: '#eaeaea', fontSize: 13 }}>
                {p.questions?.english}
              </span>
              {p.hints_used > 0 && (
                <span style={{ color: '#8e44ad', fontSize: 11, marginLeft: 8 }}>
                  💡 {p.hints_used} hints
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


// ══════════════════════════════════════════════════════════
//  TAB: QUESTIONS
//  Full CRUD editor for questions.
// ══════════════════════════════════════════════════════════
function QuestionsTab({ tutorId }) {
  const [questions, setQuestions] = useState([])
  const [editing,   setEditing]   = useState(null)  // null = new, obj = edit
  const [form,      setForm]      = useState(emptyForm())
  const [msg,       setMsg]       = useState('')
  const [filter,    setFilter]    = useState('')

  function emptyForm() {
    return { english: '', spanish: '', distractors: '', difficulty: 1, topic: 'general' }
  }

  useEffect(() => { loadQuestions() }, [])

  async function loadQuestions() {
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('type', 'sentence_builder')
      .order('created_at', { ascending: false })
    setQuestions(data || [])
  }

  function selectQuestion(q) {
    setEditing(q)
    setForm({
      english:     q.english,
      spanish:     q.spanish,
      distractors: (q.distractors || []).join(', '),
      difficulty:  q.difficulty || 1,
      topic:       q.topic || 'general'
    })
    setMsg('')
  }

  function newQuestion() {
    setEditing(null)
    setForm(emptyForm())
    setMsg('')
  }

  async function saveQuestion() {
    if (!form.english.trim() || !form.spanish.trim()) {
      setMsg('English and Spanish are required.')
      return
    }
    const payload = {
      type:        'sentence_builder',
      english:     form.english.trim(),
      spanish:     form.spanish.trim(),
      distractors: form.distractors.split(',').map(d => d.trim()).filter(Boolean),
      difficulty:  parseInt(form.difficulty),
      topic:       form.topic.trim() || 'general',
      active:      true,
      created_by:  tutorId
    }

    if (editing) {
      await supabase.from('questions').update(payload).eq('id', editing.id)
      setMsg('✅ Question updated!')
    } else {
      await supabase.from('questions').insert(payload)
      setMsg('✅ Question added!')
    }

    loadQuestions()
    newQuestion()
  }

  async function deleteQuestion(id) {
    if (!window.confirm('Delete this question?')) return
    await supabase.from('questions').delete().eq('id', id)
    loadQuestions()
    newQuestion()
  }

  async function toggleActive(q) {
    await supabase.from('questions').update({ active: !q.active }).eq('id', q.id)
    loadQuestions()
  }

  const filtered = questions.filter(q =>
    !filter || q.english.toLowerCase().includes(filter.toLowerCase()) ||
    q.topic?.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 180px)' }}>

      {/* Left: question list */}
      <div style={styles.listPanel}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input style={styles.searchInput} placeholder="Search..."
            value={filter} onChange={e => setFilter(e.target.value)} />
          <button style={styles.greenBtn} onClick={newQuestion}>+ New</button>
        </div>
        <p style={styles.dim}>{filtered.length} questions</p>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.map(q => (
            <div key={q.id}
              style={{ ...styles.listItem, opacity: q.active ? 1 : 0.5,
                background: editing?.id === q.id ? '#1b4f72' : '#0f2040' }}
              onClick={() => selectQuestion(q)}>
              <div style={{ color: '#eaeaea', fontSize: 13 }}>{q.english}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <span style={styles.chip}>{q.topic}</span>
                <span style={styles.chip}>
                  {q.difficulty === 1 ? 'Easy' : q.difficulty === 2 ? 'Medium' : 'Hard'}
                </span>
                {!q.active && <span style={{ ...styles.chip, background: '#7b241c' }}>Hidden</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: edit form */}
      <div style={styles.editPanel}>
        <h3 style={{ color: '#f5a623', margin: '0 0 16px' }}>
          {editing ? 'Edit Question' : 'New Question'}
        </h3>

        {['english', 'spanish'].map(field => (
          <div key={field} style={{ marginBottom: 12 }}>
            <label style={styles.label}>{field.charAt(0).toUpperCase() + field.slice(1)} sentence</label>
            <input style={styles.input} value={form[field]}
              onChange={e => setForm({ ...form, [field]: e.target.value })} />
          </div>
        ))}

        <div style={{ marginBottom: 12 }}>
          <label style={styles.label}>Distractor words (comma separated)</label>
          <input style={styles.input} placeholder="casa, banco, rojo, lejos, libre"
            value={form.distractors}
            onChange={e => setForm({ ...form, distractors: e.target.value })} />
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Topic</label>
            <input style={styles.input} placeholder="food, travel, places..."
              value={form.topic}
              onChange={e => setForm({ ...form, topic: e.target.value })} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Difficulty</label>
            <select style={styles.input} value={form.difficulty}
              onChange={e => setForm({ ...form, difficulty: e.target.value })}>
              <option value={1}>1 - Easy</option>
              <option value={2}>2 - Medium</option>
              <option value={3}>3 - Hard</option>
            </select>
          </div>
        </div>

        {msg && <p style={{ color: msg.startsWith('✅') ? '#2ecc71' : '#e94560',
          fontSize: 13, margin: '8px 0' }}>{msg}</p>}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button style={styles.goldBtn} onClick={saveQuestion}>
            {editing ? 'Save Changes' : 'Add Question'}
          </button>
          {editing && (
            <>
              <button style={styles.darkBtn} onClick={() => toggleActive(editing)}>
                {editing.active ? 'Hide Question' : 'Show Question'}
              </button>
              <button style={styles.redBtn} onClick={() => deleteQuestion(editing.id)}>
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}


// ══════════════════════════════════════════════════════════
//  TAB: AI GENERATOR
//  Generate batches of questions using Claude AI.
// ══════════════════════════════════════════════════════════
function AITab({ tutorId }) {
  const [topic,      setTopic]      = useState('food')
  const [difficulty, setDifficulty] = useState('easy')
  const [count,      setCount]      = useState(10)
  const [loading,    setLoading]    = useState(false)
  const [preview,    setPreview]    = useState([])
  const [msg,        setMsg]        = useState('')

  const TOPICS = ['food', 'travel', 'family', 'shopping', 'directions',
                  'weather', 'health', 'school', 'work', 'hobbies',
                  'numbers', 'time', 'colours', 'animals', 'body']

  async function generate() {
    setLoading(true)
    setMsg('')
    setPreview([])
    try {
      const questions = await generateQuestions(topic, difficulty, count)
      setPreview(questions)
      setMsg(`✅ Generated ${questions.length} questions — review them below then save.`)
    } catch (err) {
      setMsg(`❌ Error: ${err.message}. Check your Anthropic API key in Vercel settings.`)
    } finally {
      setLoading(false)
    }
  }

  async function saveAll() {
    const toSave = preview.map(q => ({ ...q, created_by: tutorId }))
    const { error } = await supabase.from('questions').insert(toSave)
    if (error) { setMsg('❌ Save failed: ' + error.message); return }
    setMsg(`✅ Saved ${preview.length} questions to the database!`)
    setPreview([])
  }

  function removePreview(i) {
    setPreview(prev => prev.filter((_, j) => j !== i))
  }

  return (
    <div>
      <h2 style={styles.tabTitle}>AI Question Generator</h2>
      <p style={styles.dim}>
        Uses Claude AI to generate Spanish sentence exercises automatically.
        Review them before saving — you can delete any you don't want.
      </p>

      {/* Controls */}
      <div style={styles.aiControls}>
        <div>
          <label style={styles.label}>Topic</label>
          <select style={styles.input} value={topic} onChange={e => setTopic(e.target.value)}>
            {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={styles.label}>Difficulty</label>
          <select style={styles.input} value={difficulty} onChange={e => setDifficulty(e.target.value)}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div>
          <label style={styles.label}>How many?</label>
          <select style={styles.input} value={count} onChange={e => setCount(parseInt(e.target.value))}>
            {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n} questions</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button style={styles.goldBtn} onClick={generate} disabled={loading}>
            {loading ? '⏳ Generating...' : '🤖 Generate with AI'}
          </button>
        </div>
      </div>

      {msg && <p style={{ color: msg.startsWith('✅') ? '#2ecc71' : '#e94560',
        margin: '12px 0', fontSize: 14 }}>{msg}</p>}

      {/* Preview list */}
      {preview.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 8px' }}>
            <h3 style={{ color: '#eaeaea', margin: 0 }}>Preview ({preview.length} questions)</h3>
            <button style={styles.goldBtn} onClick={saveAll}>
              💾 Save All to Database
            </button>
          </div>
          <div style={styles.previewGrid}>
            {preview.map((q, i) => (
              <div key={i} style={styles.previewCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={styles.chip}>{q.topic}</span>
                  <button style={styles.xBtn} onClick={() => removePreview(i)}>✕</button>
                </div>
                <p style={{ color: '#f5a623', margin: '8px 0 4px', fontSize: 14 }}>{q.english}</p>
                <p style={{ color: '#2ecc71', margin: '0 0 6px', fontSize: 13 }}>{q.spanish}</p>
                <p style={{ color: '#8888aa', fontSize: 11 }}>
                  Distractors: {q.distractors.join(', ')}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}


// ══════════════════════════════════════════════════════════
//  TAB: ASSIGNMENTS
//  Set tasks for individual students.
// ══════════════════════════════════════════════════════════
function AssignmentsTab({ tutorId }) {
  const [students,     setStudents]     = useState([])
  const [assignments,  setAssignments]  = useState([])
  const [form,         setForm]         = useState({
    student_id: '', topic: 'general', difficulty: 1,
    due_date: '', note: ''
  })
  const [msg, setMsg] = useState('')

  useEffect(() => {
    loadStudents()
    loadAssignments()
  }, [])

  async function loadStudents() {
    const { data } = await supabase.from('profiles').select('id, name').eq('role', 'student')
    setStudents(data || [])
  }

  async function loadAssignments() {
    const { data } = await supabase
      .from('assignments')
      .select('*, profiles!assignments_student_id_fkey(name)')
      .eq('tutor_id', tutorId)
      .order('created_at', { ascending: false })
    setAssignments(data || [])
  }

  async function createAssignment() {
    if (!form.student_id || !form.topic) {
      setMsg('Please select a student and topic.')
      return
    }
    await supabase.from('assignments').insert({
      ...form,
      tutor_id:   tutorId,
      difficulty: parseInt(form.difficulty)
    })
    setMsg('✅ Assignment created!')
    loadAssignments()
    setForm({ student_id: '', topic: 'general', difficulty: 1, due_date: '', note: '' })
  }

  async function deleteAssignment(id) {
    await supabase.from('assignments').delete().eq('id', id)
    loadAssignments()
  }

  return (
    <div style={{ display: 'flex', gap: 24 }}>

      {/* Create form */}
      <div style={{ flex: 1, maxWidth: 360 }}>
        <h3 style={{ color: '#f5a623', margin: '0 0 16px' }}>Create Assignment</h3>

        <label style={styles.label}>Student</label>
        <select style={styles.input} value={form.student_id}
          onChange={e => setForm({ ...form, student_id: e.target.value })}>
          <option value="">-- Select student --</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <label style={styles.label}>Topic</label>
        <input style={styles.input} placeholder="e.g. food, travel, shopping"
          value={form.topic}
          onChange={e => setForm({ ...form, topic: e.target.value })} />

        <label style={styles.label}>Difficulty</label>
        <select style={styles.input} value={form.difficulty}
          onChange={e => setForm({ ...form, difficulty: e.target.value })}>
          <option value={1}>Easy</option>
          <option value={2}>Medium</option>
          <option value={3}>Hard</option>
        </select>

        <label style={styles.label}>Due date (optional)</label>
        <input style={styles.input} type="date" value={form.due_date}
          onChange={e => setForm({ ...form, due_date: e.target.value })} />

        <label style={styles.label}>Note to student (optional)</label>
        <textarea style={{ ...styles.input, resize: 'vertical', height: 70 }}
          placeholder="e.g. Focus on past tense for our next session"
          value={form.note}
          onChange={e => setForm({ ...form, note: e.target.value })} />

        {msg && <p style={{ color: msg.startsWith('✅') ? '#2ecc71' : '#e94560',
          fontSize: 13, margin: '8px 0' }}>{msg}</p>}

        <button style={styles.goldBtn} onClick={createAssignment}>
          Create Assignment
        </button>
      </div>

      {/* Existing assignments */}
      <div style={{ flex: 2 }}>
        <h3 style={{ color: '#f5a623', margin: '0 0 16px' }}>
          Active Assignments ({assignments.filter(a => !a.completed).length})
        </h3>
        {assignments.length === 0 && <p style={styles.dim}>No assignments yet.</p>}
        {assignments.map(a => (
          <div key={a.id} style={{ ...styles.listItem, opacity: a.completed ? 0.5 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong style={{ color: '#f5a623' }}>
                {a.profiles?.name} — {a.topic}
              </strong>
              <div style={{ display: 'flex', gap: 8 }}>
                {a.completed && <span style={{ ...styles.chip, background: '#145a32' }}>Done ✅</span>}
                <button style={styles.xBtn} onClick={() => deleteAssignment(a.id)}>✕</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <span style={styles.chip}>
                {a.difficulty === 1 ? 'Easy' : a.difficulty === 2 ? 'Medium' : 'Hard'}
              </span>
              {a.due_date && (
                <span style={styles.chip}>Due {new Date(a.due_date).toLocaleDateString()}</span>
              )}
            </div>
            {a.note && <p style={{ color: '#8888aa', fontSize: 12, margin: '6px 0 0' }}>{a.note}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}


// ── Shared styles ─────────────────────────────────────────
const styles = {
  page:       { minHeight: '100vh', background: '#1a1a2e',
                fontFamily: 'Helvetica, sans-serif' },
  header:     { background: '#e94560', padding: '18px 32px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title:      { color: 'white', fontFamily: 'Georgia,serif', fontSize: 26, margin: 0 },
  subtitle:   { color: 'rgba(255,255,255,0.8)', margin: '4px 0 0', fontSize: 14 },
  signOutBtn: { background: 'rgba(0,0,0,0.2)', border: 'none', color: 'white',
                padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
  tabBar:     { display: 'flex', background: '#16213e', padding: '0 32px',
                borderBottom: '2px solid #0f2040' },
  tabBtn:     { padding: '14px 20px', border: 'none', background: 'transparent',
                color: '#8888aa', cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  tabActive:  { color: '#f5a623', borderBottom: '3px solid #f5a623' },
  content:    { padding: '24px 32px' },
  tabTitle:   { color: '#eaeaea', fontFamily: 'Georgia,serif',
                fontSize: 22, margin: '0 0 8px' },
  dim:        { color: '#8888aa', fontSize: 13 },
  tableWrap:  { overflowX: 'auto' },
  table:      { width: '100%', borderCollapse: 'collapse' },
  th:         { color: '#8888aa', fontSize: 12, textAlign: 'left',
                padding: '10px 14px', borderBottom: '1px solid #2a2a4a' },
  tr:         { borderBottom: '1px solid #0f2040' },
  td:         { color: '#eaeaea', padding: '12px 14px', fontSize: 14 },
  smallBtn:   { background: '#0f3460', border: 'none', color: '#f5a623',
                padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
  modal:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1000 },
  modalBox:   { background: '#16213e', borderRadius: 14, padding: 28,
                width: '90%', maxWidth: 560 },
  closeBtn:   { background: 'none', border: 'none', color: '#8888aa',
                fontSize: 18, cursor: 'pointer' },
  miniStat:   { textAlign: 'center' },
  detailRow:  { padding: '8px 0', borderBottom: '1px solid #0f2040',
                display: 'flex', alignItems: 'center' },
  listPanel:  { width: 280, background: '#0f2040', borderRadius: 12,
                padding: 12, display: 'flex', flexDirection: 'column', overflowY: 'hidden' },
  editPanel:  { flex: 1, background: '#0f2040', borderRadius: 12, padding: 20 },
  searchInput:{ flex: 1, background: '#16213e', border: 'none', color: '#eaeaea',
                padding: '8px 10px', borderRadius: 8, fontSize: 13, outline: 'none' },
  listItem:   { background: '#0f2040', borderRadius: 8, padding: '10px 12px',
                marginBottom: 6, cursor: 'pointer' },
  chip:       { background: '#16213e', color: '#8888aa', fontSize: 11,
                padding: '2px 8px', borderRadius: 20 },
  label:      { display: 'block', color: '#8888aa', fontSize: 12, margin: '10px 0 4px' },
  input:      { width: '100%', background: '#16213e', border: 'none', color: '#eaeaea',
                padding: '10px 12px', borderRadius: 8, fontSize: 14, outline: 'none',
                boxSizing: 'border-box' },
  goldBtn:    { background: '#f5a623', border: 'none', color: '#1a1a2e', padding: '10px 20px',
                borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  greenBtn:   { background: '#2ecc71', border: 'none', color: '#1a1a2e', padding: '8px 14px',
                borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  darkBtn:    { background: '#0f3460', border: 'none', color: '#eaeaea', padding: '10px 20px',
                borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  redBtn:     { background: '#7b241c', border: 'none', color: 'white', padding: '10px 20px',
                borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  xBtn:       { background: 'none', border: 'none', color: '#8888aa',
                cursor: 'pointer', fontSize: 16 },
  aiControls: { display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 },
  previewGrid:{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 12 },
  previewCard:{ background: '#0f2040', borderRadius: 10, padding: 14 }
}
