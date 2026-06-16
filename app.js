const statementEl = document.getElementById('statement');
const resultEl = document.getElementById('result');
const accidentTypeEl = document.getElementById('accidentType');
const vehicleARoleEl = document.getElementById('vehicleARole');
const vehicleBRoleEl = document.getElementById('vehicleBRole');
const locationEl = document.getElementById('location');
const captionEl = document.getElementById('diagramCaption');
const frontCarEl = document.getElementById('frontCar');
const rearCarEl = document.getElementById('rearCar');

const REAR_END_PATTERNS = [
  /hit\s+(the\s+)?rear\s+of\s+(my|our)\s+(car|vehicle)/i,
  /knocked\s+(into|onto)\s+(the\s+)?back\s+of\s+(my|our)\s+(car|vehicle)/i,
  /(vehicle|car)\s+behind\s+(me\s+)?(hit|collided|knocked|bumped)/i,
  /(i|we)\s+(hit|collided|knocked|bumped)\s+(into\s+)?(the\s+)?rear\s+of/i,
  /(front\s+vehicle|vehicle\s+in\s+front).*(braked|stopped|slowed)/i
];

const CHAIN_HINTS = [
  /chain\s+collision/i,
  /multiple\s+vehicles/i,
  /pushed\s+(me|my|our)\s+(car|vehicle)\s+(into|onto)/i,
  /hit\s+from\s+behind.*hit\s+(the\s+)?(front|vehicle\s+in\s+front)/i,
  /vehicle\s+(behind|at\s+the\s+back).*pushed.*vehicle\s+(in\s+front|ahead)/i
];

const LOCATION_PATTERNS = [
  /\balong\s+([^,.]+(?:road|rd|street|st|avenue|ave|expressway|way|lane|ln|drive|dr|pie|cte|sle|tpe|aye|kpe|bke|eCP)?)/i,
  /\bat\s+([^,.]+(?:junction|exit|entrance|carpark|car\s+park|traffic\s+light|road|rd|street|st|avenue|ave))/i,
  /\bon\s+([^,.]+(?:road|rd|street|st|avenue|ave|expressway|way|lane|ln|drive|dr|pie|cte|sle|tpe|aye|kpe|bke|ecp))/i
];

const TEST_CASES = [
  'I slowed down for traffic and the vehicle behind contacted the rear of my vehicle.',
  'While moving along PIE, I felt an impact at the back after the car in front slowed.',
  'The front vehicle stopped suddenly and I could not avoid contact with its rear.',
  'I was stationary at the traffic light when another car hit the back of my car.',
  'My vehicle was knocked from behind but there were only two cars involved.',
  'The car ahead braked and my front bumper touched its rear bumper.',
  'I was travelling along CTE when I was hit from the rear by the following vehicle.',
  'Traffic slowed and there was a bump to the back of my vehicle.',
  'The vehicle behind me failed to stop in time and collided with my rear.',
  'I accidentally knocked into the rear of the car in front when traffic came to a stop.'
];

function hasMatch(text, patterns) {
  return patterns.some(pattern => pattern.test(text));
}

function countVehicleReferences(text) {
  const refs = text.match(/\b(vehicle|car|lorry|van|taxi|bus|motorcycle|bike)\b/gi) || [];
  const ordinals = text.match(/\b(first|second|third|fourth|front|middle|rear|behind|ahead)\b/gi) || [];
  return refs.length + ordinals.length;
}

function shouldManualReview(text) {
  const chain = hasMatch(text, CHAIN_HINTS);
  const vehicleRefs = countVehicleReferences(text);
  // Boundary requested: do not treat a simple 2-party rear-end as chain collision.
  return chain && vehicleRefs > 6;
}

function extractLocation(text) {
  const cleaned = text.replace(/\b(?:on|at)\s+\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/gi, '');
  for (const pattern of LOCATION_PATTERNS) {
    const match = cleaned.match(pattern);
    if (match && match[1]) return match[1].trim();
  }
  return '';
}

