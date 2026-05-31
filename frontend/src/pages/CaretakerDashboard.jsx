import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../utils/api'
import { useToast } from '../components/Toast'
import StatusPill from '../components/StatusPill'

function Tab({ label, active, onClick, badge }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap
        ${active ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
      {label}
      {badge > 0 && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${active ? 'bg-white/20' : 'bg-orange-500/20 text-orange-400'}`}>
          {badge}
        </span>
      )}
    </button>
  )
}

export default function CaretakerDashboard() {
  const { user }  = useAuth()
  const toast     = useToast()
  const [tab, setTab]               = useState('complaints')
  const [complaints, setComplaints] = useState([])
  const [escalations, setEscalations] = useState([])
  const [housekeeping, setHousekeeping] = useState([])
  const [filter, setFilter]         = useState('all')
  const [loading, setLoading]       = useState(true)
  const busyRef = useRef({})

  const load = async () => {
    setLoading(true)
    try {
      const [c, e, h] = await Promise.all([
        api.get('/complaints'),
        api.get('/escalations'),
        api.get('/housekeeping'),
      ])
      setComplaints(c)
      setEscalations(e)
      setHousekeeping(h)
    } catch (err) { toast(err.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const forceResolve = async (cid) => {
    const key = `fr_${cid}`
    if (busyRef.current[key]) return
    busyRef.current[key] = true
    try {
      await api.patch(`/complaints/${cid}/force-resolve`)
      toast('Complaint force-resolved', 'success')
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { busyRef.current[key] = false }
  }

  const updateStatus = async (cid, status) => {
    const key = `st_${cid}`
    if (busyRef.current[key]) return
    busyRef.current[key] = true
    try {
      await api.patch(`/complaints/${cid}/status`, { status })
      toast('Status updated', 'success')
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { busyRef.current[key] = false }
  }

  const needsAttention = complaints.filter(c => ['Escalated', 'Disputed'].includes(c.status))
  const filteredComplaints = filter === 'all' ? complaints : complaints.filter(c => c.status === filter)

  const stats = [
    { label: 'Total',          val: complaints.length,                                           color: 'text-white' },
    { label: 'Needs attention', val: needsAttention.length,                                      color: 'text-orange-400' },
    { label: 'Pending',        val: complaints.filter(c => c.status === 'Pending').length,       color: 'text-yellow-400' },
    { label: 'Resolved',       val: complaints.filter(c => c.status === 'Resolved').length,      color: 'text-emerald-400' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Outfit' }}>Caretaker Dashboard</h1>
        <p className="text-slate-400 text-sm mt-0.5">{user?.full_name}</p>
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

      <div className="flex gap-1.5 mb-6 flex-wrap">
        <Tab label="Complaints"  active={tab === 'complaints'}  onClick={() => setTab('complaints')}  badge={needsAttention.length} />
        <Tab label="Escalations" active={tab === 'escalations'} onClick={() => setTab('escalations')} badge={escalations.length} />
        <Tab label="Housekeeping" active={tab === 'housekeeping'} onClick={() => setTab('housekeeping')} />
      </div>

      {/* ── All Complaints ───────────────────────────────────────── */}
      {tab === 'complaints' && (
        <>
          <div className="flex gap-1.5 mb-4 flex-wrap">
            {['all', 'Pending', 'In Progress', 'Escalated', 'Disputed', 'Resolved'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  filter === f ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}>
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {loading && <div className="text-slate-500 text-sm">Loading…</div>}
            {!loading && filteredComplaints.length === 0 && (
              <div className="text-slate-500 text-sm py-12 text-center">No complaints</div>
            )}
            {filteredComplaints.map(c => (
              <div key={c.complaint_id} className={`bg-slate-900 border rounded-xl p-5 ${
                ['Escalated','Disputed'].includes(c.status) ? 'border-orange-500/40' : 'border-slate-800'
              }`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="text-xs text-slate-600">#{c.complaint_id}</span>
                      <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">{c.category}</span>
                      {c.priority === 'urgent' && (
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded ring-1 ring-red-500/30">Urgent</span>
                      )}
                    </div>
                    <div className="text-white font-medium">{c.issue}</div>
                    <div className="text-slate-500 text-sm mt-0.5">{c.student_email}</div>
                    <div className="text-slate-600 text-xs mt-1">{new Date(c.created_at).toLocaleString()}</div>
                  </div>
                  <StatusPill status={c.status} />
                </div>

                {['Escalated', 'Disputed'].includes(c.status) && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-800">
                    <button onClick={() => forceResolve(c.complaint_id)}
                      className="text-sm bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 px-4 py-2 rounded-lg transition-colors font-medium ring-1 ring-orange-500/30">
                      ⚡ Force resolve
                    </button>
                    <button onClick={() => updateStatus(c.complaint_id, 'In Progress')}
                      className="text-sm bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 px-4 py-2 rounded-lg transition-colors font-medium ring-1 ring-blue-500/30">
                      Re-assign to staff
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Escalations ──────────────────────────────────────────── */}
      {tab === 'escalations' && (
        <div className="space-y-3">
          {loading && <div className="text-slate-500 text-sm">Loading…</div>}
          {!loading && escalations.length === 0 && (
            <div className="text-slate-500 text-sm py-12 text-center">No escalations — all good 🎉</div>
          )}
          {escalations.map(e => (
            <div key={e.id} className="bg-slate-900 border border-orange-500/30 rounded-xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-white font-medium">{e.issue}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">{e.category}</span>
                    <StatusPill status={e.status} />
                  </div>
                  <div className="text-slate-500 text-sm mt-0.5">{e.student_email}</div>
                  <span className="inline-block mt-1.5 text-xs bg-orange-500/15 text-orange-300 px-2.5 py-0.5 rounded ring-1 ring-orange-500/30">
                    {e.reason}
                  </span>
                  <div className="text-slate-600 text-xs mt-1">{new Date(e.escalated_at).toLocaleString()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Housekeeping ─────────────────────────────────────────── */}
      {tab === 'housekeeping' && (
        <div className="space-y-3">
          {loading && <div className="text-slate-500 text-sm">Loading…</div>}
          {!loading && housekeeping.length === 0 && (
            <div className="text-slate-500 text-sm py-12 text-center">No housekeeping requests</div>
          )}
          {housekeeping.map(h => (
            <div key={h.request_id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between gap-3">
              <div>
                <div className="text-white font-medium">{h.task}</div>
                <div className="text-slate-400 text-sm mt-0.5">Room {h.room_number} · {h.hostel_name}</div>
                <div className="text-slate-500 text-sm mt-0.5">{h.student_email}</div>
                <div className="text-slate-600 text-xs mt-1">{new Date(h.created_at).toLocaleString()}</div>
              </div>
              <StatusPill status={h.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
