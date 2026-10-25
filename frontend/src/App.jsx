import { useEffect, useState } from 'react'
import { ArrowUpRight, CarFront, Check, LogOut, Plus, Search, ShieldCheck, Trash2, Wrench } from 'lucide-react'
import './App.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

async function api(path, options = {}, token) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  })
  const body = response.status === 204 ? null : await response.json()
  if (!response.ok) throw new Error(body?.error || 'Something went wrong')
  return body
}

function App() {
  const [session, setSession] = useState(() => JSON.parse(localStorage.getItem('autohub-session') || 'null'))
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [vehicles, setVehicles] = useState([])
  const [filters, setFilters] = useState({ make: '', model: '', category: '', minPrice: '', maxPrice: '' })
  const [form, setForm] = useState({ make: '', model: '', category: 'SUV', price: '', quantity: '' })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const loadVehicles = async (activeFilters = filters) => {
    if (!session) return
    const query = new URLSearchParams(Object.entries(activeFilters).filter(([, value]) => value)).toString()
    try {
      const result = await api(`/vehicles/search${query ? `?${query}` : ''}`, {}, session.token)
      setVehicles(result.vehicles)
    } catch (error) { setMessage(error.message) }
  }

  useEffect(() => {
    if (!session) return
    api('/vehicles/search', {}, session.token).then((result) => setVehicles(result.vehicles)).catch((error) => setMessage(error.message))
  }, [session])

  const submitAuth = async (event) => {
    event.preventDefault(); setLoading(true); setMessage('')
    try {
      const result = await api(`/auth/${authMode}`, { method: 'POST', body: JSON.stringify(authForm) })
      setSession(result); localStorage.setItem('autohub-session', JSON.stringify(result))
    } catch (error) { setMessage(error.message) } finally { setLoading(false) }
  }

  const purchase = async (id) => {
    try { await api(`/vehicles/${id}/purchase`, { method: 'POST' }, session.token); setMessage('Vehicle reserved successfully.'); loadVehicles() }
    catch (error) { setMessage(error.message) }
  }

  const addVehicle = async (event) => {
    event.preventDefault()
    try { await api('/vehicles', { method: 'POST', body: JSON.stringify({ ...form, price: Number(form.price), quantity: Number(form.quantity) }) }, session.token); setForm({ make: '', model: '', category: 'SUV', price: '', quantity: '' }); setMessage('Vehicle added to inventory.'); loadVehicles() }
    catch (error) { setMessage(error.message) }
  }

  const removeVehicle = async (id) => {
    try { await api(`/vehicles/${id}`, { method: 'DELETE' }, session.token); setMessage('Vehicle removed.'); loadVehicles() }
    catch (error) { setMessage(error.message) }
  }

  if (!session) return <main className="auth-shell"><section className="auth-art"><span className="eyebrow"><CarFront size={16} /> AUTOHUB / 01</span><h1>Find the car that<br /><i>moves you.</i></h1><p>A clear view of every vehicle on your lot, built for decisions that keep moving.</p><div className="art-road" /></section><section className="auth-panel"><div className="auth-card"><div className="brand-mark"><CarFront size={20} /> AutoHub</div><h2>{authMode === 'login' ? 'Welcome back.' : 'Create your account.'}</h2><p className="muted">{authMode === 'login' ? 'Sign in to access your inventory.' : 'Start managing your dealership in minutes.'}</p><form onSubmit={submitAuth}>{authMode === 'register' && <input required placeholder="Your name" value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} />}<input required type="email" placeholder="Email address" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} /><input required minLength="6" type="password" placeholder="Password (6+ characters)" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} /><button className="primary-button" disabled={loading}>{loading ? 'Loading...' : authMode === 'login' ? 'Enter inventory' : 'Create account'} <ArrowUpRight size={17} /></button></form>{message && <p className="error">{message}</p>}<button className="text-button" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setMessage('') }}>{authMode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in'}</button></div></section></main>

  return <main className="app-shell"><header className="topbar"><div className="brand-mark"><CarFront size={20} /> AutoHub</div><div className="user-chip"><span>{session.user.name}</span><small>{session.user.role}</small></div><button className="icon-button" title="Sign out" onClick={() => { localStorage.removeItem('autohub-session'); setSession(null) }}><LogOut size={18} /></button></header><section className="dashboard-head"><div><span className="eyebrow">INVENTORY / LIVE VIEW</span><h1>Vehicles on hand<span>.</span></h1><p className="muted">Browse, filter, and keep your lot in motion.</p></div><div className="stat"><strong>{vehicles.length.toString().padStart(2, '0')}</strong><span>available now</span></div></section><section className="filter-bar"><div className="search-input"><Search size={17} /><input placeholder="Search make or model" value={filters.make} onChange={(e) => setFilters({ ...filters, make: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && loadVehicles()} /></div><select value={filters.category} onChange={(e) => { const next = { ...filters, category: e.target.value }; setFilters(next); loadVehicles(next) }}><option value="">All categories</option><option>SUV</option><option>Sedan</option><option>Electric</option><option>Truck</option></select><input className="price-input" type="number" placeholder="Min $" value={filters.minPrice} onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })} /><input className="price-input" type="number" placeholder="Max $" value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} /><button className="filter-button" onClick={() => loadVehicles()}><Search size={16} /> Filter</button></section>{message && <div className="notice"><Check size={16} /> {message}</div>}<section className="content-grid"><div className="vehicle-grid">{vehicles.map((vehicle) => <article className="vehicle-card" key={vehicle.id}><div className="vehicle-image"><CarFront size={44} strokeWidth={1.2} /><span>{vehicle.category}</span></div><div className="vehicle-info"><div className="vehicle-title"><div><h3>{vehicle.make} {vehicle.model}</h3><p>Unit #{String(vehicle.id).padStart(4, '0')}</p></div><strong>${vehicle.price.toLocaleString()}</strong></div><div className="vehicle-foot"><span className={vehicle.quantity < 2 ? 'low-stock' : ''}>{vehicle.quantity} in stock</span><button className="purchase-button" onClick={() => purchase(vehicle.id)} disabled={!vehicle.quantity}>Purchase <ArrowUpRight size={15} /></button>{session.user.role === 'admin' && <button className="danger-button" title="Delete vehicle" onClick={() => removeVehicle(vehicle.id)}><Trash2 size={15} /></button>}</div></div></article>)}{!vehicles.length && <div className="empty-state"><CarFront size={34} /><h3>No vehicles match</h3><p>Try a different filter or add inventory from the admin panel.</p></div>}</div>{session.user.role === 'admin' && <aside className="admin-panel"><div className="panel-heading"><div><span className="eyebrow">ADMIN TOOLS</span><h2>New vehicle</h2></div><ShieldCheck size={23} /></div><form onSubmit={addVehicle}><input required placeholder="Make" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} /><input required placeholder="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>SUV</option><option>Sedan</option><option>Electric</option><option>Truck</option></select><div className="form-row"><input required min="0" type="number" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /><input required min="0" type="number" placeholder="Qty" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div><button className="primary-button" type="submit"><Plus size={17} /> Add vehicle</button></form><p className="panel-note"><Wrench size={14} /> Admin actions are protected by your signed session.</p></aside>}</section></main>
}

export default App
