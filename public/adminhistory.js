const daysContainer = document.getElementById('daysContainer');
const messageEl = document.getElementById('message');
const pageTitle = document.getElementById('pageTitle');
const weekText = document.getElementById('weekText');
const busATab = document.getElementById('busATab');
const busBTab = document.getElementById('busBTab');
const residenceFilter = document.getElementById('residenceFilter');
const previousWeekBtn = document.getElementById('previousWeekBtn');
const historyModal = document.getElementById('historyModal');
const historyModalCloseBtn = document.getElementById('historyModalCloseBtn');
const historyBusATab = document.getElementById('historyBusATab');
const historyBusBTab = document.getElementById('historyBusBTab');
const historyResidenceFilter = document.getElementById('historyResidenceFilter');
const historyWeekFilter = document.getElementById('historyWeekFilter');
const historyDaysContainer = document.getElementById('historyDaysContainer');
const historyModalMessage = document.getElementById('historyModalMessage');
const refreshBtn = document.getElementById('refreshBtn');
const downloadBtn = document.getElementById('downloadBtn');
const backBtn = document.getElementById('backBtn');
const logoutBtn = document.getElementById('logoutBtn');

const ADMIN_TOKEN_KEY = 'novashuttle_admin_token';
const DRIVER_TOKEN_KEY = 'novashuttle_driver_token';
const isDriverMode = Boolean(window.NOVA_DRIVER_MODE);

let activeLocation = 'ALL';
let activeBus = 'A';
let selectedWeekStart = '';
let lastPayload = null;
let availableWeeks = [];
const driverPayloadCache = new Map();
let currentFetchController = null;

const historyState = {
  bus: 'A',
  location: 'ALL',
  weekStart: ''
};

function token() {
  const key = isDriverMode ? DRIVER_TOKEN_KEY : ADMIN_TOKEN_KEY;
  return localStorage.getItem(key) || '';
}

function setMessage(text, type = '') {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`.trim();
}

function isAbortError(error) {
  return Boolean(error && error.name === 'AbortError');
}

function handleLoadError(error) {
  if (isAbortError(error)) {
    return;
  }
  setMessage(error.message, 'error');
}

function handleHistoryLoadError(error) {
  if (isAbortError(error)) {
    return;
  }
  setHistoryMessage(error.message, 'error');
}

function fmtDay(date) {
  const d = new Date(`${date}T00:00:00`);
  const raw = d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });
  return raw.replace(',', ' -');
}

function fmtTime(hhmm) {
  if (!hhmm || !hhmm.includes(':')) {
    return hhmm || '-';
  }
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function directionLabel(direction) {
  return direction === 'INBOUND' ? 'Return' : 'Depart';
}

function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function previousWeek(isoDate) {
  const dt = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(dt.getTime())) {
    return '';
  }
  dt.setDate(dt.getDate() - 7);
  return toIsoDate(dt);
}

function residenceLabel(location) {
  if (location === 'AERA') {
    return 'Aera';
  }
  if (location === 'HELIX') {
    return 'Helix';
  }
  return 'All';
}

function updateTabState() {
  const isA = activeBus === 'A';
  busATab.classList.toggle('active', isA);
  busBTab.classList.toggle('active', !isA);
  busATab.setAttribute('aria-selected', isA ? 'true' : 'false');
  busBTab.setAttribute('aria-selected', !isA ? 'true' : 'false');

  pageTitle.textContent = 'Driver View';
}

function setHistoryMessage(text, type = '') {
  if (!historyModalMessage) {
    return;
  }

  historyModalMessage.textContent = text;
  historyModalMessage.className = `message ${type}`.trim();
}

function updateHistoryBusTabState() {
  if (!historyBusATab || !historyBusBTab) {
    return;
  }

  const isA = historyState.bus === 'A';
  historyBusATab.classList.toggle('active', isA);
  historyBusBTab.classList.toggle('active', !isA);
  historyBusATab.setAttribute('aria-selected', isA ? 'true' : 'false');
  historyBusBTab.setAttribute('aria-selected', !isA ? 'true' : 'false');
}

function renderHistoryWeekOptions() {
  if (!historyWeekFilter) {
    return;
  }

  historyWeekFilter.innerHTML = '';
  const weeks = availableWeeks.length ? availableWeeks : [historyState.weekStart].filter(Boolean);
  weeks.forEach((week) => {
    const option = document.createElement('option');
    option.value = week;
    option.textContent = week;
    if (week === historyState.weekStart) {
      option.selected = true;
    }
    historyWeekFilter.appendChild(option);
  });
}

async function fetchDriverPayload({ bus, location, weekStart }) {
  const accessToken = token();
  const endpoint = isDriverMode ? '/api/driver/view' : '/api/admin/driver-view';
  const query = new URLSearchParams();
  query.set('bus', bus);
  query.set('location', location);
  if (weekStart) {
    query.set('weekStart', weekStart);
  }

  const cacheKey = `${endpoint}|${bus}|${location}|${weekStart || ''}`;
  if (driverPayloadCache.has(cacheKey)) {
    return driverPayloadCache.get(cacheKey);
  }

  if (currentFetchController) {
    currentFetchController.abort();
  }
  currentFetchController = new AbortController();

  const response = await fetch(`${endpoint}?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    signal: currentFetchController.signal
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Unable to load driver view.');
  }

  driverPayloadCache.set(cacheKey, payload);

  return payload;
}

