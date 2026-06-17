const byId = id => document.getElementById(id);

const SAMPLE = 'On 30/05/2025 at about 0800hrs, I was driving SLL6659E along Mandai Road towards Woodlands. When I was in the right lane, I slowed down due to the traffic ahead. Suddenly, FBV321J riding a motorcycle hit the rear of my car.';

const accidentTypes = [
  'Rear-End Collision',
  'Chain Collision',
  'Lane Change',
  'Side Swipe',
  'Parked Vehicle',
  'Junction Collision',
  'Manual Review'
];

const fieldList = [
  ['date', 'Date:', 'input'],
  ['time', 'Time:', 'input'],
  ['road', 'Location / Road:', 'input'],
  ['road_lane_count', 'Road Lanes:', 'input'],
  ['lane_position', 'My Lane:', 'input'],
  ['road_feature', 'Road Feature:', 'input'],
  ['accident_type_display', 'Accident Type:', 'select'],
  ['vehicle_count', 'No. Vehicles:', 'input'],
  ['front_vehicle', 'Front Vehicle:', 'input'],
  ['rear_vehicle', 'Rear Vehicle:', 'input'],
  ['vehicle1_plate', 'A Plate:', 'input'],
  ['vehicle1_model', 'A Type:', 'input'],
  ['vehicle2_plate', 'B Plate:', 'input'],
  ['vehicle2_type', 'B Type:', 'input'],
  ['vehicle3_plate', 'C Plate:', 'input'],
  ['vehicle3_type', 'C Type:', 'input']
];

const fields = {};
let lastGeneratedData = {};

function initFields() {
  const box = byId('details');
  box.innerHTML = '';
  fieldList.forEach(([key, label, type]) => {
    const row = document.createElement('div');
    row.className = 'detail-row';
    const lab = document.createElement('label');
    lab.textContent = label;
    const input = type === 'select' ? document.createElement('select') : document.createElement('input');
    input.id = 'f_' + key;
    if (type === 'select') {
      accidentTypes.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        input.appendChild(option);
      });
    }
    input.addEventListener('input', renderAll);
    input.addEventListener('change', renderAll);
    row.append(lab, input);
    box.appendChild(row);
    fields[key] = input;
  });
}

function text() {
  return byId('statement').value || '';
}

function getData() {
  const d = {};
  Object.keys(fields).forEach(k => d[k] = fields[k].value || '');
  return d;
}

function setData(d) {
  lastGeneratedData = { ...d };
  Object.keys(fields).forEach(k => fields[k].value = d[k] || '');
  renderAll();
}

function analyze(s) {
  return window.V7Logic ? window.V7Logic.analyze(s) : {};
}

function renderAll() {
  renderDiagram(getData());
  renderStatement(getData());
}

function renderStatement(d) {
  byId('statementLayer').innerHTML =
    '<p>' + esc(text() || 'No statement entered.') + '</p>' +
    '<div class="stmt-meta">' +
    '<b>Date:</b> ' + esc(d.date || '-') + '<br>' +
    '<b>Time:</b> ' + esc(d.time || '-') + '<br>' +
    '<b>Location:</b> ' + esc(d.road || '-') + '<br>' +
    '<b>Lane:</b> ' + esc(d.lane_position || '-') + ' of ' + esc(d.road_lane_count || '') + ' lanes<br>' +
    '<b>Accident Type:</b> ' + esc(d.accident_type_display || '-') +
    '</div>';
}

function laneCount(d) {
  const n = parseInt(d.road_lane_count, 10);
  return n >= 2 && n <= 5 ? n : 3;
}

function laneIndex(d, n) {
  const p = String(d.lane_position || '').toLowerCase();
  if (p.includes('left')) return 0;
  if (p.includes('right')) return n - 1;
  if (p.includes('middle') || p.includes('centre') || p.includes('center')) return Math.floor(n / 2);
  return Math.floor(n / 2);
}

function laneX(d) {
  const n = laneCount(d), left = 170, width = 420;
  return left + (laneIndex(d, n) + 0.5) * (width / n) - 50;
}

function plateFor(label, d) {
  if (label === 'A') return d.vehicle1_plate || '';
  if (label === 'B') return d.vehicle2_plate || '';
  if (label === 'C') return d.vehicle3_plate || '';
  return '';
}

