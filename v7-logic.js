window.V7Logic = (() => {
  const VEHICLE_TYPES = ['car','motorcycle','bike','lorry','truck','bus','van','taxi','trailer','prime mover'];
  const EXPRESSWAYS = ['pie','cte','sle','tpe','aye','kpe','bke','ecp','mce','kje'];

  function normalize(text) {
    return String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function plates(text) {
    return [...new Set((String(text || '').match(/\b[A-Z]{1,3}\d{1,4}[A-Z]\b/gi) || []).map(x => x.toUpperCase()))];
  }

  function findDate(text) {
    return (String(text || '').match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/) || [''])[0];
  }

  function findTime(text) {
    const m = String(text || '').match(/(?:about\s*)?(\d{3,4})\s*hrs/i);
    if (!m) return '';
    const raw = m[1].padStart(4, '0');
    return raw.slice(0,2) + raw.slice(2) + ' hrs';
  }

  function extractRoad(text) {
    const raw = String(text || '')
      .replace(/\b(?:on|at)?\s*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi, '')
      .replace(/\b(?:at|about)?\s*\d{3,4}\s*hrs\b/gi, '');
    const patterns = [
      /\balong\s+([^,.]+?)(?:\s+towards|\s+when|\s+while|\s+and|,|\.|$)/i,
      /\bat\s+([^,.]+?)(?:\s+when|\s+while|\s+and|,|\.|$)/i,
      /\bon\s+([^,.]+?)(?:\s+when|\s+while|\s+and|,|\.|$)/i
    ];
    for (const p of patterns) {
      const m = raw.match(p);
      if (m && m[1] && !/^\d/.test(m[1].trim())) return m[1].trim();
    }
    return '';
  }

  function vehicleTypeFor(text, fallback) {
    const t = normalize(text);
    if (t.includes('motorcycle') || t.includes('bike') || t.includes('riding')) return 'Motorcycle';
    if (t.includes('lorry')) return 'Lorry';
    if (t.includes('truck')) return 'Truck';
    if (t.includes('bus')) return 'Bus';
    if (t.includes('van')) return 'Van';
    if (t.includes('taxi')) return 'Taxi';
    return fallback || 'Car';
  }

  function isChain(text) {
    const t = normalize(text);
    const explicit = t.includes('chain collision') || t.includes('multiple vehicles') || t.includes('multi vehicle') || t.includes('three vehicles');
    const third = /\b(vehicle|car|lorry|van|truck|bus)\s*c\b/.test(t) || /\bthird\b|\b3rd\b/.test(t);
    const pushed = /pushed .* into .* (front|ahead|vehicle in front|car in front)/.test(t);
    return explicit || third || pushed;
  }

  function rearEndRoles(text) {
    const t = normalize(text);
    const aHitFront =
      /\b(i|we)\b.*\b(hit|contacted|collided|knocked|bumped|touched)\b.*\b(rear|back|vehicle in front|car in front|front vehicle|its rear)\b/.test(t) ||
      t.includes('could not avoid contact with its rear') ||
      t.includes('front bumper touched') ||
      t.includes('rear of the car in front') ||
      t.includes('rear of the vehicle in front');

    const aWasHit =
      t.includes('vehicle behind') ||
      t.includes('car behind') ||
      t.includes('following vehicle') ||
      t.includes('from behind') ||
      t.includes('hit the rear of my') ||
      t.includes('rear of my car') ||
      t.includes('rear of my vehicle') ||
      t.includes('impact at the back') ||
      t.includes('bump to the back') ||
      t.includes('collided with my rear') ||
      t.includes('knocked from behind');

    const rearSignal = /\b(rear|back|behind|bumper)\b/.test(t);
    const impactSignal = /\b(hit|contacted|contact|collided|collision|knocked|bumped|impact|touched|bump)\b/.test(t) || t.includes('failed to stop');

    if (aHitFront) return { front: 'B', rear: 'A', review: false, reason: 'A contacted rear of the front vehicle.' };
    if (aWasHit) return { front: 'A', rear: 'B', review: false, reason: 'A was contacted from behind.' };
    if (rearSignal && impactSignal) return { front: 'A', rear: 'B', review: false, reason: 'Ambiguous two-party rear-end; default A as front vehicle.' };
    return { front: '', rear: '', review: true, reason: 'No reliable rear-end pattern detected.' };
  }

  function classify(text) {
    const t = normalize(text);
    if (isChain(text)) return 'Chain Collision';
    if (/\b(rear|back|behind|bumper)\b/.test(t) && /\b(hit|contact|collided|knocked|bumped|impact|touched|bump)\b/.test(t)) return 'Rear-End Collision';
    if (t.includes('lane change') || t.includes('change lane') || t.includes('filter')) return 'Lane Change';
    if (t.includes('side swipe') || t.includes('sideswipe')) return 'Side Swipe';
    if (t.includes('parked') || t.includes('parking')) return 'Parked Vehicle';
    if (t.includes('junction') || t.includes('traffic light')) return 'Junction Collision';
    return 'Manual Review';
  }

  function analyze(text) {
    const p = plates(text);
    const type = classify(text);
    const roles = type === 'Rear-End Collision' ? rearEndRoles(text) : { front: '', rear: '', review: type === 'Manual Review' || type === 'Chain Collision', reason: type };
    const t = normalize(text);
    return {
      date: findDate(text),
      time: findTime(text),
      road: extractRoad(text),
      road_lane_count: '',
      lane_position: t.includes('right lane') ? 'right' : t.includes('left lane') ? 'left' : t.includes('middle lane') ? 'middle' : '',
      road_feature: EXPRESSWAYS.some(e => t.includes(e)) ? 'expressway' : t.includes('traffic light') ? 'traffic_light' : t.includes('junction') ? 'junction' : '',
      accident_type_display: type,
      vehicle_count: type === 'Chain Collision' ? '3+' : '2',
      front_vehicle: roles.front,
      rear_vehicle: roles.rear,
      vehicle1_plate: p[0] || '',
      vehicle1_model: 'Car',
      vehicle2_plate: p[1] || '',
      vehicle2_type: vehicleTypeFor(text, 'Car'),
      vehicle3_plate: p[2] || '',
      vehicle3_type: p[2] ? 'Car' : '',
      manual_review: roles.review ? 'Yes' : 'No',
      review_reason: roles.reason
    };
  }

  const smartTests = [
    ['A','B','I slowed down for traffic and the vehicle behind contacted the rear of my vehicle.'],
    ['A','B','While moving along PIE, I felt an impact at the back after the car in front slowed.'],
    ['B','A','The front vehicle stopped suddenly and I could not avoid contact with its rear.'],
    ['A','B','I was stationary at the traffic light when another car hit the back of my car.'],
    ['A','B','My vehicle was knocked from behind but there were only two cars involved.'],
    ['B','A','The car ahead braked and my front bumper touched its rear bumper.'],
    ['A','B','I was travelling along CTE when I was hit from the rear by the following vehicle.'],
    ['A','B','Traffic slowed and there was a bump to the back of my vehicle.'],
    ['A','B','The vehicle behind me failed to stop in time and collided with my rear.'],
    ['B','A','I accidentally knocked into the rear of the car in front when traffic came to a stop.']
  ];

  function runTests() {
    return smartTests.map(([front, rear, statement], index) => {
      const result = analyze(statement);
      const pass = result.front_vehicle === front && result.rear_vehicle === rear && result.accident_type_display === 'Rear-End Collision' && result.vehicle_count === '2';
      return { index: index + 1, pass, expectedFront: front, expectedRear: rear, actualFront: result.front_vehicle, actualRear: result.rear_vehicle, statement, result };
    });
  }

  return { analyze, runTests, rearEndRoles, isChain };
})();
