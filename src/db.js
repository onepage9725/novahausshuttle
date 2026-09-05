const { createClient } = require('@supabase/supabase-js');
const {
  BUS_A_CAPACITY,
  BUS_B_CAPACITY,
  LOCATION_CODES,
  getBusTimes,
  getTripDirection,
  getPairedTime
} = require('./schedule');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
  : null;

function ensureSupabaseConfigured() {
  if (!supabase) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables.');
  }
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function computeDesiredWeekStart(now = new Date()) {
  const monday = getMonday(now);
  const fridayReset = new Date(monday);
  fridayReset.setDate(monday.getDate() + 4);
  fridayReset.setHours(20, 0, 0, 0);

  if (now >= fridayReset) {
    monday.setDate(monday.getDate() + 7);
  }

  return formatDate(monday);
}

async function getMetaValue(key) {
  const { data, error } = await supabase.from('app_meta').select('value').eq('key', key).maybeSingle();

  if (error) {
    throw error;
  }

  return data ? data.value : null;
}

async function setMetaValue(key, value) {
  const { error } = await supabase.from('app_meta').upsert({ key, value }, { onConflict: 'key' });

  if (error) {
    throw error;
  }
}

async function moveToNewActiveWeek(newWeekStart) {
  await setMetaValue('active_week_start', newWeekStart);
}

async function ensureWeeklyReset(now = new Date()) {
  const desiredWeekStart = computeDesiredWeekStart(now);
  const currentWeekStart = await getMetaValue('active_week_start');

  if (currentWeekStart !== desiredWeekStart) {
    await moveToNewActiveWeek(desiredWeekStart);
  }

  return desiredWeekStart;
}

async function getActiveWeekStart(now = new Date()) {
  return ensureWeeklyReset(now);
}

async function initDb() {
  ensureSupabaseConfigured();

  const weekStart = await getMetaValue('active_week_start');
  if (!weekStart) {
    await setMetaValue('active_week_start', computeDesiredWeekStart());
  }

  await ensureWeeklyReset();
}

async function ensureTripsForDate(date, location) {
  const seedRows = [];

  LOCATION_CODES.forEach((targetLocation) => {
    const busATimes = getBusTimes(targetLocation, 'A');
    const busBTimes = getBusTimes(targetLocation, 'B');

    busATimes.forEach((time) => {
      seedRows.push({
        date,
        location: targetLocation,
        bus: 'A',
        time,
        capacity: BUS_A_CAPACITY,
        booked: 0
      });
    });

    busBTimes.forEach((time) => {
      seedRows.push({
        date,
        location: targetLocation,
        bus: 'B',
        time,
        capacity: BUS_B_CAPACITY,
        booked: 0
      });
    });
  });

  const insertResult = await supabase
    .from('trips_v2')
    .upsert(seedRows, { onConflict: 'date,location,bus,time', ignoreDuplicates: true });

  if (insertResult.error) {
    throw insertResult.error;
  }

  const rowsResult = await supabase
    .from('trips_v2')
    .select('id, date, location, bus, time, booked')
    .eq('date', date);

  if (rowsResult.error) {
    throw rowsResult.error;
  }

  const rows = rowsResult.data || [];
  const byKey = new Map(rows.map((r) => [`${r.location}|${r.bus}|${r.time}`, r]));

  const updateQueue = [];

  ['A', 'B'].forEach((bus) => {
    const aeraTimes = getBusTimes('AERA', bus);
    aeraTimes.forEach((time) => {
      const pair = getPairedTime('AERA', bus, time);
      if (!pair) {
        return;
      }

      const aeraTrip = byKey.get(`AERA|${bus}|${time}`);
      const helixTrip = byKey.get(`${pair.pairedLocation}|${bus}|${pair.pairedTime}`);
      if (!aeraTrip || !helixTrip) {
        return;
      }

      const syncedBooked = Math.max(aeraTrip.booked, helixTrip.booked);
      if (aeraTrip.booked !== syncedBooked) {
        updateQueue.push({ id: aeraTrip.id, booked: syncedBooked });
      }
      if (helixTrip.booked !== syncedBooked) {
        updateQueue.push({ id: helixTrip.id, booked: syncedBooked });
      }
    });
  });

  for (const update of updateQueue) {
    const updateResult = await supabase.from('trips_v2').update({ booked: update.booked }).eq('id', update.id);
    if (updateResult.error) {
      throw updateResult.error;
    }
  }

  // Keep signature backward-compatible with existing route handlers.
  void location;
}