function renderDiagram(d) {
  const c = byId('diagramCanvas'), ctx = c.getContext('2d');
  const n = laneCount(d), roadLeft = 170, roadTop = 60, roadW = 420, roadH = 640, laneW = roadW / n;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#e5e5e5';
  ctx.fillRect(roadLeft, roadTop, roadW, roadH);
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 2;
  ctx.strokeRect(roadLeft, roadTop, roadW, roadH);
  ctx.strokeStyle = '#777';
  ctx.lineWidth = 3;
  for (let i = 1; i < n; i++) {
    const x = roadLeft + i * laneW;
    ctx.setLineDash([24, 24]);
    ctx.beginPath();
    ctx.moveTo(x, roadTop + 10);
    ctx.lineTo(x, roadTop + roadH - 10);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.fillStyle = '#111';
  ctx.font = 'bold 24px Arial';
  ctx.fillText('Traffic Flow ↑', 35, 45);
  ctx.font = '16px Arial';
  ctx.fillText(n + ' lanes - ' + (d.lane_position || 'centre') + ' lane', 35, 72);
  if (d.road_feature) ctx.fillText(String(d.road_feature).replace('_', ' '), 35, 96);
  const x = laneX(d);
  const front = d.front_vehicle || 'A';
  const rear = d.rear_vehicle || 'B';
  drawVehicle(ctx, front, vehicleTypeForLabel(front, d), plateFor(front, d), x, 145, 'FRONT');
  drawVehicle(ctx, rear, vehicleTypeForLabel(rear, d), plateFor(rear, d), x, 430, 'REAR');
  ctx.fillStyle = '#d93025';
  ctx.font = 'bold 74px Arial';
  ctx.fillText('X', x + 32, 392);
}

function vehicleTypeForLabel(label, d) {
  if (label === 'A') return d.vehicle1_model || 'Car';
  if (label === 'B') return d.vehicle2_type || 'Car';
  if (label === 'C') return d.vehicle3_type || 'Car';
  return 'Unknown';
}

function drawVehicle(ctx, label, type, plate, x, y, role) {
  const t = String(type || '').toLowerCase();
  if (t.includes('motor')) drawMotorcycle(ctx, label, x + 18, y, role);
  else if (t.includes('bus')) drawBus(ctx, label, x - 8, y, role);
  else if (t.includes('lorry') || t.includes('truck') || t.includes('trailer') || t.includes('prime')) drawTruck(ctx, label, x - 8, y, role);
  else if (t.includes('van')) drawVan(ctx, label, x, y, role);
  else drawCar(ctx, label, x, y, role, t.includes('taxi') ? 'TAXI' : '');
  drawPlate(ctx, label, type, plate, x - 18, y + 178);
}

function drawPlate(ctx, label, type, plate, x, y) {
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, 140, 46);
  ctx.fillStyle = '#111';
  ctx.font = 'bold 16px Arial';
  ctx.fillText(label + ' - ' + (plate || 'NO PLATE'), x + 8, y + 19);
  ctx.font = '12px Arial';
  ctx.fillText(String(type || 'Vehicle'), x + 8, y + 36);
}

function drawCar(ctx, label, x, y, role, tag) {
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 3;
  roundRect(ctx, x, y, 100, 150, 16); ctx.fill(); ctx.stroke();
  ctx.strokeRect(x + 18, y + 18, 64, 24); ctx.strokeRect(x + 18, y + 108, 64, 24);
  ctx.fillStyle = '#111'; ctx.font = 'bold 34px Arial'; ctx.fillText(label, x + 38, y + 82);
  ctx.font = '13px Arial'; ctx.fillText(tag || role, x + 22, y + 104);
}

function drawMotorcycle(ctx, label, x, y, role) {
  ctx.strokeStyle = '#111'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.ellipse(x + 32, y + 20, 20, 20, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x + 32, y + 130, 20, 20, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x + 32, y + 42); ctx.lineTo(x + 32, y + 108); ctx.stroke();
  ctx.fillStyle = '#111'; ctx.font = 'bold 28px Arial'; ctx.fillText(label, x + 20, y + 88);
  ctx.font = '12px Arial'; ctx.fillText('BIKE', x + 13, y + 165);
}

function drawTruck(ctx, label, x, y, role) {
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 3;
  ctx.strokeRect(x, y, 116, 150); ctx.strokeRect(x + 18, y + 12, 80, 42); ctx.strokeRect(x + 18, y + 60, 80, 78);
  ctx.fillStyle = '#111'; ctx.font = 'bold 32px Arial'; ctx.fillText(label, x + 45, y + 104);
  ctx.font = '12px Arial'; ctx.fillText('TRUCK', x + 36, y + 170);
}

