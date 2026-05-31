const MAP = {
  'Pending':             'bg-yellow-400/15 text-yellow-300 ring-yellow-400/30',
  'In Progress':         'bg-blue-400/15 text-blue-300 ring-blue-400/30',
  'Pending Confirmation':'bg-purple-400/15 text-purple-300 ring-purple-400/30',
  'Resolved':            'bg-emerald-400/15 text-emerald-300 ring-emerald-400/30',
  'Completed':           'bg-emerald-400/15 text-emerald-300 ring-emerald-400/30',
  'Disputed':            'bg-red-400/15 text-red-300 ring-red-400/30',
  'Escalated':           'bg-orange-400/15 text-orange-300 ring-orange-400/30',
}

export default function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 shrink-0 ${MAP[status] || 'bg-slate-700 text-slate-300 ring-slate-600'}`}>
      {status}
    </span>
  )
}
