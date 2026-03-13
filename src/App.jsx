// ─────────────────────────────────────────────────────────
//  src/App.js
//  Root of the app. Sets up routing and auth protection.
//
//  Routes:
//    /          → StudentDashboard (students) or TutorDashboard (tutors)
//    /login     → LoginPage
//    /game      → GamePage
// ─────────────────────────────────────────────────────────

import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext.jsx'

import LoginPage        from './pages/LoginPage.jsx'
import StudentDashboard from './pages/StudentDashboard.jsx'
import TutorDashboard   from './pages/TutorDashboard.jsx'
import GamePage         from './pages/GamePage.jsx'

export default function App() {
  return (
    // AuthProvider wraps everything so any page can access the logged-in user
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public route — login / signup */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes — redirect to login if not authenticated */}
          <Route path="/"     element={<ProtectedHome />} />
          <Route path="/game" element={<ProtectedGame />} />

          {/* Catch-all — redirect unknown URLs to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

// ── Protected route wrappers ──────────────────────────────

// Home: shows StudentDashboard or TutorDashboard based on role
function ProtectedHome() {
  const { user, profile, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user)   return <Navigate to="/login" replace />

  // Route to correct dashboard based on role
  return profile?.role === 'tutor'
    ? <TutorDashboard />
    : <StudentDashboard />
}

// Game page: only accessible when logged in
function ProtectedGame() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user)   return <Navigate to="/login" replace />

  return <GamePage />
}

// Simple full-screen loading spinner shown while auth loads
function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', background: '#1a1a2e',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Helvetica, sans-serif', color: '#8888aa'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🇪🇸</div>
        <p>Loading...</p>
      </div>
    </div>
  )
}
