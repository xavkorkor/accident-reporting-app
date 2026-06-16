const statementEl = document.getElementById('statement');
const resultEl = document.getElementById('result');
const accidentTypeEl = document.getElementById('accidentType');
const vehicleARoleEl = document.getElementById('vehicleARole');
const vehicleBRoleEl = document.getElementById('vehicleBRole');
const locationEl = document.getElementById('location');
const captionEl = document.getElementById('diagramCaption');
const frontCarEl = document.getElementById('frontCar');
const rearCarEl = document.getElementById('rearCar');

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

function normalize(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function hasAny(text, words) {
  return words.some(word => text.includes(word));
}

function shouldManualReview(raw) {
  const text = normalize(raw);
  const explicitChain = hasAny(text, ['chain collision', 'multiple vehicles', 'multi vehicle']);
  const pushedIntoFront = /pushed .* into .* (front|ahead|vehicle in front|car in front)/.test(text);
  const threeParty = /(third|3rd|three vehicles|vehicle c|car c)/.test(text);
  return explicitChain || pushedIntoFront || threeParty;
}

function extractLocation(raw) {
  const text = String(raw || '').replace(/\b(?:on|at)\s+\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/gi, '');
  const patterns = [
    /\balong\s+([^,.]+)/i,
    /\bat\s+([^,.]+)/i,
    /\bon\s+([^,.]+)/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const candidate = match[1].trim().replace(/\s+(when|while|and|after|before).*$/i, '').trim();
    if (candidate && !/^\d/.test(candidate)) return candidate;
  }
  return '';
}

function analyzeStatement(raw) {
  const original = String(raw || '').trim();
  const text = normalize(original);
  const reason = [];

  if (!text) {
    return { accidentType: 'Unclear / Manual Review', vehicleARole: 'Unknown', vehicleBRole: 'Unknown', location: '', manualReview: true, reason: ['Empty statement.'] };
  }

  if (shouldManualReview(original)) {
    return { accidentType: 'Unclear / Manual Review', vehicleARole: 'Unknown', vehicleBRole: 'Unknown', location: extractLocation(original), manualReview: true, reason: ['Possible chain or multi-vehicle wording detected.'] };
  }

  const rearWords = hasAny(text, ['rear', 'back', 'behind', 'bumper', 'from behind']);
  const impactWords = hasAny(text, ['hit', 'contacted', 'contact', 'collided', 'collision', 'knocked', 'bumped', 'impact', 'touched', 'failed to stop']);
  const frontVehicleWords = hasAny(text, ['front vehicle', 'vehicle in front', 'car in front', 'car ahead', 'vehicle ahead', 'its rear', 'rear bumper']);
  const myRearWords = /(rear|back) of (my|our) (vehicle|car)/.test(text) || /(my|our) (rear|back)/.test(text) || /collided with my rear/.test(text);
  const behindVehicleWords = /(vehicle|car) behind( me)?/.test(text) || /following vehicle/.test(text) || /from behind/.test(text);
  const iHitFront = /(i|we) .*?(hit|contacted|collided|knocked|bumped|touched) .*?(rear|back|rear bumper|vehicle in front|car in front|front vehicle|its rear)/.test(text) || /could not avoid contact with its rear/.test(text) || /my front bumper touched its rear/.test(text);
  const gotHitBehind = behindVehicleWords || myRearWords || /felt an impact at the back/.test(text) || /bump to the back of my vehicle/.test(text) || /hit from the rear/.test(text);
  const rearEnd = (rearWords && impactWords) || iHitFront || gotHitBehind || (frontVehicleWords && impactWords);

  if (!rearEnd) {
    return { accidentType: 'Unclear / Manual Review', vehicleARole: 'Unknown', vehicleBRole: 'Unknown', location: extractLocation(original), manualReview: true, reason: ['No reliable rear-end pattern detected.'] };
  }

  reason.push('Rear-end pattern detected.');

  if (iHitFront) {
    reason.push('Reporting vehicle appears to be the rear vehicle that contacted the vehicle in front.');
    return { accidentType: 'Rear-End', vehicleARole: 'Rear Vehicle', vehicleBRole: 'Front Vehicle', location: extractLocation(original), manualReview: false, reason };
  }

  if (gotHitBehind) {
    reason.push('Reporting vehicle appears to be the front vehicle that was hit from behind.');
    return { accidentType: 'Rear-End', vehicleARole: 'Front Vehicle', vehicleBRole: 'Rear Vehicle', location: extractLocation(original), manualReview: false, reason };
  }

  reason.push('Rear-end detected but role is ambiguous; defaulting to reporting vehicle as front vehicle for two-party rear-end wording.');
  return { accidentType: 'Rear-End', vehicleARole: 'Front Vehicle', vehicleBRole: 'Rear Vehicle', location: extractLocation(original), manualReview: false, reason };
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

  if (additions.length) text = `${text.replace(/\s+$/g, '')}\n\nCorrection note: ${additions.join(' ')}`;
  statementEl.value = text;
}

function runTests() {
  const rows = TEST_CASES.map(statement => ({ statement, ...analyzeStatement(statement) }));
  console.table(rows);
  return rows;
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
