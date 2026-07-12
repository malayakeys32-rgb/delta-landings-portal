const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authRequired, staffOrAdmin } = require('../middleware/auth');

const router = express.Router();

function notify(userId, message, link) {
  if (!userId) return;
  db.prepare(`INSERT INTO notifications (id, user_id, message, link) VALUES (?, ?, ?, ?)`).run(uuidv4(), userId, message, link);
}

// Any user can create a personal task; staff/admin can assign to others.
router.post('/', authRequired, (req, res) => {
  const { title, description, assigned_to, due_date } = req.body || {};
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });

  let assignee = req.user.id;
  if (assigned_to && assigned_to !== req.user.id) {
    if (req.user.role === 'client') return res.status(403).json({ error: 'Residents can only create tasks for themselves' });
    assignee = assigned_to;
  }

  const id = uuidv4();
  db.prepare(
    `INSERT INTO tasks (id, title, description, assigned_to, created_by, status, due_date) VALUES (?, ?, ?, ?, ?, 'todo', ?)`
  ).run(id, title.trim(), description || null, assignee, req.user.id, due_date || null);

  if (assignee !== req.user.id) notify(assignee, `New task assigned: "${title.trim()}"`, '/tasks');

  res.status(201).json({ id });
});

router.get('/', authRequired, (req, res) => {
  let rows;
  if (req.user.role === 'admin') {
    rows = db.prepare(
      `SELECT t.*, u.name AS assignee_name FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to ORDER BY
       CASE t.status WHEN 'todo' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, t.due_date IS NULL, t.due_date ASC`
    ).all();
  } else {
    rows = db.prepare(
      `SELECT t.*, u.name AS assignee_name FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to
       WHERE t.assigned_to = ? OR t.created_by = ?
       ORDER BY CASE t.status WHEN 'todo' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, t.due_date IS NULL, t.due_date ASC`
    ).all(req.user.id, req.user.id);
  }
  res.json({ tasks: rows });
});

router.post('/:id/status', authRequired, (req, res) => {
  const { status } = req.body || {};
  if (!['todo', 'in_progress', 'done'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const t = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Task not found' });
  if (req.user.role === 'client' && t.assigned_to !== req.user.id && t.created_by !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  db.prepare(`UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', authRequired, (req, res) => {
  const t = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Task not found' });
  if (req.user.role === 'client' && t.created_by !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
