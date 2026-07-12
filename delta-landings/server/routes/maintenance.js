const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authRequired, staffOrAdmin } = require('../middleware/auth');

const router = express.Router();

function notify(userId, message, link) {
  if (!userId) return;
  db.prepare(`INSERT INTO notifications (id, user_id, message, link) VALUES (?, ?, ?, ?)`).run(uuidv4(), userId, message, link);
}

router.post('/', authRequired, (req, res) => {
  const { location, issue, priority, building } = req.body || {};
  if (!location || !issue) return res.status(400).json({ error: 'Location and issue description are required' });
  const bld = req.user.role === 'client' ? req.user.building : building;
  if (!bld) return res.status(400).json({ error: 'Building is required' });

  const id = uuidv4();
  db.prepare(
    `INSERT INTO maintenance_tickets (id, client_id, building, location, issue, priority, status) VALUES (?, ?, ?, ?, ?, ?, 'submitted')`
  ).run(id, req.user.id, bld, location.trim(), issue.trim(), priority || 'normal');

  const admins = db.prepare(`SELECT id FROM users WHERE role = 'admin'`).all();
  for (const a of admins) notify(a.id, `New maintenance ticket: ${location.trim()} (Building ${bld})`, `/maintenance/${id}`);

  res.status(201).json({ id });
});

router.get('/', authRequired, (req, res) => {
  let rows;
  if (req.user.role === 'client') {
    rows = db.prepare(`SELECT * FROM maintenance_tickets WHERE client_id = ? ORDER BY created_at DESC`).all(req.user.id);
  } else if (req.user.role === 'staff') {
    rows = db.prepare(`SELECT * FROM maintenance_tickets WHERE assigned_staff_id = ? ORDER BY created_at DESC`).all(req.user.id);
  } else {
    rows = db.prepare(`SELECT * FROM maintenance_tickets ORDER BY created_at DESC`).all();
  }
  res.json({ tickets: rows });
});

router.get('/:id', authRequired, (req, res) => {
  const t = db.prepare('SELECT * FROM maintenance_tickets WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Ticket not found' });
  if (req.user.role === 'client' && t.client_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
  const messages = db.prepare(
    `SELECT mm.*, u.name AS sender_name, u.role AS sender_role FROM maintenance_messages mm
     JOIN users u ON u.id = mm.sender_id WHERE mm.ticket_id = ? ORDER BY mm.created_at ASC`
  ).all(req.params.id);
  res.json({ ticket: t, messages });
});

router.post('/:id/assign', authRequired, staffOrAdmin, (req, res) => {
  const { staff_id } = req.body || {};
  const t = db.prepare('SELECT * FROM maintenance_tickets WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Ticket not found' });
  const staff = db.prepare(`SELECT * FROM users WHERE id = ? AND role IN ('staff','admin')`).get(staff_id);
  if (!staff) return res.status(400).json({ error: 'Invalid staff member' });

  db.prepare(`UPDATE maintenance_tickets SET assigned_staff_id = ?, status = 'acknowledged', updated_at = datetime('now') WHERE id = ?`).run(staff_id, req.params.id);
  notify(t.client_id, `Your maintenance ticket "${t.issue}" was acknowledged and assigned to ${staff.name}.`, `/maintenance/${t.id}`);
  notify(staff_id, `You were assigned a maintenance ticket: ${t.location}`, `/maintenance/${t.id}`);
  res.json({ ok: true });
});

router.post('/:id/status', authRequired, staffOrAdmin, (req, res) => {
  const { status } = req.body || {};
  if (!['submitted', 'acknowledged', 'in_progress', 'resolved'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const t = db.prepare('SELECT * FROM maintenance_tickets WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Ticket not found' });

  db.prepare(`UPDATE maintenance_tickets SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, req.params.id);
  notify(t.client_id, `Your maintenance ticket "${t.issue}" is now: ${status.replace('_', ' ')}.`, `/maintenance/${t.id}`);
  res.json({ ok: true });
});

router.post('/:id/messages', authRequired, (req, res) => {
  const { message } = req.body || {};
  if (!message || !message.trim()) return res.status(400).json({ error: 'Message cannot be empty' });
  const t = db.prepare('SELECT * FROM maintenance_tickets WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Ticket not found' });
  if (req.user.role === 'client' && t.client_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

  const id = uuidv4();
  db.prepare(`INSERT INTO maintenance_messages (id, ticket_id, sender_id, message) VALUES (?, ?, ?, ?)`).run(id, req.params.id, req.user.id, message.trim());
  const notifyTarget = req.user.id === t.client_id ? t.assigned_staff_id : t.client_id;
  notify(notifyTarget, `New message on maintenance ticket "${t.location}"`, `/maintenance/${t.id}`);
  res.status(201).json({ id });
});

module.exports = router;