function analyzeStatement(text) {
  const lower = text.toLowerCase();
  const rearEnd = hasMatch(text, REAR_END_PATTERNS);
  const manualReview = shouldManualReview(text);
  let accidentType = rearEnd ? 'Rear-End' : 'Unclear / Manual Review';
  let vehicleARole = 'Unknown';
  let vehicleBRole = 'Unknown';
  let reason = [];

  if (manualReview) {
    accidentType = 'Unclear / Manual Review';
    reason.push('Potential chain-collision wording with more than two-party indicators.');
  } else if (rearEnd) {
    reason.push('Rear-end wording detected.');
    if (/\b(i|we|my|our)\b.*\b(hit|collided|knocked|bumped)\b.*\brear\b/i.test(text) || /could not avoid contact with its rear/i.test(text)) {
      vehicleARole = 'Rear Vehicle';
      vehicleBRole = 'Front Vehicle';
      reason.push('Statement suggests reporting vehicle hit the rear of the vehicle in front.');
    } else if (/(hit|impact|knocked|bumped|collided).*(back|rear)\s+of\s+(my|our)/i.test(text) || /vehicle\s+behind\s+(me\s+)?(hit|collided|knocked|bumped|failed)/i.test(text)) {
      vehicleARole = 'Front Vehicle';
      vehicleBRole = 'Rear Vehicle';
      reason.push('Statement suggests reporting vehicle was hit from behind.');
    } else if (lower.includes('behind') && lower.includes('rear')) {
      vehicleARole = 'Front Vehicle';
      vehicleBRole = 'Rear Vehicle';
      reason.push('Ambiguous rear-end wording, defaulting to reporting vehicle as front vehicle.');
    }
  } else {
    reason.push('No strong rear-end pattern detected.');
  }

  return {
    accidentType,
    vehicleARole,
    vehicleBRole,
    location: extractLocation(text),
    manualReview,
    reason
  };
}

function updateFields(analysis) {
  accidentTypeEl.value = analysis.accidentType;
  vehicleARoleEl.value = analysis.vehicleARole;
  vehicleBRoleEl.value = analysis.vehicleBRole;
  locationEl.value = analysis.location;
  updateDiagram();
  resultEl.textContent = JSON.stringify(analysis, null, 2);
}

function updateDiagram() {
  const aRole = vehicleARoleEl.value;
  const bRole = vehicleBRoleEl.value;
  frontCarEl.textContent = aRole === 'Front Vehicle' ? 'A' : bRole === 'Front Vehicle' ? 'B' : '?';
  rearCarEl.textContent = aRole === 'Rear Vehicle' ? 'A' : bRole === 'Rear Vehicle' ? 'B' : '?';
  captionEl.textContent = `${accidentTypeEl.value}: ${frontCarEl.textContent} shown as front vehicle, ${rearCarEl.textContent} shown as rear vehicle.`;
}

function lightlyRewriteStatement() {
  let text = statementEl.value.trim();
  if (!text) return;
  const type = accidentTypeEl.value;
  const aRole = vehicleARoleEl.value;
  const loc = locationEl.value.trim();
  const additions = [];

  if (type === 'Rear-End') additions.push('The accident is classified as a rear-end collision.');
  if (aRole !== 'Unknown') additions.push(`Vehicle A is recorded as the ${aRole.toLowerCase()}.`);
  if (loc && !text.toLowerCase().includes(loc.toLowerCase())) additions.push(`Location noted: ${loc}.`);

  if (additions.length) {
    text = `${text.replace(/\s+$/g, '')}\n\nCorrection note: ${additions.join(' ')}`;
  }
  statementEl.value = text;
}

function runTests() {
  return TEST_CASES.map(statement => ({ statement, ...analyzeStatement(statement) }));
}

document.getElementById('analyzeBtn').addEventListener('click', () => {
  const text = statementEl.value.trim();
  if (!text) {
    resultEl.textContent = 'Please paste a statement first.';
    return;
  }
  updateFields(analyzeStatement(text));
});

document.getElementById('clearBtn').addEventListener('click', () => {
  statementEl.value = '';
  resultEl.textContent = 'No analysis yet.';
});

document.getElementById('applyEditsBtn').addEventListener('click', () => {
  lightlyRewriteStatement();
  resultEl.textContent = 'Manual correction note applied with minimal statement change.';
});

[accidentTypeEl, vehicleARoleEl, vehicleBRoleEl].forEach(el => el.addEventListener('change', updateDiagram));

window.AccidentApp = { analyzeStatement, runTests };
