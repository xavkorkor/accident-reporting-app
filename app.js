const $ = id => document.getElementById(id);
const el = {
  statement: $('statement'), accidentType: $('accidentType'), location: $('location'),
  vehicleARole: $('vehicleARole'), vehicleBRole: $('vehicleBRole'), impactA: $('impactA'), impactB: $('impactB'),
  manualReview: $('manualReview'), reviewReason: $('reviewReason'), reportingStatementOut: $('reportingStatementOut'),
  detailsTable: $('detailsTable'), frontCar: $('frontCar'), rearCar: $('rearCar'), diagramCaption: $('diagramCaption'),
  sourceFile: $('sourceFile'), sourcePreview: $('sourcePreview'), originalOut: $('originalOut'), testResults: $('testResults'), sheetStatus: $('sheetStatus')
};
const tests = [
 ['A front / B rear','I slowed down for traffic and the vehicle behind contacted the rear of my vehicle.'],
 ['A rear / B front','The front vehicle stopped suddenly and I could not avoid contact with its rear.'],
 ['A front / B rear','I was stationary at the traffic light when another car hit the back of my car.'],
 ['A rear / B front','The car ahead braked and my front bumper touched its rear bumper.']
];
function norm(s){return String(s||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();}
function loc(s){const clean=String(s||'').replace(/\b(?:on|at)\s+\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/gi,'');for(const p of [/\balong\s+([^,.]+)/i,/\bat\s+([^,.]+)/i,/\bon\s+([^,.]+)/i]){const m=clean.match(p);if(m)return m[1].trim().replace(/\s+(when|while|and|after|before).*$/i,'');}return '';}
function analyze(s){const t=norm(s);if(!t)return {type:'Unclear / Manual Review',a:'Unknown',b:'Unknown',ia:'Unknown',ib:'Unknown',review:'Yes',reason:'Empty statement'};if(/chain collision|multiple vehicles|three vehicles|vehicle c|car c/.test(t))return {type:'Unclear / Manual Review',a:'Unknown',b:'Unknown',ia:'Unknown',ib:'Unknown',review:'Yes',reason:'Possible chain or multi-vehicle wording'};const aRear=/(i|we).*?(hit|contacted|collided|knocked|bumped|touched).*?(rear|back|vehicle in front|car in front|front vehicle|its rear)/.test(t)||/could not avoid contact with its rear/.test(t)||/front bumper touched its rear/.test(t);const aFront=/(vehicle|car) behind( me)?/.test(t)||/following vehicle/.test(t)||/from behind/.test(t)||/(rear|back) of (my|our) (vehicle|car)/.test(t)||/felt an impact at the back/.test(t)||/collided with my rear/.test(t);if(aRear)return {type:'Rear-End',a:'Rear Vehicle',b:'Front Vehicle',ia:'Front',ib:'Rear',review:'No',reason:'Vehicle A contacted rear of front vehicle'};if(aFront||(/rear|back|behind/.test(t)&&/hit|contact|collided|impact|bump|knocked|failed to stop/.test(t)))return {type:'Rear-End',a:'Front Vehicle',b:'Rear Vehicle',ia:'Rear',ib:'Front',review:'No',reason:'Vehicle A was contacted from rear'};return {type:'Unclear / Manual Review',a:'Unknown',b:'Unknown',ia:'Unknown',ib:'Unknown',review:'Yes',reason:'No reliable rear-end pattern detected'};}
function fill(r){el.accidentType.value=r.type;el.vehicleARole.value=r.a;el.vehicleBRole.value=r.b;el.impactA.value=r.ia;el.impactB.value=r.ib;el.manualReview.value=r.review;el.reviewReason.value=r.reason;el.location.value=loc(el.statement.value);sync();}
function data(){return {type:el.accidentType.value,location:el.location.value,a:el.vehicleARole.value,b:el.vehicleBRole.value,ia:el.impactA.value,ib:el.impactB.value,review:el.manualReview.value,reason:el.reviewReason.value};}
function sync(){const d=data();el.frontCar.textContent=d.a==='Front Vehicle'?'A':d.b==='Front Vehicle'?'B':'?';el.rearCar.textContent=d.a==='Rear Vehicle'?'A':d.b==='Rear Vehicle'?'B':'?';el.diagramCaption.textContent=`${d.type}: Vehicle ${el.frontCar.textContent} in front, Vehicle ${el.rearCar.textContent} at rear.`;el.reportingStatementOut.textContent=el.statement.value||'No statement generated yet.';el.detailsTable.innerHTML=[['Accident Type',d.type],['Location',d.location||'Not detected'],['Vehicle A Role',d.a],['Vehicle B Role',d.b],['Impact A',d.ia],['Impact B',d.ib],['Manual Review',d.review],['Review Reason',d.reason||'-']].map(x=>`<tr><th>${x[0]}</th><td>${x[1]}</td></tr>`).join('');el.sheetStatus.textContent=d.review==='Yes'?'Manual Review':'Ready';}
function correction(){const d=data();el.reportingStatementOut.textContent=(el.statement.value||'')+'\n\nCorrection note: Accident type '+d.type+'. Vehicle A '+d.a+'. Vehicle B '+d.b+'. Location '+(d.location||'not stated')+'.';}
$('analyzeBtn').onclick=()=>fill(analyze(el.statement.value));
$('applyEditsBtn').onclick=()=>{correction();sync();};
$('loadSampleBtn').onclick=()=>{el.statement.value=tests[0][1];fill(analyze(el.statement.value));};
$('clearBtn').onclick=()=>location.reload();
$('swapRolesBtn').onclick=()=>{const a=el.vehicleARole.value;el.vehicleARole.value=el.vehicleBRole.value;el.vehicleBRole.value=a;sync();};
$('setAFrontBtn').onclick=()=>{el.accidentType.value='Rear-End';el.vehicleARole.value='Front Vehicle';el.vehicleBRole.value='Rear Vehicle';el.impactA.value='Rear';el.impactB.value='Front';el.manualReview.value='No';sync();};
$('setARearBtn').onclick=()=>{el.accidentType.value='Rear-End';el.vehicleARole.value='Rear Vehicle';el.vehicleBRole.value='Front Vehicle';el.impactA.value='Front';el.impactB.value='Rear';el.manualReview.value='No';sync();};
$('runTestsBtn').onclick=()=>{el.testResults.innerHTML=tests.map(t=>{const r=analyze(t[1]);return `<div class="test-row"><b>${t[0]}</b><span>${r.type} | A ${r.a} | B ${r.b}</span><p>${t[1]}</p></div>`}).join('');};
el.sourceFile.onchange=e=>{const f=e.target.files[0];if(!f)return;const url=URL.createObjectURL(f);if(f.type.startsWith('image/')){el.sourcePreview.innerHTML=`<img src="${url}">`;el.originalOut.innerHTML=`<img src="${url}">`;}else{el.sourcePreview.innerHTML=`<embed src="${url}" type="application/pdf">`;el.originalOut.innerHTML='<p>Original PDF attached/uploaded. Browser export will show this placeholder; use screenshot/image for visual inclusion in exported PDF.</p>';}};
$('exportPdfBtn').onclick=()=>{sync();html2pdf().set({margin:10,filename:'accident-report.pdf',html2canvas:{scale:2},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}}).from($('exportArea')).save();};
[el.accidentType,el.location,el.vehicleARole,el.vehicleBRole,el.impactA,el.impactB,el.manualReview,el.reviewReason].forEach(x=>x.onchange=sync);
sync();
