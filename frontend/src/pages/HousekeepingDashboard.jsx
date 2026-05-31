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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Outfit' }}>Housekeeping</h1>
        <p className="text-slate-400 text-sm mt-0.5">{user?.full_name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        {[
          { label: 'Pending',     val: counts.Pending,        color: 'text-yellow-400' },
          { label: 'In Progress', val: counts['In Progress'], color: 'text-blue-400' },
          { label: 'Completed',   val: counts.Completed,      color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className={`text-2xl font-bold ${s.color}`} style={{ fontFamily: 'Outfit' }}>{s.val}</div>
            <div className="text-slate-500 text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1.5 mb-6 flex-wrap">
        {['all', 'Pending', 'In Progress', 'Completed'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === f ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}>
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading && <div className="text-slate-500 text-sm">Loading…</div>}
        {!loading && filtered.length === 0 && (
          <div className="text-slate-500 text-sm py-12 text-center">No requests</div>
        )}
        {filtered.map(r => (
          <div key={r.request_id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="text-white font-medium">{r.task}</div>
                <div className="text-slate-400 text-sm mt-0.5">
                  Room {r.room_number}{r.floor ? `, Floor ${r.floor}` : ''} · {r.hostel_name}
                </div>
                {r.notes && <div className="text-slate-500 text-sm mt-0.5">{r.notes}</div>}
                <div className="text-slate-600 text-xs mt-1">{new Date(r.created_at).toLocaleString()}</div>
              </div>
              <StatusPill status={r.status} />
            </div>
            <div className="flex gap-2">
              {r.status === 'Pending' && (
                <button onClick={() => updateStatus(r.request_id, 'In Progress')}
                  className="text-sm bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 px-4 py-2 rounded-lg transition-colors font-medium ring-1 ring-blue-500/30">
                  Start →
                </button>
              )}
              {r.status === 'In Progress' && (
                <button onClick={() => updateStatus(r.request_id, 'Completed')}
                  className="text-sm bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 px-4 py-2 rounded-lg transition-colors font-medium ring-1 ring-emerald-500/30">
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
