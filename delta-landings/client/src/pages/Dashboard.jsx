import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../api.js';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      const [laundryMine, grievances, tickets, tasks, feed] = await Promise.all([
        api.get('/laundry/mine'),
        api.get('/grievances'),
        api.get('/maintenance'),
        api.get('/tasks'),
        api.get('/feed')
      ]);
      setData({ laundryMine, grievances, tickets, tasks, feed });
    })();
  }, []);

  if (!data) return <div className="center-pad"><span className="loading-spin" /></div>;

  const openGrievances = data.grievances.grievances.filter((g) => g.status === 'open').length;
  const openTickets = data.tickets.tickets.filter((t) => t.status !== 'resolved').length;
  const openTasks = data.tasks.tasks.filter((t) => t.status !== 'done').length;

  return (
    <div>
      <div className="grid-cards" style={{ marginBottom: 22 }}>
        <div className="stat-card"><div className="num">{data.laundryMine.reservations.length}</div><div className="label">Upcoming laundry slots</div></div>
        <div className="stat-card"><div className="num">{openGrievances}</div><div className="label">Open grievances</div></div>
        <div className="stat-card"><div className="num">{openTickets}</div><div className="label">Open maintenance tickets</div></div>
        <div className="stat-card"><div className="num">{openTasks}</div><div className="label">Tasks to do</div></div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="section-head"><h2>Your upcoming laundry</h2><Link to="/laundry" className="btn btn-ghost btn-sm">Book a slot</Link></div>
          {data.laundryMine.reservations.length === 0 ? (
            <div className="empty-state"><div className="glyph">🧺</div>No reservations yet.</div>
          ) : (
            data.laundryMine.reservations.map((r) => (
              <div className="list-row" key={r.id}>
                <div className="building-badge">{r.building}</div>
                <div>
                  <div className="main-text">Machine {r.machine_no} · {r.start_hour}:00</div>
                  <div className="sub-text">{r.slot_date}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="section-head"><h2>Latest community feed</h2><Link to="/feed" className="btn btn-ghost btn-sm">View all</Link></div>
          {data.feed.posts.length === 0 ? (
            <div className="empty-state"><div className="glyph">📣</div>Nothing posted yet.</div>
          ) : (
            data.feed.posts.slice(0, 3).map((p) => (
              <div className="feed-post" key={p.id}>
                <div className="meta">{p.author_name} · {new Date(p.created_at + 'Z').toLocaleDateString()}</div>
                <strong>{p.title}</strong>
                <p style={{ marginTop: 4 }}>{p.body}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="section-head"><h2>Recent grievances</h2><Link to="/grievances" className="btn btn-ghost btn-sm">View all</Link></div>
          {data.grievances.grievances.length === 0 ? (
            <div className="empty-state"><div className="glyph">📋</div>Nothing filed.</div>
          ) : (
            data.grievances.grievances.slice(0, 4).map((g) => (
              <Link className="list-row" to={`/grievances/${g.id}`} key={g.id}>
                <div>
                  <div className="main-text">{g.subject}</div>
                  <div className="sub-text">Stage: {g.stage.replace('_', ' ')}</div>
                </div>
                <div className="spacer" />
                <span className={`badge badge-${g.status}`}>{g.status}</span>
              </Link>
            ))
          )}
        </div>

        <div className="card">
          <div className="section-head"><h2>Recent maintenance</h2><Link to="/maintenance" className="btn btn-ghost btn-sm">View all</Link></div>
          {data.tickets.tickets.length === 0 ? (
            <div className="empty-state"><div className="glyph">🔧</div>Nothing filed.</div>
          ) : (
            data.tickets.tickets.slice(0, 4).map((t) => (
              <Link className="list-row" to={`/maintenance/${t.id}`} key={t.id}>
                <div>
                  <div className="main-text">{t.location}</div>
                  <div className="sub-text">Building {t.building}</div>
                </div>
                <div className="spacer" />
                <span className={`badge badge-${t.status}`}>{t.status.replace('_', ' ')}</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
