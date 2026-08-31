const passcodeInput = document.getElementById('passcodeInput');
const loginBtn = document.getElementById('loginBtn');
const loginMsg = document.getElementById('loginMsg');
const loginView = document.getElementById('loginView');
const manageView = document.getElementById('manageView');
const historyView = document.getElementById('historyView');
const topbar = document.getElementById('topbar');
const logoutBtn = document.getElementById('logoutBtn');
const newStudentNameInput = document.getElementById('newStudentNameInput');
const newStudentContactInput = document.getElementById('newStudentContactInput');
const newStudentRemarkInput = document.getElementById('newStudentRemarkInput');
const addStudentBtn = document.getElementById('addStudentBtn');
const studentsSearchInput = document.getElementById('studentsSearchInput');
const manageMsg = document.getElementById('manageMsg');
const studentsList = document.getElementById('studentsList');
const historyWeek = document.getElementById('historyWeek');
const historyBus = document.getElementById('historyBus');
const historyLocation = document.getElementById('historyLocation');
const historyName = document.getElementById('historyName');
const historyRefreshBtn = document.getElementById('historyRefreshBtn');
const historyDeleteSelectedBtn = document.getElementById('historyDeleteSelectedBtn');
const historySelectAll = document.getElementById('historySelectAll');
const historyMsg = document.getElementById('historyMsg');
const historyRows = document.getElementById('historyRows');

const ADMIN_TOKEN_KEY = 'novashuttle_admin_token';
let allStudents = [];

function setMsg(el, text, type = '') {
  el.textContent = text;
  el.className = `msg ${type}`.trim();
}

function getToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
}

function setToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

function formatDate(iso) {
  if (!iso) {
    return '-';
  }

  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }

  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatTime(hhmm) {
  if (!hhmm || !hhmm.includes(':')) {
    return hhmm || '-';
  }

  const [hRaw, mRaw] = hhmm.split(':').map(Number);
  const ampm = hRaw >= 12 ? 'PM' : 'AM';
  const hour = hRaw % 12 || 12;
  return `${hour}:${String(mRaw).padStart(2, '0')} ${ampm}`;
}

function formatDateTime(iso) {
  if (!iso) {
    return '-';
  }

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }

  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function headers(withJson = true) {
  const h = {};
  if (withJson) {
    h['Content-Type'] = 'application/json';
  }
  h.Authorization = `Bearer ${getToken()}`;
  return h;
}

function normalizeSearchText(value) {
  return String(value || '').trim().toLowerCase();
}

function getHistorySelectionCheckboxes() {
  return Array.from(historyRows.querySelectorAll('input[data-booking-id]'));
}

function updateHistoryBulkControls() {
  const checkboxes = getHistorySelectionCheckboxes();
  const selectedCount = checkboxes.filter((checkbox) => checkbox.checked).length;

  if (historySelectAll) {
    historySelectAll.disabled = checkboxes.length === 0;
    historySelectAll.checked = checkboxes.length > 0 && selectedCount === checkboxes.length;
    historySelectAll.indeterminate = selectedCount > 0 && selectedCount < checkboxes.length;
  }

  if (historyDeleteSelectedBtn) {
    historyDeleteSelectedBtn.disabled = selectedCount === 0;
    historyDeleteSelectedBtn.textContent = selectedCount > 0 ? `Delete Selected (${selectedCount})` : 'Delete Selected';
  }
}

function applyStudentFilter() {
  const query = normalizeSearchText(studentsSearchInput ? studentsSearchInput.value : '');
  if (!query) {
    renderStudents(allStudents);
    return;
  }

  const filtered = allStudents.filter((student) => {
    const name = normalizeSearchText(student.fullName);
    const contact = normalizeSearchText(student.contactNumber);
    const remark = normalizeSearchText(student.remark);
    return name.includes(query) || contact.includes(query) || remark.includes(query);
  });

  renderStudents(filtered);
}

