require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const laundryRoutes = require('./routes/laundry');
const grievanceRoutes = require('./routes/grievances');
const maintenanceRoutes = require('./routes/maintenance');
const taskRoutes = require('./routes/tasks');
const feedRoutes = require('./routes/feed');
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'delta-landings-api', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/laundry', laundryRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/notifications', notificationRoutes);

// Serve the built React client in production (single-service Render deploy)
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (req, res, next) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next();
  });
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

app.listen(PORT, () => {
  console.log(`Delta Landings API listening on port ${PORT}`);
});
