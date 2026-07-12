import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

const BUILDINGS = ['A', 'B', 'C', 'D', 'E'];

export default function AuthPage() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    name: '', email: '', password: '', role: 'client', building: 'A', unit: '', phone: '', inviteCode: ''
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await login(loginForm.email, loginForm.password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await signup(signupForm);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="mark">DL</div>
          <div>
            <div className="word">Delta Landings</div>
            <div className="sub">Resident &amp; staff portal</div>
          </div>
        </div>

        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Log in</button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Sign up</button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" required value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" required value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} />
            </div>
            <button className="btn btn-primary btn-block" disabled={busy} type="submit">
              {busy ? <span className="loading-spin" /> : 'Log in'}
            </button>
            <p className="hint" style={{ marginTop: 14 }}>
              Demo logins: admin@deltalandings.org · staff@deltalandings.org · resident.a@deltalandings.org (password ChangeMe123!)
            </p>
          </form>
        ) : (
          <form onSubmit={handleSignup}>
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input id="name" required value={signupForm.name} onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="signup-email">Email</label>
              <input id="signup-email" type="email" required value={signupForm.email}
                onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="signup-password">Password</label>
              <input id="signup-password" type="password" required minLength={6} value={signupForm.password}
                onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="role">I am a</label>
              <select id="role" value={signupForm.role} onChange={(e) => setSignupForm({ ...signupForm, role: e.target.value })}>
                <option value="client">Resident</option>
                <option value="staff">Staff member</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            {signupForm.role === 'client' ? (
              <div className="field-row">
                <div className="field">
                  <label htmlFor="building">Building</label>
                  <select id="building" value={signupForm.building} onChange={(e) => setSignupForm({ ...signupForm, building: e.target.value })}>
                    {BUILDINGS.map((b) => <option key={b} value={b}>Building {b}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="unit">Unit / room (optional)</label>
                  <input id="unit" value={signupForm.unit} onChange={(e) => setSignupForm({ ...signupForm, unit: e.target.value })} />
                </div>
              </div>
            ) : (
              <div className="field">
                <label htmlFor="invite">Staff/admin invite code</label>
                <input id="invite" required value={signupForm.inviteCode}
                  onChange={(e) => setSignupForm({ ...signupForm, inviteCode: e.target.value })} />
                <div className="hint">Provided by shelter management to prevent unauthorized staff accounts.</div>
              </div>
            )}
            <div className="field">
              <label htmlFor="phone">Phone (optional)</label>
              <input id="phone" value={signupForm.phone} onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })} />
            </div>
            <button className="btn btn-primary btn-block" disabled={busy} type="submit">
              {busy ? <span className="loading-spin" /> : 'Create account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
