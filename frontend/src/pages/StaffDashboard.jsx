import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../utils/api'
import { useToast } from '../components/Toast'
import StatusPill from '../components/StatusPill'

const HOSTELS = ['BH1', 'BH2', 'BH3', 'BH4', 'GH1', 'GH2']

function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap
        ${active ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Outfit' }}>Staff Dashboard</h1>
        <p className="text-slate-400 text-sm mt-0.5">{user?.full_name} · {user?.department}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        {[
          { label: 'Pending',     val: pending,  color: 'text-yellow-400' },
          { label: 'In Progress', val: progress, color: 'text-blue-400' },
          { label: 'Resolved',    val: resolved, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className={`text-2xl font-bold ${s.color}`} style={{ fontFamily: 'Outfit' }}>{s.val}</div>
            <div className="text-slate-500 text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 mb-6">
        {[['complaints','Complaints'],['my-slots','My Slots'],['new-slot','Create Slot']].map(([k, l]) => (
          <Tab key={k} label={l} active={tab === k} onClick={() => setTab(k)} />
        ))}
      </div>

      {/* ── Complaints ───────────────────────────────────────────── */}
      {tab === 'complaints' && (
        <div className="space-y-3">
          {loading && <div className="text-slate-500 text-sm">Loading…</div>}
          {!loading && complaints.length === 0 && (
            <div className="text-slate-500 text-sm py-12 text-center">No complaints for your department yet</div>
          )}
          {complaints.map(c => (
            <div key={c.complaint_id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="text-xs text-slate-600">#{c.complaint_id}</span>
                    {c.priority === 'urgent' && (
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded ring-1 ring-red-500/30">Urgent</span>
                    )}
                  </div>
                  <div className="text-white font-medium">{c.issue}</div>
                  {c.details && <div className="text-slate-400 text-sm mt-0.5">{c.details}</div>}
                  <div className="text-slate-500 text-sm mt-0.5">{c.student_email}</div>
                  <div className="text-slate-600 text-xs mt-1">{new Date(c.created_at).toLocaleString()}</div>
                </div>
                <StatusPill status={c.status} />
              </div>
              {NEXT_STATUS[c.status] && (
                <button onClick={() => updateStatus(c.complaint_id, NEXT_STATUS[c.status])}
                  className="text-sm bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 px-4 py-2 rounded-lg transition-colors font-medium ring-1 ring-blue-500/30">
                  Mark as {NEXT_STATUS[c.status]} →
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── My Slots ─────────────────────────────────────────────── */}
      {tab === 'my-slots' && (
        <div className="space-y-3">
          {slots.length === 0 && (
            <div className="text-slate-500 text-sm py-12 text-center">
              No slots created yet.{' '}
              <button onClick={() => setTab('new-slot')} className="text-blue-400 hover:text-blue-300">
                Create one →
              </button>
            </div>
          )}
          {slots.map(s => (
            <div key={s.slot_id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between gap-3">
              <div>
                <div className="text-white font-medium">{s.slot_time}</div>
                <div className="text-slate-400 text-sm mt-0.5">{s.visit_date} · {s.hostel_name}</div>
                <div className="text-slate-600 text-xs mt-1">{s.current_bookings}/{s.max_capacity} bookings</div>
              </div>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ring-1 ${
                s.status === 'full'
                  ? 'bg-red-400/15 text-red-300 ring-red-400/30'
                  : 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/30'
              }`}>
                {s.status === 'full' ? 'Full' : 'Open'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Create Slot ──────────────────────────────────────────── */}
      {tab === 'new-slot' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg">
          <h2 className="text-lg font-semibold text-white mb-5" style={{ fontFamily: 'Outfit' }}>Create Visit Slot</h2>
          <form onSubmit={createSlot} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Visit date *</label>
              <input type="date" value={sForm.visit_date} onChange={e => setSForm(f => ({ ...f, visit_date: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Time slot *</label>
              <input type="text" value={sForm.slot_time} onChange={e => setSForm(f => ({ ...f, slot_time: e.target.value }))}
                placeholder="e.g. 10:00 AM – 11:00 AM"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Hostel</label>
              <select value={sForm.hostel_name} onChange={e => setSForm(f => ({ ...f, hostel_name: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {HOSTELS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Max capacity</label>
              <input type="number" min={1} max={20} value={sForm.max_capacity}
                onChange={e => setSForm(f => ({ ...f, max_capacity: Number(e.target.value) }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit"
              className="w-full bg-blue-500 hover:bg-blue-400 text-white font-semibold py-2.5 rounded-xl transition-colors">
              Create slot
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
