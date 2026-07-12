import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../api.js';

export default function GrievanceDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [nextStage, setNextStage] = useState('');
  const [stageNote, setStageNote] = useState('');
  const [message, setMessage] = useState('');
  const fileRef = useRef(null);
  const threadEndRef = useRef(null);

  const load = async () => {
    try {
      const d = await api.get(`/grievances/${id}`);
      setData(d);
    } catch (e) { setError(e.message); }
  };

  useEffect(() => {
    load();
    if (user.role !== 'client') {
      api.get('/auth/staff').then((r) => setStaffList(r.staff));
    }
    /* eslint-disable-next-line */
  }, [id]);

  useEffect(() => { threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [data?.messages?.length]);

  if (!data) return <div className="center-pad"><span className="loading-spin" /></div>;
  const { grievance: g, stageLog, documents, messages, stages } = data;
  const currentIdx = stages.indexOf(g.stage);

  const assign = async () => {
    if (!selectedStaff) return;
    try {
      await api.post(`/grievances/${id}/assign`, { staff_id: selectedStaff });
      await load();
    } catch (e) { setError(e.message); }
  };

  const advanceStage = async () => {
    if (!nextStage) return;
    try {
      await api.post(`/grievances/${id}/stage`, { stage: nextStage, note: stageNote });
      setStageNote('');
      await load();
    } catch (e) { setError(e.message); }
  };

  const uploadDoc = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      await api.postForm(`/grievances/${id}/documents`, fd);
      fileRef.current.value = '';
      await load();
    } catch (e) { setError(e.message); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    try {
      await api.post(`/grievances/${id}/messages`, { message });
      setMessage('');
      await load();
    } catch (e) { setError(e.message); }
  };

  const downloadDoc = async (docId, filename) => {
    try {
      const res = await fetch(`${api.API_BASE}/grievances/${id}/documents/${docId}/download`, {
        headers: { Authorization: `Bearer ${api.getToken()}` }
      });
      if (!res.ok) throw new Error('Could not download file');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) { setError(e.message); }
  };

  return (
    <div>
      <Link to="/grievances" className="hint">&larr; Back to grievances</Link>
      {error && <div className="error-banner" style={{ marginTop: 12 }}>{error}</div>}

      <div className="card" style={{ marginTop: 14 }}>
        <div className="section-head">
          <h2 style={{ fontSize: 20 }}>{g.subject}</h2>
          <span className={`badge badge-${g.status}`}>{g.status}</span>
        </div>
        <p className="muted" style={{ fontSize: 13 }}>Filed {new Date(g.created_at + 'Z').toLocaleString()}{g.category ? ` · ${g.category}` : ''}</p>
        <p>{g.description}</p>

        <div className="stage-track" style={{ marginTop: 24 }}>
          {stages.map((s, i) => (
            <div key={s} className={`stage-step ${i < currentIdx ? 'done' : ''} ${i === currentIdx ? 'current' : ''}`}>
              <div className="dot">{i < currentIdx ? '✓' : i + 1}</div>
              <div className="label">{s.replace('_', ' ')}</div>
            </div>
          ))}
        </div>

        {user.role !== 'client' && (
          <div className="grid-2">
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Assign staff / acknowledge</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)} style={{ flex: 1, padding: '9px 10px', border: '1px solid var(--border)', borderRadius: 6 }}>
                  <option value="">Select staff member...</option>
                  {staffList.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                </select>
                <button className="btn btn-primary btn-sm" onClick={assign}>Assign</button>
              </div>
              {g.assigned_staff_id && <p className="hint">Currently assigned. Reassigning will re-acknowledge the grievance.</p>}
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Move to next stage</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={nextStage} onChange={(e) => setNextStage(e.target.value)} style={{ flex: 1, padding: '9px 10px', border: '1px solid var(--border)', borderRadius: 6 }}>
                  <option value="">Select stage...</option>
                  {stages.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
                <button className="btn btn-primary btn-sm" onClick={advanceStage}>Update</button>
              </div>
              <input placeholder="Optional note for the timeline" value={stageNote} onChange={(e) => setStageNote(e.target.value)}
                style={{ width: '100%', marginTop: 8, padding: '9px 10px', border: '1px solid var(--border)', borderRadius: 6 }} />
            </div>
          </div>
        )}
      </div>

      <div className="grid-2" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="section-head"><h2 style={{ fontSize: 16 }}>Timeline</h2></div>
          {stageLog.map((log) => (
            <div className="stage-log-item" key={log.id}>
              <div className="dot2" />
              <div>
                <strong style={{ fontSize: 13, textTransform: 'capitalize' }}>{log.stage.replace('_', ' ')}</strong>
                {log.note && <div style={{ fontSize: 13 }}>{log.note}</div>}
                <div className="sub-text">{new Date(log.created_at + 'Z').toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="section-head"><h2 style={{ fontSize: 16 }}>Documents</h2></div>
          {documents.length === 0 && <p className="muted" style={{ fontSize: 13 }}>No documents uploaded.</p>}
          {documents.map((d) => (
            <div className="doc-row" key={d.id}>
              📄 {d.filename}
              <div className="spacer" />
              <button className="btn btn-ghost btn-sm" onClick={() => downloadDoc(d.id, d.filename)}>Download</button>
            </div>
          ))}
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <input type="file" ref={fileRef} style={{ flex: 1 }} />
            <button className="btn btn-ghost btn-sm" onClick={uploadDoc}>Upload</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="section-head"><h2 style={{ fontSize: 16 }}>Messages</h2></div>
        <div className="thread">
          {messages.length === 0 && <p className="muted" style={{ fontSize: 13 }}>No messages yet. Start the conversation below.</p>}
          {messages.map((m) => (
            <div key={m.id} className={`msg ${m.sender_id === user.id ? 'mine' : 'theirs'}`}>
              <div className="who">{m.sender_name} · {m.sender_role}</div>
              {m.message}
              <div className="when">{new Date(m.created_at + 'Z').toLocaleString()}</div>
            </div>
          ))}
          <div ref={threadEndRef} />
        </div>
        <form className="composer" onSubmit={sendMessage}>
          <textarea placeholder="Write a message..." value={message} onChange={(e) => setMessage(e.target.value)} />
          <button className="btn btn-primary" type="submit">Send</button>
        </form>
      </div>
    </div>
  );
}
