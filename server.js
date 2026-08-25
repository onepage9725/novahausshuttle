const path = require('path');
const crypto = require('crypto');
require('dotenv').config();
const express = require('express');
const dayjs = require('dayjs');
const {
  initDb,
  getActiveWeekStart,
  ensureTripsForDate,
  listTripsByDate,
  tryBookTrip,
  getTripsByIds,
  listStudentBookingsByDates,
  verifyStudentName,
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  listBookingHistory,
  deleteBookingById,
  listStudentWeekBookings,
  replaceStudentDayBookings,
  listDriverWeekView
} = require('./src/db');

const VALID_LOCATIONS = new Set(['AERA', 'HELIX']);
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'NovaAdmin123@';
const DRIVER_PASSCODE_A = process.env.DRIVER_PASSCODE_A || 'Nova123123@';
const DRIVER_PASSCODE_B = process.env.DRIVER_PASSCODE_B || 'Nova123123@@';
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const DRIVER_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const adminSessions = new Map();
const driverSessions = new Map();

const app = express();
const PORT = process.env.PORT || 3000;
let dbInitPromise = null;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/logo.png', express.static(path.join(__dirname, 'logo.png')));
app.use('/novahauslogo.png', express.static(path.join(__dirname, 'novahauslogo.png')));

function ensureDbInitialized() {
  if (!dbInitPromise) {
    dbInitPromise = initDb().catch((error) => {
      dbInitPromise = null;
      throw error;
    });
  }

  return dbInitPromise;
}

app.use('/api', async (_req, res, next) => {
  try {
    await ensureDbInitialized();
    return next();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

function createAdminToken() {
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = Date.now() + ADMIN_SESSION_TTL_MS;
  adminSessions.set(token, expiresAt);
  return { token, expiresAt };
}

function createDriverToken(bus) {
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = Date.now() + DRIVER_SESSION_TTL_MS;
  driverSessions.set(token, { expiresAt, bus });
  return { token, expiresAt, bus };
}

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';

  if (!token || !adminSessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized admin access.' });
  }

  const expiresAt = adminSessions.get(token);
  if (!expiresAt || Date.now() > expiresAt) {
    adminSessions.delete(token);
    return res.status(401).json({ error: 'Admin session expired. Please login again.' });
  }

  return next();
}

function requireDriver(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';

  if (!token || !driverSessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized driver access.' });
  }

  const session = driverSessions.get(token);
  if (!session || !session.expiresAt || Date.now() > session.expiresAt) {
    driverSessions.delete(token);
    return res.status(401).json({ error: 'Driver session expired. Please login again.' });
  }

  req.driverSession = session;
  return next();
}

app.post('/api/admin/login', (req, res) => {
  const passcode = String(req.body.passcode || '');
  if (passcode !== ADMIN_PASSCODE) {
    return res.status(401).json({ error: 'Invalid passcode.' });
  }

  const session = createAdminToken();
  return res.json({ success: true, token: session.token, expiresAt: session.expiresAt });
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (token) {
    adminSessions.delete(token);
  }
  return res.json({ success: true });
});

app.post('/api/driver/login', (req, res) => {
  const passcode = String(req.body.passcode || '');

  if (passcode === DRIVER_PASSCODE_A) {
    const session = createDriverToken('A');
    return res.json({ success: true, token: session.token, expiresAt: session.expiresAt, bus: 'A' });
  }

  if (passcode === DRIVER_PASSCODE_B) {
    const session = createDriverToken('B');
    return res.json({ success: true, token: session.token, expiresAt: session.expiresAt, bus: 'B' });
  }

  return res.status(401).json({ error: 'Invalid driver passcode.' });
});

app.post('/api/driver/logout', requireDriver, (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (token) {
    driverSessions.delete(token);
  }
  return res.json({ success: true });
});

app.get('/api/driver/session', requireDriver, (req, res) => {
  return res.json({ success: true, bus: req.driverSession.bus || 'A' });
});

app.get('/api/admin/students', requireAdmin, async (_req, res) => {
  try {
    const students = await listStudents();
    return res.json({ students });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/students', requireAdmin, async (req, res) => {
  try {
    const student = await createStudent(req.body.fullName, req.body.contactNumber, req.body.remark);
    return res.json({ success: true, student });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.put('/api/admin/students/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid student id.' });
  }

  try {
    const student = await updateStudent(id, req.body.fullName, req.body.contactNumber, req.body.remark);
    return res.json({ success: true, student });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.delete('/api/admin/students/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid student id.' });
  }

  try {
    await deleteStudent(id);
    return res.json({ success: true });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.get('/adminportal', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'adminportal.html'));
});

app.get('/adminhistory', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'adminhistory.html'));
});