function renderHistoryDays(payload) {
  if (!historyDaysContainer) {
    return;
  }

  historyDaysContainer.innerHTML = '';

  (payload.days || []).forEach((day) => {
    const card = document.createElement('section');
    card.className = 'mini-card';

    const title = document.createElement('h3');
    title.className = 'mini-day';
    title.textContent = fmtDay(day.date);
    card.appendChild(title);

    const slots = day.slots || [];
    if (!slots.length) {
      const empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = 'No bookings on this day.';
      card.appendChild(empty);
    } else {
      slots.forEach((slot) => {
        card.appendChild(createSlotRow(slot));
      });
    }

    historyDaysContainer.appendChild(card);
  });

  if (!payload.days || !payload.days.length) {
    const empty = document.createElement('section');
    empty.className = 'mini-card';
    empty.textContent = 'No booking slots for this week.';
    historyDaysContainer.appendChild(empty);
  }
}

async function loadHistoryModalData() {
  setHistoryMessage('Loading schedule history...', 'success');
  const payload = await fetchDriverPayload(historyState);

  availableWeeks = payload.availableWeeks || availableWeeks;
  historyState.weekStart = payload.weekStart || historyState.weekStart;
  if (historyResidenceFilter) {
    historyResidenceFilter.value = historyState.location;
  }

  renderHistoryWeekOptions();
  updateHistoryBusTabState();
  renderHistoryDays(payload);
  setHistoryMessage(`Showing ${payload.weekStart} to ${payload.weekEnd}.`, 'success');
}

function openHistoryModal() {
  if (!historyModal) {
    return;
  }

  historyState.bus = activeBus;
  historyState.location = activeLocation;
  historyState.weekStart = selectedWeekStart || (lastPayload && lastPayload.weekStart) || '';
  historyModal.classList.remove('hidden');
  void loadHistoryModalData().catch(handleHistoryLoadError);
}

function closeHistoryModal() {
  if (!historyModal) {
    return;
  }

  historyModal.classList.add('hidden');
}

function createStudentRow(student) {
  const row = document.createElement('div');
  row.className = 'student';

  const left = document.createElement('span');
  left.className = 'student-left';

  const userIcon = document.createElement('span');
  userIcon.className = 'student-icon';
  userIcon.textContent = '◌';

  const name = document.createElement('span');
  name.textContent = student.studentName || '-';

  left.appendChild(userIcon);
  left.appendChild(name);

  const right = document.createElement('span');
  right.className = 'student-right muted';

  const phoneIcon = document.createElement('span');
  phoneIcon.className = 'student-icon';
  phoneIcon.textContent = '◔';

  const contact = document.createElement('span');
  contact.textContent = student.contactNumber || '-';

  right.appendChild(phoneIcon);
  right.appendChild(contact);

  row.appendChild(left);
  row.appendChild(right);
  return row;
}

