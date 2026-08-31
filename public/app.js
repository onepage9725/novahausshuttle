const weeklyList = document.getElementById('weeklyList');
const messageEl = document.getElementById('message');
const proceedBtn = document.getElementById('proceedBtn');
const viewSelectionsBtn = document.getElementById('viewSelectionsBtn');
const studentLogoutBtn = document.getElementById('studentLogoutBtn');
const selectedModal = document.getElementById('selectedModal');
const closeSelectedModalBtn = document.getElementById('closeSelectedModalBtn');
const selectedRows = document.getElementById('selectedRows');
const selectedStudentInfo = document.getElementById('selectedStudentInfo');
const confirmModal = document.getElementById('confirmModal');
const confirmSummary = document.getElementById('confirmSummary');
const confirmStudentInfo = document.getElementById('confirmStudentInfo');
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
const languageToggle = document.getElementById('languageToggle');
const studentGateTitle = document.getElementById('studentGateTitle');
const studentGateDesc = document.getElementById('studentGateDesc');
const confirmTitle = document.getElementById('confirmTitle');
const confirmDesc = document.getElementById('confirmDesc');
const selectedModalTitle = document.getElementById('selectedModalTitle');
const selectedHelpText = document.getElementById('selectedHelpText');
const heroEyebrow = document.getElementById('heroEyebrow');
const heroTitle = document.getElementById('heroTitle');
const proceedNote = document.getElementById('proceedNote');
const locationAeraTab = document.getElementById('locationAeraTab');
const locationHelixTab = document.getElementById('locationHelixTab');
const busATab = document.getElementById('busATab');
const busBTab = document.getElementById('busBTab');

const LANGUAGE_KEY = 'novashuttle_language';

