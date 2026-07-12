// Creates a starter admin, staff, and a few resident accounts so the app is
// usable immediately after deployment. Run with: npm run seed
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

function upsertUser({ name, email, password, role, building }) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    console.log(`Skip (exists): ${email}`);
    return existing.id;
  }
  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(`INSERT INTO users (id, name, email, password_hash, role, building) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id, name, email, hash, role, building || null);
  console.log(`Created ${role}: ${email} / ${password}`);
  return id;
}

const adminId = upsertUser({ name: 'Dana Whitfield', email: 'admin@deltalandings.org', password: 'ChangeMe123!', role: 'admin' });
const staffId = upsertUser({ name: 'Marcus Reed', email: 'staff@deltalandings.org', password: 'ChangeMe123!', role: 'staff' });
upsertUser({ name: 'Alicia Torres', email: 'resident.a@deltalandings.org', password: 'ChangeMe123!', role: 'client', building: 'A' });
upsertUser({ name: 'James Okafor', email: 'resident.b@deltalandings.org', password: 'ChangeMe123!', role: 'client', building: 'B' });

const feedCount = db.prepare('SELECT COUNT(*) AS c FROM feed_posts').get().c;
if (feedCount === 0 && adminId) {
  db.prepare(`INSERT INTO feed_posts (id, title, body, event_date, posted_by) VALUES (?, ?, ?, ?, ?)`).run(
    uuidv4(),
    'Welcome to the Delta Landings resident portal',
    'Use this portal to reserve laundry time in your building, submit a grievance or maintenance request, and keep up with community events. Front desk staff can reach you here too, so check your notifications regularly.',
    null,
    adminId
  );
  db.prepare(`INSERT INTO feed_posts (id, title, body, event_date, posted_by) VALUES (?, ?, ?, ?, ?)`).run(
    uuidv4(),
    'Community dinner - all buildings welcome',
    'Join us in the main hall for a community dinner. Sign-up sheets are at each building front desk.',
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    staffId
  );
  console.log('Seeded sample feed posts.');
}

console.log('\nSeed complete. Demo logins:');
console.log('  Admin:    admin@deltalandings.org / ChangeMe123!');
console.log('  Staff:    staff@deltalandings.org / ChangeMe123!');
console.log('  Resident: resident.a@deltalandings.org / ChangeMe123! (Building A)');
console.log('  Resident: resident.b@deltalandings.org / ChangeMe123! (Building B)');
