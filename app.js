const els = {
  statement: document.getElementById('statement'),
  correctedStatement: document.getElementById('correctedStatement'),
  result: document.getElementById('result'),
  accidentType: document.getElementById('accidentType'),
  vehicleARole: document.getElementById('vehicleARole'),
  vehicleBRole: document.getElementById('vehicleBRole'),
  location: document.getElementById('location'),
  impactPoint: document.getElementById('impactPoint'),
  manualReview: document.getElementById('manualReview'),
  caption: document.getElementById('diagramCaption'),
  frontCar: document.getElementById('frontCar'),
  rearCar: document.getElementById('rearCar'),
  testResults: document.getElementById('testResults')
};

const TEST_CASES = [
  ['A front / B rear', 'I slowed down for traffic and the vehicle behind contacted the rear of my vehicle.'],
  ['A front / B rear', 'While moving along PIE, I felt an impact at the back after the car in front slowed.'],
  ['A rear / B front', 'The front vehicle stopped suddenly and I could not avoid contact with its rear.'],
  ['A front / B rear', 'I was stationary at the traffic light when another car hit the back of my car.'],
  ['A front / B rear', 'My vehicle was knocked from behind but there were only two cars involved.'],
  ['A rear / B front', 'The car ahead braked and my front bumper touched its rear bumper.'],
  ['A front / B rear', 'I was travelling along CTE when I was hit from the rear by the following vehicle.'],
  ['A front / B rear', 'Traffic slowed and there was a bump to the back of my vehicle.'],
  ['A front / B rear', 'The vehicle behind me failed to stop in time and collided with my rear.'],
  ['A rear / B front', 'I accidentally knocked into the rear of the car in front when traffic came to a stop.']
];

function normalize(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function includesAny(text, terms) {
  return terms.some(term => text.includes(term));
}

function extractLocation(raw) {
  const cleaned = String(raw || '').replace(/\b(?:on|at)\s+\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/gi, '');
  const patterns = [/\balong\s+([^,.]+)/i, /\bat\s+([^,.]+)/i, /\bon\s+([^,.]+)/i];
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (!match) continue;
    const candidate = match[1].trim().replace(/\s+(when|while|and|after|before|where).*$/i, '').trim();
    if (candidate && !/^\d/.test(candidate)) return candidate;
  }
  return '';
}

function shouldManualReview(raw) {
  const text = normalize(raw);
  const explicitChain = includesAny(text, ['chain collision', 'multiple vehicles', 'multi vehicle', 'three vehicles']);
  const pushedIntoFront = /pushed .* into .* (front|ahead|vehicle in front|car in front)/.test(text);
  const thirdParty = /(third|3rd|vehicle c|car c|lorry c|van c)/.test(text);
  return explicitChain || pushedIntoFront || thirdParty;
}

function analyzeStatement(raw) {
  const original = String(raw || '').trim();
  const text = normalize(original);
  const reason = [];

  if (!text) return buildResult('Unclear / Manual Review', 'Unknown', 'Unknown', '', true, 'Empty statement.');
  if (shouldManualReview(original)) return buildResult('Unclear / Manual Review', 'Unknown', 'Unknown', extractLocation(original), true, 'Possible chain or multi-vehicle wording detected.');

  const rearKeywords = includesAny(text, ['rear', 'back', 'behind', 'bumper', 'from behind']);
  const impactKeywords = includesAny(text, ['hit', 'contacted', 'contact', 'collided', 'collision', 'knocked', 'bumped', 'impact', 'touched', 'failed to stop', 'bump']);
  const iHitFront = /(i|we) .*?(hit|contacted|collided|knocked|bumped|touched) .*?(rear|back|rear bumper|vehicle in front|car in front|front vehicle|its rear)/.test(text) || /could not avoid contact with its rear/.test(text) || /my front bumper touched its rear/.test(text);
  const gotHitBehind = /(vehicle|car) behind( me)?/.test(text) || /following vehicle/.test(text) || /from behind/.test(text) || /(rear|back) of (my|our) (vehicle|car)/.test(text) || /(my|our) (rear|back)/.test(text) || /felt an impact at the back/.test(text) || /bump to the back of my vehicle/.test(text) || /hit from the rear/.test(text) || /collided with my rear/.test(text);
  const rearEnd = (rearKeywords && impactKeywords) || iHitFront || gotHitBehind;

  if (!rearEnd) return buildResult('Unclear / Manual Review', 'Unknown', 'Unknown', extractLocation(original), true, 'No reliable rear-end pattern detected.');
  reason.push('Rear-end pattern detected.');

  if (iHitFront) {
    reason.push('Vehicle A appears to be the rear vehicle that contacted the vehicle in front.');
    return buildResult('Rear-End', 'Rear Vehicle', 'Front Vehicle', extractLocation(original), false, reason);
  }
  if (gotHitBehind) {
    reason.push('Vehicle A appears to be the front vehicle that was hit from behind.');
    return buildResult('Rear-End', 'Front Vehicle', 'Rear Vehicle', extractLocation(original), false, reason);
  }
  reason.push('Ambiguous two-party rear-end; defaulting A as front vehicle.');
  return buildResult('Rear-End', 'Front Vehicle', 'Rear Vehicle', extractLocation(original), false, reason);
}

