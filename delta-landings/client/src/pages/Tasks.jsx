import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../api.js';

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', assigned_to: '', due_date: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const data = await api.get('/tasks');
    setTasks(data.tasks);
  };
  useEffect(() => {
    load();
    if (user.role !== 'client') api.get('/auth/staff').then((r) => setStaffList(r.staff));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.post('/tasks', { ...form, assigned_to: form.assigned_to || undefined });
      setForm({ title: '', description: '', assigned_to: '', due_date: '' });
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const setStatus = async (id, status) => {
    try { await api.post(`/tasks/${id}/status`, { status }); await load(); }
    catch (e) { setError(e.message); }
  };

  const remove = async (id) => {
    try { await api.del(`/tasks/${id}`); await load(); }
    catch (e) { setError(e.message); }
  };

  const columns = [
    { key: 'todo', label: 'To do' },
    { key: 'in_progress', label: 'In progress' },
    { key: 'done', label: 'Done' }
  ];

  return (
    <div>
      {error && <div className="error-banner">{error}</div>}

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="section-head"><h2 style={{ fontSize: 16 }}>Add a task</h2></div>
        <form onSubmit={submit}>
          <div className="field-row">
            <div className="field"><label htmlFor="title">Title</label>
              <input id="title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="field" style={{ maxWidth: 180 }}><label htmlFor="due">Due date (optional)</label>
              <input id="due" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
          </div>
          {user.role !== 'client' && (
            <div className="field">
              <label htmlFor="assignee">Assign to (optional, defaults to yourself)</label>
              <select id="assignee" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
                <option value="">Myself</option>
                {staffList.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
              </select>
            </div>
          )}
          <div className="field">
            <label htmlFor="desc">Notes (optional)</label>
            <textarea id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <button className="btn btn-primary" disabled={busy} type="submit">{busy ? <span className="loading-spin" /> : 'Add task'}</button>
        </form>
      </div>

      {!tasks ? (
        <div className="center-pad"><span className="loading-spin" /></div>
      ) : (
        <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {columns.map((col) => (
            <div className="card" key={col.key}>
              <div className="section-head"><h2 style={{ fontSize: 15 }}>{col.label}</h2>
                <span className="muted">{tasks.filter((t) => t.status === col.key).length}</span>
              </div>
              {tasks.filter((t) => t.status === col.key).length === 0 && <p className="muted" style={{ fontSize: 13 }}>Nothing here.</p>}
              {tasks.filter((t) => t.status === col.key).map((t) => (
                <div className="card" key={t.id} style={{ marginBottom: 10, padding: 12 }}>
                  <strong style={{ fontSize: 13.5 }}>{t.title}</strong>
                  {t.description && <p style={{ fontSize: 12.5, margin: '4px 0' }}>{t.description}</p>}
                  {t.due_date && <div className="sub-text">Due {t.due_date}</div>}
                  {t.assignee_name && t.assigned_to !== user.id && <div className="sub-text">Assigned to {t.assignee_name}</div>}
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {columns.filter((c) => c.key !== col.key).map((c) => (
                      <button key={c.key} className="btn btn-ghost btn-sm" onClick={() => setStatus(t.id, c.key)}>Move to {c.label}</button>
                    ))}
                    <button className="btn btn-danger btn-sm" onClick={() => remove(t.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
