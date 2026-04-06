import { useState, useEffect, useCallback } from 'react'
import { audit as auditApi } from '../api/client'
import { ShieldCheck, Search, X, ChevronLeft, ChevronRight, Clock, User, Tag, Monitor } from 'lucide-react'

const ACTION_COLORS = {
  LOGIN:              'var(--green)',
  REGISTER:           'var(--blue)',
  RECORD_CREATE:      'var(--gold)',
  RECORD_UPDATE:      'var(--amber)',
  RECORD_DELETE:      'var(--red)',
  RECORD_VIEW:        'var(--text-3)',
  USER_CREATE:        'var(--purple)',
  USER_UPDATE:        'var(--blue)',
  USER_STATUS_CHANGE: 'var(--amber)',
  USER_ROLE_CHANGE:   'var(--purple)',
}

const ACTION_BG = {
  LOGIN:              'rgba(34,197,94,.1)',
  REGISTER:           'rgba(96,165,250,.1)',
  RECORD_CREATE:      'rgba(245,200,66,.1)',
  RECORD_UPDATE:      'rgba(251,146,60,.1)',
  RECORD_DELETE:      'rgba(244,63,94,.1)',
  RECORD_VIEW:        'rgba(100,116,139,.08)',
  USER_CREATE:        'rgba(167,139,250,.1)',
  USER_UPDATE:        'rgba(96,165,250,.1)',
  USER_STATUS_CHANGE: 'rgba(251,146,60,.1)',
  USER_ROLE_CHANGE:   'rgba(167,139,250,.1)',
}

const ACTIONS = ['LOGIN','REGISTER','RECORD_CREATE','RECORD_UPDATE','RECORD_DELETE','RECORD_VIEW','USER_CREATE','USER_UPDATE','USER_STATUS_CHANGE','USER_ROLE_CHANGE']

function fmtTime(str) {
  if (!str) return '—'
  const d = new Date(str)
  return d.toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
}

