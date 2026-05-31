import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../utils/api'
import { useToast } from '../components/Toast'
import StatusPill from '../components/StatusPill'

const CATEGORIES = ['Electrical', 'Plumbing', 'Civil', 'Carpentry', 'Network', 'Other']
const TASKS = ['Bed linen change', 'Floor sweep', 'Washroom cleaning', 'Garbage collection', 'Window cleaning', 'Dusting']

function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap
        ${active ? 'bg-teal-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
      {label}
    </button>
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
    { label: 'Total',     val: complaints.length,                                         color: 'text-white' },
    { label: 'Pending',   val: complaints.filter(c => c.status === 'Pending').length,     color: 'text-yellow-400' },
    { label: 'Resolved',  val: complaints.filter(c => c.status === 'Resolved').length,    color: 'text-emerald-400' },
    { label: 'Escalated', val: complaints.filter(c => c.status === 'Escalated').length,   color: 'text-orange-400' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Outfit' }}>
          Hi, {(user?.full_name || user?.name || '').split(' ')[0]} 👋
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {user?.hostel_name && `${user.hostel_name} · `}
          {user?.room_number && `Room ${user.room_number}`}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
        {stats.map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className={`text-2xl font-bold ${s.color}`} style={{ fontFamily: 'Outfit' }}>{s.val}</div>
            <div className="text-slate-500 text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
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
        <div className="space-y-3">
          {loading && <div className="text-slate-500 text-sm">Loading…</div>}
          {!loading && complaints.length === 0 && (
            <div className="text-slate-500 text-sm py-12 text-center">
              No complaints yet.{' '}
              <button onClick={() => setTab('new-complaint')} className="text-teal-400 hover:text-teal-300">
                Raise one →
              </button>
            </div>
          )}
          {complaints.map(c => (
            <div key={c.complaint_id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="text-xs text-slate-600">#{c.complaint_id}</span>
                    <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">{c.category}</span>
                    {c.priority === 'urgent' && (
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded ring-1 ring-red-500/30">Urgent</span>
                    )}
                  </div>
                  <div className="text-white font-medium">{c.issue}</div>
                  {c.details && <div className="text-slate-400 text-sm mt-0.5">{c.details}</div>}
                  <div className="text-slate-600 text-xs mt-1.5">{new Date(c.created_at).toLocaleString()}</div>
                </div>
                <StatusPill status={c.status} />
              </div>

              {c.status === 'Pending Confirmation' && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-800">
                  <button onClick={() => confirmResolution(c.complaint_id, 'confirm')}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium py-2 rounded-lg transition-colors">
                    ✓ Confirm resolved
                  </button>
                  <button onClick={() => confirmResolution(c.complaint_id, 'dispute')}
                    className="flex-1 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-sm font-medium py-2 rounded-lg transition-colors ring-1 ring-red-500/30">
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
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg">
          <h2 className="text-lg font-semibold text-white mb-5" style={{ fontFamily: 'Outfit' }}>New Complaint</h2>
          <form onSubmit={submitComplaint} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Category</label>
              <select value={cForm.category} onChange={e => setCForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Issue *</label>
              <input type="text" value={cForm.issue} onChange={e => setCForm(f => ({ ...f, issue: e.target.value }))}
                maxLength={255}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Brief description of the problem" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Details</label>
              <textarea value={cForm.details} onChange={e => setCForm(f => ({ ...f, details: e.target.value }))} rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                placeholder="Any additional context…" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Priority</label>
              <div className="flex gap-4">
                {['normal', 'urgent'].map(p => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={cForm.priority === p} onChange={() => setCForm(f => ({ ...f, priority: p }))}
                      className="accent-teal-500" />
                    <span className="text-sm text-slate-300 capitalize">{p}</span>
                  </label>
                ))}
              </div>
            </div>
            <button type="submit"
              className="w-full bg-teal-500 hover:bg-teal-400 text-white font-semibold py-2.5 rounded-xl transition-colors">
              Submit complaint
            </button>
          </form>
        </div>
      )}

      {/* ── My Housekeeping ──────────────────────────────────────── */}
      {tab === 'housekeeping' && (
        <div className="space-y-3">
          {!loading && housekeeping.length === 0 && (
            <div className="text-slate-500 text-sm py-12 text-center">
              No requests yet.{' '}
              <button onClick={() => setTab('new-housekeeping')} className="text-teal-400 hover:text-teal-300">
                Request cleaning →
              </button>
            </div>
          )}
          {housekeeping.map(h => (
            <div key={h.request_id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between gap-3">
              <div>
                <div className="text-white font-medium">{h.task}</div>
                {h.notes && <div className="text-slate-400 text-sm mt-0.5">{h.notes}</div>}
                <div className="text-slate-600 text-xs mt-1">{new Date(h.created_at).toLocaleString()}</div>
              </div>
              <StatusPill status={h.status} />
            </div>
          ))}
        </div>
      )}

      {/* ── New Housekeeping ─────────────────────────────────────── */}
      {tab === 'new-housekeeping' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg">
          <h2 className="text-lg font-semibold text-white mb-5" style={{ fontFamily: 'Outfit' }}>Request Cleaning</h2>
          <form onSubmit={submitHousekeeping} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Task *</label>
              <select value={hForm.task} onChange={e => setHForm(f => ({ ...f, task: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">Select a task</option>
                {TASKS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Notes</label>
              <textarea value={hForm.notes} onChange={e => setHForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                placeholder="Any special instructions…" />
            </div>
            <button type="submit"
              className="w-full bg-teal-500 hover:bg-teal-400 text-white font-semibold py-2.5 rounded-xl transition-colors">
              Submit request
            </button>
          </form>
        </div>
      )}

      {/* ── Book a Slot ──────────────────────────────────────────── */}
      {tab === 'slots' && (
        <div className="space-y-3">
          {!loading && slots.length === 0 && (
            <div className="text-slate-500 text-sm py-12 text-center">No visit slots available right now</div>
          )}
          {slots.map(s => (
            <div key={s.slot_id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
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
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ring-1 ${
                  s.status === 'full'
                    ? 'bg-red-400/15 text-red-300 ring-red-400/30'
                    : 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/30'
                }`}>
                  {s.status === 'full' ? 'Full' : 'Available'}
                </span>
              </div>

              {s.status !== 'full' && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                  {bookingSlot === s.slot_id ? (
                    <div className="flex gap-2">
                      <select value={bookingComplaint} onChange={e => setBookingComplaint(e.target.value)}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                        <option value="">Select a complaint…</option>
                        {complaints
                          .filter(c => !['Resolved', 'Disputed'].includes(c.status))
                          .map(c => (
                            <option key={c.complaint_id} value={c.complaint_id}>
                              #{c.complaint_id} — {c.issue}
                            </option>
                          ))}
                      </select>
                      <button onClick={bookSlot}
                        className="bg-teal-500 hover:bg-teal-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
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