const I18N = {
  en: {
    documentTitle: 'NovaHaus Shuttle Booking',
    studentGateTitle: 'Enter Your Full Name',
    studentGateDesc: 'Please enter your full name exactly as registered by admin (automatically converted to uppercase without spaces).',
    studentNamePlaceholder: 'e.g. JOHNTANWEIMING',
    continue: 'Continue',
    confirmTitle: 'Confirm Weekly Booking',
    confirmDesc: 'Please review your selected timeslots. You can go back and edit before final submit.',
    confirmBack: 'Back and Edit',
    confirmSubmit: 'Confirm and Submit',
    selectedModalTitle: 'Your Selected Timeslots',
    close: 'Close',
    selectedHelp: 'To change, click another slot in the same direction. To delete, click Remove.',
    heroEyebrow: 'NovaHaus Property Management',
    heroTitle: 'Shuttle Service Booking',
    checkTimeslot: 'Check Timeslot',
    logout: 'Logout',
    aeraResidence: 'Aera Residence',
    helixResidence: 'Helix Residence',
    proceedNote: 'Select timeslots for Monday to Friday, review in Selected Timeslots, then proceed to confirm.',
    proceed: 'Proceed',
    studentDetails: 'Student Details',
    loadingWeeklySchedule: 'Loading weekly schedule...',
    studentVerificationFailed: 'Student verification failed.',
    locationAeraShort: 'Aera Residence',
    locationHelixShort: 'Helix Residence',
    routeOutbound: 'Bus {bus} - 🚌 {location} → Taylor University',
    routeInbound: 'Bus {bus} - 🏫 Taylor University → {location}',
    toUniversity: 'To University',
    backToResidence: 'Back to Residence',
    clickChangeFirst: 'Click Change my time on this day first.',
    removedSlotOn: 'Removed {direction} slot on {day}.',
    daySkipped: 'Day skipped.',
    undoSkip: 'Undo Skip',
    skipRemovedFor: 'Skip removed for {day}.',
    noSlotYet: 'No slot selected yet.',
    pending: 'Pending',
    submitted: 'Submitted',
    remove: 'Remove',
    loadingSelectedTimeslots: 'Loading selected timeslots...',
    cancelChange: 'Cancel Change',
    changeMyTime: 'Change my time',
    skipThisDay: 'Skip this day',
    addTimesForDay: 'Add times for this day',
    cancelledChangesFor: 'Cancelled changes for {day}.',
    changeModeEnabledFor: 'Change mode enabled for {day}. Select new slot(s) or skip this day.',
    clickChangeToUpdateSkip: 'Click Change my time on this day first to update or skip it.',
    skippedDay: 'Skipped {day}.',
    clickChangeToUpdateDay: 'Click Change my time on this day first to update this day.',
    submittedLockedWeek: 'Your submitted timeslots are locked for this week. Other slots are disabled until next weekly reset.',
    chooseTimeslotsFirst: 'Choose timeslots first, then click Proceed to confirm all selections.',
    bookingSubmittedClickChange: 'Your booking is already submitted. Click Change my time on this day to edit.',
    dayIsSkippedChooseSlots: 'This day is skipped. Click Add times for this day to choose slots for {day}.',
    removedTimeOnDay: 'Removed {time} on {day}.',
    selectedTimeOnDay: 'Selected {time} on {day}.',
    skipped: 'Skipped',
    notSelectedToUniversity: 'To University: Not selected',
    notSelectedBackResidence: 'Back to Residence: Not selected',
    clickChangeToUpdate: 'Click Change my time on a day to update your timeslot.',
    chooseAtLeastOneOrSkipDay: 'Please choose at least one timeslot or skip {day}.',
    chooseAtLeastOneOrSkipDays: 'Please choose at least one timeslot or skip these days: {days}',
    chooseAtLeastOneWeek: 'Please choose at least one timeslot in the week before proceeding.',
    submittingWeeklySelections: 'Submitting your weekly selections...',
    unableToSubmitSelectedTrips: 'Unable to submit selected trips.',
    changesSaved: 'Timeslot changes saved successfully.',
    bookingConfirmedCount: 'Booking confirmed for {count} timeslot(s).',
    pleaseEnterFullName: 'Please enter your full name.',
    verified: 'Verified.',
    unableToLoadSubmittedBookings: 'Unable to load your submitted bookings.'
  },
  zh: {
    documentTitle: 'NovaHaus 校车预约',
    studentGateTitle: '请输入你的全名',
    studentGateDesc: '请输入与管理员登记完全一致的全名（系统会自动转为大写并移除空格）。',
    studentNamePlaceholder: '例如：JOHNTANWEIMING',
    continue: '继续',
    confirmTitle: '确认本周预约',
    confirmDesc: '请先确认你选择的时段，提交前可以返回修改。',
    confirmBack: '返回修改',
    confirmSubmit: '确认提交',
    selectedModalTitle: '你已选择的时段',
    close: '关闭',
    selectedHelp: '如需更改，请点击同方向的其他时段；如需删除，请点击 Remove。',
    heroEyebrow: 'NovaHaus 物业管理',
    heroTitle: '校车服务预约',
    checkTimeslot: '查看时段',
    logout: '登出',
    aeraResidence: 'Aera 公寓',
    helixResidence: 'Helix 公寓',
    proceedNote: '请选择周一到周五的时段，在已选时段中检查后再继续确认。',
    proceed: '继续',
    studentDetails: '学生资料',
    loadingWeeklySchedule: '正在加载本周时刻表...',
    studentVerificationFailed: '学生验证失败。',
    locationAeraShort: 'Aera 公寓',
    locationHelixShort: 'Helix 公寓',
    routeOutbound: '巴士 {bus} - 🚌 {location} → 泰莱大学',
    routeInbound: '巴士 {bus} - 🏫 泰莱大学 → {location}',
    toUniversity: '去大学',
    backToResidence: '回公寓',
    clickChangeFirst: '请先点击 Change my time 才能修改这一天。',
    removedSlotOn: '已移除 {day} 的 {direction} 时段。',
    daySkipped: '这一天已跳过。',
    undoSkip: '取消跳过',
    skipRemovedFor: '已取消 {day} 的跳过。',
    noSlotYet: '尚未选择时段。',
    pending: '待提交',
    submitted: '已提交',
    remove: '删除',
    loadingSelectedTimeslots: '正在加载已选时段...',
    cancelChange: '取消更改',
    changeMyTime: '更改我的时段',
    skipThisDay: '跳过这一天',
    addTimesForDay: '为这一天添加时段',
    cancelledChangesFor: '已取消 {day} 的更改。',
    changeModeEnabledFor: '已为 {day} 开启更改模式。请选择新时段或跳过这一天。',
    clickChangeToUpdateSkip: '请先点击 Change my time 才能修改或跳过这一天。',
    skippedDay: '已跳过 {day}。',
    clickChangeToUpdateDay: '请先点击 Change my time 才能修改这一天。',
    submittedLockedWeek: '你本周已提交的时段已锁定，其他时段会禁用直到下次周重置。',
    chooseTimeslotsFirst: '请先选择时段，然后点击继续进行确认。',
    bookingSubmittedClickChange: '你已提交预约。请点击 Change my time 修改当天时段。',
    dayIsSkippedChooseSlots: '这一天已跳过。点击 Add times for this day 为 {day} 选择时段。',
    removedTimeOnDay: '已移除 {day} 的 {time}。',
    selectedTimeOnDay: '已选择 {day} 的 {time}。',
    skipped: '已跳过',
    notSelectedToUniversity: '去大学：未选择',
    notSelectedBackResidence: '回公寓：未选择',
    clickChangeToUpdate: '请先在某一天点击 Change my time 才能修改时段。',
    chooseAtLeastOneOrSkipDay: '请至少选择一个时段，或跳过 {day}。',
    chooseAtLeastOneOrSkipDays: '请至少选择一个时段，或跳过这些天：{days}',
    chooseAtLeastOneWeek: '请先在本周至少选择一个时段再继续。',
    submittingWeeklySelections: '正在提交你的本周选择...',
    unableToSubmitSelectedTrips: '无法提交所选时段。',
    changesSaved: '时段更改已成功保存。',
    bookingConfirmedCount: '已确认预约 {count} 个时段。',
    pleaseEnterFullName: '请输入你的全名。',
    verified: '验证成功。',
    unableToLoadSubmittedBookings: '无法加载你已提交的预约。'
  }
};

