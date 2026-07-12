import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function Directory() {
  const [staff, setStaff] = useState(null);
  const [buildings, setBuildings] = useState(null);
  const [reservations, setReservations] = useState(null);

  useEffect(() => {
    api.get('/auth/staff').then((r) => setStaff(r.staff));
    api.get('/laundry/buildings').then((r) => setBuildings(r.buildings));
    api.get(`/laundry/all?date=${todayStr()}`).then((r) => setReservations(r.reservations));
  }, []);

  return (
    <div>
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="section-head"><h2 style={{ fontSize: 16 }}>Buildings</h2></div>
        {!buildings ? <div className="center-pad"><span className="loading-spin" /></div> : (
          <div className="grid-cards">
            {buildings.map((b) => (
              <div className="stat-card" key={b.code}>
                <div className="num">{b.code}</div>
                <div className="label">Capacity {b.capacity} residents · {b.machine_count} laundry machines</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="section-head"><h2 style={{ fontSize: 16 }}>Staff &amp; admin directory</h2></div>
        {!staff ? <div className="center-pad"><span className="loading-spin" /></div> : (
          staff.map((s) => (
            <div className="list-row" key={s.id}>
              <div>
                <div className="main-text">{s.name}</div>
                <div className="sub-text">{s.email}</div>
              </div>
              <div className="spacer" />
              <span className="badge badge-normal">{s.role}</span>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <div className="section-head"><h2 style={{ fontSize: 16 }}>Today's laundry reservations (all buildings)</h2></div>
        {!reservations ? <div className="center-pad"><span className="loading-spin" /></div> : reservations.length === 0 ? (
          <div className="empty-state"><div className="glyph">🧺</div>No reservations for today yet.</div>
        ) : (
          reservations.map((r) => (
            <div className="list-row" key={r.id}>
              <div className="building-badge">{r.building}</div>
              <div>
                <div className="main-text">{r.resident_name || 'Unknown resident'}</div>
                <div className="sub-text">Machine {r.machine_no} · {String(r.start_hour).padStart(2, '0')}:00</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
