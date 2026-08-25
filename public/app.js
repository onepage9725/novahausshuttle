const weeklyList = document.getElementById('weeklyList');
const messageEl = document.getElementById('message');
const proceedBtn = document.getElementById('proceedBtn');
const viewSelectionsBtn = document.getElementById('viewSelectionsBtn');
const selectedModal = document.getElementById('selectedModal');
const closeSelectedModalBtn = document.getElementById('closeSelectedModalBtn');
const selectedRows = document.getElementById('selectedRows');
const confirmModal = document.getElementById('confirmModal');
const confirmSummary = document.getElementById('confirmSummary');
const confirmBackBtn = document.getElementById('confirmBackBtn');
const confirmSubmitBtn = document.getElementById('confirmSubmitBtn');
const confirmMessage = document.getElementById('confirmMessage');
const tripItemTemplate = document.getElementById('tripItemTemplate');
const dayCardTemplate = document.getElementById('dayCardTemplate');
const busTabs = Array.from(document.querySelectorAll('.bus-tab'));
const locationTabs = Array.from(document.querySelectorAll('.location-tab'));

const studentGate = document.getElementById('studentGate');
const studentNameInput = document.getElementById('studentNameInput');
const studentNameSubmit = document.getElementById('studentNameSubmit');
const studentGateMessage = document.getElementById('studentGateMessage');

let activeBus = 'A';
let activeLocation = 'AERA';
let anchorDate = toApiDate(new Date());
const skippedDates = new Set();
const selectedTripsByKey = new Map();
const submittedTripsByKey = new Map();
const editableDates = new Set();
const weekTripsCache = new Map();
let currentStudentName = '';
let activeWeekDates = [];
let currentWeekDays = [];

function hasSubmittedSelections() {
  return submittedTripsByKey.size > 0;
}

function isEditableDate(date) {
  return editableDates.has(date);
}

function getEffectiveSelection(date, direction) {
  return selectedTripsByKey.get(selectionKey(date, direction)) || submittedTripsByKey.get(selectionKey(date, direction)) || null;
}

function toApiDate(date) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
}

function toDisplayTime(hhmm) {
  const [hRaw, mRaw] = hhmm.split(':').map(Number);
  const ampm = hRaw >= 12 ? 'pm' : 'am';
  const hour = hRaw % 12 || 12;
  return `${hour}:${String(mRaw).padStart(2, '0')}${ampm}`;
}

function toDisplayDay(date) {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });
}

function busRouteTitles(bus) {
  const locationName = activeLocation === 'HELIX' ? 'Helix Residence' : 'Aera Residence';

  if (bus === 'A') {
    return {
      outbound: `Bus A - 🚌 ${locationName} → Taylor University`,
      inbound: `Bus A - 🏫 Taylor University → ${locationName}`
    };
  }

  return {
    outbound: `Bus B - 🚌 ${locationName} → Taylor University`,
    inbound: `Bus B - 🏫 Taylor University → ${locationName}`
  };
}

