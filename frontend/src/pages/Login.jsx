import { useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const toast     = useToast()

  // Individual state — not a shared object
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)

  // useCallback = stable function refs, won't cause input remounts
  const handleEmail    = useCallback(e => setEmail(e.target.value),    [])
  const handlePassword = useCallback(e => setPassword(e.target.value), [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) { toast('Email is required', 'error'); return }
    if (!password)     { toast('Password is required', 'error'); return }
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-57px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-fadeInUp">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-5">
            <div className="absolute -inset-3 bg-gradient-to-r from-teal-500 to-purple-500 rounded-3xl opacity-30 blur-xl" />
            <div
              className="relative w-14 h-14 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-teal-500/25"
              style={{ fontFamily: 'Outfit' }}
            >
              FP
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Outfit' }}>
            Welcome back
          </h1>
          <p className="text-slate-400 mt-2 text-sm">Sign in to FixPoint</p>
        </div>

        {/* Glass form card */}
        <div className="glass-card-static p-8 glow-teal" style={{ borderRadius: '1.25rem' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={handleEmail}
                autoFocus
                autoComplete="email"
                placeholder="you@iitj.ac.in"
                className="glass-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={handlePassword}
                autoComplete="current-password"
                placeholder="••••••••"
                className="glass-input"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" style={{ animation: 'spin-slow 0.6s linear infinite' }} />
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-teal-400 hover:text-teal-300 transition-colors font-medium">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