let activeLang = localStorage.getItem(LANGUAGE_KEY) || 'en';
if (!Object.prototype.hasOwnProperty.call(I18N, activeLang)) {
  activeLang = 'en';
}

function t(key, vars = {}) {
  const source = (I18N[activeLang] && I18N[activeLang][key]) || I18N.en[key] || key;
  return source.replace(/\{(\w+)\}/g, (_match, tokenName) => String(vars[tokenName] ?? ''));
}

function getLocale() {
  return activeLang === 'zh' ? 'zh-CN' : 'en-US';
}

function applyLanguage() {
  document.documentElement.lang = activeLang === 'zh' ? 'zh-CN' : 'en';
  document.title = t('documentTitle');

  if (languageToggle) {
    const isZh = activeLang === 'zh';
    languageToggle.classList.toggle('is-zh', isZh);
    languageToggle.classList.toggle('is-en', !isZh);
    languageToggle.setAttribute('aria-pressed', isZh ? 'true' : 'false');
  }

  if (studentGateTitle) studentGateTitle.textContent = t('studentGateTitle');
  if (studentGateDesc) studentGateDesc.textContent = t('studentGateDesc');
  if (studentNameInput) studentNameInput.placeholder = t('studentNamePlaceholder');
  if (studentNameSubmit) studentNameSubmit.textContent = t('continue');
  if (confirmTitle) confirmTitle.textContent = t('confirmTitle');
  if (confirmDesc) confirmDesc.textContent = t('confirmDesc');
  if (confirmBackBtn) confirmBackBtn.textContent = t('confirmBack');
  if (confirmSubmitBtn) confirmSubmitBtn.textContent = t('confirmSubmit');
  if (selectedModalTitle) selectedModalTitle.textContent = t('selectedModalTitle');
  if (closeSelectedModalBtn) closeSelectedModalBtn.textContent = t('close');
  if (selectedHelpText) selectedHelpText.textContent = t('selectedHelp');
  if (heroEyebrow) heroEyebrow.textContent = t('heroEyebrow');
  if (heroTitle) heroTitle.textContent = t('heroTitle');
  if (viewSelectionsBtn) viewSelectionsBtn.textContent = t('checkTimeslot');
  if (studentLogoutBtn) studentLogoutBtn.textContent = t('logout');
  if (locationAeraTab) locationAeraTab.textContent = t('aeraResidence');
  if (locationHelixTab) locationHelixTab.textContent = t('helixResidence');
  if (busATab) busATab.textContent = 'Bus A';
  if (busBTab) busBTab.textContent = 'Bus B';
  if (proceedNote) proceedNote.textContent = t('proceedNote');
  if (proceedBtn) proceedBtn.textContent = t('proceed');

  renderStudentInfo();
  if (currentWeekDays.length) {
    renderWeek(currentWeekDays);
  }
  if (confirmModal && !confirmModal.classList.contains('hidden')) {
    renderConfirmSummary();
  }
  if (selectedModal && !selectedModal.classList.contains('hidden')) {
    renderSelectedSummary();
  }
}

