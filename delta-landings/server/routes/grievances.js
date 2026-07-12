const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authRequired, staffOrAdmin } = require('../middleware/auth');

const router = express.Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

const STAGES = ['submitted', 'acknowledged', 'under_review', 'action_taken', 'resolved'];

function notify(userId, message, link) {
  if (!userId) return;
  db.prepare(`INSERT INTO notifications (id, user_id, message, link) VALUES (?, ?, ?, ?)`).run(uuidv4(), userId, message, link);
}

function canView(user, grievance) {
  if (user.role === 'admin' || user.role === 'staff') return true;
  return grievance.client_id === user.id;
}

// Submit a new grievance
router.post('/', authRequired, (req, res) => {
  if (req.user.role !== 'client') return res.status(403).json({ error: 'Only residents can submit a grievance' });
  const { subject, description, category } = req.body || {};
  if (!subject || !description) return res.status(400).json({ error: 'Subject and description are required' });

  const id = uuidv4();
  db.prepare(
    `INSERT INTO grievances (id, client_id, subject, description, category, status, stage) VALUES (?, ?, ?, ?, ?, 'open', 'submitted')`
  ).run(id, req.user.id, subject.trim(), description.trim(), category || null);

  db.prepare(`INSERT INTO grievance_stage_log (id, grievance_id, stage, note, changed_by) VALUES (?, ?, 'submitted', 'Grievance submitted by resident.', ?)`)
    .run(uuidv4(), id, req.user.id);

  // notify all admins so one can triage / assign
  const admins = db.prepare(`SELECT id FROM users WHERE role = 'admin'`).all();
  for (const a of admins) notify(a.id, `New grievance submitted: "${subject.trim()}"`, `/grievances/${id}`);

  res.status(201).json({ id });
});

// List grievances - clients see their own, staff/admin see assigned or all
router.get('/', authRequired, (req, res) => {
  let rows;
  if (req.user.role === 'client') {
    rows = db.prepare(`SELECT * FROM grievances WHERE client_id = ? ORDER BY created_at DESC`).all(req.user.id);
  } else if (req.user.role === 'staff') {
    rows = db.prepare(`SELECT * FROM grievances WHERE assigned_staff_id = ? ORDER BY created_at DESC`).all(req.user.id);
  } else {
    rows = db.prepare(`SELECT * FROM grievances ORDER BY created_at DESC`).all();
  }
  res.json({ grievances: rows });
});

router.get('/:id', authRequired, (req, res) => {
  const g = db.prepare('SELECT * FROM grievances WHERE id = ?').get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Grievance not found' });
  if (!canView(req.user, g)) return res.status(403).json({ error: 'Not authorized to view this grievance' });

  const stageLog = db.prepare(`SELECT * FROM grievance_stage_log WHERE grievance_id = ? ORDER BY created_at ASC`).all(req.params.id);
  const documents = db.prepare(`SELECT id, filename, uploaded_by, created_at FROM grievance_documents WHERE grievance_id = ? ORDER BY created_at ASC`).all(req.params.id);
  const messages = db.prepare(
    `SELECT gm.*, u.name AS sender_name, u.role AS sender_role FROM grievance_messages gm
     JOIN users u ON u.id = gm.sender_id WHERE gm.grievance_id = ? ORDER BY gm.created_at ASC`
  ).all(req.params.id);

  res.json({ grievance: g, stageLog, documents, messages, stages: STAGES });
});

