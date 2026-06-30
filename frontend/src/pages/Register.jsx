import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'

const HOSTELS = ['BH1', 'BH2', 'BH3', 'BH4', 'GH1', 'GH2']

const Field = ({ label, name, type = 'text', placeholder, value, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="glass-input"
    />
  </div>
)

export default function Register() {
  const { register } = useAuth()
  const navigate     = useNavigate()
  const toast        = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', role: 'student',
    roll_number: '', hostel_name: '', room_number: '',
    department: '', phone_number: '',
  })

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.full_name.trim()) { toast('Full name is required', 'error'); return }
    if (!form.email.trim())     { toast('Email is required', 'error'); return }
    if (form.password.length < 8) { toast('Password must be at least 8 characters', 'error'); return }
    setLoading(true)
    try {
      await register(form)
      navigate('/dashboard')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-57px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-fadeInUp">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Outfit' }}>
            Create account
          </h1>
          <p className="text-slate-400 mt-2 text-sm">Join FixPoint</p>
        </div>

        <div className="glass-card-static p-8 glow-teal" style={{ borderRadius: '1.25rem' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Full name *" name="full_name" placeholder="Your full name" value={form.full_name} onChange={set('full_name')} />
            <Field label="Email *" name="email" type="email" placeholder="you@iitj.ac.in" value={form.email} onChange={set('email')} />
            <Field label="Password * (min 8 chars)" name="password" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} />

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Role</label>
              <select value={form.role} onChange={set('role')} className="glass-input">
                {['student','staff','housekeeping','caretaker'].map(r => (
                  <option key={r} value={r} style={{ background: '#1e293b' }}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {form.role === 'student' && <>
              <Field label="Roll number" name="roll_number" placeholder="B21CS000" value={form.roll_number} onChange={set('roll_number')} />
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Hostel</label>
                <select value={form.hostel_name} onChange={set('hostel_name')} className="glass-input">
                  <option value="" style={{ background: '#1e293b' }}>Select hostel</option>
                  {HOSTELS.map(h => <option key={h} value={h} style={{ background: '#1e293b' }}>{h}</option>)}
                </select>
              </div>
              <Field label="Room number" name="room_number" placeholder="101" value={form.room_number} onChange={set('room_number')} />
            </>}

            {(form.role === 'staff' || form.role === 'housekeeping') && <>
              <Field label="Department" name="department" placeholder="e.g. Electrical" value={form.department} onChange={set('department')} />
              <Field label="Phone number" name="phone_number" type="tel" placeholder="9876543210" value={form.phone_number} onChange={set('phone_number')} />
            </>}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" style={{ animation: 'spin-slow 0.6s linear infinite' }} />
                  Creating account…
                </span>
              ) : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-teal-400 hover:text-teal-300 transition-colors font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
