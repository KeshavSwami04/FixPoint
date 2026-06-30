import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../utils/api'
import { useToast } from '../components/Toast'
import StatusPill from '../components/StatusPill'

export default function HousekeepingDashboard() {
  const { user }  = useAuth()
  const toast     = useToast()
  const [requests, setRequests] = useState([])
  const [filter, setFilter]     = useState('all')
  const [loading, setLoading]   = useState(true)
  const busyRef = useRef({})

  const load = async () => {
    setLoading(true)
    try { setRequests(await api.get('/housekeeping')) }
    catch (err) { toast(err.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const updateStatus = async (rid, status) => {
    if (busyRef.current[rid]) return
    busyRef.current[rid] = true
    try {
      await api.patch(`/housekeeping/${rid}/status`, { status })
      toast('Updated!', 'success')
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { busyRef.current[rid] = false }
  }

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter)
  const counts = {
    Pending:     requests.filter(r => r.status === 'Pending').length,
    'In Progress': requests.filter(r => r.status === 'In Progress').length,
    Completed:   requests.filter(r => r.status === 'Completed').length,
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-7 animate-fadeInUp">
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Outfit' }}>Housekeeping</h1>
        <p className="text-slate-400 text-sm mt-1">{user?.full_name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Pending',     val: counts.Pending,        color: 'text-yellow-400', glow: 'from-yellow-400 to-amber-400' },
          { label: 'In Progress', val: counts['In Progress'], color: 'text-blue-400',   glow: 'from-blue-400 to-cyan-400' },
          { label: 'Completed',   val: counts.Completed,      color: 'text-emerald-400', glow: 'from-emerald-400 to-teal-400' },
        ].map((s, i) => (
          <div key={s.label} className="glass-card p-5 relative animate-fadeInUp" style={{ animationDelay: `${i * 80}ms` }}>
            <div className={`text-3xl font-bold ${s.color}`} style={{ fontFamily: 'Outfit' }}>{s.val}</div>
            <div className="text-slate-500 text-xs mt-1 tracking-wide uppercase">{s.label}</div>
            <div className={`absolute top-0 left-4 right-4 h-px bg-gradient-to-r ${s.glow} opacity-40`} />
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1.5 mb-7 flex-wrap">
        {['all', 'Pending', 'In Progress', 'Completed'].map(f => (
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
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 animate-fadeInUp">
            <div className="text-4xl mb-3">✨</div>
            <div className="text-slate-400 text-sm">No requests</div>
          </div>
        )}
        {filtered.map(r => (
          <div key={r.request_id} className="glass-card p-5 animate-fadeInUp">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="text-white font-medium">{r.task}</div>
                <div className="text-slate-400 text-sm mt-0.5">
                  Room {r.room_number}{r.floor ? `, Floor ${r.floor}` : ''} · {r.hostel_name}
                </div>
                {r.notes && <div className="text-slate-500 text-sm mt-0.5">{r.notes}</div>}
                <div className="text-slate-600 text-xs mt-1.5">{new Date(r.created_at).toLocaleString()}</div>
              </div>
              <StatusPill status={r.status} />
            </div>
            <div className="flex gap-2">
              {r.status === 'Pending' && (
                <button onClick={() => updateStatus(r.request_id, 'In Progress')}
                  className="action-btn action-btn-blue">
                  Start →
                </button>
              )}
              {r.status === 'In Progress' && (
                <button onClick={() => updateStatus(r.request_id, 'Completed')}
                  className="action-btn action-btn-emerald">
                  ✓ Mark complete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