// Admin assigns a staff member - this is the "acknowledge and start" action
router.post('/:id/assign', authRequired, staffOrAdmin, (req, res) => {
  const { staff_id } = req.body || {};
  const g = db.prepare('SELECT * FROM grievances WHERE id = ?').get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Grievance not found' });
  const staff = db.prepare(`SELECT * FROM users WHERE id = ? AND role IN ('staff','admin')`).get(staff_id);
  if (!staff) return res.status(400).json({ error: 'Invalid staff member' });

  db.prepare(`UPDATE grievances SET assigned_staff_id = ?, stage = 'acknowledged', updated_at = datetime('now') WHERE id = ?`).run(staff_id, req.params.id);
  db.prepare(`INSERT INTO grievance_stage_log (id, grievance_id, stage, note, changed_by) VALUES (?, ?, 'acknowledged', ?, ?)`)
    .run(uuidv4(), req.params.id, `Assigned to ${staff.name} and acknowledged.`, req.user.id);

  notify(g.client_id, `Your grievance "${g.subject}" has been acknowledged and assigned to ${staff.name}.`, `/grievances/${g.id}`);
  notify(staff_id, `You have been assigned a grievance: "${g.subject}"`, `/grievances/${g.id}`);

  res.json({ ok: true });
});

// Advance / update the stage of the grievance
router.post('/:id/stage', authRequired, staffOrAdmin, (req, res) => {
  const { stage, note } = req.body || {};
  if (!STAGES.includes(stage)) return res.status(400).json({ error: 'Invalid stage' });
  const g = db.prepare('SELECT * FROM grievances WHERE id = ?').get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Grievance not found' });

  const status = stage === 'resolved' ? 'closed' : 'open';
  db.prepare(`UPDATE grievances SET stage = ?, status = ?, updated_at = datetime('now') WHERE id = ?`).run(stage, status, req.params.id);
  db.prepare(`INSERT INTO grievance_stage_log (id, grievance_id, stage, note, changed_by) VALUES (?, ?, ?, ?, ?)`)
    .run(uuidv4(), req.params.id, stage, note || null, req.user.id);

  notify(g.client_id, `Your grievance "${g.subject}" moved to stage: ${stage.replace('_', ' ')}.`, `/grievances/${g.id}`);

  res.json({ ok: true });
});

// Upload a supporting document
router.post('/:id/documents', authRequired, upload.single('file'), (req, res) => {
  const g = db.prepare('SELECT * FROM grievances WHERE id = ?').get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Grievance not found' });
  if (!canView(req.user, g)) return res.status(403).json({ error: 'Not authorized' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const id = uuidv4();
  db.prepare(`INSERT INTO grievance_documents (id, grievance_id, filename, stored_name, uploaded_by) VALUES (?, ?, ?, ?, ?)`)
    .run(id, req.params.id, req.file.originalname, req.file.filename, req.user.id);

  res.status(201).json({ id, filename: req.file.originalname });
});

router.get('/:id/documents/:docId/download', authRequired, (req, res) => {
  const g = db.prepare('SELECT * FROM grievances WHERE id = ?').get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Grievance not found' });
  if (!canView(req.user, g)) return res.status(403).json({ error: 'Not authorized' });
  const doc = db.prepare('SELECT * FROM grievance_documents WHERE id = ? AND grievance_id = ?').get(req.params.docId, req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.download(path.join(UPLOAD_DIR, doc.stored_name), doc.filename);
});

// Messaging thread
router.post('/:id/messages', authRequired, (req, res) => {
  const { message } = req.body || {};
  if (!message || !message.trim()) return res.status(400).json({ error: 'Message cannot be empty' });
  const g = db.prepare('SELECT * FROM grievances WHERE id = ?').get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Grievance not found' });
  if (!canView(req.user, g)) return res.status(403).json({ error: 'Not authorized' });

  const id = uuidv4();
  db.prepare(`INSERT INTO grievance_messages (id, grievance_id, sender_id, message) VALUES (?, ?, ?, ?)`)
    .run(id, req.params.id, req.user.id, message.trim());

  const notifyTarget = req.user.id === g.client_id ? g.assigned_staff_id : g.client_id;
  notify(notifyTarget, `New message on grievance "${g.subject}"`, `/grievances/${g.id}`);

  res.status(201).json({ id });
});

module.exports = router;
