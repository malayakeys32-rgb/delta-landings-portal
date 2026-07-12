import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../api.js';

export default function Grievances() {
  const { user } = useAuth();
  const [list, setList] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', category: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const data = await api.get('/grievances');
    setList(data.grievances);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.post('/grievances', form);
      setForm({ subject: '', description: '', category: '' });
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e.message);
    } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="section-head">
        <h2 style={{ fontSize: 19 }}>All grievances</h2>
        {user.role === 'client' && (
          <button className="btn btn-accent" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : '+ File a grievance'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 18 }}>
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="subject">Subject</label>
              <input id="subject" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="category">Category (optional)</label>
              <input id="category" placeholder="e.g. noise, staff conduct, facilities" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="description">Describe what happened</label>
              <textarea id="description" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <button className="btn btn-primary" disabled={busy} type="submit">{busy ? <span className="loading-spin" /> : 'Submit grievance'}</button>
            <p className="hint">Once submitted, an administrator will acknowledge it and assign staff. You'll be able to message them and upload documents from the grievance page.</p>
          </form>
        </div>
      )}

      <div className="card">
        {!list ? (
          <div className="center-pad"><span className="loading-spin" /></div>
        ) : list.length === 0 ? (
          <div className="empty-state"><div className="glyph">📋</div>No grievances filed yet.</div>
        ) : (
          list.map((g) => (
            <Link className="list-row" to={`/grievances/${g.id}`} key={g.id}>
              <div>
                <div className="main-text">{g.subject}</div>
                <div className="sub-text">Filed {new Date(g.created_at + 'Z').toLocaleDateString()} · Stage: {g.stage.replace('_', ' ')}</div>
              </div>
              <div className="spacer" />
              <span className={`badge badge-${g.status}`}>{g.status}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
