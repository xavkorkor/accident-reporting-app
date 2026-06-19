(function () {
  const ICON_PATHS = {
    car: 'assets/vehicles/car.png',
    taxi: 'assets/vehicles/taxi.png',
    van: 'assets/vehicles/van.png',
    motorcycle: 'assets/vehicles/motorcycle.png',
    bus: 'assets/vehicles/bus.png',
    truck: 'assets/vehicles/truck.png',
    prime: 'assets/vehicles/prime.png'
  };

  const icons = {};
  let loaded = false;

  function byId(id) { return document.getElementById(id); }

  function loadIcons() {
    const keys = Object.keys(ICON_PATHS);
    let remaining = keys.length;
    keys.forEach(key => {
      const img = new Image();
      img.onload = img.onerror = function () {
        remaining -= 1;
        if (remaining === 0) {
          loaded = true;
          if (typeof window.renderAll === 'function') window.renderAll();
        }
      };
      img.src = ICON_PATHS[key];
      icons[key] = img;
    });
  }

  function lanePlan(d) {
    const p = String(d.lane_position || '').toLowerCase().trim();
    const explicit = parseInt(d.road_lane_count, 10);
    if (p.includes('middle') || p.includes('centre') || p.includes('center')) return { lanes: 3, laneIndex: 1 };
    if (p.includes('left')) return { lanes: 2, laneIndex: 0 };
    if (p.includes('right')) return { lanes: 2, laneIndex: 1 };
    if (explicit >= 2 && explicit <= 5) return { lanes: explicit, laneIndex: Math.floor(explicit / 2) };
    return { lanes: 1, laneIndex: 0 };
  }

  function vehicleType(label, d) {
    if (label === 'A') return d.vehicle1_model || 'Car';
    if (label === 'B') return d.vehicle2_type || 'Car';
    if (label === 'C') return d.vehicle3_type || 'Car';
    return 'Car';
  }

  function iconKey(type) {
    const t = String(type || '').toLowerCase();
    if (t.includes('taxi')) return 'taxi';
    if (t.includes('motor') || t.includes('bike')) return 'motorcycle';
    if (t.includes('bus')) return 'bus';
    if (t.includes('prime') || t.includes('trailer')) return 'prime';
    if (t.includes('lorry') || t.includes('truck')) return 'truck';
    if (t.includes('van')) return 'van';
    return 'car';
  }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  function drawLabel(ctx, label, x, y, size) {
    ctx.save();
    ctx.font = 'bold ' + size + 'px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#fff';
    ctx.strokeText(label, x, y);
    ctx.fillStyle = '#111';
    ctx.fillText(label, x, y);
    ctx.restore();
  }

  function drawFallback(ctx, x, y, w, h) {
    ctx.save();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    rr(ctx, x, y, w, h, 10);
    ctx.stroke();
    ctx.restore();
  }

  function drawVehicleSprite(ctx, label, type, x, y, w, h, rotate90) {
    const key = iconKey(type);
    const img = icons[key] || icons.car;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    if (rotate90) ctx.rotate(Math.PI / 2);
    const boxW = rotate90 ? h : w;
    const boxH = rotate90 ? w : h;
    if (img && img.complete && img.naturalWidth) {
      const scale = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight);
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      drawFallback(ctx, -boxW / 2, -boxH / 2, boxW, boxH);
    }
    ctx.restore();
    drawLabel(ctx, label, x + w / 2, y + h * 0.53, Math.max(13, Math.min(23, w * 0.30)));
  }

  function drawLocation(ctx, road) {
    if (!road) return;
    ctx.save();
    ctx.translate(58, 210);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#111';
    ctx.font = 'bold 17px Arial';
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
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2.6;
    rr(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.font = 'bold 13px Arial';
    ctx.fillText('LEGEND', x + 10, y + 19);

    rows.forEach((r, i) => {
      const yy = y + 38 + i * 32;
      drawVehicleSprite(ctx, r[0], r[2], x + 8, yy - 23, 38, 24, false);
      ctx.fillStyle = '#111';
      ctx.font = 'bold 12px Arial';
      ctx.fillText(r[0], x + 42, yy - 3);
      ctx.font = 'bold 10px Arial';
      ctx.fillText((r[1] || '') + (r[2] ? ' ' + r[2] : ''), x + 58, yy - 3);
    });

    const iy = y + 38 + rows.length * 32;
    ctx.font = 'bold 19px Arial';
    ctx.fillText('X', x + 14, iy - 2);
    ctx.font = 'bold 10px Arial';
    ctx.fillText('Point of Impact', x + 36, iy - 4);
    ctx.restore();
  }

  window.renderDiagram = function renderDiagram(d) {
    const c = byId('diagramCanvas');
    if (!c) return;
    c.width = 1000;
    c.height = 320;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);

    const plan = lanePlan(d);
    const n = plan.lanes;
    const roadW = Math.min(300, n * 92);
    const left = 455 - roadW / 2;
    const top = 12;
    const bottom = 296;
    const laneW = roadW / n;

    ctx.strokeStyle = '#111';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, bottom);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(left + roadW, top);
    ctx.lineTo(left + roadW, bottom);
    ctx.stroke();

    ctx.strokeStyle = '#555';
    ctx.lineWidth = 4;
    ctx.setLineDash([18, 16]);
    for (let i = 1; i < n; i++) {
      const lx = left + laneW * i;
      ctx.beginPath();
      ctx.moveTo(lx, top);
      ctx.lineTo(lx, bottom);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    const laneCentre = left + laneW * (plan.laneIndex + 0.5);
    const front = d.front_vehicle || 'A';
    const rear = d.rear_vehicle || 'B';

    drawVehicleSprite(ctx, front, vehicleType(front, d), laneCentre - 36, 52, 72, 96, true);
    drawVehicleSprite(ctx, rear, vehicleType(rear, d), laneCentre - 36, 174, 72, 96, true);

    ctx.fillStyle = '#111';
    ctx.font = 'bold 34px Arial';
    ctx.fillText('X', laneCentre - 15, 170);
    ctx.font = 'bold 44px Arial';
    ctx.fillText('↑', left + roadW / 2 - 13, 316);

    drawLegend(ctx, d);
    drawLocation(ctx, d.road);
  };

  loadIcons();
  window.addEventListener('load', function () {
    setTimeout(function () {
      if (typeof window.renderAll === 'function') window.renderAll();
    }, 250);
  });
})();