function setMessage(text, type = '') {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`.trim();
}

function selectionKey(date, direction) {
  return `${date}|${direction}`;
}

function normalizeDateText(date) {
  return date.split('-').join('/');
}

function rowClass(status) {
  if (status === 'FULL') return 'full';
  if (status === 'ALMOST_FULL') return 'almost';
  return 'available';
}

async function fetchWeekTrips() {
  const date = anchorDate;
  const cacheKey = `${activeLocation}|${date}`;

  if (weekTripsCache.has(cacheKey)) {
    return weekTripsCache.get(cacheKey);
  }

  setMessage('Loading weekly schedule...');

  const response = await fetch(
    `/api/week-trips?date=${encodeURIComponent(date)}&location=${encodeURIComponent(activeLocation)}`
  );
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || 'Unable to load trips.');
  }

  const days = payload.days || [];
  weekTripsCache.set(cacheKey, days);
  return days;
}

async function verifyStudent(fullName) {
  const response = await fetch('/api/students/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fullName })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Student verification failed.');
  }
}

function setStudentAccess(fullName) {
  currentStudentName = fullName;
  studentGate.classList.add('hidden');
}

function setGateMessage(text, type = 'error') {
  studentGateMessage.textContent = text;
  studentGateMessage.className = `modal-message ${type}`;
}

function clearWeek() {
  weeklyList.innerHTML = '';
}

function renderTrip(trip) {
  const node = tripItemTemplate.content.firstElementChild.cloneNode(true);
  node.classList.add(rowClass(trip.status));
  node.querySelector('.trip-time').textContent = toDisplayTime(trip.time);
  node.querySelector('.trip-capacity').textContent = `${trip.booked}/${trip.capacity}`;

  const key = selectionKey(trip.date, trip.direction);
  const selectedPending = selectedTripsByKey.get(key);
  const selectedSubmitted = submittedTripsByKey.get(key);
  const editable = isEditableDate(trip.date);
  const isSelected = editable
    ? Boolean(selectedPending && selectedPending.id === trip.id)
    : Boolean(
      (selectedPending && selectedPending.id === trip.id) ||
      (selectedSubmitted && trip.time === selectedSubmitted.time && trip.bus === selectedSubmitted.bus && trip.location === selectedSubmitted.location)
    );

  if (isSelected) {
    node.classList.add('selected');
  }

  const lockBySubmission = hasSubmittedSelections();
  const canEditThisDate = isEditableDate(trip.date);
  const isLockedNonSelected = lockBySubmission && !canEditThisDate && !isSelected;

  if (trip.status === 'FULL' || isLockedNonSelected) {
    node.disabled = true;
  }

  if (isLockedNonSelected) {
    node.classList.add('locked');
  }

  if (!isLockedNonSelected) {
    node.addEventListener('click', () => {
      toggleTripSelection(trip);
    });
  }

  return node;
}

function splitTripsForDirection(trips) {
  return {
    outbound: trips.filter((trip) => trip.direction === 'OUTBOUND'),
    inbound: trips.filter((trip) => trip.direction === 'INBOUND')
  };
}

function applyDaySkipState(dayNode, isSkipped) {
  const skippedView = dayNode.querySelector('.skipped-view');
  const skipBtn = dayNode.querySelector('.skip-btn');
  const sections = Array.from(dayNode.querySelectorAll('.day-section'));

  if (isSkipped) {
    dayNode.classList.add('is-skipped');
    skipBtn.hidden = true;
    sections.forEach((section) => {
      section.hidden = true;
    });
    skippedView.hidden = false;
  } else {
    dayNode.classList.remove('is-skipped');
    skipBtn.hidden = false;
    sections.forEach((section) => {
      section.hidden = false;
    });
    skippedView.hidden = true;
  }
}

function clearDaySelections(date) {
  selectedTripsByKey.delete(selectionKey(date, 'OUTBOUND'));
  selectedTripsByKey.delete(selectionKey(date, 'INBOUND'));
}

function isDayCompleteOrSkipped(date) {
  if (skippedDates.has(date)) {
    return true;
  }

  return Boolean(
    selectedTripsByKey.get(selectionKey(date, 'OUTBOUND')) ||
    selectedTripsByKey.get(selectionKey(date, 'INBOUND'))
  );
}

function updateProceedState() {
  if (hasSubmittedSelections()) {
    proceedBtn.disabled = editableDates.size === 0;
    return;
  }

  const hasAnySelection = selectedTripsByKey.size > 0;
  proceedBtn.disabled = !hasAnySelection;
}

function directionLabel(direction) {
  return direction === 'OUTBOUND' ? 'To University' : 'Back to Residence';
}

async function loadSubmittedWeekBookings() {
  if (!currentStudentName) {
    submittedTripsByKey.clear();
    return;
  }

  const response = await fetch(
    `/api/students/week-bookings?fullName=${encodeURIComponent(currentStudentName)}`
  );
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Unable to load your submitted bookings.');
  }

  submittedTripsByKey.clear();
  (payload.bookings || []).forEach((booking) => {
    if (!booking.date || !booking.direction) {
      return;
    }

    submittedTripsByKey.set(selectionKey(booking.date, booking.direction), {
      id: booking.bookingId,
      date: booking.date,
      direction: booking.direction,
      time: booking.time,
      bus: booking.bus,
      location: booking.location,
      submitted: true
    });
  });
}

function removeSelectedTrip(date, direction) {
  if (hasSubmittedSelections() && !isEditableDate(date)) {
    setMessage('Click Change my time on this day first.', 'error');
    return;
  }

  const key = selectionKey(date, direction);
  const current = selectedTripsByKey.get(key);
  if (!current) {
    return;
  }

  selectedTripsByKey.delete(key);
  setMessage(`Removed ${directionLabel(direction)} slot on ${toDisplayDay(date)}.`, 'success');
  renderWeek(currentWeekDays);
}

function renderSelectedSummary() {
  selectedRows.innerHTML = '';

  if (!activeWeekDates.length) {
    return;
  }

  activeWeekDates.forEach((date) => {
    const dayBox = document.createElement('article');
    dayBox.className = 'selected-day';

    const title = document.createElement('h3');
    title.className = 'selected-day-title';
    title.textContent = toDisplayDay(date);
    dayBox.appendChild(title);

    if (skippedDates.has(date)) {
      const skippedText = document.createElement('p');
      skippedText.className = 'selected-skipped';
      skippedText.textContent = 'Day skipped.';

      const undoBtn = document.createElement('button');
      undoBtn.type = 'button';
      undoBtn.className = 'selected-undo';
      undoBtn.textContent = 'Undo Skip';
      undoBtn.addEventListener('click', () => {
        if (hasSubmittedSelections() && !isEditableDate(date)) {
          setMessage('Click Change my time on this day first.', 'error');
          return;
        }
        skippedDates.delete(date);
        setMessage(`Skip removed for ${toDisplayDay(date)}.`, 'success');
        renderWeek(currentWeekDays);
      });

      dayBox.appendChild(skippedText);
      dayBox.appendChild(undoBtn);
      selectedRows.appendChild(dayBox);
      return;
    }

    const pendingOutbound = selectedTripsByKey.get(selectionKey(date, 'OUTBOUND'));
    const pendingInbound = selectedTripsByKey.get(selectionKey(date, 'INBOUND'));
    const submittedOutbound = submittedTripsByKey.get(selectionKey(date, 'OUTBOUND'));
    const submittedInbound = submittedTripsByKey.get(selectionKey(date, 'INBOUND'));
    const outbound = isEditableDate(date) ? pendingOutbound : (pendingOutbound || submittedOutbound);
    const inbound = isEditableDate(date) ? pendingInbound : (pendingInbound || submittedInbound);

    if (!outbound && !inbound) {
      const emptyText = document.createElement('p');
      emptyText.className = 'selected-empty';
      emptyText.textContent = 'No slot selected yet.';
      dayBox.appendChild(emptyText);
      selectedRows.appendChild(dayBox);
      return;
    }

    [
      { direction: 'OUTBOUND', trip: outbound },
      { direction: 'INBOUND', trip: inbound }
    ].forEach(({ direction, trip }) => {
      if (!trip) {
        return;
      }

      const row = document.createElement('div');
      row.className = 'selected-slot';

      const text = document.createElement('span');
      text.className = 'selected-slot-text';
      const isPending = pendingOutbound === trip || pendingInbound === trip;
      const prefix = isPending ? 'Pending' : 'Submitted';
      text.textContent = `${prefix} - ${directionLabel(direction)}: ${toDisplayTime(trip.time)} (${trip.location} Bus ${trip.bus})`;

      row.appendChild(text);

      if (isPending) {
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'selected-remove';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => {
          removeSelectedTrip(date, direction);
        });
        row.appendChild(removeBtn);
      }

      dayBox.appendChild(row);
    });

    selectedRows.appendChild(dayBox);
  });
}

function setConfirmMessage(text, type = '') {
  confirmMessage.textContent = text;
  confirmMessage.className = `modal-message ${type}`.trim();
}

function closeConfirmModal() {
  confirmModal.classList.add('hidden');
  setConfirmMessage('');
}

function openSelectedModal() {
  setMessage('Loading selected timeslots...', 'success');
  void loadSubmittedWeekBookings()
    .then(() => {
      renderSelectedSummary();
      selectedModal.classList.remove('hidden');
      setMessage('');
    })
    .catch((error) => {
      renderSelectedSummary();
      selectedModal.classList.remove('hidden');
      setMessage(error.message, 'error');
    });
}

function closeSelectedModal() {
  selectedModal.classList.add('hidden');
}

function renderDay(dayData) {
  const dayNode = dayCardTemplate.content.firstElementChild.cloneNode(true);
  dayNode.dataset.date = dayData.date;
  dayNode.querySelector('.day-title').textContent = toDisplayDay(dayData.date);

  const selectedBusTrips = dayData.trips.filter((trip) => trip.bus === activeBus);
  const { outbound, inbound } = splitTripsForDirection(selectedBusTrips);
  const routeTitles = busRouteTitles(activeBus);

  dayNode.querySelector('.route-outbound').textContent = routeTitles.outbound;
  dayNode.querySelector('.route-inbound').textContent = routeTitles.inbound;

  const outboundList = dayNode.querySelector('.outbound-list');
  const inboundList = dayNode.querySelector('.inbound-list');
  const changeBtn = dayNode.querySelector('.change-btn');
  const skipBtn = dayNode.querySelector('.skip-btn');
  const date = dayData.date;

  if (hasSubmittedSelections()) {
    changeBtn.hidden = false;
    changeBtn.classList.toggle('is-editing', isEditableDate(date));
    changeBtn.textContent = isEditableDate(date) ? 'Cancel Change' : 'Change my time';
    skipBtn.hidden = !isEditableDate(date);

    changeBtn.addEventListener('click', () => {
      if (isEditableDate(date)) {
        editableDates.delete(date);
        skippedDates.delete(date);
        selectedTripsByKey.delete(selectionKey(date, 'OUTBOUND'));
        selectedTripsByKey.delete(selectionKey(date, 'INBOUND'));
        skipBtn.hidden = true;
        setMessage(`Cancelled changes for ${toDisplayDay(date)}.`, 'success');
      } else {
        editableDates.add(date);
        selectedTripsByKey.delete(selectionKey(date, 'OUTBOUND'));
        selectedTripsByKey.delete(selectionKey(date, 'INBOUND'));
        skipBtn.hidden = false;
        setMessage(`Change mode enabled for ${toDisplayDay(date)}. Select new slot(s) or skip this day.`, 'success');
      }

      renderWeek(currentWeekDays);
    });
  } else {
    changeBtn.hidden = true;
    skipBtn.hidden = false;
  }

  outbound.forEach((trip) => outboundList.appendChild(renderTrip(trip)));
  inbound.forEach((trip) => inboundList.appendChild(renderTrip(trip)));

  skipBtn.addEventListener('click', () => {
    if (hasSubmittedSelections() && !isEditableDate(dayData.date)) {
      setMessage('Click Change my time on this day first to update or skip it.', 'error');
      return;
    }

    skippedDates.add(dayData.date);
    clearDaySelections(dayData.date);
    applyDaySkipState(dayNode, true);
    updateProceedState();
    setMessage(`Skipped ${toDisplayDay(dayData.date)}.`, 'success');
  });

  dayNode.querySelector('.add-times-btn').addEventListener('click', () => {
    if (hasSubmittedSelections() && !isEditableDate(dayData.date)) {
      setMessage('Click Change my time on this day first to update this day.', 'error');
      return;
    }

    skippedDates.delete(dayData.date);
    applyDaySkipState(dayNode, false);
    updateProceedState();
  });

  applyDaySkipState(dayNode, skippedDates.has(dayData.date));

  return dayNode;
}

function renderWeek(days) {
  activeWeekDates = days.map((day) => day.date);
  const validDates = new Set(activeWeekDates);

  Array.from(skippedDates).forEach((date) => {
    if (!validDates.has(date)) {
      skippedDates.delete(date);
    }
  });

  Array.from(selectedTripsByKey.keys()).forEach((key) => {
    const [date] = key.split('|');
    if (!validDates.has(date)) {
      selectedTripsByKey.delete(key);
    }
  });

  Array.from(editableDates).forEach((date) => {
    if (!validDates.has(date)) {
      editableDates.delete(date);
    }
  });

  clearWeek();
  days.forEach((dayData) => {
    weeklyList.appendChild(renderDay(dayData));
  });
  renderSelectedSummary();
  updateProceedState();

  if (hasSubmittedSelections()) {
    setMessage('Your submitted timeslots are locked for this week. Other slots are disabled until next weekly reset.', 'success');
  }
}

function setActiveBus(bus) {
  activeBus = bus;
  busTabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.bus === bus);
  });
}

function setActiveLocation(location) {
  activeLocation = location;
  locationTabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.location === location);
  });
}

async function loadWeekTrips() {
  try {
    const days = await fetchWeekTrips();
    currentWeekDays = days;
    await loadSubmittedWeekBookings();
    renderWeek(days);
    if (!hasSubmittedSelections()) {
      setMessage('Choose timeslots first, then click Proceed to confirm all selections.', 'success');
    }
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

function toggleTripSelection(trip) {
  if (hasSubmittedSelections() && !isEditableDate(trip.date)) {
    setMessage('Your booking is already submitted. Click Change my time on this day to edit.', 'error');
    return;
  }

  const date = trip.date;
  if (skippedDates.has(date)) {
    setMessage(`This day is skipped. Click Add times for this day to choose slots for ${toDisplayDay(date)}.`, 'error');
    return;
  }

  const key = selectionKey(date, trip.direction);
  const existing = selectedTripsByKey.get(key);

  if (existing && existing.id === trip.id) {
    selectedTripsByKey.delete(key);
    setMessage(`Removed ${toDisplayTime(trip.time)} on ${toDisplayDay(trip.date)}.`, 'success');
  } else {
    selectedTripsByKey.set(key, {
      id: trip.id,
      date: trip.date,
      direction: trip.direction,
      time: trip.time,
      bus: trip.bus,
      location: trip.location
    });
    setMessage(`Selected ${toDisplayTime(trip.time)} on ${toDisplayDay(trip.date)}.`, 'success');
  }

  renderWeek(currentWeekDays);
}

function buildConfirmationLines() {
  return activeWeekDates.map((date) => {
    if (skippedDates.has(date)) {
      return {
        date,
        skipped: true,
        outbound: '',
        inbound: ''
      };
    }

    const out = isEditableDate(date)
      ? selectedTripsByKey.get(selectionKey(date, 'OUTBOUND'))
      : getEffectiveSelection(date, 'OUTBOUND');
    const back = isEditableDate(date)
      ? selectedTripsByKey.get(selectionKey(date, 'INBOUND'))
      : getEffectiveSelection(date, 'INBOUND');

    return {
      date,
      skipped: false,
      outbound: out ? `To University: ${toDisplayTime(out.time)} (${out.location} Bus ${out.bus})` : '',
      inbound: back ? `Back to Residence: ${toDisplayTime(back.time)} (${back.location} Bus ${back.bus})` : ''
    };
  });
}

function renderConfirmSummary() {
  const lines = buildConfirmationLines();
  confirmSummary.innerHTML = '';

  lines.forEach((line) => {
    const row = document.createElement('div');
    row.className = 'confirm-day-row';

    const title = document.createElement('div');
    title.className = 'confirm-day-title';
    title.textContent = `${normalizeDateText(line.date)} (${toDisplayDay(line.date)})`;
    row.appendChild(title);

    if (line.skipped) {
      const skipped = document.createElement('div');
      skipped.className = 'confirm-line skipped';
      skipped.textContent = 'Skipped';
      row.appendChild(skipped);
    } else {
      const outbound = document.createElement('div');
      outbound.className = `confirm-line ${line.outbound ? '' : 'empty'}`.trim();
      outbound.textContent = line.outbound || 'To University: Not selected';
      row.appendChild(outbound);

      const inbound = document.createElement('div');
      inbound.className = `confirm-line ${line.inbound ? '' : 'empty'}`.trim();
      inbound.textContent = line.inbound || 'Back to Residence: Not selected';
      row.appendChild(inbound);
    }

    confirmSummary.appendChild(row);
  });
}

function openConfirmModal() {
  renderConfirmSummary();
  setConfirmMessage('');
  confirmModal.classList.remove('hidden');
}

function validateSelectionsBeforeSubmit() {
  if (hasSubmittedSelections()) {
    if (editableDates.size === 0) {
      return 'Click Change my time on a day to update your timeslot.';
    }

    for (const date of editableDates) {
      if (skippedDates.has(date)) {
        continue;
      }

      const out = selectedTripsByKey.get(selectionKey(date, 'OUTBOUND'));
      const back = selectedTripsByKey.get(selectionKey(date, 'INBOUND'));
      if (!out && !back) {
        return `Please choose at least one timeslot or skip ${toDisplayDay(date)}.`;
      }
    }

    return '';
  }

  const incompleteDays = activeWeekDates.filter((date) => !isDayCompleteOrSkipped(date));
  if (incompleteDays.length > 0) {
    const dayText = incompleteDays.map((date) => toDisplayDay(date)).join(', ');
    return `Please choose at least one timeslot or skip these days: ${dayText}`;
  }

  if (selectedTripsByKey.size === 0) {
    return 'Please choose at least one timeslot in the week before proceeding.';
  }

  return '';
}

async function submitSelectedTrips() {
  const validationError = validateSelectionsBeforeSubmit();
  if (validationError) {
    setMessage(validationError, 'error');
    return;
  }

  openConfirmModal();
}

async function confirmAndSubmitSelectedTrips() {
  const validationError = validateSelectionsBeforeSubmit();
  if (validationError) {
    setConfirmMessage(validationError, 'error');
    return;
  }

  try {
    proceedBtn.disabled = true;
    confirmSubmitBtn.disabled = true;
    setConfirmMessage('Submitting your weekly selections...', 'success');

    let response;
    const inChangeMode = hasSubmittedSelections();

    if (inChangeMode) {
      const changes = Array.from(editableDates).map((date) => {
        if (skippedDates.has(date)) {
          return { date, tripIds: [] };
        }

        const out = selectedTripsByKey.get(selectionKey(date, 'OUTBOUND'));
        const back = selectedTripsByKey.get(selectionKey(date, 'INBOUND'));
        const tripIds = [out, back].filter(Boolean).map((trip) => trip.id);
        return { date, tripIds };
      });

      response = await fetch('/api/students/change-days', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentName: currentStudentName,
          changes
        })
      });
    } else {
      response = await fetch('/api/book-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentName: currentStudentName,
          selections: Array.from(selectedTripsByKey.values()).map((trip) => ({ tripId: trip.id }))
        })
      });
    }

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Unable to submit selected trips.');
    }

    selectedTripsByKey.clear();
    skippedDates.clear();
    editableDates.clear();
    weekTripsCache.clear();
    await loadSubmittedWeekBookings();
    closeConfirmModal();
    if (inChangeMode) {
      setMessage('Timeslot changes saved successfully.', 'success');
    } else {
      setMessage(`Booking confirmed for ${payload.bookedCount || 0} timeslot(s).`, 'success');
    }
    await loadWeekTrips();
  } catch (error) {
    setConfirmMessage(error.message, 'error');
  } finally {
    confirmSubmitBtn.disabled = false;
    updateProceedState();
  }
}

async function initStudentGate() {
  currentStudentName = '';
  submittedTripsByKey.clear();
  selectedTripsByKey.clear();
  skippedDates.clear();
  editableDates.clear();
  studentNameInput.value = '';
  setGateMessage('');
  studentGate.classList.remove('hidden');
}

busTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    if (tab.dataset.bus !== activeBus) {
      setActiveBus(tab.dataset.bus);
      renderWeek(currentWeekDays);
    }
  });
});

locationTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    if (tab.dataset.location !== activeLocation) {
      setActiveLocation(tab.dataset.location);
      void loadWeekTrips();
    }
  });
});

studentNameSubmit.addEventListener('click', async () => {
  const fullName = studentNameInput.value.trim();
  if (!fullName) {
    setGateMessage('Please enter your full name.');
    return;
  }

  try {
    await verifyStudent(fullName);
    setStudentAccess(fullName);
    setGateMessage('Verified.', 'success');
    await loadWeekTrips();
  } catch (error) {
    setGateMessage(error.message, 'error');
  }
});

studentNameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    studentNameSubmit.click();
  }
});

proceedBtn.addEventListener('click', () => {
  void submitSelectedTrips();
});

viewSelectionsBtn.addEventListener('click', () => {
  openSelectedModal();
});

closeSelectedModalBtn.addEventListener('click', () => {
  closeSelectedModal();
});

selectedModal.addEventListener('click', (event) => {
  if (event.target === selectedModal) {
    closeSelectedModal();
  }
});

confirmBackBtn.addEventListener('click', () => {
  closeConfirmModal();
});

confirmSubmitBtn.addEventListener('click', () => {
  void confirmAndSubmitSelectedTrips();
});

confirmModal.addEventListener('click', (event) => {
  if (event.target === confirmModal) {
    closeConfirmModal();
  }
});

setActiveLocation('AERA');
setActiveBus('A');
updateProceedState();
void initStudentGate().then(async () => {
  if (studentGate.classList.contains('hidden')) {
    await loadWeekTrips();
  }
});