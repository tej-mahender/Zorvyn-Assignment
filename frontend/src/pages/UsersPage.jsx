import { useState, useEffect, useCallback } from 'react'
import { users as usersApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Plus, Search, Edit2, ShieldAlert, UserCheck, UserX, X, ChevronLeft, ChevronRight, User } from 'lucide-react'

const ROLES = ['VIEWER', 'ANALYST', 'ADMIN']
const BLANK_FORM = { name:'', email:'', password:'', role:'VIEWER' }

export default function UsersPage() {
  const { user: me } = useAuth()
  const [data, setData]   = useState([])
  const [meta, setMeta]   = useState(null)
  const [filters, setFilters] = useState({ search:'', role:'', status:'', page:1, limit:15 })
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)   // null | 'create' | 'edit' | 'role' | 'status'
  const [selected, setSelected] = useState(null)
  const [form, setForm]   = useState(BLANK_FORM)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState({})
  const [apiErr, setApiErr] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([,v])=>v!==''))
      const res = await usersApi.list(params)
      setData(res.data); setMeta(res.meta)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [filters])

  useEffect(() => { load() }, [load])

  function setFilter(k,v) { setFilters(f=>({...f,[k]:v,page:1})) }
  function closeModal() { setModal(null); setSelected(null); setApiErr('') }

  function openCreate() { setForm(BLANK_FORM); setFormErr({}); setApiErr(''); setModal('create') }
  function openEdit(u)  { setForm({ name:u.name, email:u.email, password:'', role:u.role }); setSelected(u); setFormErr({}); setApiErr(''); setModal('edit') }
  function openRole(u)  { setSelected(u); setApiErr(''); setModal('role') }
  function openStatus(u){ setSelected(u); setApiErr(''); setModal('status') }

  function validate(isCreate) {
    const e = {}
    if (!form.name.trim()) e.name = 'Required'
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required'
    if (isCreate && (!form.password || form.password.length < 8)) e.password = 'Min 8 characters'
    if (isCreate && !/[A-Z]/.test(form.password)) e.password = 'Must contain uppercase letter'
    if (isCreate && !/[0-9]/.test(form.password)) e.password = (e.password ? e.password + ' and' : 'Must contain') + ' a number'
    setFormErr(e)
    return Object.keys(e).length === 0
  }

  async function handleCreateSave(e) {
    e.preventDefault()
    if (!validate(modal === 'create')) return
    setSaving(true); setApiErr('')
    try {
      if (modal === 'create') await usersApi.create(form)
      else await usersApi.update(selected.id, { name: form.name, email: form.email })
      closeModal(); load()
    } catch (err) { setApiErr(err.message) }
    finally { setSaving(false) }
  }

  async function handleRoleChange(newRole) {
    setSaving(true); setApiErr('')
    try { await usersApi.changeRole(selected.id, newRole); closeModal(); load() }
    catch (err) { setApiErr(err.message) }
    finally { setSaving(false) }
  }

  async function handleStatusChange(newStatus) {
    setSaving(true); setApiErr('')
    try { await usersApi.changeStatus(selected.id, newStatus); closeModal(); load() }
    catch (err) { setApiErr(err.message) }
    finally { setSaving(false) }
  }

  const ROLE_BADGE = { ADMIN:'badge-admin', ANALYST:'badge-analyst', VIEWER:'badge-viewer' }
  const ROLE_COLOR = { ADMIN:'var(--purple)', ANALYST:'var(--blue)', VIEWER:'var(--green)' }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'1.5rem' }}>Users</h1>
          <p style={{ color:'var(--text-3)', fontSize:'.8rem', marginTop:'.2rem' }}>{meta ? `${meta.total} users` : 'User management'}</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={14}/> New User</button>
      </div>

      {/* ── Filters ── */}
      <div className="card" style={{ marginBottom:'1rem', padding:'1rem' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto', gap:'.65rem', alignItems:'end' }}>
          <div>
            <label className="label">Search</label>
            <div style={{ position:'relative' }}>
              <Search size={13} style={{ position:'absolute', left:'.7rem', top:'50%', transform:'translateY(-50%)', color:'var(--text-3)', pointerEvents:'none' }} />
              <input className="input" style={{ paddingLeft:'2.1rem' }} placeholder="Name or email…" value={filters.search} onChange={e=>setFilter('search',e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={filters.role} onChange={e=>setFilter('role',e.target.value)}>
              <option value="">All roles</option>
              {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={filters.status} onChange={e=>setFilter('status',e.target.value)}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={()=>setFilters(f=>({...f,search:'',role:'',status:'',page:1}))}>
            <X size={12}/> Clear
          </button>
        </div>
      </div>

      {/* ── User cards ── */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'3rem' }}><div className="spinner" style={{width:24,height:24}}/></div>
      ) : data.length === 0 ? (
        <div className="empty-state"><User size={28}/> No users found</div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(310px,1fr))', gap:'.85rem', marginBottom:'1rem' }}>
          {data.map(u => {
            const isSelf = u.id === me?.id
            return (
              <div key={u.id} className="card" style={{ padding:'1.1rem', display:'flex', flexDirection:'column', gap:'.75rem', opacity: u.status==='inactive'?.65:1, transition:'opacity .2s' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'.75rem' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'var(--bg-2)', border: `2px solid ${ROLE_COLOR[u.role]}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontFamily:'var(--font-display)', fontWeight:700, fontSize:'.9rem',
                    color: ROLE_COLOR[u.role], flexShrink:0
                  }}>{u.name[0].toUpperCase()}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'.9rem', display:'flex', alignItems:'center', gap:'.4rem', flexWrap:'wrap' }}>
                      {u.name}
                      {isSelf && <span style={{ fontSize:'.6rem', color:'var(--gold)', border:'1px solid var(--gold-dim)', borderRadius:4, padding:'.05rem .3rem' }}>you</span>}
                    </div>
                    <div style={{ fontSize:'.73rem', color:'var(--text-3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.email}</div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'.25rem' }}>
                    <span className={`badge ${ROLE_BADGE[u.role]}`}>{u.role}</span>
                    <span className={`badge badge-${u.status}`}>{u.status}</span>
                  </div>
                </div>
                <div style={{ fontSize:'.7rem', color:'var(--text-3)', paddingTop:'.5rem', borderTop:'1px solid var(--border)' }}>
                  Joined {new Date(u.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                </div>
                <div style={{ display:'flex', gap:'.4rem', flexWrap:'wrap' }}>
                  <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(u)}><Edit2 size={11}/> Edit</button>
                  {!isSelf && <>
                    <button className="btn btn-ghost btn-sm" onClick={()=>openRole(u)}><ShieldAlert size={11}/> Role</button>
                    <button className={`btn btn-sm ${u.status==='active'?'btn-danger':'btn-ghost'}`} onClick={()=>openStatus(u)}>
                      {u.status==='active' ? <><UserX size={11}/> Deactivate</> : <><UserCheck size={11}/> Activate</>}
                    </button>
                  </>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="pagination">
          <span>Page {meta.page} of {meta.totalPages}</span>
          <button className="btn btn-ghost btn-sm" disabled={!meta.hasPrev} onClick={()=>setFilters(f=>({...f,page:f.page-1}))}><ChevronLeft size={13}/></button>
          <button className="btn btn-ghost btn-sm" disabled={!meta.hasNext} onClick={()=>setFilters(f=>({...f,page:f.page+1}))}><ChevronRight size={13}/></button>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {(modal==='create'||modal==='edit') && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&closeModal()}>
          <div className="modal">
            <div className="modal-title">{modal==='create'?<><Plus size={16}/>New User</>:<><Edit2 size={16}/>Edit User</>}</div>
            <form onSubmit={handleCreateSave} className="form-grid">
              <div>
                <label className="label">Full Name</label>
                <input className="input" placeholder="Jane Smith" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
                {formErr.name && <div className="err">{formErr.name}</div>}
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" placeholder="jane@company.com" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} />
                {formErr.email && <div className="err">{formErr.email}</div>}
              </div>
              {modal==='create' && <>
                <div>
                  <label className="label">Password</label>
                  <input className="input" type="password" placeholder="Min 8 chars, 1 uppercase, 1 number" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} />
                  {formErr.password && <div className="err">{formErr.password}</div>}
                </div>
                <div>
                  <label className="label">Role</label>
                  <select className="input" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                    {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </>}
              {apiErr && <div className="err">{apiErr}</div>}
              <div style={{ display:'flex', gap:'.65rem', justifyContent:'flex-end', paddingTop:'.5rem' }}>
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving?<><div className="spinner"/>Saving…</>:modal==='create'?'Create User':'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Change Role Modal ── */}
      {modal==='role' && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&closeModal()}>
          <div className="modal" style={{ maxWidth:360 }}>
            <div className="modal-title"><ShieldAlert size={16}/>Change Role</div>
            <p style={{ color:'var(--text-2)', fontSize:'.83rem', marginBottom:'1rem' }}>
              Set role for <strong style={{color:'var(--text)'}}>{selected?.name}</strong>
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:'.5rem' }}>
              {ROLES.map(r => (
                <button key={r} className={`btn ${r===selected?.role?'btn-primary':'btn-ghost'}`}
                  style={{ justifyContent:'space-between' }}
                  disabled={saving} onClick={()=>handleRoleChange(r)}>
                  <span>{r}</span>
                  <span style={{ fontSize:'.7rem', opacity:.7 }}>{
                    {VIEWER:'Read only', ANALYST:'Records + Dashboard', ADMIN:'Full access'}[r]
                  }</span>
                </button>
              ))}
            </div>
            {apiErr && <div className="err" style={{marginTop:'.75rem'}}>{apiErr}</div>}
            <button className="btn btn-ghost" style={{ width:'100%', marginTop:'.75rem' }} onClick={closeModal}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Toggle Status Modal ── */}
      {modal==='status' && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&closeModal()}>
          <div className="modal" style={{ maxWidth:360 }}>
            <div className="modal-title">
              {selected?.status==='active'?<><UserX size={16} color="var(--red)"/>Deactivate User</>:<><UserCheck size={16} color="var(--green)"/>Activate User</>}
            </div>
            <p style={{ color:'var(--text-2)', fontSize:'.83rem', marginBottom:'1.25rem' }}>
              {selected?.status==='active'
                ? <>This will prevent <strong style={{color:'var(--text)'}}>{selected?.name}</strong> from logging in.</>
                : <>This will restore access for <strong style={{color:'var(--text)'}}>{selected?.name}</strong>.</>
              }
            </p>
            {apiErr && <div className="err" style={{marginBottom:'.75rem'}}>{apiErr}</div>}
            <div style={{ display:'flex', gap:'.65rem', justifyContent:'flex-end' }}>
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className={`btn ${selected?.status==='active'?'btn-danger':'btn-primary'}`}
                disabled={saving}
                onClick={()=>handleStatusChange(selected?.status==='active'?'inactive':'active')}>
                {saving?<><div className="spinner"/>…</>:selected?.status==='active'?'Deactivate':'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
