import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'

const HOSTELS = ['BH1', 'BH2', 'BH3', 'BH4', 'GH1', 'GH2']

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

  const Field = ({ label, name, type = 'text', placeholder }) => (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      <input
        type={type} value={form[name]} onChange={set(name)} placeholder={placeholder}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
      />
    </div>
  )

  return (
    <div className="min-h-[calc(100vh-57px)] bg-slate-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Outfit' }}>Create account</h1>
          <p className="text-slate-400 mt-1.5 text-sm">Join FixPoint</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Full name *" name="full_name" placeholder="Your full name" />
            <Field label="Email *" name="email" type="email" placeholder="you@iitj.ac.in" />
            <Field label="Password * (min 8 chars)" name="password" type="password" placeholder="••••••••" />

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Role</label>
              <select value={form.role} onChange={set('role')}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                {['student','staff','housekeeping','caretaker'].map(r => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>

            {form.role === 'student' && <>
              <Field label="Roll number" name="roll_number" placeholder="B21CS000" />
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Hostel</label>
                <select value={form.hostel_name} onChange={set('hostel_name')}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Select hostel</option>
                  {HOSTELS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <Field label="Room number" name="room_number" placeholder="101" />
            </>}

            {(form.role === 'staff' || form.role === 'housekeeping') && <>
              <Field label="Department" name="department" placeholder="e.g. Electrical" />
              <Field label="Phone number" name="phone_number" type="tel" placeholder="9876543210" />
            </>}

            <button type="submit" disabled={loading}
              className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors mt-2">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-sm mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-teal-400 hover:text-teal-300">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