function fmtRelative(str) {
  if (!str) return ''
  const diff = Date.now() - new Date(str).getTime()
  const mins = Math.floor(diff/60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins/60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs/24)}d ago`
}

export default function AuditPage() {
  const [data, setData]   = useState([])
  const [meta, setMeta]   = useState(null)
  const [filters, setFilters] = useState({ action:'', entity:'', dateFrom:'', dateTo:'', page:1, limit:20 })
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([,v])=>v!==''))
      const res = await auditApi.list(params)
      setData(res.data); setMeta(res.meta)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [filters])

  useEffect(() => { load() }, [load])

  function setFilter(k,v) { setFilters(f=>({...f,[k]:v,page:1})) }

  return (
    <div>
      <div style={{ marginBottom:'1.5rem' }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'1.5rem' }}>Audit Log</h1>
        <p style={{ color:'var(--text-3)', fontSize:'.8rem', marginTop:'.2rem' }}>
          {meta ? `${meta.total} events recorded` : 'Complete system activity trail'}
        </p>
      </div>

      {/* ── Filters ── */}
      <div className="card" style={{ marginBottom:'1rem', padding:'1rem' }}>
        <div style={{ display:'grid', gridTemplateColumns:'auto auto 1fr 1fr auto', gap:'.65rem', alignItems:'end', flexWrap:'wrap' }}>
          <div>
            <label className="label">Action</label>
            <select className="input" value={filters.action} onChange={e=>setFilter('action',e.target.value)}>
              <option value="">All actions</option>
              {ACTIONS.map(a=><option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Entity</label>
            <select className="input" value={filters.entity} onChange={e=>setFilter('entity',e.target.value)}>
              <option value="">All entities</option>
              <option value="User">User</option>
              <option value="FinancialRecord">FinancialRecord</option>
            </select>
          </div>
          <div>
            <label className="label">From</label>
            <input className="input" type="date" value={filters.dateFrom} onChange={e=>setFilter('dateFrom',e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input className="input" type="date" value={filters.dateTo} onChange={e=>setFilter('dateTo',e.target.value)} />
          </div>
          <button className="btn btn-ghost btn-sm" style={{alignSelf:'flex-end'}} onClick={()=>setFilters(f=>({...f,action:'',entity:'',dateFrom:'',dateTo:'',page:1}))}>
            <X size={12}/> Clear
          </button>
        </div>
      </div>

      {/* ── Timeline ── */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'3rem' }}><div className="spinner" style={{width:24,height:24}}/></div>
      ) : data.length === 0 ? (
        <div className="empty-state"><ShieldCheck size={28}/> No audit events found</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'.5rem', marginBottom:'1rem' }}>
          {data.map(entry => {
            const isOpen = expanded === entry.id
            const color = ACTION_COLORS[entry.action] || 'var(--text-3)'
            const bg    = ACTION_BG[entry.action] || 'rgba(100,116,139,.06)'
            return (
              <div key={entry.id} className="card"
                style={{ padding:0, overflow:'hidden', cursor:'pointer', transition:'border-color .15s' }}
                onClick={()=>setExpanded(isOpen ? null : entry.id)}>
                <div style={{ display:'flex', alignItems:'center', gap:'.85rem', padding:'.85rem 1rem' }}>
                  {/* Action badge */}
                  <div style={{ background:bg, color, borderRadius:6, padding:'.3rem .6rem', fontFamily:'var(--font-display)', fontSize:'.65rem', fontWeight:700, letterSpacing:'.07em', flexShrink:0, minWidth:120, textAlign:'center' }}>
                    {entry.action}
                  </div>
                  {/* User */}
                  <div style={{ display:'flex', alignItems:'center', gap:'.4rem', minWidth:140, flexShrink:0 }}>
                    <div style={{ width:26, height:26, borderRadius:'50%', background:'var(--bg-2)', border:'1px solid var(--border-2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.7rem', fontFamily:'var(--font-display)', fontWeight:700, color:'var(--gold)', flexShrink:0 }}>
                      {entry.user?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontSize:'.75rem', color:'var(--text)', fontFamily:'var(--font-display)', fontWeight:600 }}>{entry.user?.name || 'Unknown'}</div>
                      <div style={{ fontSize:'.65rem', color:'var(--text-3)' }}>{entry.user?.role}</div>
                    </div>
                  </div>
                  {/* Entity */}
                  {entry.entity && (
                    <div style={{ display:'flex', alignItems:'center', gap:'.3rem', color:'var(--text-3)', fontSize:'.75rem' }}>
                      <Tag size={10}/>
                      <span>{entry.entity}</span>
                      {entry.entity_id && <span style={{ fontFamily:'var(--font-body)', fontSize:'.65rem', opacity:.6 }}>{entry.entity_id.slice(0,8)}…</span>}
                    </div>
                  )}
                  {/* Spacer */}
                  <div style={{ flex:1 }}/>
                  {/* IP */}
                  {entry.ip_address && (
                    <div style={{ display:'flex', alignItems:'center', gap:'.3rem', color:'var(--text-3)', fontSize:'.7rem', flexShrink:0 }}>
                      <Monitor size={10}/>{entry.ip_address}
                    </div>
                  )}
                  {/* Time */}
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:'.75rem', color:'var(--text-2)' }}>{fmtRelative(entry.created_at)}</div>
                    <div style={{ fontSize:'.65rem', color:'var(--text-3)' }}>{fmtTime(entry.created_at)}</div>
                  </div>
                </div>

                {/* Expanded metadata */}
                {isOpen && entry.metadata && Object.keys(entry.metadata).length > 0 && (
                  <div style={{ borderTop:'1px solid var(--border)', padding:'.75rem 1rem', background:'var(--bg-2)' }}>
                    <div style={{ fontSize:'.68rem', color:'var(--text-3)', fontFamily:'var(--font-display)', letterSpacing:'.08em', marginBottom:'.4rem' }}>METADATA</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'.5rem' }}>
                      {Object.entries(entry.metadata).map(([k,v]) => (
                        <div key={k} style={{ background:'var(--bg-3)', border:'1px solid var(--border)', borderRadius:6, padding:'.25rem .65rem', fontSize:'.72rem' }}>
                          <span style={{ color:'var(--text-3)' }}>{k}: </span>
                          <span style={{ color:'var(--text)', fontFamily:'var(--font-body)' }}>{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="pagination">
          <span>Page {meta.page} of {meta.totalPages} ({meta.total} events)</span>
          <button className="btn btn-ghost btn-sm" disabled={!meta.hasPrev} onClick={()=>setFilters(f=>({...f,page:f.page-1}))}><ChevronLeft size={13}/></button>
          <button className="btn btn-ghost btn-sm" disabled={!meta.hasNext} onClick={()=>setFilters(f=>({...f,page:f.page+1}))}><ChevronRight size={13}/></button>
        </div>
      )}
    </div>
  )
}
