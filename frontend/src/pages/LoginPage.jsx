import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { TrendingUp, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (user) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  function fill(email, password) { setForm({ email, password }); setError('') }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
      backgroundImage: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(245,200,66,0.08) 0%, transparent 60%)',
    }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '1rem' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'var(--gold)', margin: '0 auto .75rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TrendingUp size={24} color="#0c0e14" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.6rem', letterSpacing: '.01em' }}>
            Ledger
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '.82rem', marginTop: '.25rem' }}>
            Finance Dashboard · Sign in to continue
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ borderColor: 'var(--border-2)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="you@example.com" required
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <input className="input" type={show ? 'text' : 'password'} placeholder="••••••••" required
                  style={{ paddingRight: '2.5rem' }}
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                <button type="button" onClick={() => setShow(s => !s)} style={{
                  position: 'absolute', right: '.7rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display:'flex'
                }}>
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && <div className="err" style={{ textAlign: 'center' }}>{error}</div>}

            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: '.25rem' }}>
              {loading ? <><div className="spinner" />Signing in…</> : 'Sign in'}
            </button>
          </form>

          {/* Quick-fill demo credentials */}
          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: '.68rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: '.6rem' }}>
              Demo accounts
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
              {[
                { label: 'Admin', email: 'admin@finance.dev', password: 'Admin@123', cls: 'badge-admin' },
                { label: 'Analyst', email: 'analyst@finance.dev', password: 'Analyst@123', cls: 'badge-analyst' },
                { label: 'Viewer', email: 'viewer@finance.dev', password: 'Viewer@123', cls: 'badge-viewer' },
              ].map(({ label, email, password, cls }) => (
                <button key={label} type="button" onClick={() => fill(email, password)}
                  style={{ display:'flex', alignItems:'center', gap:'.6rem', background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'.5rem .75rem', cursor:'pointer', textAlign:'left', transition:'border-color .15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='var(--border-2)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}
                >
                  <span className={`badge ${cls}`}>{label}</span>
                  <span style={{ fontSize: '.75rem', color: 'var(--text-2)', fontFamily:'var(--font-body)' }}>{email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
