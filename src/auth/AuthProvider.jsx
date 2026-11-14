import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppState } from 'react-native'
import { AuthContext } from './AuthContext.js'
import { supabase, supabaseConfigError } from '../lib/supabase.js'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState(supabaseConfigError)

  useEffect(() => {
    if (!supabase) return undefined

    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setError(null)
    })

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) setError(`Sesi tidak dapat dimuat: ${sessionError.message}`)
      else setSession(data.session)
      setLoading(false)
    })

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh()
      else supabase.auth.stopAutoRefresh()
    })

    return () => {
      active = false
      subscription.unsubscribe()
      appStateSubscription.remove()
    }
  }, [])

  // Sesi tamu (Supabase Anonymous Sign-in) untuk pesan lewat QR meja tanpa login — file 13
  const signInGuest = useCallback(async (fullName) => {
    const { data, error: guestError } = await supabase.auth.signInAnonymously({ options: { data: fullName ? { full_name: fullName } : {} } })
    if (guestError) {
      const disabled = /anonymous.*disabled|not enabled/i.test(guestError.message)
      throw new Error(disabled ? 'Pesan tanpa login belum diaktifkan kafe. Silakan masuk atau daftar dulu.' : `Gagal memulai sesi tamu: ${guestError.message}`)
    }
    return data.session
  }, [])
  const isGuest = Boolean(session?.user?.is_anonymous)

  const value = useMemo(() => ({ error, loading, session, supabase, isGuest, signInGuest }), [error, loading, session, isGuest, signInGuest])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