function getAvailabilityStatus(booked, capacity) {
  if (booked >= capacity) {
    return 'FULL';
  }

  const remaining = capacity - booked;
  if (remaining <= 3) {
    return 'ALMOST_FULL';
  }

  return 'AVAILABLE';
}

async function listTripsByDate(date, location) {
  const busATimes = getBusTimes(location, 'A');
  const busBTimes = getBusTimes(location, 'B');
  const rowsResult = await supabase
    .from('trips_v2')
    .select('id, date, location, bus, time, capacity, booked')
    .eq('date', date)
    .eq('location', location)
    .order('bus', { ascending: true })
    .order('time', { ascending: true });

  if (rowsResult.error) {
    throw rowsResult.error;
  }

  const rows = (rowsResult.data || []).filter((row) => {
    if (row.bus === 'A') {
      return busATimes.includes(row.time);
    }
    if (row.bus === 'B') {
      return busBTimes.includes(row.time);
    }
    return false;
  });

  return rows.map((row) => ({
    ...row,
    direction: getTripDirection(row.location, row.bus, row.time),
    status: getAvailabilityStatus(row.booked, row.capacity)
  }));
}

async function tryBookTrip(tripId, studentName) {
  const rpcResult = await supabase.rpc('book_trip_atomic_v2', {
    p_trip_id: tripId,
    p_student_name: studentName || null
  });

  if (rpcResult.error) {
    throw new Error(
      `Supabase booking function error: ${rpcResult.error.message}. Run supabase SQL setup script first.`
    );
  }

  const row = Array.isArray(rpcResult.data) ? rpcResult.data[0] : null;

  if (!row || !row.success) {
    return { success: false };
  }

  return {
    success: true,
    trip: {
      id: row.id,
      date: row.trip_date || row.date,
      location: row.location,
      bus: row.bus,
      time: row.trip_time || row.time,
      capacity: row.capacity,
      booked: row.booked,
      direction: getTripDirection(row.location, row.bus, row.time),
      status: getAvailabilityStatus(row.booked, row.capacity)
    }
  };
}

async function getTripsByIds(tripIds) {
  if (!Array.isArray(tripIds) || tripIds.length === 0) {
    return [];
  }

  const uniqueIds = Array.from(new Set(tripIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)));
  if (uniqueIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('trips_v2')
    .select('id, date, location, bus, time, capacity, booked')
    .in('id', uniqueIds);

  if (error) {
    throw error;
  }

  return (data || []).map((row) => ({
    ...row,
    direction: getTripDirection(row.location, row.bus, row.time)
  }));
}

