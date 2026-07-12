const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authRequired, staffOrAdmin } = require('../middleware/auth');

const router = express.Router();

const BUILDING_CODES = ['A', 'B', 'C', 'D', 'E'];

function assertBuilding(code) {
  return BUILDING_CODES.includes(code);
}

// List the 24 hourly slots for every machine in a building on a given date.
// Any hour without a row in laundry_slots is implicitly open.
router.get('/slots', authRequired, (req, res) => {
  const { building, date } = req.query;
  if (!assertBuilding(building)) return res.status(400).json({ error: 'Invalid building' });
  if (!date) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });

  const b = db.prepare('SELECT * FROM buildings WHERE code = ?').get(building);
  const rows = db.prepare(
    `SELECT ls.*, u.name AS reserved_by_name FROM laundry_slots ls
     LEFT JOIN users u ON u.id = ls.user_id
     WHERE ls.building = ? AND ls.slot_date = ?`
  ).all(building, date);

  const byKey = {};
  for (const r of rows) byKey[`${r.machine_no}-${r.start_hour}`] = r;

  const grid = [];
  for (let m = 1; m <= b.machine_count; m++) {
    const machineSlots = [];
    for (let h = 0; h < 24; h++) {
      const existing = byKey[`${m}-${h}`];
      if (existing) {
        machineSlots.push({
          id: existing.id,
          machine_no: m,
          start_hour: h,
          status: existing.status,
          is_mine: existing.user_id === req.user.id,
          reserved_by_name: req.user.role === 'client' ? undefined : existing.reserved_by_name
        });
      } else {
        machineSlots.push({ id: null, machine_no: m, start_hour: h, status: 'open', is_mine: false });
      }
    }
    grid.push({ machine_no: m, slots: machineSlots });
  }

  res.json({ building, date, machine_count: b.machine_count, grid });
});

// Reserve a slot. Clients can only book within their own building.
router.post('/reserve', authRequired, (req, res) => {
  const { building, machine_no, slot_date, start_hour } = req.body || {};
  if (!assertBuilding(building)) return res.status(400).json({ error: 'Invalid building' });
  if (!slot_date || start_hour === undefined || !machine_no) {
    return res.status(400).json({ error: 'building, machine_no, slot_date, and start_hour are required' });
  }
  if (req.user.role === 'client' && req.user.building !== building) {
    return res.status(403).json({ error: 'Residents may only reserve laundry slots in their own building' });
  }
  const hour = Number(start_hour);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return res.status(400).json({ error: 'start_hour must be 0-23' });
  }

  const existing = db.prepare(
    `SELECT * FROM laundry_slots WHERE building = ? AND machine_no = ? AND slot_date = ? AND start_hour = ?`
  ).get(building, machine_no, slot_date, hour);
  if (existing && existing.status === 'reserved') {
    return res.status(409).json({ error: 'That slot is already reserved' });
  }

  // Limit residents to 2 active reservations at a time so one person can't block a building out.
  if (req.user.role === 'client') {
    const activeCount = db.prepare(
      `SELECT COUNT(*) AS c FROM laundry_slots WHERE user_id = ? AND status = 'reserved' AND slot_date >= date('now')`
    ).get(req.user.id).c;
    if (activeCount >= 2) {
      return res.status(409).json({ error: 'You already have 2 upcoming laundry reservations. Cancel one to book another.' });
    }
  }

  const id = existing ? existing.id : uuidv4();
  if (existing) {
    db.prepare(`UPDATE laundry_slots SET status = 'reserved', user_id = ? WHERE id = ?`).run(req.user.id, id);
  } else {
    db.prepare(
      `INSERT INTO laundry_slots (id, building, machine_no, slot_date, start_hour, user_id, status) VALUES (?, ?, ?, ?, ?, ?, 'reserved')`
    ).run(id, building, machine_no, slot_date, hour, req.user.id);
  }

  db.prepare(`INSERT INTO notifications (id, user_id, message, link) VALUES (?, ?, ?, ?)`).run(
    uuidv4(), req.user.id, `Laundry reserved: Building ${building}, machine ${machine_no}, ${slot_date} at ${hour}:00`, '/laundry'
  );

  res.status(201).json({ id, building, machine_no, slot_date, start_hour: hour, status: 'reserved' });
});

// Cancel a reservation (owner, staff, or admin)
router.delete('/reserve/:id', authRequired, (req, res) => {
  const slot = db.prepare('SELECT * FROM laundry_slots WHERE id = ?').get(req.params.id);
  if (!slot) return res.status(404).json({ error: 'Reservation not found' });
  if (req.user.role === 'client' && slot.user_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only cancel your own reservation' });
  }
  db.prepare(`UPDATE laundry_slots SET status = 'cancelled', user_id = NULL WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// My upcoming reservations
router.get('/mine', authRequired, (req, res) => {
  const rows = db.prepare(
    `SELECT * FROM laundry_slots WHERE user_id = ? AND status = 'reserved' ORDER BY slot_date, start_hour`
  ).all(req.user.id);
  res.json({ reservations: rows });
});

// Staff/admin: full reservation list across buildings for a date
router.get('/all', authRequired, staffOrAdmin, (req, res) => {
  const { date } = req.query;
  const rows = db.prepare(
    `SELECT ls.*, u.name AS resident_name, u.building AS resident_building FROM laundry_slots ls
     LEFT JOIN users u ON u.id = ls.user_id
     WHERE ls.status = 'reserved' ${date ? 'AND ls.slot_date = ?' : ''}
     ORDER BY ls.slot_date, ls.building, ls.machine_no, ls.start_hour`
  ).all(...(date ? [date] : []));
  res.json({ reservations: rows });
});

router.get('/buildings', authRequired, (req, res) => {
  const buildings = db.prepare('SELECT * FROM buildings ORDER BY code').all();
  res.json({ buildings });
});

module.exports = router;
