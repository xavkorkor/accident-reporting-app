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

  function plate(label, d) {
    if (label === 'A') return d.vehicle1_plate || '';
    if (label === 'B') return d.vehicle2_plate || '';
    if (label === 'C') return d.vehicle3_plate || '';
    return '';
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  }

  function drawCar(ctx, label, x, y, tag) {
    ctx.save(); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 3;
    roundRect(ctx, x, y, 52, 78, 9); ctx.fill(); ctx.stroke();
    ctx.strokeRect(x + 11, y + 9, 30, 11); ctx.strokeRect(x + 11, y + 58, 30, 11);
    ctx.fillStyle = '#111'; ctx.font = 'bold 24px Arial'; ctx.fillText(label, x + 18, y + 47);
    if (tag) { ctx.font = '8px Arial'; ctx.fillText(tag, x + 15, y + 56); }
    ctx.restore();
  }

  function drawVan(ctx, label, x, y) {
    ctx.save(); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 3;
    ctx.strokeRect(x + 2, y, 48, 82); ctx.strokeRect(x + 10, y + 10, 32, 18); ctx.strokeRect(x + 10, y + 37, 32, 32);
    ctx.fillStyle = '#111'; ctx.font = 'bold 22px Arial'; ctx.fillText(label, x + 18, y + 54);
    ctx.font = '8px Arial'; ctx.fillText('VAN', x + 17, y + 93); ctx.restore();
  }

  function drawTruck(ctx, label, x, y) {
    ctx.save(); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 3;
    ctx.strokeRect(x, y, 58, 84); ctx.strokeRect(x + 9, y + 8, 40, 22); ctx.strokeRect(x + 9, y + 36, 40, 40);
    ctx.fillStyle = '#111'; ctx.font = 'bold 22px Arial'; ctx.fillText(label, x + 21, y + 58);
    ctx.font = '8px Arial'; ctx.fillText('TRUCK', x + 13, y + 95); ctx.restore();
  }

  function drawBus(ctx, label, x, y) {
    ctx.save(); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 3;
    ctx.strokeRect(x, y, 58, 88);
    for (let i = 0; i < 4; i++) { ctx.strokeRect(x + 7, y + 10 + i * 16, 11, 8); ctx.strokeRect(x + 40, y + 10 + i * 16, 11, 8); }
    ctx.fillStyle = '#111'; ctx.font = 'bold 22px Arial'; ctx.fillText(label, x + 22, y + 53);
    ctx.font = '8px Arial'; ctx.fillText('BUS', x + 21, y + 99); ctx.restore();
  }

  function drawMotorcycle(ctx, label, x, y) {
    ctx.save(); ctx.strokeStyle = '#111'; ctx.fillStyle = '#111';
    ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(x + 26, y + 12, 11, 11, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x + 26, y + 66, 11, 11, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x + 26, y + 24); ctx.lineTo(x + 26, y + 54); ctx.stroke();
    ctx.font = 'bold 20px Arial'; ctx.fillText(label, x + 18, y + 46);
    ctx.font = '8px Arial'; ctx.fillText('BIKE', x + 14, y + 88); ctx.restore();
  }

  function drawVehicle(ctx, label, type, x, y, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    const t = String(type || '').toLowerCase();
    if (t.includes('motor') || t.includes('bike')) drawMotorcycle(ctx, label, 0, 0);
    else if (t.includes('bus')) drawBus(ctx, label, -3, 0);
    else if (t.includes('lorry') || t.includes('truck') || t.includes('trailer') || t.includes('prime')) drawTruck(ctx, label, -3, 0);
    else if (t.includes('van')) drawVan(ctx, label, 0, 0);
    else drawCar(ctx, label, 0, 0, t.includes('taxi') ? 'TAXI' : '');
    ctx.restore();
  }

  function drawLocation(ctx, road) {
    if (!road) return;
    ctx.save(); ctx.translate(58, 210); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#111'; ctx.font = 'bold 15px Arial';
    ctx.fillText('Location: ' + road, 0, 0);
    ctx.restore();
  }

  function drawLegend(ctx, d) {
    const rows = [];
    if (d.vehicle1_plate) rows.push(['A', d.vehicle1_plate, d.vehicle1_model || 'Car']);
    if (d.vehicle2_plate) rows.push(['B', d.vehicle2_plate, d.vehicle2_type || 'Car']);
    if (d.vehicle3_plate) rows.push(['C', d.vehicle3_plate, d.vehicle3_type || 'Car']);
    if (!rows.length) rows.push(['A/B', 'Vehicles', '']);
    ctx.save();
    const x = 805, y = 120, w = 170, h = rows.length * 32 + 42;
    ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.strokeStyle = '#111'; ctx.lineWidth = 1.4;
    roundRect(ctx, x, y, w, h, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#111'; ctx.font = 'bold 12px Arial'; ctx.fillText('LEGEND', x + 10, y + 19);
    rows.forEach((r, i) => {
      const yy = y + 38 + i * 32;
      drawVehicle(ctx, r[0], r[2], x + 10, yy - 17, 0.36);
      ctx.fillStyle = '#111'; ctx.font = 'bold 11px Arial'; ctx.fillText(r[0], x + 36, yy - 3);
      ctx.font = '10px Arial'; ctx.fillText((r[1] || '') + (r[2] ? ' ' + r[2] : ''), x + 58, yy - 3);
    });
    const iy = y + 38 + rows.length * 32;
    ctx.font = 'bold 17px Arial'; ctx.fillText('X', x + 14, iy - 2);
    ctx.font = '10px Arial'; ctx.fillText('Point of Impact', x + 36, iy - 4);
    ctx.restore();
  }

  window.renderDiagram = function renderDiagram(d) {
    const c = byId('diagramCanvas'); if (!c) return;
    c.width = 1000; c.height = 320;
    const ctx = c.getContext('2d'); ctx.clearRect(0, 0, c.width, c.height);

    const plan = lanePlan(d);
    const n = plan.lanes;
    const roadW = Math.min(300, n * 92);
    const left = 455 - roadW / 2;
    const top = 45, bottom = 245, laneW = roadW / n;

    ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, bottom); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(left + roadW, top); ctx.lineTo(left + roadW, bottom); ctx.stroke();

    ctx.strokeStyle = '#777'; ctx.lineWidth = 2; ctx.setLineDash([14, 18]);
    for (let i = 1; i < n; i++) { const lx = left + laneW * i; ctx.beginPath(); ctx.moveTo(lx, top); ctx.lineTo(lx, bottom); ctx.stroke(); }
    ctx.setLineDash([]);

    const x = left + laneW * (plan.laneIndex + 0.5) - 26;
    ctx.fillStyle = '#111'; ctx.font = '13px Arial';
    ctx.fillText(n + ' lane' + (n > 1 ? 's' : '') + (plan.text ? ' - ' + plan.text + ' lane' : ''), 130, 48);

    const front = d.front_vehicle || 'A';
    const rear = d.rear_vehicle || 'B';
    drawVehicle(ctx, front, vehicleType(front, d), x, 70);
    drawVehicle(ctx, rear, vehicleType(rear, d), x, 174);

    ctx.fillStyle = '#111'; ctx.font = 'bold 26px Arial'; ctx.fillText('X', x + 17, 165);
    ctx.font = 'bold 34px Arial'; ctx.fillText('↑', left + roadW / 2 - 10, 292);

    drawLegend(ctx, d);
    drawLocation(ctx, d.road);
  };

  window.renderStatement = function renderStatement() {
    const layer = byId('statementLayer');
    const statement = byId('statement');
    if (!layer || !statement) return;
    layer.innerHTML = '<p>' + String(statement.value || 'No statement entered.').replace(/[&<>]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[ch])) + '</p>';
  };

  window.addEventListener('load', function () {
    if (typeof window.renderAll === 'function') window.renderAll();
    if (!window.pdfjsLib) return;
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER;
    window.pdfjsLib.getDocument('sketch-plan.pdf').promise.then(function (pdf) {
      function renderFormPage(pageNo, canvasId) {
        return pdf.getPage(pageNo).then(function (page) {
          const canvas = byId(canvasId); if (!canvas) return;
          const viewport = page.getViewport({ scale: 2 });
          canvas.width = viewport.width; canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
          return page.render({ canvasContext: ctx, viewport }).promise;
        });
      }
      renderFormPage(1, 'formPage1');
      renderFormPage(2, 'formPage2');
    }).catch(function () {
      document.querySelectorAll('.actual-form').forEach(function (page) { page.classList.add('missing-form'); });
    });
  });
})();
