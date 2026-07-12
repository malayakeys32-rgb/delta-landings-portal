import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../api.js';

const BUILDINGS = ['A', 'B', 'C', 'D', 'E'];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function Laundry() {
  const { user } = useAuth();
  const [building, setBuilding] = useState(user.role === 'client' ? user.building : 'A');
  const [date, setDate] = useState(todayStr());
  const [grid, setGrid] = useState(null);
  const [error, setError] = useState('');
  const [busySlot, setBusySlot] = useState(null);
  const [mine, setMine] = useState([]);

  const canBookHere = user.role !== 'client' || user.building === building;

  const load = async () => {
    setError('');
    try {
      const data = await api.get(`/laundry/slots?building=${building}&date=${date}`);
      setGrid(data);
      const mineData = await api.get('/laundry/mine');
      setMine(mineData.reservations);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [building, date]);

  const reserve = async (machine_no, start_hour) => {
    setBusySlot(`${machine_no}-${start_hour}`);
    setError('');
    try {
      await api.post('/laundry/reserve', { building, machine_no, slot_date: date, start_hour });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusySlot(null);
    }
  };

  const cancel = async (id) => {
    setError('');
    try {
      await api.del(`/laundry/reserve/${id}`);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <div className="building-tabs">
        {BUILDINGS.map((b) => (
          <button key={b} className={`building-tab ${building === b ? 'active' : ''}`} onClick={() => setBuilding(b)}>
            Building {b}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="field-row" style={{ alignItems: 'flex-end' }}>
          <div className="field" style={{ maxWidth: 220 }}>
            <label htmlFor="date">Date</label>
            <input id="date" type="date" value={date} min={todayStr()} onChange={(e) => setDate(e.target.value)} />
          </div>
          <p className="hint" style={{ margin: 0, paddingBottom: 10 }}>
            Laundry rooms run 24 hours. Pick an open hour on any machine below to reserve it.
            {user.role === 'client' && ' Residents may hold up to 2 upcoming reservations at a time.'}
          </p>
        </div>
        {!canBookHere && (
          <div className="error-banner" style={{ marginTop: 10, marginBottom: 0 }}>
            You're viewing Building {building}. As a Building {user.building} resident you can only reserve slots in your own building.
          </div>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {mine.length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="section-head"><h2>Your reservations</h2></div>
          {mine.map((r) => (
            <div className="list-row" key={r.id}>
              <div className="building-badge">{r.building}</div>
              <div>
                <div className="main-text">Machine {r.machine_no} · {String(r.start_hour).padStart(2, '0')}:00</div>
                <div className="sub-text">{r.slot_date}</div>
              </div>
              <div className="spacer" />
              <button className="btn btn-danger btn-sm" onClick={() => cancel(r.id)}>Cancel</button>
            </div>
          ))}
        </div>
      )}

      {!grid ? (
        <div className="center-pad"><span className="loading-spin" /></div>
      ) : (
        <div className="card">
          <div className="section-head"><h2>Building {building} · {date}</h2><span className="muted">{grid.machine_count} machines</span></div>
          {grid.grid.map((m) => (
            <div className="machine-block" key={m.machine_no}>
              <h3>Machine {m.machine_no}</h3>
              <div className="hour-grid">
                {m.slots.map((s) => {
                  const key = `${m.machine_no}-${s.start_hour}`;
                  const status = s.status === 'reserved' ? (s.is_mine ? 'mine' : 'reserved') : 'open';
                  const disabled = !canBookHere || status === 'reserved' || busySlot === key;
                  return (
                    <button
                      key={key}
                      className={`hour-slot ${status} ${disabled && status === 'open' ? 'disabled' : ''}`}
                      disabled={disabled}
                      title={status === 'reserved' && s.reserved_by_name ? `Reserved by ${s.reserved_by_name}` : status === 'mine' ? 'Cancel from "Your reservations" above' : 'Reserve this hour'}
                      onClick={() => status === 'open' && reserve(m.machine_no, s.start_hour)}
                    >
                      <div className="h">{String(s.start_hour).padStart(2, '0')}:00</div>
                      {busySlot === key ? <span className="loading-spin" /> : (status === 'mine' ? 'Yours' : status === 'reserved' ? 'Taken' : 'Open')}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
