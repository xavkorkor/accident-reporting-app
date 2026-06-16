const byId = id => document.getElementById(id);
const SAMPLE = 'On 30/05/2025 at about 0800hrs, I was driving SLL6659E along Mandai Road towards Woodlands. When I was in the right lane, I slowed down due to the traffic ahead. Suddenly, FBV321J riding a motorcycle hit the rear of my car.';
const fieldList = [
  ['date','Date:'], ['time','Time:'], ['road','Location / Road:'], ['road_lane_count','Road Lanes:'], ['lane_position','My Lane:'], ['road_feature','Road Feature:'], ['accident_type_display','Accident Type:'], ['vehicle_count','No. Vehicles:'], ['front_vehicle','Front Vehicle:'], ['rear_vehicle','Rear Vehicle:'], ['vehicle1_plate','A Plate:'], ['vehicle1_model','A Type:'], ['vehicle2_plate','B Plate:'], ['vehicle2_type','B Type:'], ['vehicle3_plate','C Plate:'], ['vehicle3_type','C Type:']
];
const fields = {};
function initFields(){
  const box = byId('details'); box.innerHTML = '';
  fieldList.forEach(item => {
    const key = item[0], label = item[1];
    const row = document.createElement('div'); row.className = 'detail-row';
    const lab = document.createElement('label'); lab.textContent = label;
    const input = document.createElement('input'); input.id = 'f_' + key;
    input.addEventListener('input', renderAll);
    row.appendChild(lab); row.appendChild(input); box.appendChild(row); fields[key] = input;
  });
}
function text(){ return byId('statement').value || ''; }
function getData(){ const d = {}; Object.keys(fields).forEach(k => d[k] = fields[k].value || ''); return d; }
function setData(d){ Object.keys(fields).forEach(k => fields[k].value = d[k] || ''); renderAll(); }
function extractBasic(s){
  const lower = s.toLowerCase();
  const plates = (s.match(/[A-Z]{1,3}[0-9]{1,4}[A-Z]/g) || []);
  const date = (s.match(/[0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4}/) || [''])[0];
  const timeRaw = (s.match(/(?:about )?([0-9]{3,4})\s*hrs/i) || ['',''])[1];
  const time = timeRaw ? timeRaw.padStart(4,'0').slice(0,2) + timeRaw.padStart(4,'0').slice(2) + ' hrs' : '';
  let road = '';
  ['along',' at ',' on '].forEach(token => {
    if (road) return;
    const idx = lower.indexOf(token.trim() === 'along' ? 'along ' : token);
    if (idx >= 0) road = s.slice(idx + token.length).split(/ when | while | and |,|\./i)[0].trim();
  });
  const userHitFront = lower.includes('could not avoid contact with its rear') || lower.includes('front bumper touched') || (lower.includes('i ') && lower.includes('rear of the car in front'));
  const hitFromRear = lower.includes('vehicle behind') || lower.includes('from behind') || lower.includes('hit the rear of my') || lower.includes('rear of my car') || lower.includes('rear of my vehicle');
  let front = 'A', rear = 'B';
  if (userHitFront) { front = 'B'; rear = 'A'; }
  else if (hitFromRear) { front = 'A'; rear = 'B'; }
  return {date,time,road,road_lane_count:'',lane_position:lower.includes('right lane')?'right':lower.includes('left lane')?'left':'',road_feature:'',accident_type_display:'Rear-End Collision',vehicle_count:'2',front_vehicle:front,rear_vehicle:rear,vehicle1_plate:plates[0]||'',vehicle1_model:'Car',vehicle2_plate:plates[1]||'',vehicle2_type:lower.includes('motorcycle')?'Motorcycle':'Car',vehicle3_plate:plates[2]||'',vehicle3_type:''};
}
function renderAll(){ renderDiagram(getData()); renderStatement(getData()); }
function renderStatement(d){
  byId('statementLayer').innerHTML = '<div class="stmt-head">Reporting Statement</div><p>' + esc(text() || 'No statement entered.') + '</p><div class="stmt-meta"><b>Date:</b> ' + esc(d.date || '-') + '<br><b>Time:</b> ' + esc(d.time || '-') + '<br><b>Location:</b> ' + esc(d.road || '-') + '<br><b>Accident Type:</b> ' + esc(d.accident_type_display || '-') + '</div>';
}
function renderDiagram(d){
  const c = byId('diagramCanvas'), ctx = c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height); ctx.fillStyle = '#e9ecef'; ctx.fillRect(0,0,c.width,c.height);
  ctx.fillStyle = '#555'; ctx.fillRect(270,60,220,640); ctx.strokeStyle = 'white'; ctx.setLineDash([24,24]); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(380,70); ctx.lineTo(380,690); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#111'; ctx.font = 'bold 24px Arial'; ctx.fillText('Traffic Flow ↑',40,50);
  const front = d.front_vehicle || 'A', rear = d.rear_vehicle || 'B'; drawCar(ctx,front,330,170,'FRONT'); drawCar(ctx,rear,330,430,'REAR');
  ctx.fillStyle = '#d93025'; ctx.font = 'bold 70px Arial'; ctx.fillText('*',365,390);
}
function drawCar(ctx,label,x,y,role){ ctx.fillStyle='#fff'; ctx.strokeStyle='#111'; ctx.lineWidth=3; ctx.fillRect(x,y,100,150); ctx.strokeRect(x,y,100,150); ctx.fillStyle='#111'; ctx.font='bold 34px Arial'; ctx.fillText(label,x+38,y+78); ctx.font='16px Arial'; ctx.fillText(role,x+23,y+125); }
function esc(s){ return String(s).replace(/[&<>]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch])); }
function updateCounter(){ byId('counter').textContent = text().length + ' / 20000'; }
function previewOriginal(file){ if(!file) return; const url = URL.createObjectURL(file); if(file.type.startsWith('image/')){ byId('page0').innerHTML='<img src="'+url+'">'; byId('originalPreview').innerHTML='<img src="'+url+'">'; } else { byId('page0').innerHTML='<embed src="'+url+'" type="application/pdf"><div class="pdf-note">Original PDF uploaded: '+esc(file.name)+'</div>'; byId('originalPreview').innerHTML='<embed src="'+url+'" type="application/pdf"><div class="pdf-note">'+esc(file.name)+'</div>'; } }
function exportPdf(){ const bundle = byId('exportBundle'); bundle.innerHTML = ''; ['page0','page1','page2'].forEach(id => { const clone = byId(id).cloneNode(true); clone.classList.add('export-page'); bundle.appendChild(clone); }); html2pdf().set({margin:6,filename:'accident-report-with-original.pdf',html2canvas:{scale:2,useCORS:true},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}}).from(bundle).save(); }
byId('statement').value = SAMPLE; initFields(); updateCounter(); setData(extractBasic(SAMPLE));
byId('statement').addEventListener('input', updateCounter); byId('generateBtn').onclick = () => setData(extractBasic(text())); byId('applyBtn').onclick = renderAll; byId('originalFile').onchange = e => previewOriginal(e.target.files[0]); byId('exportAllBtn').onclick = exportPdf; byId('exportPage1Btn').onclick = () => { const a=document.createElement('a'); a.download='page1-sketch-diagram.png'; a.href=byId('diagramCanvas').toDataURL('image/png'); a.click(); }; byId('exportPage2Btn').onclick = () => html2pdf().set({filename:'page2-statement.pdf'}).from(byId('page2')).save();