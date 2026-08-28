import React, { useState } from 'react';

export default function Auth({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const submit = async (event) => {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to continue.');
      onAuthenticated(data);
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  };
  return <main className="landing auth-page"><section className="brand"><div className="logo">W</div><span>watchwave</span></section><div className="hero-copy"><p className="eyebrow">SYNCED STREAMING, HUMAN MOMENTS</p><h1>One room.<br /><i>Every</i> moment.</h1><p className="lede">Sign in to create private watch parties, share a room code, and watch together in sync.</p></div><form className="join-card" onSubmit={submit}><div className="segmented"><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>Log in</button><button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); }}>Create account</button></div><h2>{mode === 'login' ? 'Welcome back.' : 'Join Watchwave.'}</h2><p>{mode === 'login' ? 'Log in to continue to your watch parties.' : 'Create an account to host or join a party.'}</p>{mode === 'register' && <label>DISPLAY NAME<input value={form.name} onChange={update('name')} placeholder="e.g. Alex" maxLength="28" required /></label>}<label>EMAIL<input type="email" value={form.email} onChange={update('email')} placeholder="you@example.com" required autoComplete="email" /></label><label>PASSWORD<input type="password" value={form.password} onChange={update('password')} placeholder="At least 8 characters" minLength="8" required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>{error && <div className="form-error">{error}</div>}<button className="primary" disabled={loading}>{loading ? 'Please wait…' : mode === 'login' ? 'Log in ?' : 'Create account ?'}</button></form><footer>Built for the group chat that never sleeps.</footer></main>;
}