// PDF form renderer that preserves V7 behaviour while drawing inside the real GIA form.
(function () {
  const PDF_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  function byId(id) { return document.getElementById(id); }

  function lanePlan(d) {
    const p = String(d.lane_position || '').toLowerCase().trim();
    const explicit = parseInt(d.road_lane_count, 10);
    if (p.includes('middle') || p.includes('centre') || p.includes('center')) return { lanes: 3, laneIndex: 1, text: 'middle' };
    if (p.includes('left')) return { lanes: 2, laneIndex: 0, text: 'left' };
    if (p.includes('right')) return { lanes: 2, laneIndex: 1, text: 'right' };
    if (explicit >= 2 && explicit <= 5) return { lanes: explicit, laneIndex: Math.floor(explicit / 2), text: '' };
    return { lanes: 1, laneIndex: 0, text: '' };
  }

  function vehicleType(label, d) {
    if (label === 'A') return d.vehicle1_model || 'Car';
    if (label === 'B') return d.vehicle2_type || 'Car';
    if (label === 'C') return d.vehicle3_type || 'Car';
    return 'Car';
  }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  }

  function label(ctx, txt, x, y, size) { ctx.fillStyle = '#111'; ctx.font = 'bold ' + size + 'px Arial'; ctx.fillText(txt, x, y); }

  function drawSedan(ctx, lab, x, y, taxi) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = '#111'; ctx.fillStyle = '#fff'; ctx.lineWidth = 4.5;
    rr(ctx, 5, 0, 48, 82, 18); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 3; rr(ctx, 12, 10, 34, 20, 7); ctx.stroke(); rr(ctx, 12, 52, 34, 20, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, 36); ctx.lineTo(50, 36); ctx.moveTo(8, 46); ctx.lineTo(50, 46); ctx.stroke();
    ctx.beginPath(); ctx.arc(10, 18, 3, 0, Math.PI * 2); ctx.arc(48, 18, 3, 0, Math.PI * 2); ctx.arc(10, 65, 3, 0, Math.PI * 2); ctx.arc(48, 65, 3, 0, Math.PI * 2); ctx.fill();
    if (taxi) { ctx.strokeRect(18, 34, 22, 12); ctx.font = 'bold 7px Arial'; ctx.fillText('TAXI', 20, 43); }
    label(ctx, lab, 21, 50, 24); ctx.restore();
  }

  function drawVan(ctx, lab, x, y) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = '#111'; ctx.fillStyle = '#fff'; ctx.lineWidth = 4.5;
    rr(ctx, 3, 0, 54, 86, 8); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 3; rr(ctx, 12, 9, 36, 18, 4); ctx.stroke(); rr(ctx, 12, 34, 36, 38, 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, 53); ctx.lineTo(48, 53); ctx.stroke();
    label(ctx, lab, 22, 57, 24); ctx.font = 'bold 8px Arial'; ctx.fillText('VAN', 20, 96); ctx.restore();
  }

  function drawTruck(ctx, lab, x, y) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = '#111'; ctx.fillStyle = '#fff'; ctx.lineWidth = 4.5;
    rr(ctx, 6, 0, 48, 28, 6); ctx.fill(); ctx.stroke(); ctx.strokeRect(2, 32, 56, 58);
    ctx.lineWidth = 3; ctx.strokeRect(13, 8, 32, 12); ctx.beginPath(); ctx.moveTo(12, 45); ctx.lineTo(48, 45); ctx.moveTo(12, 62); ctx.lineTo(48, 62); ctx.stroke();
    label(ctx, lab, 22, 72, 24); ctx.font = 'bold 8px Arial'; ctx.fillText('TRUCK', 13, 101); ctx.restore();
  }

  function drawBus(ctx, lab, x, y) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = '#111'; ctx.fillStyle = '#fff'; ctx.lineWidth = 4.5;
    rr(ctx, 0, 0, 62, 92, 8); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 2.8; ctx.strokeRect(10, 8, 42, 12); ctx.strokeRect(10, 72, 42, 12);
    for (let i = 0; i < 4; i++) { ctx.strokeRect(8, 26 + i * 10, 12, 6); ctx.strokeRect(42, 26 + i * 10, 12, 6); }
    label(ctx, lab, 24, 58, 24); ctx.font = 'bold 8px Arial'; ctx.fillText('BUS', 23, 103); ctx.restore();
  }

  function drawMotorcycle(ctx, lab, x, y) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = '#111'; ctx.fillStyle = '#fff'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = 4.8;
    ctx.beginPath(); ctx.ellipse(30, 8, 13, 8, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(30, 76, 13, 8, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.ellipse(30, 31, 14, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(30, 54, 12, 16, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 4.2;
    ctx.beginPath(); ctx.moveTo(30, 17); ctx.lineTo(30, 23); ctx.moveTo(30, 42); ctx.lineTo(30, 47); ctx.moveTo(30, 67); ctx.lineTo(30, 70); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(13, 24); ctx.lineTo(47, 24); ctx.moveTo(17, 42); ctx.lineTo(43, 42); ctx.moveTo(19, 61); ctx.lineTo(41, 61); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 18px Arial'; ctx.fillText(lab, 24, 59);
    ctx.fillStyle = '#111'; ctx.font = 'bold 8px Arial'; ctx.fillText('M/CYCLE', 7, 96); ctx.restore();
  }

  function drawVehicle(ctx, lab, type, x, y, scale = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    const t = String(type || '').toLowerCase();
    if (t.includes('motor') || t.includes('bike')) drawMotorcycle(ctx, lab, 0, 0);
    else if (t.includes('bus')) drawBus(ctx, lab, -5, 0);
    else if (t.includes('lorry') || t.includes('truck') || t.includes('trailer') || t.includes('prime')) drawTruck(ctx, lab, -2, 0);
    else if (t.includes('van')) drawVan(ctx, lab, 0, 0);
    else drawSedan(ctx, lab, 0, 0, t.includes('taxi'));
    ctx.restore();
  }

  function drawLocation(ctx, road) {
    if (!road) return;
    ctx.save(); ctx.translate(58, 210); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#111'; ctx.font = 'bold 17px Arial'; ctx.fillText('Location: ' + road, 0, 0); ctx.restore();
  }

  function drawLegend(ctx, d) {
    const rows = [];
    if (d.vehicle1_plate) rows.push(['A', d.vehicle1_plate, d.vehicle1_model || 'Car']);
    if (d.vehicle2_plate) rows.push(['B', d.vehicle2_plate, d.vehicle2_type || 'Car']);
    if (d.vehicle3_plate) rows.push(['C', d.vehicle3_plate, d.vehicle3_type || 'Car']);
    if (!rows.length) rows.push(['A/B', 'Vehicles', '']);
    ctx.save(); const x = 805, y = 120, w = 170, h = rows.length * 32 + 42;
    ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.strokeStyle = '#111'; ctx.lineWidth = 2.6; rr(ctx, x, y, w, h, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#111'; ctx.font = 'bold 13px Arial'; ctx.fillText('LEGEND', x + 10, y + 19);
    rows.forEach((r, i) => { const yy = y + 38 + i * 32; drawVehicle(ctx, r[0], r[2], x + 10, yy - 18, 0.32); ctx.fillStyle = '#111'; ctx.font = 'bold 12px Arial'; ctx.fillText(r[0], x + 36, yy - 3); ctx.font = 'bold 10px Arial'; ctx.fillText((r[1] || '') + (r[2] ? ' ' + r[2] : ''), x + 58, yy - 3); });
    const iy = y + 38 + rows.length * 32; ctx.font = 'bold 19px Arial'; ctx.fillText('X', x + 14, iy - 2); ctx.font = 'bold 10px Arial'; ctx.fillText('Point of Impact', x + 36, iy - 4); ctx.restore();
  }

  window.renderDiagram = function renderDiagram(d) {
    const c = byId('diagramCanvas'); if (!c) return; c.width = 1000; c.height = 320;
    const ctx = c.getContext('2d'); ctx.clearRect(0, 0, c.width, c.height);
    const plan = lanePlan(d), n = plan.lanes, roadW = Math.min(300, n * 92), left = 455 - roadW / 2, top = 12, bottom = 296, laneW = roadW / n;
    ctx.strokeStyle = '#111'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, bottom); ctx.stroke(); ctx.beginPath(); ctx.moveTo(left + roadW, top); ctx.lineTo(left + roadW, bottom); ctx.stroke();
    ctx.strokeStyle = '#555'; ctx.lineWidth = 4; ctx.setLineDash([18, 16]); for (let i = 1; i < n; i++) { const lx = left + laneW * i; ctx.beginPath(); ctx.moveTo(lx, top); ctx.lineTo(lx, bottom); ctx.stroke(); } ctx.setLineDash([]);
    const x = left + laneW * (plan.laneIndex + 0.5) - 29, front = d.front_vehicle || 'A', rear = d.rear_vehicle || 'B';
    drawVehicle(ctx, front, vehicleType(front, d), x, 62); drawVehicle(ctx, rear, vehicleType(rear, d), x, 178);
    ctx.fillStyle = '#111'; ctx.font = 'bold 34px Arial'; ctx.fillText('X', x + 14, 170); ctx.font = 'bold 44px Arial'; ctx.fillText('↑', left + roadW / 2 - 13, 316);
    drawLegend(ctx, d); drawLocation(ctx, d.road);
  };

  window.renderStatement = function renderStatement() {
    const layer = byId('statementLayer'), statement = byId('statement'); if (!layer || !statement) return;
    layer.innerHTML = '<p>' + String(statement.value || 'No statement entered.').replace(/[&<>]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[ch])) + '</p>';
  };

  window.addEventListener('load', function () {
    if (typeof window.renderAll === 'function') window.renderAll(); if (!window.pdfjsLib) return;
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER;
    window.pdfjsLib.getDocument('sketch-plan.pdf').promise.then(function (pdf) {
      function renderFormPage(pageNo, canvasId) { return pdf.getPage(pageNo).then(function (page) { const canvas = byId(canvasId); if (!canvas) return; const viewport = page.getViewport({ scale: 2 }); canvas.width = viewport.width; canvas.height = viewport.height; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); return page.render({ canvasContext: ctx, viewport }).promise; }); }
      renderFormPage(1, 'formPage1'); renderFormPage(2, 'formPage2');
    }).catch(function () { document.querySelectorAll('.actual-form').forEach(function (page) { page.classList.add('missing-form'); }); });
  });
})();
