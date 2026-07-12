const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authRequired, staffOrAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', authRequired, (req, res) => {
  const posts = db.prepare(
    `SELECT fp.*, u.name AS author_name, u.role AS author_role FROM feed_posts fp
     JOIN users u ON u.id = fp.posted_by ORDER BY fp.created_at DESC LIMIT 100`
  ).all();
  res.json({ posts });
});

router.post('/', authRequired, staffOrAdmin, (req, res) => {
  const { title, body, event_date } = req.body || {};
  if (!title || !body) return res.status(400).json({ error: 'Title and body are required' });
  const id = uuidv4();
  db.prepare(`INSERT INTO feed_posts (id, title, body, event_date, posted_by) VALUES (?, ?, ?, ?, ?)`)
    .run(id, title.trim(), body.trim(), event_date || null, req.user.id);
  res.status(201).json({ id });
});

router.delete('/:id', authRequired, staffOrAdmin, (req, res) => {
  const post = db.prepare('SELECT * FROM feed_posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (req.user.role !== 'admin' && post.posted_by !== req.user.id) {
    return res.status(403).json({ error: 'You can only remove your own posts' });
  }
  db.prepare('DELETE FROM feed_posts WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