function renderStudents(students) {
  studentsList.innerHTML = '';

  if (!students.length) {
    const empty = document.createElement('div');
    empty.className = 'item-sub';
    empty.textContent = 'No matching students found.';
    studentsList.appendChild(empty);
    return;
  }

  students.forEach((student) => {
    const item = document.createElement('div');
    item.className = 'item';

    const details = document.createElement('div');
    details.className = 'item-main';

    const title = document.createElement('div');
    title.className = 'item-title';
    title.textContent = student.fullName;

    const sub = document.createElement('div');
    sub.className = 'item-sub';
    const remarkText = student.remark ? ` | Remark: ${student.remark}` : '';
    sub.textContent = `Contact: ${student.contactNumber || '-'}${remarkText}`;

    details.appendChild(title);
    details.appendChild(sub);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', async () => {
      const nextName = window.prompt('Update full name', student.fullName);
      if (!nextName) {
        return;
      }

      const nextContact = window.prompt('Update contact number', student.contactNumber || '');
      if (!nextContact) {
        return;
      }

      const nextRemark = window.prompt('Update remark (optional)', student.remark || '');

      try {
        const response = await fetch(`/api/admin/students/${student.id}`, {
          method: 'PUT',
          headers: headers(),
          body: JSON.stringify({
            fullName: nextName,
            contactNumber: nextContact,
            remark: nextRemark || ''
          })
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || 'Unable to update student.');
        }

        setMsg(manageMsg, 'Student updated.', 'success');
        await loadStudents();
      } catch (error) {
        setMsg(manageMsg, error.message, 'error');
      }
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', async () => {
      if (!window.confirm(`Delete ${student.fullName}?`)) {
        return;
      }

      try {
        deleteBtn.disabled = true;
        setMsg(manageMsg, 'Deleting student...', 'success');
        const response = await fetch(`/api/admin/students/${student.id}`, {
          method: 'DELETE',
          headers: headers(false)
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || 'Unable to delete student.');
        }

        item.remove();
        setMsg(manageMsg, 'Student deleted.', 'success');
      } catch (error) {
        deleteBtn.disabled = false;
        setMsg(manageMsg, error.message, 'error');
      }
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(details);
    item.appendChild(actions);
    studentsList.appendChild(item);
  });
}

function renderHistoryRows(bookings) {
  historyRows.innerHTML = '';

  if (!bookings.length) {
    renderNoHistoryRowsState();
    return;
  }

  bookings.forEach((booking) => {
    const row = document.createElement('tr');
    row.dataset.bookingId = String(booking.bookingId);
    row.dataset.studentName = booking.studentName || '';

    const selectCell = document.createElement('td');
    const selectCheckbox = document.createElement('input');
    selectCheckbox.type = 'checkbox';
    selectCheckbox.dataset.bookingId = String(booking.bookingId);
    selectCheckbox.setAttribute('aria-label', `Select booking for ${booking.studentName || 'student'}`);
    selectCell.appendChild(selectCheckbox);
    row.appendChild(selectCell);

    const cells = [
      formatDate(booking.date),
      formatTime(booking.time),
      booking.bus || '-',
      booking.location || '-',
      booking.studentName || '-',
      booking.contactNumber || '-',
      formatDateTime(booking.createdAt)
    ];

    cells.forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    });

    const actionCell = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', async () => {
      const whenText = `${formatDate(booking.date)} ${formatTime(booking.time)}`;
      if (!window.confirm(`Delete booking for ${booking.studentName} at ${whenText}?`)) {
        return;
      }

      try {
        deleteBtn.disabled = true;
        setMsg(historyMsg, 'Deleting booking...', 'success');
        const response = await fetch(`/api/admin/bookings/${booking.bookingId}`, {
          method: 'DELETE',
          headers: headers(false)
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || 'Unable to delete booking.');
        }

        row.remove();
        if (!historyRows.querySelector('tr')) {
          renderNoHistoryRowsState();
        }
        updateHistoryBulkControls();
        setMsg(historyMsg, 'Booking deleted successfully.', 'success');
      } catch (error) {
        deleteBtn.disabled = false;
        setMsg(historyMsg, error.message, 'error');
      }
    });

    actionCell.appendChild(deleteBtn);
    row.appendChild(actionCell);

    historyRows.appendChild(row);
  });

  updateHistoryBulkControls();
}

function renderNoHistoryRowsState() {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = 9;
  cell.textContent = 'No booking history found for this filter.';
  row.appendChild(cell);
  historyRows.appendChild(row);
  updateHistoryBulkControls();
}

function renderWeekOptions(availableWeeks, selectedWeek) {
  historyWeek.innerHTML = '';

  (availableWeeks || []).forEach((week) => {
    const option = document.createElement('option');
    option.value = week;
    option.textContent = week;
    if (week === selectedWeek) {
      option.selected = true;
    }
    historyWeek.appendChild(option);
  });
}

async function loadHistory() {
  const params = new URLSearchParams();
  if (historyWeek.value) {
    params.set('weekStart', historyWeek.value);
  }
  if (historyBus.value) {
    params.set('bus', historyBus.value);
  }
  if (historyLocation.value) {
    params.set('location', historyLocation.value);
  }
  if (historyName.value.trim()) {
    params.set('studentName', historyName.value.trim());
  }

  const response = await fetch(`/api/admin/bookings?${params.toString()}`, {
    headers: headers(false)
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Unable to load booking history.');
  }

  renderWeekOptions(payload.availableWeeks || [], payload.weekStart || '');
  if (!historyWeek.value && payload.weekStart) {
    historyWeek.value = payload.weekStart;
  }
  renderHistoryRows(payload.bookings || []);
  setMsg(historyMsg, `Showing week ${payload.weekStart} to ${payload.weekEnd}.`, 'success');
}

async function loadStudents() {
  const response = await fetch('/api/admin/students', {
    headers: headers(false)
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Unable to load students.');
  }
  allStudents = payload.students || [];
  applyStudentFilter();
}

async function showManageView() {
  document.body.classList.remove('auth-screen');
  loginView.classList.add('hidden');
  manageView.classList.remove('hidden');
  historyView.classList.remove('hidden');
  logoutBtn.classList.remove('hidden');
  topbar.classList.remove('hidden');
  await loadStudents();
  await loadHistory();
}

function showLoginView() {
  document.body.classList.add('auth-screen');
  loginView.classList.remove('hidden');
  manageView.classList.add('hidden');
  historyView.classList.add('hidden');
  logoutBtn.classList.add('hidden');
  topbar.classList.add('hidden');
}

async function doLogout() {
  try {
    const token = getToken();
    if (token) {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: headers(false)
      });
    }
  } finally {
    clearToken();
    showLoginView();
    setMsg(loginMsg, 'Logged out.', 'success');
  }
}