async function listStudentBookingsByDates(studentName, dates) {
  const normalized = normalizeStudentName(studentName);
  if (!normalized || !Array.isArray(dates) || dates.length === 0) {
    return [];
  }

  const uniqueDates = Array.from(new Set(dates.filter(Boolean)));
  if (uniqueDates.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('bookings_v2')
    .select('id, student_name, created_at, trips_v2!inner(id, date, location, bus, time)')
    .eq('student_name', normalized)
    .in('trips_v2.date', uniqueDates);

  if (error) {
    throw error;
  }

  return (data || []).map((row) => {
    const trip = row.trips_v2 || {};
    return {
      id: row.id,
      studentName: row.student_name || '',
      createdAt: row.created_at,
      tripId: trip.id,
      date: trip.date,
      location: trip.location,
      bus: trip.bus,
      time: trip.time,
      direction: getTripDirection(trip.location, trip.bus, trip.time)
    };
  });
}

function normalizeStudentName(name) {
  return typeof name === 'string' ? name.trim() : '';
}

function mapStudentsSchemaError(error) {
  const message = String(error && error.message ? error.message : '');
  if (message.includes('public.students')) {
    return new Error('Students table is missing. Please run the latest supabase_setup.sql script in Supabase SQL Editor.');
  }
  if (message.includes('students.contact_number') || message.includes('students.remark')) {
    return new Error('Students table schema is outdated. Please run the latest supabase_setup.sql script to add contact number and remark columns.');
  }
  return null;
}

function normalizeContactNumber(contactNumber) {
  return typeof contactNumber === 'string' ? contactNumber.trim() : '';
}

function normalizeRemark(remark) {
  if (remark === null || remark === undefined) {
    return null;
  }

  const text = String(remark).trim();
  return text || null;
}

async function verifyStudentName(fullName) {
  const normalized = normalizeStudentName(fullName);
  if (!normalized) {
    return false;
  }

  const { data, error } = await supabase
    .from('students')
    .select('id')
    .eq('full_name', normalized)
    .maybeSingle();

  if (error) {
    const mapped = mapStudentsSchemaError(error);
    if (mapped) {
      throw mapped;
    }
    throw error;
  }

  return Boolean(data);
}

async function getStudentProfileByName(fullName) {
  const normalized = normalizeStudentName(fullName);
  if (!normalized) {
    return null;
  }

  const { data, error } = await supabase
    .from('students')
    .select('full_name, contact_number')
    .eq('full_name', normalized)
    .maybeSingle();

  if (error) {
    const mapped = mapStudentsSchemaError(error);
    if (mapped) {
      throw mapped;
    }
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    fullName: data.full_name,
    contactNumber: data.contact_number || ''
  };
}

async function listStudents() {
  const { data, error } = await supabase
    .from('students')
    .select('id, full_name, contact_number, remark')
    .order('full_name');

  if (error) {
    const mapped = mapStudentsSchemaError(error);
    if (mapped) {
      throw mapped;
    }
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    contactNumber: row.contact_number || '',
    remark: row.remark || ''
  }));
}

async function createStudent(fullName, contactNumber, remark) {
  const normalized = normalizeStudentName(fullName);
  const normalizedContact = normalizeContactNumber(contactNumber);
  const normalizedRemark = normalizeRemark(remark);

  if (!normalized) {
    throw new Error('Student full name is required.');
  }

  if (!normalizedContact) {
    throw new Error('Student contact number is required.');
  }

  const { data, error } = await supabase
    .from('students')
    .insert({
      full_name: normalized,
      contact_number: normalizedContact,
      remark: normalizedRemark
    })
    .select('id, full_name, contact_number, remark')
    .single();

  if (error) {
    const mapped = mapStudentsSchemaError(error);
    if (mapped) {
      throw mapped;
    }
    throw error;
  }

  return {
    id: data.id,
    fullName: data.full_name,
    contactNumber: data.contact_number || '',
    remark: data.remark || ''
  };
}

async function updateStudent(studentId, fullName, contactNumber, remark) {
  const normalized = normalizeStudentName(fullName);
  const normalizedContact = normalizeContactNumber(contactNumber);
  const normalizedRemark = normalizeRemark(remark);

  if (!normalized) {
    throw new Error('Student full name is required.');
  }

  if (!normalizedContact) {
    throw new Error('Student contact number is required.');
  }

  const { data, error } = await supabase
    .from('students')
    .update({
      full_name: normalized,
      contact_number: normalizedContact,
      remark: normalizedRemark
    })
    .eq('id', studentId)
    .select('id, full_name, contact_number, remark')
    .single();

  if (error) {
    const mapped = mapStudentsSchemaError(error);
    if (mapped) {
      throw mapped;
    }
    throw error;
  }

  return {
    id: data.id,
    fullName: data.full_name,
    contactNumber: data.contact_number || '',
    remark: data.remark || ''
  };
}

async function deleteStudent(studentId) {
  const { error } = await supabase.from('students').delete().eq('id', studentId);
  if (error) {
    const mapped = mapStudentsSchemaError(error);
    if (mapped) {
      throw mapped;
    }
    throw error;
  }
}

function dateFromIso(isoDate) {
  return new Date(`${isoDate}T00:00:00`);
}

function getWeekRange(weekStart) {
  const startDate = dateFromIso(weekStart);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 4);
  return {
    weekStart,
    weekEnd: formatDate(endDate)
  };
}

function mondayFromDateString(isoDate) {
  return formatDate(getMonday(dateFromIso(isoDate)));
}