app.get('/driverlogin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'driverlogin.html'));
});

app.get('/driverview', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'driverview.html'));
});

app.get('/api/admin/bookings', requireAdmin, async (req, res) => {
  const weekStart = req.query.weekStart ? String(req.query.weekStart) : '';
  const bus = req.query.bus ? String(req.query.bus).toUpperCase() : '';
  const location = req.query.location ? String(req.query.location).toUpperCase() : '';
  const studentName = req.query.studentName ? String(req.query.studentName).trim() : '';

  if (weekStart && !dayjs(weekStart, 'YYYY-MM-DD', true).isValid()) {
    return res.status(400).json({ error: 'Invalid weekStart date format. Use YYYY-MM-DD.' });
  }

  if (bus && !['A', 'B'].includes(bus)) {
    return res.status(400).json({ error: 'Invalid bus filter.' });
  }

  if (location && !VALID_LOCATIONS.has(location)) {
    return res.status(400).json({ error: 'Invalid location filter.' });
  }

  try {
    const payload = await listBookingHistory({
      weekStart: weekStart || null,
      bus: bus || null,
      location: location || null,
      studentName: studentName || null
    });

    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/driver-view', requireAdmin, async (req, res) => {
  const locationRaw = req.query.location ? String(req.query.location).toUpperCase() : '';
  const location = locationRaw && locationRaw !== 'ALL' ? locationRaw : '';
  const bus = req.query.bus ? String(req.query.bus).toUpperCase() : '';
  const weekStart = req.query.weekStart ? String(req.query.weekStart) : '';

  if (location && !VALID_LOCATIONS.has(location)) {
    return res.status(400).json({ error: 'Invalid location filter.' });
  }

  if (bus && !['A', 'B'].includes(bus)) {
    return res.status(400).json({ error: 'Invalid bus filter.' });
  }

  if (weekStart && !dayjs(weekStart, 'YYYY-MM-DD', true).isValid()) {
    return res.status(400).json({ error: 'Invalid weekStart date format. Use YYYY-MM-DD.' });
  }

  try {
    const payload = await listDriverWeekView({
      location: location || null,
      bus: bus || null,
      weekStart: weekStart || null
    });
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/driver/view', requireDriver, async (req, res) => {
  const locationRaw = req.query.location ? String(req.query.location).toUpperCase() : '';
  const location = locationRaw && locationRaw !== 'ALL' ? locationRaw : '';
  const bus = req.query.bus ? String(req.query.bus).toUpperCase() : 'A';
  const weekStart = req.query.weekStart ? String(req.query.weekStart) : '';

  if (location && !VALID_LOCATIONS.has(location)) {
    return res.status(400).json({ error: 'Invalid location filter.' });
  }

  if (!['A', 'B'].includes(bus)) {
    return res.status(400).json({ error: 'Invalid bus filter.' });
  }

  if (weekStart && !dayjs(weekStart, 'YYYY-MM-DD', true).isValid()) {
    return res.status(400).json({ error: 'Invalid weekStart date format. Use YYYY-MM-DD.' });
  }

  try {
    const payload = await listDriverWeekView({
      location: location || null,
      bus,
      weekStart: weekStart || null
    });

    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/bookings/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid booking id.' });
  }

  try {
    const result = await deleteBookingById(id);
    return res.json(result);
  } catch (error) {
    if (String(error.message || '').toLowerCase().includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/students/verify', async (req, res) => {
  try {
    const valid = await verifyStudentName(req.body.fullName);
    if (!valid) {
      return res.status(401).json({ error: 'Name not found. Please enter full name with correct capital letters and spacing.' });
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/students/week-bookings', async (req, res) => {
  const fullName = String(req.query.fullName || '').trim();
  if (!fullName) {
    return res.status(400).json({ error: 'Student full name is required.' });
  }

  try {
    const valid = await verifyStudentName(fullName);
    if (!valid) {
      return res.status(401).json({ error: 'Name not found. Please enter full name with correct capital letters and spacing.' });
    }

    const payload = await listStudentWeekBookings(fullName);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/students/change-days', async (req, res) => {
  const studentName = String(req.body.studentName || '').trim();
  const changes = Array.isArray(req.body.changes) ? req.body.changes : [];

  if (!studentName) {
    return res.status(400).json({ error: 'Student name is required.' });
  }

  if (changes.length === 0) {
    return res.status(400).json({ error: 'No day changes submitted.' });
  }

  try {
    const valid = await verifyStudentName(studentName);
    if (!valid) {
      return res.status(401).json({ error: 'Name not found. Please enter full name with correct capital letters and spacing.' });
    }

    const results = [];
    for (const change of changes) {
      const date = String((change && change.date) || '').trim();
      const tripIds = Array.isArray(change && change.tripIds) ? change.tripIds : [];

      if (!dayjs(date, 'YYYY-MM-DD', true).isValid()) {
        return res.status(400).json({ error: 'Invalid date found in day changes.' });
      }

      const result = await replaceStudentDayBookings(studentName, date, tripIds);
      results.push(result);
    }

    return res.json({ success: true, results });
  } catch (error) {
    return res.status(409).json({ error: error.message });
  }
});

app.get('/api/trips', async (req, res) => {
  const date = req.query.date;
  const location = (req.query.location || 'AERA').toUpperCase();

  if (!date || !dayjs(date, 'YYYY-MM-DD', true).isValid()) {
    return res.status(400).json({
      error: 'Please provide a valid date in YYYY-MM-DD format.'
    });
  }

  if (!VALID_LOCATIONS.has(location)) {
    return res.status(400).json({
      error: 'Invalid location selected.'
    });
  }

  try {
    await ensureTripsForDate(date, location);
    const trips = await listTripsByDate(date, location);
    return res.json({ date, location, trips });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/week-trips', async (req, res) => {
  const date = req.query.date;
  const location = (req.query.location || 'AERA').toUpperCase();

  if (date && !dayjs(date, 'YYYY-MM-DD', true).isValid()) {
    return res.status(400).json({
      error: 'Please provide a valid date in YYYY-MM-DD format.'
    });
  }

  if (!VALID_LOCATIONS.has(location)) {
    return res.status(400).json({
      error: 'Invalid location selected.'
    });
  }

  let activeWeekStart;
  try {
    activeWeekStart = await getActiveWeekStart();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }

  const monday = new Date(`${activeWeekStart}T00:00:00`);

  const days = [];
  try {
    for (let i = 0; i < 5; i += 1) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const targetDate = dayjs(d).format('YYYY-MM-DD');
      await ensureTripsForDate(targetDate, location);
      days.push({
        date: targetDate,
        location,
        trips: await listTripsByDate(targetDate, location)
      });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({
    anchorDate: date || activeWeekStart,
    location,
    weekStart: activeWeekStart,
    days
  });
});

app.post('/api/book', async (req, res) => {
  const { tripId, studentName } = req.body;

  if (!tripId || Number.isNaN(Number(tripId))) {
    return res.status(400).json({
      error: 'Invalid trip selected.'
    });
  }

  let selectedTrip;
  try {
    const rows = await getTripsByIds([Number(tripId)]);
    selectedTrip = rows[0];
    if (!selectedTrip) {
      return res.status(400).json({ error: 'Invalid trip selected.' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }

  const normalizedStudentName = String(studentName || '').trim();
  if (normalizedStudentName) {
    try {
      const existingBookings = await listStudentBookingsByDates(normalizedStudentName, [selectedTrip.date]);
      const hasConflict = existingBookings.some(
        (booking) => booking.date === selectedTrip.date && booking.direction === selectedTrip.direction
      );

      if (hasConflict) {
        return res.status(409).json({
          error: `You already have a ${selectedTrip.direction.toLowerCase()} booking on ${selectedTrip.date}. Only one is allowed per day.`
        });
      }
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  let result;
  try {
    result = await tryBookTrip(Number(tripId), normalizedStudentName || null);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!result.success) {
    return res.status(409).json({
      error: 'This shuttle is now full. Please select another time.'
    });
  }

  return res.json({
    success: true,
    trip: result.trip
  });
});

function countByDayDirection(trips) {
  const counts = new Map();

  trips.forEach((trip) => {
    const key = `${trip.date}|${trip.direction}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return counts;
}

app.post('/api/book-batch', async (req, res) => {
  const studentName = String(req.body.studentName || '').trim();
  const selections = Array.isArray(req.body.selections) ? req.body.selections : [];

  if (!studentName) {
    return res.status(400).json({ error: 'Student name is required.' });
  }

  if (selections.length === 0) {
    return res.status(400).json({ error: 'Please select at least one timeslot before proceeding.' });
  }

  const tripIds = selections
    .map((item) => Number(item && item.tripId))
    .filter((id) => Number.isInteger(id) && id > 0);

  const uniqueTripIds = Array.from(new Set(tripIds));
  if (uniqueTripIds.length !== selections.length) {
    return res.status(400).json({ error: 'Duplicate trip selections are not allowed.' });
  }

  try {
    const studentValid = await verifyStudentName(studentName);
    if (!studentValid) {
      return res.status(401).json({ error: 'Name not found. Please enter full name with correct capital letters and spacing.' });
    }

    const selectedTrips = await getTripsByIds(uniqueTripIds);
    if (selectedTrips.length !== uniqueTripIds.length) {
      return res.status(400).json({ error: 'One or more selected timeslots are invalid. Please refresh and try again.' });
    }

    const requestedCounts = countByDayDirection(selectedTrips);
    for (const [key, count] of requestedCounts.entries()) {
      if (count > 1) {
        const [date, direction] = key.split('|');
        return res.status(409).json({
          error: `Only one ${direction.toLowerCase()} trip can be selected on ${date}.`
        });
      }
    }

    const selectedDates = Array.from(new Set(selectedTrips.map((trip) => trip.date)));
    const existingBookings = await listStudentBookingsByDates(studentName, selectedDates);
    const existingCounts = countByDayDirection(existingBookings);

    for (const [key, requested] of requestedCounts.entries()) {
      const existing = existingCounts.get(key) || 0;
      if (existing + requested > 1) {
        const [date, direction] = key.split('|');
        return res.status(409).json({
          error: `You already have a ${direction.toLowerCase()} booking on ${date}. Only one is allowed per day.`
        });
      }
    }

    const bookedTrips = [];
    try {
      for (const trip of selectedTrips) {
        const result = await tryBookTrip(trip.id, studentName);
        if (!result.success) {
          throw new Error('One of the selected trips is now full. Please review your selections and submit again.');
        }
        bookedTrips.push(result.trip);
      }
    } catch (bookingError) {
      // Roll back any successful bookings from this batch to prevent partial saves.
      if (bookedTrips.length > 0) {
        try {
          const rollbackDates = Array.from(new Set(bookedTrips.map((trip) => trip.date).filter(Boolean)));
          const currentStudentBookings = await listStudentBookingsByDates(studentName, rollbackDates);

          for (const trip of bookedTrips) {
            const matchingBooking = currentStudentBookings.find((booking) => booking.tripId === trip.id);
            if (matchingBooking) {
              await deleteBookingById(matchingBooking.id);
            }
          }
        } catch (rollbackError) {
          return res.status(500).json({
            error: `Booking failed and automatic rollback also failed. ${rollbackError.message}`
          });
        }
      }

      const message = bookingError && bookingError.message
        ? bookingError.message
        : 'Unable to submit selected trips.';

      const statusCode = message.toLowerCase().includes('full') ? 409 : 500;
      return res.status(statusCode).json({ error: message, bookedCount: 0 });
    }

    return res.json({
      success: true,
      bookedCount: bookedTrips.length,
      trips: bookedTrips
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function startServer() {
  try {
    await ensureDbInitialized();
    app.listen(PORT, () => {
      console.log(`NovaHaus shuttle app running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize server:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  void startServer();
}

module.exports = app;