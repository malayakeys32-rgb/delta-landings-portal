import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../api.js';

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', event_date: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const data = await api.get('/feed');
    setPosts(data.posts);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.post('/feed', form);
      setForm({ title: '', body: '', event_date: '' });
      setShowForm(false);
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const remove = async (id) => {
    try { await api.del(`/feed/${id}`); await load(); }
    catch (e) { setError(e.message); }
  };

  const canPost = user.role === 'staff' || user.role === 'admin';

  return (
    <div>
      {canPost && (
        <div className="section-head">
          <h2 style={{ fontSize: 19 }}>Post to the community</h2>
          <button className="btn btn-accent" onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : '+ New post'}</button>
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: 18 }}>
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={submit}>
            <div className="field"><label htmlFor="title">Title</label>
              <input id="title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="field"><label htmlFor="event_date">Event date (optional)</label>
              <input id="event_date" type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></div>
            <div className="field"><label htmlFor="body">Details</label>
              <textarea id="body" required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
            <button className="btn btn-primary" disabled={busy} type="submit">{busy ? <span className="loading-spin" /> : 'Post to feed'}</button>
          </form>
        </div>
      )}

      <div className="card">
        {!posts ? (
          <div className="center-pad"><span className="loading-spin" /></div>
        ) : posts.length === 0 ? (
          <div className="empty-state"><div className="glyph">📣</div>No posts yet.</div>
        ) : (
          posts.map((p) => (
            <div className="feed-post" key={p.id}>
              <div className="meta">
                {p.author_name} · {p.author_role} · {new Date(p.created_at + 'Z').toLocaleString()}
                {p.event_date && <span className="event-chip">Event: {p.event_date}</span>}
              </div>
              <strong style={{ fontSize: 15 }}>{p.title}</strong>
              <p style={{ marginTop: 6 }}>{p.body}</p>
              {(user.role === 'admin' || p.posted_by === user.id) && (
                <button className="btn btn-ghost btn-sm" onClick={() => remove(p.id)}>Remove</button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
