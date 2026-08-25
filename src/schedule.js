const BUS_A_CAPACITY = 14;
const BUS_B_CAPACITY = 7;

const LOCATION_CODES = ['AERA', 'HELIX'];

const AERA_SCHEDULE = {
  A: {
    outbound: ['07:15', '08:30', '09:30', '10:30', '11:30', '13:30', '15:30', '17:30'],
    inbound: ['10:00', '12:00', '14:00', '16:00', '18:00']
  },
  B: {
    outbound: ['07:20', '08:00', '09:00', '10:00', '11:00', '13:00', '15:00', '17:00'],
    inbound: ['09:30', '11:30', '13:30', '15:30', '17:30']
  }
};

const HELIX_SCHEDULE = {
  A: {
    outbound: ['07:20', '08:35', '09:35', '10:35', '11:35', '13:35', '15:35', '17:35'],
    inbound: ['10:00', '12:00', '14:00', '16:00', '18:00']
  },
  B: {
    outbound: ['07:25', '08:05', '09:05', '10:05', '11:05', '13:05', '15:05', '17:05'],
    inbound: ['09:30', '11:30', '13:30', '15:30', '17:30']
  }
};

const SCHEDULES = {
  AERA: AERA_SCHEDULE,
  HELIX: HELIX_SCHEDULE
};

function getSchedule(location) {
  return SCHEDULES[location] || SCHEDULES.AERA;
}

function getBusTimes(location, bus) {
  const schedule = getSchedule(location);
  const data = schedule[bus];
  if (!data) {
    return [];
  }

  return [...data.outbound, ...data.inbound];
}

function getTripDirection(location, bus, time) {
  const schedule = getSchedule(location);
  const data = schedule[bus];
  if (!data) {
    return 'OUTBOUND';
  }

  if (data.outbound.includes(time)) {
    return 'OUTBOUND';
  }

  if (data.inbound.includes(time)) {
    return 'INBOUND';
  }

  return 'OUTBOUND';
}

function getPairedOutboundTime(location, bus, time) {
  const thisSchedule = getSchedule(location)[bus];
  if (!thisSchedule) {
    return null;
  }

  const index = thisSchedule.outbound.indexOf(time);
  if (index < 0) {
    return null;
  }

  const pairedLocation = location === 'AERA' ? 'HELIX' : 'AERA';
  const pairedSchedule = getSchedule(pairedLocation)[bus];
  if (!pairedSchedule || index >= pairedSchedule.outbound.length) {
    return null;
  }

  return {
    pairedLocation,
    pairedTime: pairedSchedule.outbound[index]
  };
}

function getPairedTime(location, bus, time) {
  const direction = getTripDirection(location, bus, time);
  const thisSchedule = getSchedule(location)[bus];
  if (!thisSchedule) {
    return null;
  }

  const lane = direction === 'INBOUND' ? thisSchedule.inbound : thisSchedule.outbound;
  const index = lane.indexOf(time);
  if (index < 0) {
    return null;
  }

  const pairedLocation = location === 'AERA' ? 'HELIX' : 'AERA';
  const pairedSchedule = getSchedule(pairedLocation)[bus];
  if (!pairedSchedule) {
    return null;
  }

  const pairedLane = direction === 'INBOUND' ? pairedSchedule.inbound : pairedSchedule.outbound;
  if (index >= pairedLane.length) {
    return null;
  }

  return {
    pairedLocation,
    pairedTime: pairedLane[index],
    direction
  };
}

module.exports = {
  BUS_A_CAPACITY,
  BUS_B_CAPACITY,
  LOCATION_CODES,
  getBusTimes,
  getTripDirection,
  getPairedOutboundTime,
  getPairedTime
};