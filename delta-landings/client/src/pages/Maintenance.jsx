import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../api.js';

const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

export default function Maintenance() {
  const { user } = useAuth();
  const [list, setList] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ location: '', issue: '', priority: 'normal', building: user.building || 'A' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const data = await api.get('/maintenance');
    setList(data.tickets);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.post('/maintenance', form);
      setForm({ location: '', issue: '', priority: 'normal', building: user.building || 'A' });
      setShowForm(false);
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="section-head">
        <h2 style={{ fontSize: 19 }}>All maintenance requests</h2>
        <button className="btn btn-accent" onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : '+ New request'}</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 18 }}>
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={submit}>
            {user.role !== 'client' && (
              <div className="field">
                <label htmlFor="building">Building</label>
                <select id="building" value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })}>
                  {['A', 'B', 'C', 'D', 'E'].map((b) => <option key={b} value={b}>Building {b}</option>)}
                </select>
              </div>
            )}
            <div className="field">
              <label htmlFor="location">Location</label>
              <input id="location" required placeholder="e.g. Unit 214 bathroom, hallway 2nd floor" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="priority">Priority</label>
              <select id="priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="issue">Describe the issue</label>
              <textarea id="issue" required value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} />
            </div>
            <button className="btn btn-primary" disabled={busy} type="submit">{busy ? <span className="loading-spin" /> : 'Submit request'}</button>
          </form>
        </div>
      )}

      <div className="card">
        {!list ? (
          <div className="center-pad"><span className="loading-spin" /></div>
        ) : list.length === 0 ? (
          <div className="empty-state"><div className="glyph">🔧</div>No maintenance requests yet.</div>
        ) : (
          list.map((t) => (
            <Link className="list-row" to={`/maintenance/${t.id}`} key={t.id}>
              <div className="building-badge">{t.building}</div>
              <div>
                <div className="main-text">{t.location}</div>
                <div className="sub-text">Filed {new Date(t.created_at + 'Z').toLocaleDateString()}</div>
              </div>
              <div className="spacer" />
              <span className={`badge badge-${t.priority}`}>{t.priority}</span>
              <span className={`badge badge-${t.status}`} style={{ marginLeft: 8 }}>{t.status.replace('_', ' ')}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
