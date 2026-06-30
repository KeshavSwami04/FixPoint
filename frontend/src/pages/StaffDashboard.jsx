import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../utils/api'
import { useToast } from '../components/Toast'
import StatusPill from '../components/StatusPill'

const HOSTELS = ['BH1', 'BH2', 'BH3', 'BH4', 'GH1', 'GH2']

function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} className={`tab-glass ${active ? 'active-blue' : ''}`}>
      {label}
    </button>
  )
}

const NEXT_STATUS = { 'Pending': 'In Progress', 'In Progress': 'Pending Confirmation' }

export default function StaffDashboard() {
  const { user } = useAuth()
  const toast    = useToast()
  const [tab, setTab]               = useState('complaints')
  const [complaints, setComplaints] = useState([])
  const [slots, setSlots]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [sForm, setSForm] = useState({
    visit_date: '', slot_time: '', hostel_name: 'BH1', max_capacity: 8,
  })
  const busyRef = useRef({})

  const load = async () => {
    setLoading(true)
    try {
      const [c, s] = await Promise.all([api.get('/complaints'), api.get('/slots')])
      setComplaints(c)
      setSlots(s.filter(sl => sl.staff_id === user?.id))
    } catch (err) { toast(err.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const updateStatus = async (cid, status) => {
    if (busyRef.current[cid]) return
    busyRef.current[cid] = true
    try {
      await api.patch(`/complaints/${cid}/status`, { status })
      toast('Status updated', 'success')
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { busyRef.current[cid] = false }
  }

  const createSlot = async (e) => {
    e.preventDefault()
    if (!sForm.visit_date) { toast('Visit date is required', 'error'); return }
    if (!sForm.slot_time.trim()) { toast('Slot time is required', 'error'); return }
    try {
      await api.post('/slots', sForm)
      toast('Slot created!', 'success')
      setSForm({ visit_date: '', slot_time: '', hostel_name: 'BH1', max_capacity: 8 })
      setTab('my-slots')
      load()
    } catch (err) { toast(err.message, 'error') }
  }

  const pending   = complaints.filter(c => c.status === 'Pending').length
  const progress  = complaints.filter(c => c.status === 'In Progress').length
  const resolved  = complaints.filter(c => c.status === 'Resolved').length

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-7 animate-fadeInUp">
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Outfit' }}>Staff Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">{user?.full_name} · {user?.department}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Pending',     val: pending,  color: 'text-yellow-400', glow: 'from-yellow-400 to-amber-400' },
          { label: 'In Progress', val: progress, color: 'text-blue-400',   glow: 'from-blue-400 to-cyan-400' },
          { label: 'Resolved',    val: resolved, color: 'text-emerald-400', glow: 'from-emerald-400 to-teal-400' },
        ].map((s, i) => (
          <div key={s.label} className="glass-card p-5 relative animate-fadeInUp" style={{ animationDelay: `${i * 80}ms` }}>
            <div className={`text-3xl font-bold ${s.color}`} style={{ fontFamily: 'Outfit' }}>{s.val}</div>
            <div className="text-slate-500 text-xs mt-1 tracking-wide uppercase">{s.label}</div>
            <div className={`absolute top-0 left-4 right-4 h-px bg-gradient-to-r ${s.glow} opacity-40`} />
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 mb-7">
        {[['complaints','Complaints'],['my-slots','My Slots'],['new-slot','Create Slot']].map(([k, l]) => (
          <Tab key={k} label={l} active={tab === k} onClick={() => setTab(k)} />
        ))}
      </div>

      {/* ── Complaints ───────────────────────────────────────────── */}
      {tab === 'complaints' && (
        <div className="space-y-3 stagger">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="loader" />
            </div>
          )}
          {!loading && complaints.length === 0 && (
            <div className="text-center py-16 animate-fadeInUp">
              <div className="text-4xl mb-3">✅</div>
              <div className="text-slate-400 text-sm">No complaints for your department yet</div>
            </div>
          )}
          {complaints.map(c => (
            <div key={c.complaint_id} className="glass-card p-5 animate-fadeInUp">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <span className="text-xs text-slate-600 font-mono">#{c.complaint_id}</span>
                    {c.priority === 'urgent' && (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">⚡ Urgent</span>
                    )}
                  </div>
                  <div className="text-white font-medium">{c.issue}</div>
                  {c.details && <div className="text-slate-400 text-sm mt-0.5">{c.details}</div>}
                  <div className="text-slate-500 text-sm mt-0.5">{c.student_email}</div>
                  <div className="text-slate-600 text-xs mt-1.5">{new Date(c.created_at).toLocaleString()}</div>
                </div>
                <StatusPill status={c.status} />
              </div>
              {NEXT_STATUS[c.status] && (
                <button onClick={() => updateStatus(c.complaint_id, NEXT_STATUS[c.status])}
                  className="action-btn action-btn-blue">
                  Mark as {NEXT_STATUS[c.status]} →
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── My Slots ─────────────────────────────────────────────── */}
      {tab === 'my-slots' && (
        <div className="space-y-3 stagger">
          {slots.length === 0 && (
            <div className="text-center py-16 animate-fadeInUp">
              <div className="text-4xl mb-3">📅</div>
              <div className="text-slate-400 text-sm">
                No slots created yet.{' '}
                <button onClick={() => setTab('new-slot')} className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                  Create one →
                </button>
              </div>
            </div>
          )}
          {slots.map(s => (
            <div key={s.slot_id} className="glass-card p-5 flex items-center justify-between gap-3 animate-fadeInUp">
              <div>
                <div className="text-white font-medium">{s.slot_time}</div>
                <div className="text-slate-400 text-sm mt-0.5">{s.visit_date} · {s.hostel_name}</div>
                <div className="text-slate-600 text-xs mt-1">{s.current_bookings}/{s.max_capacity} bookings</div>
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
                {s.status === 'full' ? 'Full' : 'Open'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Create Slot ──────────────────────────────────────────── */}
      {tab === 'new-slot' && (
        <div className="glass-card-static p-6 max-w-lg glow-blue animate-fadeInUp" style={{ borderRadius: '1.25rem' }}>
          <h2 className="text-lg font-semibold text-white mb-5" style={{ fontFamily: 'Outfit' }}>Create Visit Slot</h2>
          <form onSubmit={createSlot} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Visit date *</label>
              <input type="date" value={sForm.visit_date} onChange={e => setSForm(f => ({ ...f, visit_date: e.target.value }))}
                className="glass-input glass-input-blue" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Time slot *</label>
              <input type="text" value={sForm.slot_time} onChange={e => setSForm(f => ({ ...f, slot_time: e.target.value }))}
                placeholder="e.g. 10:00 AM – 11:00 AM"
                className="glass-input glass-input-blue" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Hostel</label>
              <select value={sForm.hostel_name} onChange={e => setSForm(f => ({ ...f, hostel_name: e.target.value }))}
                className="glass-input glass-input-blue">
                {HOSTELS.map(h => <option key={h} value={h} style={{ background: '#1e293b' }}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Max capacity</label>
              <input type="number" min={1} max={20} value={sForm.max_capacity}
                onChange={e => setSForm(f => ({ ...f, max_capacity: Number(e.target.value) }))}
                className="glass-input glass-input-blue" />
            </div>
            <button type="submit" className="w-full btn-blue py-2.5">
              Create slot
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
