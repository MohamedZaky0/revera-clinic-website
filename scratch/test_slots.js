function getDurationInMinutes(duration) {
  if (!duration) return 30; // default to 30 mins
  const cleaned = duration.toLowerCase().trim();
  
  // Format: "1:30 Hours" or "0:30 Hours" or "1:00 Hours"
  const matchHours = cleaned.match(/(\d+):(\d+)\s*hour/);
  if (matchHours) {
    const hrs = parseInt(matchHours[1], 10);
    const mins = parseInt(matchHours[2], 10);
    return hrs * 60 + mins;
  }
  
  // Format: "30 mins" or "15 mins"
  const matchMins = cleaned.match(/(\d+)\s*min/);
  if (matchMins) {
    return parseInt(matchMins[1], 10);
  }

  // Format: "1 hour"
  const matchOneHour = cleaned.match(/(\d+)\s*hour/);
  if (matchOneHour) {
    return parseInt(matchOneHour[1], 10) * 60;
  }
  
  // Format: "1:30"
  const matchHHMM = cleaned.match(/^(\d+):(\d+)$/);
  if (matchHHMM) {
    const hrs = parseInt(matchHHMM[1], 10);
    const mins = parseInt(matchHHMM[2], 10);
    return hrs * 60 + mins;
  }

  return 30; // default fallback
}

const ALL_15MIN_SLOTS = (() => {
  const slots = [];
  for (let h = 9; h <= 21; h++) {
    for (const m of [0, 15, 30, 45]) {
      if (h === 21 && m > 0) break;
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
})();

// Thursday closing time is 21:00
const end = "21:00";

// Simulation for a 1-hour service booking
const targetDuration = getDurationInMinutes("1 Hour");
const targetSlotsNeeded = Math.ceil(targetDuration / 15);

console.log(`targetDuration: ${targetDuration} mins, slotsNeeded: ${targetSlotsNeeded}`);

const occupied = new Array(ALL_15MIN_SLOTS.length).fill(false);

const unavailable = [];
const available = [];

for (let i = 0; i < ALL_15MIN_SLOTS.length; i++) {
  let fit = true;
  for (let k = 0; k < targetSlotsNeeded; k++) {
    const slotIdx = i + k;
    if (slotIdx >= occupied.length || occupied[slotIdx]) {
      fit = false;
      break;
    }
    // Check if slot falls on/after the closing hour
    if (ALL_15MIN_SLOTS[slotIdx] >= end) {
      fit = false;
      break;
    }
  }
  if (!fit) {
    unavailable.push(ALL_15MIN_SLOTS[i]);
  } else {
    available.push(ALL_15MIN_SLOTS[i]);
  }
}

console.log("All slots generated:", ALL_15MIN_SLOTS);
console.log("Available start slots:", available);
console.log("Unavailable start slots:", unavailable);

const formattedAvailable = available.map(slot => {
  const [hStr, mStr] = slot.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${ampm}`;
});

console.log("\nFormatted Available Slots (12h format):", formattedAvailable);