async function listAvailableBookingWeeks() {
  const tripsResult = await supabase.from('trips_v2').select('date').order('date', { ascending: false });
  if (tripsResult.error) {
    throw tripsResult.error;
  }

  const weeks = new Set();
  (tripsResult.data || []).forEach((row) => {
    if (row.date) {
      weeks.add(mondayFromDateString(String(row.date)));
    }
  });

  return Array.from(weeks).sort((a, b) => (a < b ? 1 : -1));
}

async function listBookingHistory({ weekStart, bus, location, studentName }) {
  const activeWeekStart = await getActiveWeekStart();
  const selectedWeek = weekStart || activeWeekStart;
  const { weekEnd } = getWeekRange(selectedWeek);

  let query = supabase
    .from('bookings_v2')
    .select('id, student_name, created_at, trips_v2!inner(id, date, location, bus, time)')
    .gte('trips_v2.date', selectedWeek)
    .lte('trips_v2.date', weekEnd)
    .order('created_at', { ascending: false });

  if (bus === 'A' || bus === 'B') {
    query = query.eq('trips_v2.bus', bus);
  }

  if (location === 'AERA' || location === 'HELIX') {
    query = query.eq('trips_v2.location', location);
  }

  if (studentName) {
    query = query.ilike('student_name', `%${studentName}%`);
  }

  const bookingsResult = await query;
  if (bookingsResult.error) {
    throw bookingsResult.error;
  }

  const studentsResult = await supabase.from('students').select('full_name, contact_number, remark');
  if (studentsResult.error) {
    const mapped = mapStudentsSchemaError(studentsResult.error);
    if (mapped) {
      throw mapped;
    }
    throw studentsResult.error;
  }

  const studentsByName = new Map(
    (studentsResult.data || []).map((row) => [row.full_name, {
      contactNumber: row.contact_number || '',
      remark: row.remark || ''
    }])
  );

  const bookings = (bookingsResult.data || []).map((row) => {
    const trip = row.trips_v2 || {};
    const studentName = row.student_name || '';
    const studentData = studentsByName.get(studentName) || { contactNumber: '', remark: '' };

    return {
      bookingId: row.id,
      createdAt: row.created_at,
      studentName,
      contactNumber: studentData.contactNumber,
      remark: studentData.remark,
      date: trip.date,
      location: trip.location,
      bus: trip.bus,
      time: trip.time
    };
  });

  const availableWeeks = await listAvailableBookingWeeks();

  return {
    weekStart: selectedWeek,
    weekEnd,
    activeWeekStart,
    availableWeeks,
    bookings
  };
}

async function listStudentWeekBookings(studentName, weekStart = null) {
  const normalized = normalizeStudentName(studentName);
  if (!normalized) {
    return { weekStart: '', weekEnd: '', bookings: [] };
  }

  const activeWeekStart = await getActiveWeekStart();
  const selectedWeek = weekStart || activeWeekStart;
  const { weekEnd } = getWeekRange(selectedWeek);

  const result = await supabase
    .from('bookings_v2')
    .select('id, student_name, created_at, trips_v2!inner(id, date, location, bus, time)')
    .eq('student_name', normalized)
    .gte('trips_v2.date', selectedWeek)
    .lte('trips_v2.date', weekEnd)
    .order('created_at', { ascending: false });

  if (result.error) {
    throw result.error;
  }

  const bookings = (result.data || []).map((row) => {
    const trip = row.trips_v2 || {};
    return {
      bookingId: row.id,
      createdAt: row.created_at,
      studentName: row.student_name || '',
      date: trip.date,
      location: trip.location,
      bus: trip.bus,
      time: trip.time,
      direction: getTripDirection(trip.location, trip.bus, trip.time)
    };
  });

  return {
    weekStart: selectedWeek,
    weekEnd,
    bookings
  };
}

