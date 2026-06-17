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
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  }

  function centerText(ctx, txt, x, y, size, fill, stroke) {
    ctx.save();
    ctx.font = 'bold ' + size + 'px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (stroke) { ctx.lineWidth = 3; ctx.strokeStyle = stroke; ctx.strokeText(txt, x, y); }
    ctx.fillStyle = fill || '#111'; ctx.fillText(txt, x, y);
    ctx.restore();
  }

  function setupIcon(ctx) {
    ctx.strokeStyle = '#111'; ctx.fillStyle = '#fff'; ctx.lineWidth = 3.2;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  }

  function drawSedan(ctx, lab, x, y, taxi) {
    ctx.save(); ctx.translate(x, y); setupIcon(ctx);
    // outer silhouette with bonnet/boot taper, closer to the reference car icon
    ctx.beginPath();
    ctx.moveTo(30, 1);
    ctx.bezierCurveTo(45, 3, 54, 13, 56, 31);
    ctx.bezierCurveTo(58, 46, 57, 63, 54, 75);
    ctx.bezierCurveTo(50, 86, 40, 91, 30, 92);
    ctx.bezierCurveTo(20, 91, 10, 86, 6, 75);
    ctx.bezierCurveTo(3, 63, 2, 46, 4, 31);
    ctx.bezierCurveTo(6, 13, 15, 3, 30, 1);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // mirrors
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(2, 39, 5, 3, -0.4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(58, 39, 5, 3, 0.4, 0, Math.PI * 2); ctx.stroke();
    // windows and roof details
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.ellipse(30, 21, 20, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(30, 70, 20, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(13, 33); ctx.bezierCurveTo(17, 29, 43, 29, 47, 33);
    ctx.moveTo(13, 59); ctx.bezierCurveTo(17, 63, 43, 63, 47, 59);
    ctx.moveTo(11, 39); ctx.lineTo(11, 58);
    ctx.moveTo(49, 39); ctx.lineTo(49, 58);
    ctx.stroke();
    // side black strips / wheel areas
    ctx.fillStyle = '#111';
    ctx.fillRect(8, 43, 5, 20); ctx.fillRect(47, 43, 5, 20);
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(18, 7); ctx.lineTo(42, 7); ctx.moveTo(17, 86); ctx.lineTo(43, 86); ctx.stroke();
    if (taxi) {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 2.3;
      ctx.strokeRect(18, 39, 24, 14);
      ctx.fillStyle = '#111'; ctx.font = 'bold 7px Arial'; ctx.textAlign = 'center'; ctx.fillText('TAXI', 30, 49);
      centerText(ctx, lab, 30, 62, 18, '#111');
    } else {
      centerText(ctx, lab, 30, 48, 20, '#fff', '#111');
    }
    ctx.restore();
  }

  function drawVan(ctx, lab, x, y) {
    ctx.save(); ctx.translate(x, y); setupIcon(ctx);
    rr(ctx, 2, 0, 60, 96, 8); ctx.fill(); ctx.stroke();
    // front windscreen
    ctx.fillStyle = '#111'; ctx.fillRect(12, 9, 40, 16);
    // cargo roof ribs
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2.2;
    rr(ctx, 12, 34, 40, 42, 4); ctx.stroke();
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(17, 41 + i * 7); ctx.lineTo(47, 41 + i * 7); ctx.stroke(); }
    // side details
    ctx.beginPath(); ctx.moveTo(8, 29); ctx.lineTo(8, 80); ctx.moveTo(56, 29); ctx.lineTo(56, 80); ctx.stroke();
    centerText(ctx, lab, 32, 83, 18, '#111');
    ctx.restore();
  }

  function drawTruck(ctx, lab, x, y) {
    ctx.save(); ctx.translate(x, y); setupIcon(ctx);
    // cab
    rr(ctx, 8, 0, 44, 31, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#111'; ctx.fillRect(16, 9, 28, 11);
    // joint and cargo body
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 3.2;
    ctx.strokeRect(4, 38, 56, 62);
    ctx.strokeRect(9, 44, 46, 50);
    // cargo panel lines
    ctx.lineWidth = 2.1;
    for (let yy of [55, 70, 85]) { ctx.beginPath(); ctx.moveTo(14, yy); ctx.lineTo(50, yy); ctx.stroke(); }
    // wheels
    ctx.fillStyle = '#111'; ctx.fillRect(2, 13, 4, 11); ctx.fillRect(54, 13, 4, 11); ctx.fillRect(2, 54, 4, 16); ctx.fillRect(54, 54, 4, 16);
    centerText(ctx, lab, 32, 77, 18, '#111');
    ctx.restore();
  }

  function drawBus(ctx, lab, x, y) {
    ctx.save(); ctx.translate(x, y); setupIcon(ctx);
    rr(ctx, 0, 0, 66, 100, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#111'; ctx.fillRect(10, 8, 46, 13); ctx.fillRect(10, 79, 46, 13);
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2.3;
    // side window slots
    for (let i = 0; i < 5; i++) {
      ctx.strokeRect(9, 28 + i * 9, 12, 5);
      ctx.strokeRect(45, 28 + i * 9, 12, 5);
    }
    // roof long panel and small door mark
    ctx.strokeRect(24, 31, 18, 42); ctx.fillStyle = '#111'; ctx.fillRect(51, 48, 4, 9);
    centerText(ctx, lab, 33, 62, 18, '#111');
    ctx.restore();
  }

  function drawMotorcycle(ctx, lab, x, y) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = '#111'; ctx.fillStyle = '#fff'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = 3.2;
    // wheels
    ctx.beginPath(); ctx.ellipse(30, 6, 13, 7, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(30, 82, 13, 7, 0, 0, Math.PI * 2); ctx.stroke();
    // front fork, handlebar
    ctx.beginPath(); ctx.moveTo(30, 13); ctx.lineTo(30, 22); ctx.moveTo(14, 24); ctx.lineTo(46, 24); ctx.stroke();
    // tank and body
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(30, 34, 13, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(30, 57, 11, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(30, 45); ctx.lineTo(30, 49); ctx.moveTo(30, 73); ctx.lineTo(30, 77); ctx.stroke();
    // foot rests / handle details
    ctx.beginPath(); ctx.moveTo(17, 48); ctx.lineTo(43, 48); ctx.moveTo(19, 66); ctx.lineTo(41, 66); ctx.stroke();
    centerText(ctx, lab, 30, 57, 15, '#fff');
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