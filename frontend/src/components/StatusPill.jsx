const MAP = {
  'Pending':             { bg: 'rgba(250, 204, 21, 0.1)',  text: 'text-yellow-300',  ring: 'ring-yellow-400/25',  dot: 'bg-yellow-400' },
  'In Progress':         { bg: 'rgba(59, 130, 246, 0.1)',  text: 'text-blue-300',    ring: 'ring-blue-400/25',    dot: 'bg-blue-400',    pulse: true },
  'Pending Confirmation':{ bg: 'rgba(139, 92, 246, 0.1)',  text: 'text-purple-300',  ring: 'ring-purple-400/25',  dot: 'bg-purple-400',  pulse: true },
  'Resolved':            { bg: 'rgba(16, 185, 129, 0.1)',  text: 'text-emerald-300', ring: 'ring-emerald-400/25', dot: 'bg-emerald-400' },
  'Completed':           { bg: 'rgba(16, 185, 129, 0.1)',  text: 'text-emerald-300', ring: 'ring-emerald-400/25', dot: 'bg-emerald-400' },
  'Disputed':            { bg: 'rgba(239, 68, 68, 0.1)',   text: 'text-red-300',     ring: 'ring-red-400/25',     dot: 'bg-red-400',     pulse: true },
  'Escalated':           { bg: 'rgba(249, 115, 22, 0.1)',  text: 'text-orange-300',  ring: 'ring-orange-400/25',  dot: 'bg-orange-400',  pulse: true },
}

const FALLBACK = { bg: 'rgba(100, 116, 139, 0.1)', text: 'text-slate-300', ring: 'ring-slate-500/25', dot: 'bg-slate-400' }

export default function StatusPill({ status }) {
  const style = MAP[status] || FALLBACK
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 shrink-0 ${style.text} ${style.ring}`}
      style={{ background: style.bg, backdropFilter: 'blur(8px)' }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${style.dot}`}
        style={style.pulse ? { animation: 'pulse-dot 2s ease-in-out infinite' } : {}}
      />
      {status}
    </span>
  )
}
