import { useState, useEffect, useCallback } from 'react'
import { dashboard as dashApi } from '../api/client'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Activity, BarChart2, ArrowUpRight, ArrowDownRight } from 'lucide-react'

const FMT = n => {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}
const fmtShort = n => n >= 1000 ? `₹${(n/1000).toFixed(1)}k` : `₹${n}`

const COLORS = ['#f5c842','#60a5fa','#22c55e','#f43f5e','#a78bfa','#fb923c','#34d399','#f472b6']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--bg-2)', border:'1px solid var(--border-2)', borderRadius:8, padding:'.65rem .9rem', fontSize:'.78rem' }}>
      <div style={{ color:'var(--text-3)', marginBottom:'.35rem', fontFamily:'var(--font-display)', letterSpacing:'.05em' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, display:'flex', gap:'.5rem' }}>
          <span>{p.name}:</span><span style={{fontWeight:600}}>{fmtShort(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [summary, setSummary] = useState(null)
  const [monthly, setMonthly] = useState([])
  const [catTotals, setCatTotals] = useState([])
  const [recent, setRecent] = useState([])
  const [topCats, setTopCats] = useState([])
  const [weekly, setWeekly] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({ from: '', to: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { dateFrom: dateRange.from || undefined, dateTo: dateRange.to || undefined }
      const [s, m, c, r, t, w] = await Promise.all([
        dashApi.summary(params),
        dashApi.monthlyTrends(6),
        dashApi.categoryTotals({ ...params, type: 'expense' }),
        dashApi.recentActivity(8),
        dashApi.topCategories({ ...params, limit: 5 }),
        dashApi.weeklyTrends(8),
      ])
      setSummary(s.data)
      setMonthly(m.data)
      setCatTotals(c.data)
      setRecent(r.data)
      setTopCats(t.data)
      setWeekly(w.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [dateRange.from, dateRange.to])

  useEffect(() => { load() }, [load])

  if (loading && !summary) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', gap:'.75rem', color:'var(--text-3)' }}>
      <div className="spinner" style={{width:28,height:28}} />
      <span style={{fontFamily:'var(--font-display)'}}>Loading dashboard…</span>
    </div>
  )

  const net = summary?.net_balance ?? 0
  const isPositive = net >= 0

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'1.75rem', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'1.5rem', letterSpacing:'.01em' }}>Dashboard</h1>
          <p style={{ color:'var(--text-3)', fontSize:'.8rem', marginTop:'.2rem' }}>Financial overview & analytics</p>
        </div>
        <div style={{ display:'flex', gap:'.65rem', alignItems:'center', flexWrap:'wrap' }}>
          <input className="input" type="date" style={{width:'auto'}} value={dateRange.from} onChange={e=>setDateRange(d=>({...d,from:e.target.value}))} />
          <span style={{color:'var(--text-3)',fontSize:'.75rem'}}>to</span>
          <input className="input" type="date" style={{width:'auto'}} value={dateRange.to} onChange={e=>setDateRange(d=>({...d,to:e.target.value}))} />
          {(dateRange.from||dateRange.to) && (
            <button className="btn btn-ghost btn-sm" onClick={()=>setDateRange({from:'',to:''})}>Clear</button>
          )}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
        <StatCard label="Total Income" value={FMT(summary?.total_income)} sub={`${summary?.income_count} records`} icon={<TrendingUp size={16} color="var(--green)" />} accent="var(--green)" />
        <StatCard label="Total Expenses" value={FMT(summary?.total_expenses)} sub={`${summary?.expense_count} records`} icon={<TrendingDown size={16} color="var(--red)" />} accent="var(--red)" />
        <StatCard label="Net Balance" value={FMT(net)} sub={`${summary?.savings_rate}% savings rate`} icon={<DollarSign size={16} color={isPositive?'var(--gold)':'var(--red)'} />} accent={isPositive?'var(--gold)':'var(--red)'} positive={isPositive} />
        <StatCard label="Total Records" value={summary?.record_count} sub="across all time" icon={<Activity size={16} color="var(--blue)" />} accent="var(--blue)" />
      </div>

      {/* ── Charts row ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
        {/* Monthly trend */}
        <div className="card">
          <SectionTitle icon={<BarChart2 size={14}/>} title="Monthly Trend" sub="Income vs Expenses" />
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthly} margin={{ top:4, right:4, left:-20, bottom:0 }}>
              <defs>
                <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{fill:'var(--text-3)',fontSize:10,fontFamily:'var(--font-body)'}} />
              <YAxis tick={{fill:'var(--text-3)',fontSize:10,fontFamily:'var(--font-body)'}} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="income"   name="Income"   stroke="#22c55e" fill="url(#gIncome)"  strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f43f5e" fill="url(#gExpense)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="card">
          <SectionTitle icon={<BarChart2 size={14}/>} title="Expense Breakdown" sub="By category" />
          <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={catTotals.slice(0,6)} dataKey="total" nameKey="category" cx="50%" cy="50%" innerRadius={44} outerRadius={70} strokeWidth={0}>
                  {catTotals.slice(0,6).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v)=>FMT(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'.4rem' }}>
              {catTotals.slice(0,6).map((c,i) => (
                <div key={c.category} style={{ display:'flex', alignItems:'center', gap:'.5rem' }}>
                  <div style={{ width:8,height:8,borderRadius:2,background:COLORS[i%COLORS.length],flexShrink:0 }} />
                  <span style={{ fontSize:'.72rem',color:'var(--text-2)',flex:1 }}>{c.category}</span>
                  <span style={{ fontSize:'.72rem',color:'var(--text-3)' }}>{c.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Weekly + Top cats + Recent ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
        {/* Weekly bar */}
        <div className="card">
          <SectionTitle title="Weekly Activity" sub="Last 8 weeks" />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekly} margin={{ top:4, right:4, left:-20, bottom:0 }} barCategoryGap="30%">
              <XAxis dataKey="week" tick={{fill:'var(--text-3)',fontSize:9}} />
              <YAxis tick={{fill:'var(--text-3)',fontSize:9}} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="income"   name="Income"   fill="#22c55e" radius={[3,3,0,0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top categories */}
        <div className="card">
          <SectionTitle title="Top Spending" sub="By category" />
          <div style={{ display:'flex', flexDirection:'column', gap:'.6rem', marginTop:'.5rem' }}>
            {topCats.map((c,i) => {
              const pct = topCats[0]?.total ? Math.round((c.total/topCats[0].total)*100) : 0
              return (
                <div key={c.category}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'.2rem' }}>
                    <span style={{ fontSize:'.78rem', color:'var(--text-2)' }}>{c.category}</span>
                    <span style={{ fontSize:'.78rem', color:'var(--text-3)', fontFamily:'var(--font-body)' }}>{FMT(c.total)}</span>
                  </div>
                  <div style={{ height:4, background:'var(--bg-3)', borderRadius:2 }}>
                    <div style={{ height:4, background:COLORS[i%COLORS.length], borderRadius:2, width:`${pct}%`, transition:'width .4s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Recent Activity ── */}
      <div className="card">
        <SectionTitle title="Recent Activity" sub="Latest transactions" />
        {recent.length === 0
          ? <div className="empty-state">No recent activity</div>
          : (
          <table className="tbl" style={{ marginTop:'.75rem' }}>
            <thead>
              <tr>
                <th>Date</th><th>Category</th><th>Notes</th><th>Type</th><th style={{textAlign:'right'}}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(r => (
                <tr key={r.id}>
                  <td style={{ color:'var(--text-3)', fontSize:'.75rem' }}>{r.date}</td>
                  <td style={{ color:'var(--text)' }}>{r.category}</td>
                  <td style={{ color:'var(--text-3)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.notes || '—'}</td>
                  <td><span className={`badge badge-${r.type}`}>{r.type}</span></td>
                  <td style={{ textAlign:'right' }}>
                    <span className={`amount-${r.type}`}>
                      {r.type==='income' ? <ArrowUpRight size={11} style={{display:'inline',verticalAlign:'middle'}}/> : <ArrowDownRight size={11} style={{display:'inline',verticalAlign:'middle'}}/>}
                      {' '}{FMT(r.amount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, icon, accent }) {
  return (
    <div className="stat-card" style={{ borderLeft:`3px solid ${accent}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <span className="stat-label">{label}</span>
        <div style={{ padding:'.35rem', background:'var(--bg-2)', borderRadius:6 }}>{icon}</div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  )
}

function SectionTitle({ icon, title, sub }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'.5rem', marginBottom:'.75rem' }}>
      {icon && <span style={{color:'var(--text-3)'}}>{icon}</span>}
      <div>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'.85rem', color:'var(--text)' }}>{title}</div>
        {sub && <div style={{ fontSize:'.7rem', color:'var(--text-3)' }}>{sub}</div>}
      </div>
    </div>
  )
}