function createSlotRow(slot) {
  const row = document.createElement('article');
  row.className = 'slot-row';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'slot-btn';

  const left = document.createElement('div');
  left.className = 'slot-left';

  const clock = document.createElement('span');
  clock.className = 'student-icon';
  clock.textContent = '◷';

  const time = document.createElement('span');
  time.className = 'slot-time';
  time.textContent = fmtTime(slot.time);

  const dirBadge = document.createElement('span');
  dirBadge.className = 'badge badge-dark';
  dirBadge.textContent = directionLabel(slot.direction);

  const locationBadge = document.createElement('span');
  locationBadge.className = 'badge badge-location';
  locationBadge.textContent = residenceLabel(slot.location);

  const paxBadge = document.createElement('span');
  paxBadge.className = 'badge badge-soft';
  paxBadge.textContent = `${slot.pax} pax`;

  left.appendChild(clock);
  left.appendChild(time);
  left.appendChild(dirBadge);
  left.appendChild(locationBadge);
  left.appendChild(paxBadge);

  const arrow = document.createElement('span');
  arrow.className = 'slot-arrow';
  arrow.textContent = '⌄';

  btn.appendChild(left);
  btn.appendChild(arrow);

  const details = document.createElement('div');
  details.className = 'details';

  const students = slot.students || [];
  students.forEach((student) => details.appendChild(createStudentRow(student)));

  btn.addEventListener('click', () => {
    details.classList.toggle('open');
    arrow.textContent = details.classList.contains('open') ? '⌃' : '⌄';
  });

  row.appendChild(btn);
  row.appendChild(details);
  return row;
}

function renderDays(payload) {
  daysContainer.innerHTML = '';

  if (!payload.days || !payload.days.length) {
    const card = document.createElement('section');
    card.className = 'card';
    card.textContent = 'No booking slots for this week.';
    daysContainer.appendChild(card);
    return;
  }

  payload.days.forEach((day) => {
    const card = document.createElement('section');
    card.className = 'card';

    const title = document.createElement('h2');
    title.className = 'day-title';
    title.innerHTML = `<span class="day-icon">◫</span>${fmtDay(day.date)}`;
    card.appendChild(title);

    const slots = day.slots || [];
    if (!slots.length) {
      const empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = 'No bookings on this day.';
      card.appendChild(empty);
    } else {
      slots.forEach((slot) => {
        card.appendChild(createSlotRow(slot));
      });
    }

    daysContainer.appendChild(card);
  });
}

