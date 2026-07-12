const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { JWT_SECRET, authRequired } = require('../middleware/auth');

const router = express.Router();

// Staff/admin signups require an invite code so residents can't self-elevate.
const STAFF_INVITE_CODE = process.env.STAFF_INVITE_CODE || 'DL-STAFF-2026';
const ADMIN_INVITE_CODE = process.env.ADMIN_INVITE_CODE || 'DL-ADMIN-2026';

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, building: user.building },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, building: u.building, unit: u.unit, phone: u.phone, created_at: u.created_at };
}

router.post('/signup', (req, res) => {
  const { name, email, password, role, building, unit, phone, inviteCode } = req.body || {};
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required' });
  }
  if (!['client', 'staff', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  if (role === 'client' && !building) {
    return res.status(400).json({ error: 'Building is required for resident accounts' });
  }
  if (role === 'client' && !['A', 'B', 'C', 'D', 'E'].includes(building)) {
    return res.status(400).json({ error: 'Building must be one of A, B, C, D, E' });
  }
  if (role === 'staff' && inviteCode !== STAFF_INVITE_CODE) {
    return res.status(403).json({ error: 'A valid staff invite code is required' });
  }
  if (role === 'admin' && inviteCode !== ADMIN_INVITE_CODE) {
    return res.status(403).json({ error: 'A valid admin invite code is required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) return res.status(409).json({ error: 'An account with that email already exists' });

  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(`INSERT INTO users (id, name, email, password_hash, role, building, unit, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, name.trim(), email.toLowerCase().trim(), hash, role, role === 'client' ? building : null, unit || null, phone || null);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user) return res.status(401).json({ error: 'Incorrect email or password' });
  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Incorrect email or password' });
  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

router.get('/me', authRequired, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Account not found' });
  res.json({ user: publicUser(user) });
});

// Staff/admin directory - used to assign grievances/tickets/tasks
router.get('/staff', authRequired, (req, res) => {
  const staff = db.prepare(`SELECT id, name, email, role FROM users WHERE role IN ('staff','admin') ORDER BY name`).all();
  res.json({ staff });
});

module.exports = router;