loginBtn.addEventListener('click', async () => {
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ passcode: passcodeInput.value })
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Login failed.');
    }

    setToken(payload.token);
    setMsg(loginMsg, 'Login successful.', 'success');
    await showManageView();
  } catch (error) {
    setMsg(loginMsg, error.message, 'error');
  }
});

addStudentBtn.addEventListener('click', async () => {
  const fullName = newStudentNameInput.value.trim();
  const contactNumber = newStudentContactInput.value.trim();
  const remark = newStudentRemarkInput.value.trim();

  if (!fullName) {
    setMsg(manageMsg, 'Please enter full name.', 'error');
    return;
  }

  if (!contactNumber) {
    setMsg(manageMsg, 'Please enter contact number.', 'error');
    return;
  }

  try {
    const response = await fetch('/api/admin/students', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ fullName, contactNumber, remark })
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Unable to add student.');
    }

    newStudentNameInput.value = '';
    newStudentContactInput.value = '';
    newStudentRemarkInput.value = '';
    setMsg(manageMsg, 'Student added.', 'success');
    await loadStudents();
    await loadHistory();
  } catch (error) {
    setMsg(manageMsg, error.message, 'error');
  }
});

historyRefreshBtn.addEventListener('click', async () => {
  try {
    await loadHistory();
  } catch (error) {
    setMsg(historyMsg, error.message, 'error');
  }
});

if (studentsSearchInput) {
  studentsSearchInput.addEventListener('input', () => {
    applyStudentFilter();
  });
}

historyRows.addEventListener('change', (event) => {
  const checkbox = event.target;
  if (!(checkbox instanceof HTMLInputElement)) {
    return;
  }

  if (!checkbox.dataset.bookingId) {
    return;
  }

  updateHistoryBulkControls();
});

if (historySelectAll) {
  historySelectAll.addEventListener('change', () => {
    const checkboxes = getHistorySelectionCheckboxes();
    checkboxes.forEach((checkbox) => {
      checkbox.checked = historySelectAll.checked;
    });
    updateHistoryBulkControls();
  });
}

if (historyDeleteSelectedBtn) {
  historyDeleteSelectedBtn.addEventListener('click', async () => {
    const selectedRows = getHistorySelectionCheckboxes()
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => ({
        id: Number(checkbox.dataset.bookingId),
        row: checkbox.closest('tr')
      }))
      .filter((entry) => entry.id && entry.row);

    if (!selectedRows.length) {
      setMsg(historyMsg, 'Please tick booking rows to delete.', 'error');
      return;
    }

    if (!window.confirm(`Delete ${selectedRows.length} selected booking(s)?`)) {
      return;
    }

    let deletedCount = 0;
    let failedCount = 0;

    try {
      historyDeleteSelectedBtn.disabled = true;
      setMsg(historyMsg, `Deleting ${selectedRows.length} booking(s)...`, 'success');

      for (const entry of selectedRows) {
        const response = await fetch(`/api/admin/bookings/${entry.id}`, {
          method: 'DELETE',
          headers: headers(false)
        });
        const payload = await response.json();
        if (!response.ok) {
          failedCount += 1;
          continue;
        }

        deletedCount += 1;
        entry.row.remove();
        void payload;
      }

      if (!historyRows.querySelector('tr')) {
        renderNoHistoryRowsState();
      } else {
        updateHistoryBulkControls();
      }

      if (failedCount > 0) {
        setMsg(historyMsg, `Deleted ${deletedCount} booking(s). ${failedCount} failed, please refresh and retry.`, 'error');
      } else {
        setMsg(historyMsg, `Deleted ${deletedCount} booking(s).`, 'success');
      }
    } catch (error) {
      setMsg(historyMsg, error.message, 'error');
      updateHistoryBulkControls();
    }
  });
}

historyWeek.addEventListener('change', () => {
  void loadHistory().catch((error) => {
    setMsg(historyMsg, error.message, 'error');
  });
});

logoutBtn.addEventListener('click', () => {
  void doLogout();
});

(async () => {
  const token = getToken();
  if (!token) {
    showLoginView();
    return;
  }

  try {
    await showManageView();
  } catch (_error) {
    clearToken();
    showLoginView();
  }
})();
