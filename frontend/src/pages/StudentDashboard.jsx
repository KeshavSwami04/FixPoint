import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../utils/api'
import { useToast } from '../components/Toast'
import StatusPill from '../components/StatusPill'

const CATEGORIES = ['Electrical', 'Plumbing', 'Civil', 'Carpentry', 'Network', 'Other']
const TASKS = ['Bed linen change', 'Floor sweep', 'Washroom cleaning', 'Garbage collection', 'Window cleaning', 'Dusting']

function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} className={`tab-glass ${active ? 'active-teal' : ''}`}>
      {label}
    </button>
  )
}

function StatCard({ label, val, color, glow, delay }) {
  return (
    <div
      className="glass-card p-5 animate-fadeInUp"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`text-3xl font-bold ${color}`} style={{ fontFamily: 'Outfit' }}>{val}</div>
      <div className="text-slate-500 text-xs mt-1 tracking-wide uppercase">{label}</div>
      {/* Subtle colored top border */}
      <div className={`absolute top-0 left-4 right-4 h-px bg-gradient-to-r ${glow} opacity-40`} style={{ borderRadius: '1px' }} />
    </div>
  )
}

export default function StudentDashboard() {
  const { user }  = useAuth()
  const toast     = useToast()
  const [tab, setTab]             = useState('complaints')
  const [complaints, setComplaints] = useState([])
  const [housekeeping, setHousekeeping] = useState([])
  const [slots, setSlots]         = useState([])
  const [loading, setLoading]     = useState(true)

  const [cForm, setCForm] = useState({ category: 'Electrical', issue: '', details: '', priority: 'normal' })
  const [hForm, setHForm] = useState({ task: '', notes: '' })
  const [bookingSlot, setBookingSlot]         = useState(null)
  const [bookingComplaint, setBookingComplaint] = useState('')

  // busyRef prevents double-submit on any action
  const busyRef = useRef({})

  const load = async () => {
    setLoading(true)
    try {
      const [c, h, s] = await Promise.all([
        api.get('/complaints'),
        api.get('/housekeeping'),
        api.get('/slots'),
      ])
      setComplaints(c)
      setHousekeeping(h)
      setSlots(s)
    } catch (err) { toast(err.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const submitComplaint = async (e) => {
    e.preventDefault()
    if (busyRef.current.complaint) return
    if (!cForm.issue.trim()) { toast('Please describe the issue', 'error'); return }
    busyRef.current.complaint = true
    try {
      await api.post('/complaints', cForm)
      toast('Complaint submitted!', 'success')
      setCForm({ category: 'Electrical', issue: '', details: '', priority: 'normal' })
      setTab('complaints')
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { busyRef.current.complaint = false }
  }

  const submitHousekeeping = async (e) => {
    e.preventDefault()
    if (busyRef.current.housekeeping) return
    if (!hForm.task) { toast('Please select a task', 'error'); return }
    busyRef.current.housekeeping = true
    try {
      await api.post('/housekeeping', hForm)
      toast('Request submitted!', 'success')
      setHForm({ task: '', notes: '' })
      setTab('housekeeping')
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { busyRef.current.housekeeping = false }
  }

  const confirmResolution = async (cid, action) => {
    const key = `confirm_${cid}`
    if (busyRef.current[key]) return
    busyRef.current[key] = true
    try {
      await api.patch(`/complaints/${cid}/confirm`, { action })
      toast(action === 'confirm' ? 'Resolution confirmed!' : 'Complaint disputed', action === 'confirm' ? 'success' : 'warning')
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { busyRef.current[key] = false }
  }

  const bookSlot = async () => {
    if (busyRef.current.book) return
    if (!bookingComplaint) { toast('Select a complaint to link', 'error'); return }
    busyRef.current.book = true
    try {
      await api.post(`/slots/${bookingSlot}/book`, { complaint_id: Number(bookingComplaint) })
      toast('Slot booked!', 'success')
      setBookingSlot(null)
      setBookingComplaint('')
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { busyRef.current.book = false }
  }

  const stats = [
    { label: 'Total',     val: complaints.length,                                         color: 'text-white',        glow: 'from-slate-400 to-slate-500' },
    { label: 'Pending',   val: complaints.filter(c => c.status === 'Pending').length,     color: 'text-yellow-400',   glow: 'from-yellow-400 to-amber-400' },
    { label: 'Resolved',  val: complaints.filter(c => c.status === 'Resolved').length,    color: 'text-emerald-400',  glow: 'from-emerald-400 to-teal-400' },
    { label: 'Escalated', val: complaints.filter(c => c.status === 'Escalated').length,   color: 'text-orange-400',   glow: 'from-orange-400 to-amber-400' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-7 animate-fadeInUp">
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Outfit' }}>
          Hi, {(user?.full_name || user?.name || '').split(' ')[0]} 👋
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {user?.hostel_name && `${user.hostel_name} · `}
          {user?.room_number && `Room ${user.room_number}`}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {stats.map((s, i) => (
          <StatCard key={s.label} {...s} delay={i * 80} />
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-7 overflow-x-auto pb-1">
        {[
          ['complaints',      'My Complaints'],
          ['new-complaint',   'New Complaint'],
          ['housekeeping',    'Housekeeping'],
          ['new-housekeeping','Request Cleaning'],
          ['slots',           'Book a Slot'],
        ].map(([key, label]) => (
          <Tab key={key} label={label} active={tab === key} onClick={() => setTab(key)} />
        ))}
      </div>

      {/* ── My Complaints ───────────────────────────────────────── */}
      {tab === 'complaints' && (
        <div className="space-y-3 stagger">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="loader" />
            </div>
          )}
          {!loading && complaints.length === 0 && (
            <div className="text-center py-16 animate-fadeInUp">
              <div className="text-4xl mb-3">📋</div>
              <div className="text-slate-400 text-sm">
                No complaints yet.{' '}
                <button onClick={() => setTab('new-complaint')} className="text-teal-400 hover:text-teal-300 font-medium transition-colors">
                  Raise one →
                </button>
              </div>
            </div>
          )}
          {complaints.map(c => (
            <div key={c.complaint_id} className="glass-card p-5 animate-fadeInUp">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <span className="text-xs text-slate-600 font-mono">#{c.complaint_id}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">{c.category}</span>
                    {c.priority === 'urgent' && (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">⚡ Urgent</span>
                    )}
                  </div>
                  <div className="text-white font-medium">{c.issue}</div>
                  {c.details && <div className="text-slate-400 text-sm mt-0.5">{c.details}</div>}
                  <div className="text-slate-600 text-xs mt-2">{new Date(c.created_at).toLocaleString()}</div>
                </div>
                <StatusPill status={c.status} />
              </div>

              {c.status === 'Pending Confirmation' && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                  <button onClick={() => confirmResolution(c.complaint_id, 'confirm')}
                    className="flex-1 action-btn action-btn-emerald">
                    ✓ Confirm resolved
                  </button>
                  <button onClick={() => confirmResolution(c.complaint_id, 'dispute')}
                    className="flex-1 action-btn action-btn-red">
                    ✗ Dispute
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── New Complaint ────────────────────────────────────────── */}
      {tab === 'new-complaint' && (
        <div className="glass-card-static p-6 max-w-lg glow-teal animate-fadeInUp" style={{ borderRadius: '1.25rem' }}>
          <h2 className="text-lg font-semibold text-white mb-5" style={{ fontFamily: 'Outfit' }}>New Complaint</h2>
          <form onSubmit={submitComplaint} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Category</label>
              <select value={cForm.category} onChange={e => setCForm(f => ({ ...f, category: e.target.value }))}
                className="glass-input">
                {CATEGORIES.map(c => <option key={c} style={{ background: '#1e293b' }}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Issue *</label>
              <input type="text" value={cForm.issue} onChange={e => setCForm(f => ({ ...f, issue: e.target.value }))}
                maxLength={255}
                className="glass-input"
                placeholder="Brief description of the problem" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Details</label>
              <textarea value={cForm.details} onChange={e => setCForm(f => ({ ...f, details: e.target.value }))} rows={3}
                className="glass-input resize-none"
                placeholder="Any additional context…" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Priority</label>
              <div className="flex gap-4">
                {['normal', 'urgent'].map(p => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer group">
                    <input type="radio" checked={cForm.priority === p} onChange={() => setCForm(f => ({ ...f, priority: p }))}
                      className="accent-teal-500" />
                    <span className="text-sm text-slate-400 capitalize group-hover:text-slate-200 transition-colors">{p}</span>
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" className="w-full btn-primary py-2.5">
              Submit complaint
            </button>
          </form>
        </div>
      )}

      {/* ── My Housekeeping ──────────────────────────────────────── */}
      {tab === 'housekeeping' && (
        <div className="space-y-3 stagger">
          {!loading && housekeeping.length === 0 && (
            <div className="text-center py-16 animate-fadeInUp">
              <div className="text-4xl mb-3">🧹</div>
              <div className="text-slate-400 text-sm">
                No requests yet.{' '}
                <button onClick={() => setTab('new-housekeeping')} className="text-teal-400 hover:text-teal-300 font-medium transition-colors">
                  Request cleaning →
                </button>
              </div>
            </div>
          )}
          {housekeeping.map(h => (
            <div key={h.request_id} className="glass-card p-5 flex items-center justify-between gap-3 animate-fadeInUp">
              <div>
                <div className="text-white font-medium">{h.task}</div>
                {h.notes && <div className="text-slate-400 text-sm mt-0.5">{h.notes}</div>}
                <div className="text-slate-600 text-xs mt-1.5">{new Date(h.created_at).toLocaleString()}</div>
              </div>
              <StatusPill status={h.status} />
            </div>
          ))}
        </div>
      )}

      {/* ── New Housekeeping ─────────────────────────────────────── */}
      {tab === 'new-housekeeping' && (
        <div className="glass-card-static p-6 max-w-lg glow-teal animate-fadeInUp" style={{ borderRadius: '1.25rem' }}>
          <h2 className="text-lg font-semibold text-white mb-5" style={{ fontFamily: 'Outfit' }}>Request Cleaning</h2>
          <form onSubmit={submitHousekeeping} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Task *</label>
              <select value={hForm.task} onChange={e => setHForm(f => ({ ...f, task: e.target.value }))}
                className="glass-input">
                <option value="" style={{ background: '#1e293b' }}>Select a task</option>
                {TASKS.map(t => <option key={t} style={{ background: '#1e293b' }}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Notes</label>
              <textarea value={hForm.notes} onChange={e => setHForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                className="glass-input resize-none"
                placeholder="Any special instructions…" />
            </div>
            <button type="submit" className="w-full btn-primary py-2.5">
              Submit request
            </button>
          </form>
        </div>
      )}

      {/* ── Book a Slot ──────────────────────────────────────────── */}
      {tab === 'slots' && (
        <div className="space-y-3 stagger">
          {!loading && slots.length === 0 && (
            <div className="text-center py-16 animate-fadeInUp">
              <div className="text-4xl mb-3">📅</div>
              <div className="text-slate-400 text-sm">No visit slots available right now</div>
            </div>
          )}
          {slots.map(s => (
            <div key={s.slot_id} className="glass-card p-5 animate-fadeInUp">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div>
                  <div className="text-white font-medium">{s.slot_time}</div>
                  <div className="text-slate-400 text-sm mt-0.5">
                    {s.visit_date} · {s.hostel_name} · {s.staff_name}
                  </div>
                  <div className="text-slate-600 text-xs mt-1">
                    {s.current_bookings}/{s.max_capacity} booked
                  </div>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ring-1 ${
                    s.status === 'full'
                      ? 'text-red-300 ring-red-400/25'
                      : 'text-emerald-300 ring-emerald-400/25'
                  }`}
                  style={{
                    background: s.status === 'full' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  {s.status === 'full' ? 'Full' : 'Available'}
                </span>
              </div>

              {s.status !== 'full' && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  {bookingSlot === s.slot_id ? (
                    <div className="flex gap-2">
                      <select value={bookingComplaint} onChange={e => setBookingComplaint(e.target.value)}
                        className="flex-1 glass-input text-sm">
                        <option value="" style={{ background: '#1e293b' }}>Select a complaint…</option>
                        {complaints
                          .filter(c => !['Resolved', 'Disputed'].includes(c.status))
                          .map(c => (
                            <option key={c.complaint_id} value={c.complaint_id} style={{ background: '#1e293b' }}>
                              #{c.complaint_id} — {c.issue}
                            </option>
                          ))}
                      </select>
                      <button onClick={bookSlot} className="btn-primary px-4 py-2 text-sm">
                        Book
                      </button>
                      <button onClick={() => { setBookingSlot(null); setBookingComplaint('') }}
                        className="text-slate-500 hover:text-white text-sm px-3 py-2 transition-colors">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setBookingSlot(s.slot_id)}
                      className="text-sm text-teal-400 hover:text-teal-300 font-medium transition-colors">
                      Book this slot →
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
