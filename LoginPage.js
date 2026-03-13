// ─────────────────────────────────────────────────────────
//  src/pages/LoginPage.js
//  Handles both login and signup in one page.
//  Switches between modes with a tab toggle.
// ─────────────────────────────────────────────────────────

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const [mode,     setMode]     = useState('login')   // 'login' or 'signup'
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [role,     setRole]     = useState('student') // 'student' or 'tutor'
  const [tutorPin, setTutorPin] = useState('')        // tutor must enter pin
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  // The tutor PIN — change this to something only your tutor knows
  // In production this would be stored as an environment variable
  const TUTOR_PIN = '1234'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'login') {
        // ── Login ──────────────────────────
        const { error } = await signIn(email, password)
        if (error) throw error
        navigate('/')

      } else {
        // ── Sign up ────────────────────────
        if (!name.trim()) throw new Error('Please enter your name')

        // If signing up as tutor, validate the PIN
        if (role === 'tutor' && tutorPin !== TUTOR_PIN) {
          throw new Error('Incorrect tutor PIN. Ask your administrator.')
        }

        const { error } = await signUp(email, password, name, role)
        if (error) throw error

        // After signup show a success message
        setError('✅ Account created! Check your email to confirm, then log in.')
        setMode('login')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Logo / title */}
        <div style={styles.logo}>🇪🇸</div>
        <h1 style={styles.title}>Spanish Learner</h1>
        <p style={styles.subtitle}>
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </p>

        {/* Tab switcher */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(mode === 'login'  ? styles.tabActive : {}) }}
            onClick={() => { setMode('login');  setError('') }}
          >Log In</button>
          <button
            style={{ ...styles.tab, ...(mode === 'signup' ? styles.tabActive : {}) }}
            onClick={() => { setMode('signup'); setError('') }}
          >Sign Up</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>

          {/* Name — signup only */}
          {mode === 'signup' && (
            <input style={styles.input} type="text" placeholder="Your name"
              value={name} onChange={e => setName(e.target.value)} required />
          )}

          <input style={styles.input} type="email" placeholder="Email address"
            value={email} onChange={e => setEmail(e.target.value)} required />

          <input style={styles.input} type="password" placeholder="Password"
            value={password} onChange={e => setPassword(e.target.value)} required />

          {/* Role selector — signup only */}
          {mode === 'signup' && (
            <>
              <select style={styles.input} value={role}
                onChange={e => setRole(e.target.value)}>
                <option value="student">I am a Student</option>
                <option value="tutor">I am a Tutor</option>
              </select>

              {/* Tutor PIN field — only shown when tutor is selected */}
              {role === 'tutor' && (
                <input style={styles.input} type="password"
                  placeholder="Tutor PIN (ask your administrator)"
                  value={tutorPin} onChange={e => setTutorPin(e.target.value)} />
              )}
            </>
          )}

          {/* Error / success message */}
          {error && (
            <p style={{
              ...styles.error,
              color: error.startsWith('✅') ? '#2ecc71' : '#e94560'
            }}>{error}</p>
          )}

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>

        <p style={styles.foot}>
          {mode === 'login'
            ? "Don't have an account? "
            : "Already have an account? "}
          <span style={styles.link}
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}>
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </span>
        </p>

      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: '#1a1a2e', fontFamily: 'Helvetica, sans-serif'
  },
  card: {
    background: '#16213e', borderRadius: 16, padding: '40px 36px',
    width: '100%', maxWidth: 420, textAlign: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
  },
  logo:     { fontSize: 52, marginBottom: 8 },
  title:    { color: '#f5a623', fontFamily: 'Georgia, serif', fontSize: 28, margin: '0 0 4px' },
  subtitle: { color: '#8888aa', fontSize: 14, margin: '0 0 24px' },
  tabs: {
    display: 'flex', marginBottom: 24,
    background: '#0f2040', borderRadius: 8, padding: 4
  },
  tab: {
    flex: 1, padding: '8px 0', border: 'none',
    background: 'transparent', color: '#8888aa',
    cursor: 'pointer', borderRadius: 6, fontSize: 14, fontWeight: 600
  },
  tabActive: { background: '#e94560', color: 'white' },
  form:  { display: 'flex', flexDirection: 'column', gap: 12 },
  input: {
    padding: '12px 14px', background: '#0f2040', border: 'none',
    borderRadius: 8, color: '#eaeaea', fontSize: 14, outline: 'none'
  },
  error: { fontSize: 13, margin: '4px 0', textAlign: 'left' },
  btn: {
    padding: '13px', background: '#e94560', border: 'none',
    borderRadius: 8, color: 'white', fontSize: 15, fontWeight: 700,
    cursor: 'pointer', marginTop: 4
  },
  foot: { color: '#8888aa', fontSize: 13, marginTop: 20 },
  link: { color: '#f5a623', cursor: 'pointer', textDecoration: 'underline' }
}