async function listDriverWeekView(options = {}) {
  const location = options.location || null;
  const bus = options.bus || null;
  const weekStart = options.weekStart || null;

  const [activeWeekStart, availableWeeks] = await Promise.all([
    getActiveWeekStart(),
    listAvailableBookingWeeks()
  ]);
  const selectedWeek = weekStart || activeWeekStart;
  const { weekEnd } = getWeekRange(selectedWeek);

  const monday = dateFromIso(selectedWeek);
  const weekDates = [];
  for (let i = 0; i < 5; i += 1) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    weekDates.push(formatDate(date));
  }
  await Promise.all(weekDates.map((date) => ensureTripsForDate(date)));

  let tripsQuery = supabase
    .from('trips_v2')
    .select('id, date, location, bus, time, booked')
    .gte('date', selectedWeek)
    .lte('date', weekEnd)
    .order('date', { ascending: true })
    .order('bus', { ascending: true })
    .order('time', { ascending: true });

  if (location) {
    tripsQuery = tripsQuery.eq('location', location);
  }
  if (bus) {
    tripsQuery = tripsQuery.eq('bus', bus);
  }

  const allWeekBookingsQuery = supabase
    .from('bookings_v2')
    .select('id, student_name, created_at, trips_v2!inner(id, date, location, bus, time)')
    .gte('trips_v2.date', selectedWeek)
    .lte('trips_v2.date', weekEnd)
    .order('created_at', { ascending: true });

  if (bus) {
    allWeekBookingsQuery.eq('trips_v2.bus', bus);
  }

  const [tripsResult, allWeekBookingsResult] = await Promise.all([
    tripsQuery,
    allWeekBookingsQuery
  ]);

  if (tripsResult.error) {
    throw tripsResult.error;
  }

  if (allWeekBookingsResult.error) {
    throw allWeekBookingsResult.error;
  }

  const studentNames = Array.from(
    new Set(
      (allWeekBookingsResult.data || [])
        .map((row) => row.student_name || '')
        .filter(Boolean)
    )
  );

  const studentsByName = new Map();
  if (studentNames.length) {
    const chunkSize = 200;
    for (let i = 0; i < studentNames.length; i += chunkSize) {
      const chunk = studentNames.slice(i, i + chunkSize);
      const studentsResult = await supabase
        .from('students')
        .select('full_name, contact_number')
        .in('full_name', chunk);

      if (studentsResult.error) {
        const mapped = mapStudentsSchemaError(studentsResult.error);
        if (mapped) {
          throw mapped;
        }
        throw studentsResult.error;
      }

      (studentsResult.data || []).forEach((row) => {
        studentsByName.set(row.full_name, row.contact_number || '');
      });
    }
  }

  const bookingsByTripId = new Map();
  (allWeekBookingsResult.data || []).forEach((row) => {
    const trip = row.trips_v2 || {};
    if (!trip.id) {
      return;
    }

    const current = bookingsByTripId.get(trip.id) || [];
    current.push({
      bookingId: row.id,
      studentName: row.student_name || '',
      contactNumber: studentsByName.get(row.student_name || '') || '',
      createdAt: row.created_at
    });
    bookingsByTripId.set(trip.id, current);
  });

  const trips = tripsResult.data || [];
  const tripIdByKey = new Map(
    trips.map((trip) => [`${trip.date}|${trip.location}|${trip.bus}|${trip.time}`, trip.id])
  );

  const dayMap = new Map();
  for (let i = 0; i < 5; i += 1) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dayMap.set(formatDate(date), []);
  }

  const mergePairedStudents = Boolean(location);

  trips.forEach((trip) => {
    if (!trip.booked || Number(trip.booked) <= 0) {
      return;
    }

    const ownStudents = bookingsByTripId.get(trip.id) || [];
    let mergedStudents = ownStudents;

    if (mergePairedStudents) {
      const pair = getPairedTime(trip.location, trip.bus, trip.time);
      if (pair) {
        const pairedTripId = tripIdByKey.get(`${trip.date}|${pair.pairedLocation}|${trip.bus}|${pair.pairedTime}`);
        if (pairedTripId) {
          const pairedStudents = bookingsByTripId.get(pairedTripId) || [];
          mergedStudents = [...ownStudents, ...pairedStudents];
        }
      }
    }

    // Skip rendering/exporting slot records that do not have any student booking rows.
    if (!mergedStudents.length) {
      return;
    }

    const slots = dayMap.get(trip.date) || [];
    slots.push({
      tripId: trip.id,
      time: trip.time,
      location: trip.location,
      bus: trip.bus,
      direction: getTripDirection(trip.location, trip.bus, trip.time),
      pax: Number(trip.booked) || mergedStudents.length,
      students: mergedStudents
    });
    dayMap.set(trip.date, slots);
  });

  return {
    location: location || 'ALL',
    bus: bus || 'ALL',
    activeWeekStart,
    availableWeeks,
    weekStart: selectedWeek,
    weekEnd,
    days: Array.from(dayMap.entries()).map(([date, slots]) => ({
      date,
      slots
    }))
  };
}

