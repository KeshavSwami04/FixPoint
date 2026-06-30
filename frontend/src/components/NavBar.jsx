import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../utils/api'

const ROLE_COLOR = {
  student:     'text-teal-400',
  staff:       'text-blue-400',
  housekeeping:'text-purple-400',
  caretaker:   'text-orange-400',
}

const ROLE_GLOW = {
  student:     'from-teal-400 to-emerald-400',
  staff:       'from-blue-400 to-cyan-400',
  housekeeping:'from-purple-400 to-violet-400',
  caretaker:   'from-orange-400 to-amber-400',
}

export default function NavBar() {
  const { user, logout } = useAuth()
  const [notifs, setNotifs]         = useState([])
  const [showNotifs, setShowNotifs] = useState(false)
  const panelRef = useRef(null)

  useEffect(() => {
    if (!user) return
    const fetchNotifs = async () => {
      try { setNotifs(await api.get('/notifications')) } catch {}
    }
    fetchNotifs()
    const id = setInterval(fetchNotifs, 30_000)
    return () => clearInterval(id)
  }, [user])

  // Close panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowNotifs(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unread = notifs.filter(n => !n.is_read).length

  const openNotifs = async () => {
    setShowNotifs(v => !v)
    if (!showNotifs && unread > 0) {
      try {
        await api.patch('/notifications/read-all')
        setNotifs(n => n.map(x => ({ ...x, is_read: 1 })))
      } catch {}
    }
  }

  return (
    <nav className="glass-nav px-5 py-3 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        {/* Gradient logo */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-purple-500 rounded-xl opacity-40 blur group-hover:opacity-60 transition-opacity duration-500" />
          <div className="relative w-9 h-9 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center font-bold text-white text-sm select-none shadow-lg">
            FP
          </div>
        </div>
        <span className="font-semibold text-white text-[17px] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
          FixPoint
        </span>
      </div>

      {user && (
        <div className="flex items-center gap-3">
          {/* User info */}
          <div className="hidden sm:block text-right">
            <div className="text-white text-sm font-medium leading-tight">{user.full_name || user.name}</div>
            <div className={`text-xs capitalize leading-tight ${ROLE_COLOR[user.role] || 'text-slate-400'}`}>
              {user.role}
            </div>
          </div>

          {/* Avatar ring */}
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${ROLE_GLOW[user.role] || 'from-slate-400 to-slate-500'} p-[2px] hidden sm:block`}>
            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-xs font-bold text-white">
              {(user.full_name || user.name || '?')[0].toUpperCase()}
            </div>
          </div>

          {/* Notification bell */}
          <div className="relative" ref={panelRef}>
            <button onClick={openNotifs}
              className="relative p-2 text-slate-400 hover:text-white transition-all duration-200 rounded-lg hover:bg-white/5">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold shadow-lg shadow-red-500/30"
                  style={{ animation: 'pulse-dot 2s ease-in-out infinite' }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 glass-card-static rounded-2xl shadow-2xl overflow-hidden animate-fadeIn"
                style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
                <div className="px-4 py-3 border-b border-white/5 text-sm font-semibold text-white flex items-center gap-2">
                  <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Notifications
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifs.length === 0 ? (
                    <div className="px-4 py-8 text-center text-slate-500 text-sm">No notifications yet</div>
                  ) : notifs.map(n => (
                    <div key={n.id} className={`px-4 py-3 border-b border-white/5 text-sm transition-colors ${n.is_read ? 'text-slate-500' : 'text-slate-200 bg-white/[0.03]'}`}>
                      <div className="leading-snug">{n.message}</div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={logout}
            className="text-sm text-slate-400 hover:text-white transition-all duration-200 px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            Sign out
          </button>
        </div>
      )}
    </nav>
  )
}