let activeBus = 'A';
let activeLocation = 'AERA';
let anchorDate = toApiDate(new Date());
const skippedDates = new Set();
const selectedTripsByKey = new Map();
const submittedTripsByKey = new Map();
const editableDates = new Set();
const weekTripsCache = new Map();
let currentStudentName = '';
let currentStudentContact = '';
let activeWeekDates = [];
let currentWeekDays = [];
let submittedWeekLoaded = false;

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
  const ampm = activeLang === 'zh' ? (hRaw >= 12 ? '下午' : '上午') : (hRaw >= 12 ? 'pm' : 'am');
  const hour = hRaw % 12 || 12;
  return `${hour}:${String(mRaw).padStart(2, '0')}${ampm}`;
}

function toDisplayDay(date) {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString(getLocale(), {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });
}

function busRouteTitles(bus) {
  const locationName = activeLocation === 'HELIX' ? t('locationHelixShort') : t('locationAeraShort');

  if (bus === 'A') {
    return {
      outbound: t('routeOutbound', { bus: 'A', location: locationName }),
      inbound: t('routeInbound', { bus: 'A', location: locationName })
    };
  }

  return {
    outbound: t('routeOutbound', { bus: 'B', location: locationName }),
    inbound: t('routeInbound', { bus: 'B', location: locationName })
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

  setMessage(t('loadingWeeklySchedule'));

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
    throw new Error(payload.error || t('studentVerificationFailed'));
  }

  return payload.student || { fullName, contactNumber: '' };
}

function renderStudentInfo() {
  const safeName = currentStudentName || '-';
  const safeContact = currentStudentContact || '-';
  [confirmStudentInfo, selectedStudentInfo].forEach((container) => {
    if (!container) {
      return;
    }

    container.innerHTML = '';

    const label = document.createElement('div');
    label.className = 'student-info-label';
    label.textContent = t('studentDetails');

    const value = document.createElement('div');
    value.className = 'student-info-value';
    value.textContent = `${safeName} | ${safeContact}`;

    container.appendChild(label);
    container.appendChild(value);
  });
}

function setStudentAccess(student) {
  currentStudentName = String(student.fullName || '').trim();
  currentStudentContact = String(student.contactNumber || '').trim();
  renderStudentInfo();
  studentGate.classList.add('hidden');
}

function setGateMessage(text, type = 'error') {
  studentGateMessage.textContent = text;
  studentGateMessage.className = `modal-message ${type}`;
}

function normalizeStudentGateName(name) {
  return String(name || '').toUpperCase().replace(/\s+/g, '');
}

function clearWeek() {
  weeklyList.innerHTML = '';
}

function getDayDataByDate(date) {
  return currentWeekDays.find((day) => day.date === date) || null;
}

function rerenderDayByDate(date) {
  const dayData = getDayDataByDate(date);
  if (!dayData) {
    return;
  }

  const currentNode = weeklyList.querySelector(`[data-date="${date}"]`);
  const nextNode = renderDay(dayData);

  if (!currentNode) {
    weeklyList.appendChild(nextNode);
    return;
  }

  currentNode.replaceWith(nextNode);
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
  return direction === 'OUTBOUND' ? t('toUniversity') : t('backToResidence');
}

async function loadSubmittedWeekBookings(forceReload = false) {
  if (!currentStudentName) {
    submittedTripsByKey.clear();
    submittedWeekLoaded = false;
    return;
  }

  if (submittedWeekLoaded && !forceReload) {
    return;
  }

  const response = await fetch(
    `/api/students/week-bookings?fullName=${encodeURIComponent(currentStudentName)}`
  );
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || t('unableToLoadSubmittedBookings'));
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

  submittedWeekLoaded = true;
}

