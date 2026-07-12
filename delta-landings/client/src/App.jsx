import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { api } from './api.js';

import AuthPage from './pages/AuthPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Laundry from './pages/Laundry.jsx';
import Grievances from './pages/Grievances.jsx';
import GrievanceDetail from './pages/GrievanceDetail.jsx';
import Maintenance from './pages/Maintenance.jsx';
import MaintenanceDetail from './pages/MaintenanceDetail.jsx';
import Tasks from './pages/Tasks.jsx';
import Feed from './pages/Feed.jsx';
import Directory from './pages/Directory.jsx';

function Shell({ children, title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState({ notifications: [], unread: 0 });

  const loadNotifs = async () => {
    try {
      const data = await api.get('/notifications');
      setNotifs(data);
    } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    loadNotifs();
    const t = setInterval(loadNotifs, 20000);
    return () => clearInterval(t);
  }, []);

  const openNotifs = async () => {
    setNotifOpen((v) => !v);
    if (!notifOpen && notifs.unread > 0) {
      await api.post('/notifications/read-all');
      loadNotifs();
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="mark">DL</div>
          <div className="word">Delta Landings</div>
        </div>
        <nav>
          <NavLink to="/" end><span className="icon">⌂</span> Dashboard</NavLink>
          <NavLink to="/laundry"><span className="icon">🧺</span> Laundry</NavLink>
          <NavLink to="/grievances"><span className="icon">📋</span> Grievances</NavLink>
          <NavLink to="/maintenance"><span className="icon">🔧</span> Maintenance</NavLink>
          <NavLink to="/tasks"><span className="icon">✓</span> Tasks</NavLink>
          <NavLink to="/feed"><span className="icon">📣</span> Community Feed</NavLink>
          {(user.role === 'staff' || user.role === 'admin') && (
            <NavLink to="/directory"><span className="icon">👥</span> Directory</NavLink>
          )}
        </nav>
        <div className="user-box">
          <div className="user-name">{user.name}</div>
          <div className="user-role">{user.role}{user.building ? ` · Building ${user.building}` : ''}</div>
          <button className="btn btn-ghost btn-sm btn-block" onClick={() => { logout(); navigate('/login'); }}>Sign out</button>
        </div>
      </aside>
      <div className="main">
        <div className="topbar">
          <h1>{title}</h1>
          <div className="actions">
            <button className="bell-btn" onClick={openNotifs} aria-label="Notifications">
              🔔
              {notifs.unread > 0 && <span className="bell-dot" />}
            </button>
          </div>
        </div>
        {notifOpen && (
          <div className="notif-panel">
            {notifs.notifications.length === 0 && <div className="notif-item">No notifications yet.</div>}
            {notifs.notifications.map((n) => (
              <div key={n.id} className={`notif-item ${n.is_read ? '' : 'unread'}`}>
                {n.message}
                <div className="time">{new Date(n.created_at + 'Z').toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
        <div className="content">{children}</div>
      </div>
    </div>
  );
}

function Protected({ children, title }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-pad"><span className="loading-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Shell title={title}>{children}</Shell>;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="center-pad"><span className="loading-spin" /></div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/" element={<Protected title="Dashboard"><Dashboard /></Protected>} />
      <Route path="/laundry" element={<Protected title="Laundry Sign-Up"><Laundry /></Protected>} />
      <Route path="/grievances" element={<Protected title="Grievances"><Grievances /></Protected>} />
      <Route path="/grievances/:id" element={<Protected title="Grievance Detail"><GrievanceDetail /></Protected>} />
      <Route path="/maintenance" element={<Protected title="Maintenance Requests"><Maintenance /></Protected>} />
      <Route path="/maintenance/:id" element={<Protected title="Maintenance Ticket"><MaintenanceDetail /></Protected>} />
      <Route path="/tasks" element={<Protected title="Tasks & To-Dos"><Tasks /></Protected>} />
      <Route path="/feed" element={<Protected title="Community Feed"><Feed /></Protected>} />
      <Route path="/directory" element={<Protected title="Staff Directory"><Directory /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