async function deleteBookingById(bookingId) {
  const { data: bookingRow, error: bookingError } = await supabase
    .from('bookings_v2')
    .select('id, trip_id, trips_v2!inner(id, date, location, bus, time, booked)')
    .eq('id', bookingId)
    .maybeSingle();

  if (bookingError) {
    throw bookingError;
  }

  if (!bookingRow || !bookingRow.trips_v2) {
    throw new Error('Booking record not found.');
  }

  const trip = bookingRow.trips_v2;
  let currentBooked = Number(trip.booked) || 0;
  let pairedTripId = null;

  const pair = getPairedTime(trip.location, trip.bus, trip.time);
  if (pair) {
    const { data: pairedTrip, error: pairedError } = await supabase
      .from('trips_v2')
      .select('id, booked')
      .eq('date', trip.date)
      .eq('location', pair.pairedLocation)
      .eq('bus', trip.bus)
      .eq('time', pair.pairedTime)
      .maybeSingle();

    if (pairedError) {
      throw pairedError;
    }

    if (pairedTrip) {
      pairedTripId = pairedTrip.id;
      currentBooked = Math.max(currentBooked, Number(pairedTrip.booked) || 0);
    }
  }

  const nextBooked = Math.max(0, currentBooked - 1);

  const updatePrimary = await supabase.from('trips_v2').update({ booked: nextBooked }).eq('id', trip.id);
  if (updatePrimary.error) {
    throw updatePrimary.error;
  }

  if (pairedTripId) {
    const updatePaired = await supabase.from('trips_v2').update({ booked: nextBooked }).eq('id', pairedTripId);
    if (updatePaired.error) {
      throw updatePaired.error;
    }
  }

  const deleteResult = await supabase.from('bookings_v2').delete().eq('id', bookingId);
  if (deleteResult.error) {
    throw deleteResult.error;
  }

  return {
    success: true,
    bookingId,
    tripId: trip.id,
    booked: nextBooked
  };
}

function countByDirection(trips) {
  const counts = new Map();
  trips.forEach((trip) => {
    counts.set(trip.direction, (counts.get(trip.direction) || 0) + 1);
  });
  return counts;
}

async function replaceStudentDayBookings(studentName, date, tripIds) {
  const normalizedName = normalizeStudentName(studentName);
  if (!normalizedName) {
    throw new Error('Student name is required.');
  }

  const uniqueTripIds = Array.from(new Set((tripIds || []).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)));
  const selectedTrips = await getTripsByIds(uniqueTripIds);
  if (selectedTrips.length !== uniqueTripIds.length) {
    throw new Error('One or more selected timeslots are invalid. Please refresh and try again.');
  }

  const invalidDate = selectedTrips.some((trip) => trip.date !== date);
  if (invalidDate) {
    throw new Error('All selected timeslots must be from the same day.');
  }

  const directionCounts = countByDirection(selectedTrips);
  if ((directionCounts.get('OUTBOUND') || 0) > 1 || (directionCounts.get('INBOUND') || 0) > 1) {
    throw new Error('Only one outbound and one inbound timeslot can be selected per day.');
  }

  const existingBookings = await listStudentBookingsByDates(normalizedName, [date]);
  for (const booking of existingBookings) {
    await deleteBookingById(booking.id);
  }

  const bookedTrips = [];
  for (const trip of selectedTrips) {
    const result = await tryBookTrip(trip.id, normalizedName);
    if (!result.success) {
      throw new Error('One selected timeslot is now full. Please choose another available time.');
    }
    bookedTrips.push(result.trip);
  }

  return {
    date,
    bookedCount: bookedTrips.length,
    trips: bookedTrips
  };
}

module.exports = {
  initDb,
  getActiveWeekStart,
  ensureTripsForDate,
  listTripsByDate,
  tryBookTrip,
  getTripsByIds,
  listStudentBookingsByDates,
  verifyStudentName,
  getStudentProfileByName,
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  listBookingHistory,
  deleteBookingById,
  listStudentWeekBookings,
  replaceStudentDayBookings,
  listDriverWeekView
};