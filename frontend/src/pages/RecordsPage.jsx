import { useState, useEffect, useCallback } from 'react'
import { records as recApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Plus, Search, Filter, Edit2, Trash2, X, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react'

const FMT = n => new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 }).format(n)

const BLANK = { amount:'', type:'income', category:'', date:'', notes:'' }

export default function RecordsPage() {
  const { can } = useAuth()
  const [data, setData] = useState([])
  const [meta, setMeta] = useState(null)
  const [categories, setCategories] = useState([])
  const [filters, setFilters] = useState({ type:'', category:'', dateFrom:'', dateTo:'', search:'', sortBy:'date', sortOrder:'DESC', page:1, limit:15 })
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)     // null | 'create' | 'edit' | 'delete'
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState({})
  const [apiErr, setApiErr] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([,v])=>v!==''&&v!=null))
      const res = await recApi.list(params)
      setData(res.data)
      setMeta(res.meta)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [filters])

  useEffect(() => { load() }, [load])
  useEffect(() => { recApi.categories().then(r => setCategories(r.data)) }, [])

  function setFilter(k, v) { setFilters(f => ({ ...f, [k]: v, page: 1 })) }
  function openCreate() { setForm(BLANK); setFormErr({}); setApiErr(''); setModal('create') }
  function openEdit(r)  { setForm({ amount:r.amount, type:r.type, category:r.category, date:r.date?.slice(0,10)||'', notes:r.notes||'' }); setSelected(r); setFormErr({}); setApiErr(''); setModal('edit') }
  function openDelete(r){ setSelected(r); setModal('delete') }
  function closeModal() { setModal(null); setSelected(null) }

  function validate() {
    const e = {}
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) e.amount = 'Amount must be positive'
    if (!form.type) e.type = 'Required'
    if (!form.category.trim()) e.category = 'Required'
    if (!form.date) e.date = 'Required'
    setFormErr(e)
    return Object.keys(e).length === 0
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true); setApiErr('')
    try {
      const body = { ...form, amount: Number(form.amount) }
      if (modal === 'create') await recApi.create(body)
      else await recApi.update(selected.id, body)
      closeModal(); load()
    } catch (err) {
      setApiErr(err.message || 'Save failed')
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    setSaving(true)
    try { await recApi.delete(selected.id); closeModal(); load() }
    catch (err) { setApiErr(err.message) }
    finally { setSaving(false) }
  }

  function toggleSort(col) {
    setFilters(f => ({
      ...f,
      sortBy: col,
      sortOrder: f.sortBy === col && f.sortOrder === 'DESC' ? 'ASC' : 'DESC',
      page: 1
    }))
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'1.5rem' }}>Records</h1>
          <p style={{ color:'var(--text-3)', fontSize:'.8rem', marginTop:'.2rem' }}>
            {meta ? `${meta.total} total records` : 'Financial records'}
          </p>
        </div>
        {can('records:create') && (
          <button className="btn btn-primary" onClick={openCreate}><Plus size={14}/> New Record</button>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="card" style={{ marginBottom:'1rem', padding:'1rem' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr auto', gap:'.65rem', alignItems:'end', flexWrap:'wrap' }}>
          <div>
            <label className="label">Search</label>
            <div style={{ position:'relative' }}>
              <Search size={13} style={{ position:'absolute', left:'.7rem', top:'50%', transform:'translateY(-50%)', color:'var(--text-3)', pointerEvents:'none' }} />
              <input className="input" style={{ paddingLeft:'2.1rem' }} placeholder="Notes or category…" value={filters.search} onChange={e=>setFilter('search',e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={filters.type} onChange={e=>setFilter('type',e.target.value)}>
              <option value="">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={filters.category} onChange={e=>setFilter('category',e.target.value)}>
              <option value="">All categories</option>
              {categories.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.4rem' }}>
            <div>
              <label className="label">From</label>
              <input className="input" type="date" value={filters.dateFrom} onChange={e=>setFilter('dateFrom',e.target.value)} />
            </div>
            <div>
              <label className="label">To</label>
              <input className="input" type="date" value={filters.dateTo} onChange={e=>setFilter('dateTo',e.target.value)} />
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={()=>setFilters(f=>({...f,type:'',category:'',dateFrom:'',dateTo:'',search:'',page:1}))}>
            <X size={12}/> Clear
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'2.5rem', color:'var(--text-3)' }}>
            <div className="spinner" style={{width:24,height:24}} />
          </div>
        ) : data.length === 0 ? (
          <div className="empty-state">
            <Filter size={28}/> No records match your filters
          </div>
        ) : (
          <>
          <table className="tbl">
            <thead>
              <tr>
                <SortTh col="date"     label="Date"     current={filters} onSort={toggleSort} />
                <th>Type</th>
                <SortTh col="category" label="Category" current={filters} onSort={toggleSort} />
                <th>Notes</th>
                <th>Created By</th>
                <SortTh col="amount"   label="Amount"   current={filters} onSort={toggleSort} style={{textAlign:'right'}} />
                {(can('records:update')||can('records:delete')) && <th/>}
              </tr>
            </thead>
            <tbody>
              {data.map(r => (
                <tr key={r.id}>
                  <td style={{ color:'var(--text-3)', whiteSpace:'nowrap' }}>{r.date?.slice(0,10)}</td>
                  <td><span className={`badge badge-${r.type}`}>{r.type}</span></td>
                  <td style={{ color:'var(--text)' }}>{r.category}</td>
                  <td style={{ color:'var(--text-3)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.notes||'—'}</td>
                  <td style={{ color:'var(--text-3)', fontSize:'.75rem' }}>{r.created_by?.name||'—'}</td>
                  <td style={{ textAlign:'right' }}>
                    <span className={`amount-${r.type}`} style={{ fontWeight:600 }}>
                      {r.type==='income'?'+':'-'}{FMT(r.amount)}
                    </span>
                  </td>
                  {(can('records:update')||can('records:delete')) && (
                    <td>
                      <div style={{ display:'flex', gap:'.35rem', justifyContent:'flex-end' }}>
                        {can('records:update') && (
                          <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(r)}><Edit2 size={12}/></button>
                        )}
                        {can('records:delete') && (
                          <button className="btn btn-danger btn-sm" onClick={()=>openDelete(r)}><Trash2 size={12}/></button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="pagination" style={{ padding:'1rem 1.25rem' }}>
              <span>Page {meta.page} of {meta.totalPages} ({meta.total} total)</span>
              <button className="btn btn-ghost btn-sm" disabled={!meta.hasPrev} onClick={()=>setFilters(f=>({...f,page:f.page-1}))}>
                <ChevronLeft size={13}/>
              </button>
              <button className="btn btn-ghost btn-sm" disabled={!meta.hasNext} onClick={()=>setFilters(f=>({...f,page:f.page+1}))}>
                <ChevronRight size={13}/>
              </button>
            </div>
          )}
          </>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      {(modal==='create'||modal==='edit') && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&closeModal()}>
          <div className="modal">
            <div className="modal-title">
              {modal==='create' ? <><Plus size={16}/> New Record</> : <><Edit2 size={16}/> Edit Record</>}
            </div>
            <form onSubmit={handleSave} className="form-grid">
              <div className="form-row">
                <div>
                  <label className="label">Amount</label>
                  <input className="input" type="number" step="0.01" min="0.01" placeholder="0.00"
                    value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} />
                  {formErr.amount && <div className="err">{formErr.amount}</div>}
                </div>
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                  {formErr.type && <div className="err">{formErr.type}</div>}
                </div>
              </div>
              <div className="form-row">
                <div>
                  <label className="label">Category</label>
                  <input className="input" placeholder="e.g. Salary" list="cats"
                    value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} />
                  <datalist id="cats">{categories.map(c=><option key={c} value={c}/>)}</datalist>
                  {formErr.category && <div className="err">{formErr.category}</div>}
                </div>
                <div>
                  <label className="label">Date</label>
                  <input className="input" type="date"
                    value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
                  {formErr.date && <div className="err">{formErr.date}</div>}
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <input className="input" placeholder="Optional notes…"
                  value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} />
              </div>
              {apiErr && <div className="err">{apiErr}</div>}
              <div style={{ display:'flex', gap:'.65rem', justifyContent:'flex-end', paddingTop:'.5rem' }}>
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit"  className="btn btn-primary" disabled={saving}>
                  {saving ? <><div className="spinner" />Saving…</> : modal==='create' ? 'Create' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {modal==='delete' && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&closeModal()}>
          <div className="modal" style={{ maxWidth:380 }}>
            <div className="modal-title"><Trash2 size={16} color="var(--red)"/> Delete Record</div>
            <p style={{ color:'var(--text-2)', fontSize:'.85rem', marginBottom:'1rem' }}>
              Are you sure you want to delete this <strong style={{color:'var(--text)'}}>{selected?.category}</strong> record of <strong style={{color:'var(--text)'}}>{FMT(selected?.amount)}</strong>? This action cannot be undone.
            </p>
            {apiErr && <div className="err" style={{marginBottom:'.75rem'}}>{apiErr}</div>}
            <div style={{ display:'flex', gap:'.65rem', justifyContent:'flex-end' }}>
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>
                {saving ? <><div className="spinner"/>Deleting…</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SortTh({ col, label, current, onSort, style: s = {} }) {
  const active = current.sortBy === col
  return (
    <th style={{ cursor:'pointer', userSelect:'none', ...s }} onClick={()=>onSort(col)}>
      <span style={{ display:'inline-flex', alignItems:'center', gap:'.3rem' }}>
        {label}
        <ArrowUpDown size={10} style={{ opacity: active ? 1 : 0.3, color: active ? 'var(--gold)' : 'inherit' }} />
      </span>
    </th>
  )
}
