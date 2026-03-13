// ─────────────────────────────────────────────────────────
//  src/lib/AuthContext.js
//  React context that tracks who is logged in.
//  Wrap the whole app in <AuthProvider> so any component
//  can call useAuth() to get the current user and profile.
// ─────────────────────────────────────────────────────────

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)   // Supabase auth user
  const [profile, setProfile] = useState(null)   // our profiles table row
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if someone is already logged in when app loads
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    // Listen for login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) await fetchProfile(session.user.id)
        else { setProfile(null); setLoading(false) }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  // Sign up a new user
  async function signUp(email, password, name, role = 'student') {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name, role } }  // passed to handle_new_user trigger
    })
    return { data, error }
  }

  // Log in an existing user
  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email, password
    })
    return { data, error }
  }

  // Log out
  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// Shortcut hook — use this in any component
export const useAuth = () => useContext(AuthContext)