function buildResult(accidentType, vehicleARole, vehicleBRole, location, manualReview, reason) {
  return {
    accidentType,
    vehicleARole,
    vehicleBRole,
    location,
    impactPoint: accidentType === 'Rear-End' && vehicleARole === 'Front Vehicle' ? 'Rear of Vehicle A' : accidentType === 'Rear-End' && vehicleARole === 'Rear Vehicle' ? 'Front of Vehicle A' : 'Unknown',
    manualReview,
    reason: Array.isArray(reason) ? reason : [reason]
  };
}

function updateFields(analysis) {
  els.accidentType.value = analysis.accidentType;
  els.vehicleARole.value = analysis.vehicleARole;
  els.vehicleBRole.value = analysis.vehicleBRole;
  els.location.value = analysis.location;
  els.impactPoint.value = analysis.impactPoint;
  els.manualReview.value = analysis.manualReview ? 'Yes' : 'No';
  updateDiagram();
  els.result.textContent = JSON.stringify(analysis, null, 2);
  makeCorrectionNote(false);
}

function updateDiagram() {
  const aRole = els.vehicleARole.value;
  const bRole = els.vehicleBRole.value;
  els.frontCar.textContent = aRole === 'Front Vehicle' ? 'A' : bRole === 'Front Vehicle' ? 'B' : '?';
  els.rearCar.textContent = aRole === 'Rear Vehicle' ? 'A' : bRole === 'Rear Vehicle' ? 'B' : '?';
  els.caption.textContent = `${els.accidentType.value}: ${els.frontCar.textContent} is front vehicle, ${els.rearCar.textContent} is rear vehicle. Manual review: ${els.manualReview.value}.`;
}

function currentAnalysisFromFields() {
  return buildResult(els.accidentType.value, els.vehicleARole.value, els.vehicleBRole.value, els.location.value.trim(), els.manualReview.value === 'Yes', ['Manual field values.']);
}

function makeCorrectionNote(forceApply) {
  const text = els.statement.value.trim();
  if (!text) return;
  const analysis = currentAnalysisFromFields();
  const notes = [];
  if (analysis.accidentType !== 'Unclear / Manual Review') notes.push(`classified as ${analysis.accidentType}`);
  if (analysis.vehicleARole !== 'Unknown') notes.push(`Vehicle A as ${analysis.vehicleARole.toLowerCase()}`);
  if (analysis.vehicleBRole !== 'Unknown') notes.push(`Vehicle B as ${analysis.vehicleBRole.toLowerCase()}`);
  if (analysis.location) notes.push(`location: ${analysis.location}`);
  if (analysis.manualReview) notes.push('manual review required');
  const correction = notes.length ? `\n\nCorrection note: Based on manual/extracted details, this report is ${notes.join(', ')}.` : '';
  els.correctedStatement.value = forceApply ? `${text.replace(/\n\nCorrection note:.*$/s, '')}${correction}` : text;
}

function runTests() {
  const rows = TEST_CASES.map(([expected, statement]) => ({ expected, statement, ...analyzeStatement(statement) }));
  els.testResults.innerHTML = rows.map(row => `<div class="test-row"><strong>${row.expected}</strong><span>${row.accidentType} | A: ${row.vehicleARole} | B: ${row.vehicleBRole}</span><p>${row.statement}</p></div>`).join('');
  console.table(rows);
  return rows;
}

document.getElementById('analyzeBtn').addEventListener('click', () => {
  const text = els.statement.value.trim();
  if (!text) return els.result.textContent = 'Please paste a statement first.';
  updateFields(analyzeStatement(text));
});

document.getElementById('clearBtn').addEventListener('click', () => {
  els.statement.value = '';
  els.correctedStatement.value = '';
  els.result.textContent = 'No analysis yet.';
  els.testResults.textContent = 'No tests run yet.';
});

document.getElementById('applyEditsBtn').addEventListener('click', () => {
  makeCorrectionNote(true);
  els.result.textContent = JSON.stringify(currentAnalysisFromFields(), null, 2);
});

document.getElementById('swapRolesBtn').addEventListener('click', () => {
  const a = els.vehicleARole.value;
  els.vehicleARole.value = els.vehicleBRole.value;
  els.vehicleBRole.value = a;
  updateDiagram();
});

document.getElementById('markManualBtn').addEventListener('click', () => {
  els.manualReview.value = 'Yes';
  els.accidentType.value = 'Unclear / Manual Review';
  updateDiagram();
});

document.getElementById('loadSampleBtn').addEventListener('click', () => {
  els.statement.value = TEST_CASES[0][1];
  updateFields(analyzeStatement(els.statement.value));
});

document.getElementById('runTestsBtn').addEventListener('click', runTests);

[els.accidentType, els.vehicleARole, els.vehicleBRole, els.impactPoint, els.manualReview, els.location].forEach(el => el.addEventListener('change', updateDiagram));

window.AccidentApp = { analyzeStatement, runTests };
