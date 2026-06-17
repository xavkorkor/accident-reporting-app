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
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.bezierCurveTo(50, 6, 58, 24, 58, 43);
    ctx.bezierCurveTo(58, 64, 50, 80, 30, 86);
    ctx.bezierCurveTo(10, 80, 2, 64, 2, 43);
    ctx.bezierCurveTo(2, 24, 10, 6, 30, 0);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.ellipse(30, 17, 19, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(30, 69, 19, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(11, 32); ctx.lineTo(49, 32); ctx.moveTo(11, 54); ctx.lineTo(49, 54); ctx.stroke();
    if (taxi) {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 2.5;
      ctx.strokeRect(18, 37, 24, 13);
      ctx.fillStyle = '#111'; ctx.font = 'bold 7px Arial'; ctx.fillText('TAXI', 20, 46);
      ctx.font = 'bold 20px Arial'; ctx.fillText(lab, 24, 64);
    } else {
      ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Arial'; ctx.fillText(lab, 23, 48);
    }
    ctx.restore();
  }

  function drawVan(ctx, lab, x, y) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = '#111'; ctx.fillStyle = '#fff'; ctx.lineWidth = 4.5;
    rr(ctx, 4, 0, 54, 90, 9); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#111'; ctx.fillRect(13, 9, 36, 15);
    ctx.strokeStyle = '#111'; ctx.lineWidth = 3;
    ctx.strokeRect(13, 34, 36, 40);
    ctx.beginPath(); ctx.moveTo(13, 48); ctx.lineTo(49, 48); ctx.moveTo(13, 62); ctx.lineTo(49, 62); ctx.stroke();
    ctx.fillStyle = '#111'; ctx.font = 'bold 22px Arial'; ctx.fillText(lab, 24, 59);
    ctx.restore();
  }

  function drawTruck(ctx, lab, x, y) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = '#111'; ctx.fillStyle = '#fff'; ctx.lineWidth = 4.5;
    rr(ctx, 8, 0, 44, 28, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#111'; ctx.fillRect(17, 8, 26, 11);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 4.5;
    ctx.strokeRect(2, 34, 56, 62);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(12, 49); ctx.lineTo(48, 49);
    ctx.moveTo(12, 66); ctx.lineTo(48, 66);
    ctx.moveTo(12, 83); ctx.lineTo(48, 83);
    ctx.stroke();
    ctx.fillStyle = '#111'; ctx.font = 'bold 22px Arial'; ctx.fillText(lab, 23, 75);
    ctx.restore();
  }

  function drawBus(ctx, lab, x, y) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = '#111'; ctx.fillStyle = '#fff'; ctx.lineWidth = 4.5;
    rr(ctx, 0, 0, 62, 96, 9); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.fillRect(10, 8, 42, 13);
    ctx.fillRect(10, 75, 42, 13);
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2.6;
    for (let i = 0; i < 5; i++) {
      ctx.strokeRect(8, 27 + i * 9, 12, 5);
      ctx.strokeRect(42, 27 + i * 9, 12, 5);
    }
    ctx.fillStyle = '#111'; ctx.font = 'bold 22px Arial'; ctx.fillText(lab, 24, 57);
    ctx.restore();
  }

  function drawMotorcycle(ctx, lab, x, y) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = '#111'; ctx.fillStyle = '#fff'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.ellipse(30, 7, 13, 7, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(30, 78, 13, 7, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.ellipse(30, 30, 13, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(30, 55, 11, 15, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(30, 15); ctx.lineTo(30, 22);
    ctx.moveTo(30, 40); ctx.lineTo(30, 47);
    ctx.moveTo(30, 68); ctx.lineTo(30, 72);
    ctx.moveTo(13, 24); ctx.lineTo(47, 24);
    ctx.moveTo(17, 45); ctx.lineTo(43, 45);
    ctx.moveTo(19, 63); ctx.lineTo(41, 63);
    ctx.stroke();
    ctx.fillStyle = '#111'; ctx.font = 'bold 18px Arial'; ctx.fillText(lab, 24, 60);
    ctx.restore();
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