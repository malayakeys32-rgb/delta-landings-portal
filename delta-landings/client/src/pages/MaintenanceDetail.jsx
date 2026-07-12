import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../api.js';

const STATUSES = ['submitted', 'acknowledged', 'in_progress', 'resolved'];

export default function MaintenanceDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const d = await api.get(`/maintenance/${id}`);
      setData(d);
    } catch (e) { setError(e.message); }
  };

  useEffect(() => {
    load();
    if (user.role !== 'client') api.get('/auth/staff').then((r) => setStaffList(r.staff));
    /* eslint-disable-next-line */
  }, [id]);

  if (!data) return <div className="center-pad"><span className="loading-spin" /></div>;
  const { ticket: t, messages } = data;

  const assign = async () => {
    if (!selectedStaff) return;
    try { await api.post(`/maintenance/${id}/assign`, { staff_id: selectedStaff }); await load(); }
    catch (e) { setError(e.message); }
  };

  const setStatus = async (status) => {
    try { await api.post(`/maintenance/${id}/status`, { status }); await load(); }
    catch (e) { setError(e.message); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    try { await api.post(`/maintenance/${id}/messages`, { message }); setMessage(''); await load(); }
    catch (e) { setError(e.message); }
  };

  return (
    <div>
      <Link to="/maintenance" className="hint">&larr; Back to maintenance</Link>
      {error && <div className="error-banner" style={{ marginTop: 12 }}>{error}</div>}

      <div className="card" style={{ marginTop: 14 }}>
        <div className="section-head">
          <h2 style={{ fontSize: 20 }}>{t.location}</h2>
          <div>
            <span className={`badge badge-${t.priority}`}>{t.priority}</span>
            <span className={`badge badge-${t.status}`} style={{ marginLeft: 8 }}>{t.status.replace('_', ' ')}</span>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 13 }}>Building {t.building} · filed {new Date(t.created_at + 'Z').toLocaleString()}</p>
        <p>{t.issue}</p>

        {user.role !== 'client' && (
          <div className="grid-2" style={{ marginTop: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Assign staff / acknowledge</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)} style={{ flex: 1, padding: '9px 10px', border: '1px solid var(--border)', borderRadius: 6 }}>
                  <option value="">Select staff member...</option>
                  {staffList.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                </select>
                <button className="btn btn-primary btn-sm" onClick={assign}>Assign</button>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Update status</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {STATUSES.map((s) => (
                  <button key={s} className={`btn btn-sm ${t.status === s ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setStatus(s)}>
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="section-head"><h2 style={{ fontSize: 16 }}>Messages</h2></div>
        <div className="thread">
          {messages.length === 0 && <p className="muted" style={{ fontSize: 13 }}>No messages yet.</p>}
          {messages.map((m) => (
            <div key={m.id} className={`msg ${m.sender_id === user.id ? 'mine' : 'theirs'}`}>
              <div className="who">{m.sender_name} · {m.sender_role}</div>
              {m.message}
              <div className="when">{new Date(m.created_at + 'Z').toLocaleString()}</div>
            </div>
          ))}
        </div>
        <form className="composer" onSubmit={sendMessage}>
          <textarea placeholder="Write a message..." value={message} onChange={(e) => setMessage(e.target.value)} />
          <button className="btn btn-primary" type="submit">Send</button>
        </form>
      </div>
    </div>
  );
}
