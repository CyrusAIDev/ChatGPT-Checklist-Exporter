import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase/client'

type AuthPromptProps = {
  user: User | null
  isPro: boolean
  upgradeBusy: boolean
  onSignIn: (user: User) => void
  onSignOut: () => void
  onUpgradePro: () => void
}

type Stage = 'email' | 'otp'

export function AuthPrompt({ user, isPro, upgradeBusy, onSignIn, onSignOut, onUpgradePro }: AuthPromptProps) {
  const [stage, setStage] = useState<Stage>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (user) {
    return (
      <div className="auth-prompt auth-prompt--synced">
        <div className="auth-prompt__synced-info">
          <span className="auth-prompt__synced-label">
            <span className="auth-prompt__synced-check" aria-hidden>
              {isPro ? '★' : '✓'}
            </span>
            {' '}{isPro ? 'Pro' : 'Free'} · {user.email}
          </span>
          {!isPro && (
            <button
              type="button"
              className="auth-prompt__upgrade-btn"
              onClick={onUpgradePro}
              disabled={upgradeBusy}
            >
              {upgradeBusy ? 'Upgrading…' : 'Upgrade to Pro'}
            </button>
          )}
        </div>
        <button
          type="button"
          className="auth-prompt__sign-out"
          onClick={onSignOut}
        >
          Sign out
        </button>
      </div>
    )
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    })
    setBusy(false)
    if (err) {
      setError(err.message)
      return
    }
    setStage('otp')
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otp.trim()) return
    setBusy(true)
    setError(null)
    const { data, error: err } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: 'email',
    })
    setBusy(false)
    if (err || !data.user) {
      setError(err?.message ?? 'Verification failed.')
      return
    }
    onSignIn(data.user)
  }

  return (
    <div className="auth-prompt">
      <p className="auth-prompt__title">Back up your library</p>
      <p className="auth-prompt__sub">Sign in to sync checklists across devices.</p>
      {error ? (
        <p className="auth-prompt__error">{error}</p>
      ) : null}
      {stage === 'email' ? (
        <form className="auth-prompt__form" onSubmit={handleSendCode}>
          <div className="auth-prompt__row">
            <input
              className="auth-prompt__input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={busy}
            />
            <button type="submit" className="btn-primary auth-prompt__btn" disabled={busy || !email.trim()}>
              {busy ? 'Sending…' : 'Send code'}
            </button>
          </div>
        </form>
      ) : (
        <form className="auth-prompt__form" onSubmit={handleVerify}>
          <p className="auth-prompt__sub">Check your email for a 6-digit code.</p>
          <div className="auth-prompt__row">
            <input
              className="auth-prompt__input auth-prompt__input--otp"
              type="text"
              inputMode="numeric"
              placeholder="00000000"
              maxLength={8}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              required
              autoComplete="one-time-code"
              disabled={busy}
            />
            <button type="submit" className="btn-primary auth-prompt__btn" disabled={busy || otp.length < 6}>
              {busy ? 'Verifying…' : 'Verify'}
            </button>
            <button
              type="button"
              className="btn-secondary auth-prompt__btn"
              onClick={() => { setStage('email'); setOtp(''); setError(null) }}
              disabled={busy}
            >
              Back
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