function drawBus(ctx, label, x, y, role) {
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 3;
  ctx.strokeRect(x, y, 116, 165);
  for (let i = 0; i < 5; i++) ctx.strokeRect(x + 12, y + 15 + i * 25, 22, 14);
  for (let i = 0; i < 5; i++) ctx.strokeRect(x + 82, y + 15 + i * 25, 22, 14);
  ctx.fillStyle = '#111'; ctx.font = 'bold 32px Arial'; ctx.fillText(label, x + 45, y + 92);
  ctx.font = '12px Arial'; ctx.fillText('BUS', x + 45, y + 184);
}

function drawVan(ctx, label, x, y, role) {
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 3;
  ctx.strokeRect(x, y, 100, 155); ctx.strokeRect(x + 15, y + 18, 70, 36); ctx.strokeRect(x + 15, y + 68, 70, 62);
  ctx.fillStyle = '#111'; ctx.font = 'bold 32px Arial'; ctx.fillText(label, x + 38, y + 100);
  ctx.font = '12px Arial'; ctx.fillText('VAN', x + 38, y + 174);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
}

function esc(s) {
  return String(s).replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
}

function replaceFirst(source, regex, replacement) {
  return source.match(regex) ? source.replace(regex, replacement) : source;
}

function applyEditedDetailsToStatement(d) {
  let s = text();
  const old = lastGeneratedData || {};
  if (d.date && d.date !== old.date) s = replaceFirst(s, /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/, d.date);
  if (d.time && d.time !== old.time) s = replaceFirst(s, /(?:about\s*)?\d{3,4}\s*hrs/i, 'about ' + d.time.replace(/\s*hrs$/i, '') + 'hrs');
  if (d.road && d.road !== old.road) {
    const roadPatterns = [
      /\balong\s+([^,.]+?)(?=\s+towards|\s+when|\s+while|\s+and|,|\.|$)/i,
      /\bat\s+([^,.]+?)(?=\s+when|\s+while|\s+and|,|\.|$)/i,
      /\bon\s+([^,.]+?)(?=\s+when|\s+while|\s+and|,|\.|$)/i
    ];
    for (const p of roadPatterns) {
      if (p.test(s)) { s = s.replace(p, match => match.split(/\s+/)[0] + ' ' + d.road); break; }
    }
  }
  if (d.lane_position && d.lane_position !== old.lane_position) {
    s = replaceFirst(s, /\b(left|right|middle|centre|center)\s+lane\b/i, d.lane_position + ' lane');
  }
  byId('statement').value = s;
  updateCounter();
  lastGeneratedData = { ...d };
}

function updateCounter() {
  byId('counter').textContent = text().length + ' / 20000';
}

function exportPdf() {
  const bundle = byId('exportBundle');
  bundle.innerHTML = '';
  ['page1', 'page2'].forEach(id => {
    const clone = byId(id).cloneNode(true);
    clone.classList.add('export-page');
    bundle.appendChild(clone);
  });
  html2pdf().set({
    margin: 6,
    filename: 'sketch-plan-and-statement.pdf',
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(bundle).save();
}

function runSmartTests() {
  const box = byId('smartTestResults');
  const rows = window.V7Logic ? window.V7Logic.runTests() : [];
  const pass = rows.filter(r => r.pass).length;
  box.innerHTML = '<div class="smart-summary">' + pass + ' / ' + rows.length + ' passed</div>' +
    rows.map(r => '<div class="smart-row ' + (r.pass ? 'pass' : 'fail') + '"><b>' +
      (r.pass ? 'PASS' : 'FAIL') + ' Test ' + r.index + '</b><span>Expected front ' + r.expectedFront +
      ' / rear ' + r.expectedRear + ' | Got front ' + r.actualFront + ' / rear ' + r.actualRear +
      '</span><p>' + esc(r.statement) + '</p></div>').join('');
}

byId('statement').value = SAMPLE;
initFields();
updateCounter();
setData(analyze(SAMPLE));
byId('statement').addEventListener('input', updateCounter);
byId('generateBtn').onclick = () => setData(analyze(text()));
byId('applyBtn').onclick = () => { applyEditedDetailsToStatement(getData()); renderAll(); };
byId('exportAllBtn').onclick = exportPdf;
byId('exportPage1Btn').onclick = () => { const a = document.createElement('a'); a.download = 'page1-sketch-diagram.png'; a.href = byId('diagramCanvas').toDataURL('image/png'); a.click(); };
byId('exportPage2Btn').onclick = () => html2pdf().set({ filename: 'page2-statement.pdf' }).from(byId('page2')).save();
byId('runSmartTestsBtn').onclick = runSmartTests;
