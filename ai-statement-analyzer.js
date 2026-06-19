(function () {
  function byId(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s || '').replace(/[&<>]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch];
    });
  }

  function addAiUi() {
    const generateBtn = byId('generateBtn');
    if (!generateBtn || byId('aiGenerateBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'aiGenerateBtn';
    btn.className = 'primary';
    btn.type = 'button';
    btn.textContent = 'AI Generate Sketch';
    btn.style.marginTop = '8px';
    btn.style.background = '#111827';

    const status = document.createElement('div');
    status.id = 'aiStatus';
    status.className = 'hint';
    status.style.marginTop = '8px';
    status.innerHTML = 'AI endpoint not connected yet. Button will use V7 fallback until backend is added.';

    generateBtn.insertAdjacentElement('afterend', btn);
    btn.insertAdjacentElement('afterend', status);
    btn.onclick = runAiAnalysis;
  }

  function setStatus(message, isError) {
    const el = byId('aiStatus');
    if (!el) return;
    el.style.color = isError ? '#b91c1c' : '';
    el.innerHTML = esc(message);
  }

  function getStatement() {
    const el = byId('statement');
    return el ? el.value.trim() : '';
  }

  function localAnalyze(statement) {
    try {
      return window.V7Logic && typeof window.V7Logic.analyze === 'function' ? window.V7Logic.analyze(statement) : {};
    } catch (err) {
      console.error(err);
      return {};
    }
  }

  function applyData(data) {
    if (typeof window.setData === 'function') window.setData(data);
    else if (typeof setData === 'function') setData(data);
  }

  function cleanAiData(aiData, fallback) {
    const d = Object.assign({}, fallback || {}, aiData || {});
    d.vehicle_count = String(d.vehicle_count || '2');
    d.road_lane_count = String(d.road_lane_count || '');
    d.vehicle1_model = d.vehicle1_model || 'Car';
    d.vehicle2_type = d.vehicle2_type || 'Car';
    d.front_vehicle = d.front_vehicle || 'A';
    d.rear_vehicle = d.rear_vehicle || 'B';
    d.accident_type_display = d.accident_type_display || 'Manual Review';
    return d;
  }

  async function callAiEndpoint(statement, fallback) {
    const endpoint = window.ACCIDENT_AI_ENDPOINT || sessionStorage.getItem('ACCIDENT_AI_ENDPOINT') || '';
    if (!endpoint) return null;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statement: statement, fallback: fallback })
    });

    if (!res.ok) throw new Error('AI endpoint returned ' + res.status);
    return await res.json();
  }

  async function runAiAnalysis() {
    const statement = getStatement();
    if (!statement) {
      setStatus('Enter an accident statement first.', true);
      return;
    }

    const btn = byId('aiGenerateBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'AI analysing...'; }

    const fallback = localAnalyze(statement);

    try {
      const aiData = await callAiEndpoint(statement, fallback);
      if (aiData) {
        applyData(cleanAiData(aiData, fallback));
        setStatus('AI sketch details applied.', false);
      } else {
        applyData(fallback);
        setStatus('No AI backend connected yet, so V7 local logic was used.', true);
      }
    } catch (err) {
      console.error(err);
      applyData(fallback);
      setStatus('AI endpoint failed, so V7 local logic was used. ' + err.message, true);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'AI Generate Sketch'; }
    }
  }

  window.setAccidentAiEndpoint = function (url) {
    sessionStorage.setItem('ACCIDENT_AI_ENDPOINT', url || '');
    setStatus(url ? 'AI endpoint connected for this browser session.' : 'AI endpoint cleared.', !url);
  };

  window.addEventListener('load', addAiUi);
})();