async function loadDriverView() {
  const accessToken = token();
  if (!accessToken) {
    if (isDriverMode) {
      setMessage('Driver login required. Please login at /driverlogin first.', 'error');
    } else {
      setMessage('Admin login required. Please login at /adminportal first.', 'error');
    }
    return;
  }

  setMessage('Loading weekly history...', 'success');
  const payload = await fetchDriverPayload({
    location: activeLocation,
    bus: activeBus,
    weekStart: selectedWeekStart
  });

  lastPayload = payload;
  selectedWeekStart = payload.weekStart || selectedWeekStart;
  availableWeeks = payload.availableWeeks || availableWeeks;

  updateTabState();
  residenceFilter.value = activeLocation;

  weekText.textContent = `Weekly shuttle bookings by time (${payload.weekStart} to ${payload.weekEnd})`;
  renderDays(payload);
  setMessage('');
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function flattenRows(payload) {
  const rows = [];

  (payload.days || []).forEach((day) => {
    (day.slots || []).forEach((slot) => {
      const students = slot.students || [];
      if (!students.length) {
        rows.push({
          date: day.date,
          time: slot.time,
          direction: slot.direction,
          residence: slot.location || '-',
          pax: slot.pax,
          student_name: '',
          contact_number: ''
        });
        return;
      }

      students.forEach((student) => {
        rows.push({
          date: day.date,
          time: slot.time,
          direction: slot.direction,
          residence: slot.location || '-',
          pax: slot.pax,
          student_name: student.studentName || '',
          contact_number: student.contactNumber || ''
        });
      });
    });
  });

  return rows;
}

async function fetchExportPayload(bus) {
  const accessToken = token();
  const endpoint = isDriverMode ? '/api/driver/view' : '/api/admin/driver-view';
  const query = new URLSearchParams();
  query.set('location', 'ALL');
  if (lastPayload && lastPayload.weekStart) {
    query.set('weekStart', lastPayload.weekStart);
  }
  query.set('bus', bus);

  const response = await fetch(`${endpoint}?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Unable to fetch export data.');
  }

  return payload;
}

async function downloadSchedule() {
  if (!lastPayload) {
    setMessage('Load data first before downloading.', 'error');
    return;
  }

  if (!window.XLSX) {
    setMessage('Excel exporter is not ready. Please refresh and try again.', 'error');
    return;
  }

  setMessage('Preparing Excel file...', 'success');

  const workbook = window.XLSX.utils.book_new();

  try {
    const payloadA = await fetchExportPayload('A');
    const payloadB = await fetchExportPayload('B');
    const rowsA = flattenRows(payloadA);
    const rowsB = flattenRows(payloadB);

    window.XLSX.utils.book_append_sheet(workbook, window.XLSX.utils.json_to_sheet(rowsA), 'Bus A');
    window.XLSX.utils.book_append_sheet(workbook, window.XLSX.utils.json_to_sheet(rowsB), 'Bus B');

    const weekTag = (lastPayload.weekStart || '').replace(/[^0-9-]/g, '') || 'week';
    window.XLSX.writeFile(workbook, `driver-view-week-${weekTag}.xlsx`);
    setMessage('Excel downloaded.', 'success');
  } catch (error) {
    setMessage(error.message || 'Unable to export Excel.', 'error');
  }
}

busATab.addEventListener('click', () => {
  activeBus = 'A';
  updateTabState();
  void loadDriverView().catch(handleLoadError);
});

busBTab.addEventListener('click', () => {
  activeBus = 'B';
  updateTabState();
  void loadDriverView().catch(handleLoadError);
});

residenceFilter.addEventListener('change', () => {
  activeLocation = String(residenceFilter.value || 'ALL').toUpperCase();
  void loadDriverView().catch(handleLoadError);
});

refreshBtn.addEventListener('click', () => {
  void loadDriverView().catch(handleLoadError);
});

previousWeekBtn.addEventListener('click', () => {
  openHistoryModal();
});

downloadBtn.addEventListener('click', () => {
  void downloadSchedule();
});

backBtn.addEventListener('click', () => {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  window.location.href = isDriverMode ? '/driverlogin' : '/adminportal';
});

if (historyModalCloseBtn) {
  historyModalCloseBtn.addEventListener('click', () => {
    closeHistoryModal();
  });
}

if (historyModal) {
  historyModal.addEventListener('click', (event) => {
    if (event.target === historyModal) {
      closeHistoryModal();
    }
  });
}

if (historyBusATab) {
  historyBusATab.addEventListener('click', () => {
    historyState.bus = 'A';
    updateHistoryBusTabState();
    void loadHistoryModalData().catch(handleHistoryLoadError);
  });
}

if (historyBusBTab) {
  historyBusBTab.addEventListener('click', () => {
    historyState.bus = 'B';
    updateHistoryBusTabState();
    void loadHistoryModalData().catch(handleHistoryLoadError);
  });
}

if (historyResidenceFilter) {
  historyResidenceFilter.addEventListener('change', () => {
    historyState.location = String(historyResidenceFilter.value || 'ALL').toUpperCase();
    void loadHistoryModalData().catch(handleHistoryLoadError);
  });
}

if (historyWeekFilter) {
  historyWeekFilter.addEventListener('change', () => {
    historyState.weekStart = String(historyWeekFilter.value || '').trim();
    if (!historyState.weekStart) {
      return;
    }
    void loadHistoryModalData().catch(handleHistoryLoadError);
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && historyModal && !historyModal.classList.contains('hidden')) {
    closeHistoryModal();
  }
});

if (isDriverMode) {
  logoutBtn.style.display = 'inline-flex';
  logoutBtn.addEventListener('click', async () => {
    const driverToken = token();
    try {
      if (driverToken) {
        await fetch('/api/driver/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${driverToken}`
          }
        });
      }
    } finally {
      localStorage.removeItem(DRIVER_TOKEN_KEY);
      window.location.href = '/driverlogin';
    }
  });
}

updateTabState();
void loadDriverView().catch(handleLoadError);