function removeSelectedTrip(date, direction) {
  if (hasSubmittedSelections() && !isEditableDate(date)) {
    setMessage(t('clickChangeFirst'), 'error');
    return;
  }

  const key = selectionKey(date, direction);
  const current = selectedTripsByKey.get(key);
  if (!current) {
    return;
  }

  selectedTripsByKey.delete(key);
  setMessage(t('removedSlotOn', { direction: directionLabel(direction), day: toDisplayDay(date) }), 'success');
  rerenderDayByDate(date);
  renderSelectedSummary();
  updateProceedState();
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
      skippedText.textContent = t('daySkipped');

      const undoBtn = document.createElement('button');
      undoBtn.type = 'button';
      undoBtn.className = 'selected-undo';
      undoBtn.textContent = t('undoSkip');
      undoBtn.addEventListener('click', () => {
        if (hasSubmittedSelections() && !isEditableDate(date)) {
          setMessage(t('clickChangeFirst'), 'error');
          return;
        }
        skippedDates.delete(date);
        setMessage(t('skipRemovedFor', { day: toDisplayDay(date) }), 'success');
        rerenderDayByDate(date);
        renderSelectedSummary();
        updateProceedState();
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
      emptyText.textContent = t('noSlotYet');
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
      const prefix = isPending ? t('pending') : t('submitted');
      text.textContent = `${prefix} - ${directionLabel(direction)}: ${toDisplayTime(trip.time)} (${trip.location} Bus ${trip.bus})`;

      row.appendChild(text);

      if (isPending) {
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'selected-remove';
        removeBtn.textContent = t('remove');
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
  setMessage(t('loadingSelectedTimeslots'), 'success');
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
  const addTimesBtn = dayNode.querySelector('.add-times-btn');

  skipBtn.textContent = t('skipThisDay');
  addTimesBtn.textContent = t('addTimesForDay');

  if (hasSubmittedSelections()) {
    changeBtn.hidden = false;
    changeBtn.classList.toggle('is-editing', isEditableDate(date));
    changeBtn.textContent = isEditableDate(date) ? t('cancelChange') : t('changeMyTime');
    skipBtn.hidden = !isEditableDate(date);

    changeBtn.addEventListener('click', () => {
      if (isEditableDate(date)) {
        editableDates.delete(date);
        skippedDates.delete(date);
        selectedTripsByKey.delete(selectionKey(date, 'OUTBOUND'));
        selectedTripsByKey.delete(selectionKey(date, 'INBOUND'));
        skipBtn.hidden = true;
        setMessage(t('cancelledChangesFor', { day: toDisplayDay(date) }), 'success');
      } else {
        editableDates.add(date);
        selectedTripsByKey.delete(selectionKey(date, 'OUTBOUND'));
        selectedTripsByKey.delete(selectionKey(date, 'INBOUND'));
        skipBtn.hidden = false;
        setMessage(t('changeModeEnabledFor', { day: toDisplayDay(date) }), 'success');
      }

      rerenderDayByDate(date);
      renderSelectedSummary();
      updateProceedState();
    });
  } else {
    changeBtn.hidden = true;
    skipBtn.hidden = false;
  }

  outbound.forEach((trip) => outboundList.appendChild(renderTrip(trip)));
  inbound.forEach((trip) => inboundList.appendChild(renderTrip(trip)));

  skipBtn.addEventListener('click', () => {
    if (hasSubmittedSelections() && !isEditableDate(dayData.date)) {
      setMessage(t('clickChangeToUpdateSkip'), 'error');
      return;
    }

    skippedDates.add(dayData.date);
    clearDaySelections(dayData.date);
    applyDaySkipState(dayNode, true);
    updateProceedState();
    setMessage(t('skippedDay', { day: toDisplayDay(dayData.date) }), 'success');
  });

  addTimesBtn.addEventListener('click', () => {
    if (hasSubmittedSelections() && !isEditableDate(dayData.date)) {
      setMessage(t('clickChangeToUpdateDay'), 'error');
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
    setMessage(t('submittedLockedWeek'), 'success');
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
    const daysPromise = fetchWeekTrips();
    const submittedPromise = currentStudentName ? loadSubmittedWeekBookings() : Promise.resolve();
    const [days] = await Promise.all([daysPromise, submittedPromise]);
    currentWeekDays = days;
    renderWeek(days);
    if (!hasSubmittedSelections()) {
      setMessage(t('chooseTimeslotsFirst'), 'success');
    }
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

function toggleTripSelection(trip) {
  if (hasSubmittedSelections() && !isEditableDate(trip.date)) {
    setMessage(t('bookingSubmittedClickChange'), 'error');
    return;
  }

  const date = trip.date;
  if (skippedDates.has(date)) {
    setMessage(t('dayIsSkippedChooseSlots', { day: toDisplayDay(date) }), 'error');
    return;
  }

  const key = selectionKey(date, trip.direction);
  const existing = selectedTripsByKey.get(key);

  if (existing && existing.id === trip.id) {
    selectedTripsByKey.delete(key);
    setMessage(t('removedTimeOnDay', { time: toDisplayTime(trip.time), day: toDisplayDay(trip.date) }), 'success');
  } else {
    selectedTripsByKey.set(key, {
      id: trip.id,
      date: trip.date,
      direction: trip.direction,
      time: trip.time,
      bus: trip.bus,
      location: trip.location
    });
    setMessage(t('selectedTimeOnDay', { time: toDisplayTime(trip.time), day: toDisplayDay(trip.date) }), 'success');
  }

  rerenderDayByDate(trip.date);
  renderSelectedSummary();
  updateProceedState();
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
      skipped.textContent = t('skipped');
      row.appendChild(skipped);
    } else {
      const outbound = document.createElement('div');
      outbound.className = `confirm-line ${line.outbound ? '' : 'empty'}`.trim();
      outbound.textContent = line.outbound || t('notSelectedToUniversity');
      row.appendChild(outbound);

      const inbound = document.createElement('div');
      inbound.className = `confirm-line ${line.inbound ? '' : 'empty'}`.trim();
      inbound.textContent = line.inbound || t('notSelectedBackResidence');
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
      return t('clickChangeToUpdate');
    }

    for (const date of editableDates) {
      if (skippedDates.has(date)) {
        continue;
      }

      const out = selectedTripsByKey.get(selectionKey(date, 'OUTBOUND'));
      const back = selectedTripsByKey.get(selectionKey(date, 'INBOUND'));
      if (!out && !back) {
        return t('chooseAtLeastOneOrSkipDay', { day: toDisplayDay(date) });
      }
    }

    return '';
  }

  const incompleteDays = activeWeekDates.filter((date) => !isDayCompleteOrSkipped(date));
  if (incompleteDays.length > 0) {
    const dayText = incompleteDays.map((date) => toDisplayDay(date)).join(', ');
    return t('chooseAtLeastOneOrSkipDays', { days: dayText });
  }

  if (selectedTripsByKey.size === 0) {
    return t('chooseAtLeastOneWeek');
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
    setConfirmMessage(t('submittingWeeklySelections'), 'success');

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
      throw new Error(payload.error || t('unableToSubmitSelectedTrips'));
    }

    selectedTripsByKey.clear();
    skippedDates.clear();
    editableDates.clear();
    weekTripsCache.clear();
    await loadSubmittedWeekBookings(true);
    closeConfirmModal();
    if (inChangeMode) {
      setMessage(t('changesSaved'), 'success');
    } else {
      setMessage(t('bookingConfirmedCount', { count: payload.bookedCount || 0 }), 'success');
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
  currentStudentContact = '';
  submittedTripsByKey.clear();
  selectedTripsByKey.clear();
  skippedDates.clear();
  editableDates.clear();
  closeSelectedModal();
  closeConfirmModal();
  clearWeek();
  currentWeekDays = [];
  activeWeekDates = [];
  submittedWeekLoaded = false;
  renderStudentInfo();
  studentNameInput.value = '';
  setGateMessage('');
  setMessage('');
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

if (languageToggle) {
  languageToggle.addEventListener('click', () => {
    activeLang = activeLang === 'en' ? 'zh' : 'en';
    localStorage.setItem(LANGUAGE_KEY, activeLang);
    applyLanguage();
  });
}

studentNameSubmit.addEventListener('click', async () => {
  const fullName = normalizeStudentGateName(studentNameInput.value);
  studentNameInput.value = fullName;
  if (!fullName) {
    setGateMessage(t('pleaseEnterFullName'));
    return;
  }

  try {
    const student = await verifyStudent(fullName);
    setStudentAccess(student);
    setGateMessage(t('verified'), 'success');
    await loadWeekTrips();
  } catch (error) {
    setGateMessage(error.message, 'error');
  }
});

studentNameInput.addEventListener('input', () => {
  const normalized = normalizeStudentGateName(studentNameInput.value);
  if (studentNameInput.value !== normalized) {
    studentNameInput.value = normalized;
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

studentLogoutBtn.addEventListener('click', () => {
  void initStudentGate();
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
applyLanguage();
updateProceedState();
void initStudentGate().then(async () => {
  if (studentGate.classList.contains('hidden')) {
    await loadWeekTrips();
  }
});