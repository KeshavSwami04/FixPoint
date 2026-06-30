import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../utils/api'
import { useToast } from '../components/Toast'
import StatusPill from '../components/StatusPill'

function Tab({ label, active, onClick, badge }) {
  return (
    <button onClick={onClick}
      className={`tab-glass flex items-center gap-1.5 ${active ? 'active-orange' : ''}`}>
      {label}
      {badge > 0 && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
          active
            ? 'bg-white/15 text-white'
            : 'bg-orange-500/15 text-orange-400'
        }`}>
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
    { label: 'Total',          val: complaints.length,                                           color: 'text-white',       glow: 'from-slate-400 to-slate-500' },
    { label: 'Needs attention', val: needsAttention.length,                                      color: 'text-orange-400',  glow: 'from-orange-400 to-amber-400' },
    { label: 'Pending',        val: complaints.filter(c => c.status === 'Pending').length,       color: 'text-yellow-400',  glow: 'from-yellow-400 to-amber-400' },
    { label: 'Resolved',       val: complaints.filter(c => c.status === 'Resolved').length,      color: 'text-emerald-400', glow: 'from-emerald-400 to-teal-400' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-7 animate-fadeInUp">
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Outfit' }}>Caretaker Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">{user?.full_name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {stats.map((s, i) => (
          <div key={s.label} className="glass-card p-5 relative animate-fadeInUp" style={{ animationDelay: `${i * 80}ms` }}>
            <div className={`text-3xl font-bold ${s.color}`} style={{ fontFamily: 'Outfit' }}>{s.val}</div>
            <div className="text-slate-500 text-xs mt-1 tracking-wide uppercase">{s.label}</div>
            <div className={`absolute top-0 left-4 right-4 h-px bg-gradient-to-r ${s.glow} opacity-40`} />
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 mb-7 flex-wrap">
        <Tab label="Complaints"  active={tab === 'complaints'}  onClick={() => setTab('complaints')}  badge={needsAttention.length} />
        <Tab label="Escalations" active={tab === 'escalations'} onClick={() => setTab('escalations')} badge={escalations.length} />
        <Tab label="Housekeeping" active={tab === 'housekeeping'} onClick={() => setTab('housekeeping')} />
      </div>

      {/* ── All Complaints ───────────────────────────────────────── */}
      {tab === 'complaints' && (
        <>
          <div className="flex gap-1.5 mb-5 flex-wrap">
            {['all', 'Pending', 'In Progress', 'Escalated', 'Disputed', 'Resolved'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`filter-pill ${filter === f ? 'active' : ''}`}>
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>

          <div className="space-y-3 stagger">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="loader" />
              </div>
            )}
            {!loading && filteredComplaints.length === 0 && (
              <div className="text-center py-16 animate-fadeInUp">
                <div className="text-4xl mb-3">📊</div>
                <div className="text-slate-400 text-sm">No complaints</div>
              </div>
            )}
            {filteredComplaints.map(c => (
              <div key={c.complaint_id}
                className={`glass-card p-5 animate-fadeInUp ${
                  ['Escalated','Disputed'].includes(c.status) ? 'glow-orange' : ''
                }`}
                style={['Escalated','Disputed'].includes(c.status) ? { borderColor: 'rgba(249, 115, 22, 0.25)' } : {}}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      <span className="text-xs text-slate-600 font-mono">#{c.complaint_id}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">{c.category}</span>
                      {c.priority === 'urgent' && (
                        <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">⚡ Urgent</span>
                      )}
                    </div>
                    <div className="text-white font-medium">{c.issue}</div>
                    <div className="text-slate-500 text-sm mt-0.5">{c.student_email}</div>
                    <div className="text-slate-600 text-xs mt-1.5">{new Date(c.created_at).toLocaleString()}</div>
                  </div>
                  <StatusPill status={c.status} />
                </div>

                {['Escalated', 'Disputed'].includes(c.status) && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/5">
                    <button onClick={() => forceResolve(c.complaint_id)}
                      className="action-btn action-btn-orange">
                      ⚡ Force resolve
                    </button>
                    <button onClick={() => updateStatus(c.complaint_id, 'In Progress')}
                      className="action-btn action-btn-blue">
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
        <div className="space-y-3 stagger">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="loader" />
            </div>
          )}
          {!loading && escalations.length === 0 && (
            <div className="text-center py-16 animate-fadeInUp">
              <div className="text-4xl mb-3">🎉</div>
              <div className="text-slate-400 text-sm">No escalations — all good!</div>
            </div>
          )}
          {escalations.map(e => (
            <div key={e.id} className="glass-card p-5 glow-orange animate-fadeInUp" style={{ borderColor: 'rgba(249, 115, 22, 0.2)' }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-white font-medium">{e.issue}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">{e.category}</span>
                    <StatusPill status={e.status} />
                  </div>
                  <div className="text-slate-500 text-sm mt-1">{e.student_email}</div>
                  <span
                    className="inline-block mt-2 text-xs px-2.5 py-0.5 rounded text-orange-300 border border-orange-500/20"
                    style={{ background: 'rgba(249,115,22,0.1)' }}
                  >
                    {e.reason}
                  </span>
                  <div className="text-slate-600 text-xs mt-1.5">{new Date(e.escalated_at).toLocaleString()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Housekeeping ─────────────────────────────────────────── */}
      {tab === 'housekeeping' && (
        <div className="space-y-3 stagger">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="loader" />
            </div>
          )}
          {!loading && housekeeping.length === 0 && (
            <div className="text-center py-16 animate-fadeInUp">
              <div className="text-4xl mb-3">🧹</div>
              <div className="text-slate-400 text-sm">No housekeeping requests</div>
            </div>
          )}
          {housekeeping.map(h => (
            <div key={h.request_id} className="glass-card p-5 flex items-center justify-between gap-3 animate-fadeInUp">
              <div>
                <div className="text-white font-medium">{h.task}</div>
                <div className="text-slate-400 text-sm mt-0.5">Room {h.room_number} · {h.hostel_name}</div>
                <div className="text-slate-500 text-sm mt-0.5">{h.student_email}</div>
                <div className="text-slate-600 text-xs mt-1.5">{new Date(h.created_at).toLocaleString()}</div>
              </div>
              <StatusPill status={h.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
