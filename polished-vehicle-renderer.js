(function(){
function byId(id){return document.getElementById(id)}
function lanePlan(d){
  const p=String(d.lane_position||'').toLowerCase();
  const n=parseInt(d.road_lane_count,10);
  if(p.includes('middle')||p.includes('centre')||p.includes('center'))return{lanes:3,idx:1};
  if(p.includes('left'))return{lanes:2,idx:0};
  if(p.includes('right'))return{lanes:2,idx:1};
  if(n>=2&&n<=5)return{lanes:n,idx:Math.floor(n/2)};
  return{lanes:1,idx:0};
}
function vType(l,d){
  if(l==='A')return d.vehicle1_model||'Car';
  if(l==='B')return d.vehicle2_type||'Car';
  if(l==='C')return d.vehicle3_type||'Car';
  return 'Car';
}
function round(ctx,x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);
}
function mark(ctx,t,x,y,size,color){
  ctx.save();ctx.fillStyle=color||'#111';ctx.font='bold '+size+'px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t,x,y);ctx.restore();
}
function iconStyle(ctx){ctx.lineWidth=5.5;ctx.strokeStyle='#111';ctx.fillStyle='#fff';ctx.lineJoin='round';ctx.lineCap='round'}
function drawCar(ctx,label,x,y,taxi){
  ctx.save();ctx.translate(x,y);iconStyle(ctx);
  ctx.beginPath();ctx.moveTo(42,0);ctx.bezierCurveTo(68,7,80,32,80,62);ctx.bezierCurveTo(80,92,68,118,42,126);ctx.bezierCurveTo(16,118,4,92,4,62);ctx.bezierCurveTo(4,32,16,7,42,0);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#111';ctx.beginPath();ctx.ellipse(42,26,27,12,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(42,100,27,12,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#111';ctx.lineWidth=3.8;ctx.beginPath();ctx.moveTo(14,46);ctx.lineTo(70,46);ctx.moveTo(14,78);ctx.lineTo(70,78);ctx.stroke();
  ctx.fillRect(-2,43,9,30);ctx.fillRect(77,43,9,30);
  if(taxi){ctx.fillStyle='#fff';ctx.strokeStyle='#111';ctx.lineWidth=3.2;ctx.strokeRect(25,54,34,18);ctx.fillStyle='#111';ctx.font='bold 10px Arial';ctx.textAlign='center';ctx.fillText('TAXI',42,67);mark(ctx,label,42,63,28,'#111');}
  else mark(ctx,label,42,63,32,'#fff');
  ctx.restore();
}
function drawVan(ctx,label,x,y){
  ctx.save();ctx.translate(x,y);iconStyle(ctx);
  round(ctx,3,0,82,130,12);ctx.fill();ctx.stroke();
  ctx.fillStyle='#111';ctx.fillRect(17,12,54,22);
  ctx.strokeStyle='#111';ctx.lineWidth=3.5;ctx.strokeRect(17,48,54,62);
  ctx.beginPath();ctx.moveTo(24,67);ctx.lineTo(64,67);ctx.moveTo(24,86);ctx.lineTo(64,86);ctx.stroke();
  mark(ctx,label,44,80,34);ctx.restore();
}
function drawBus(ctx,label,x,y){
  ctx.save();ctx.translate(x,y);iconStyle(ctx);
  round(ctx,0,0,88,140,12);ctx.fill();ctx.stroke();
  ctx.fillStyle='#111';ctx.fillRect(14,11,60,22);ctx.fillRect(14,111,60,20);
  ctx.strokeStyle='#111';ctx.lineWidth=3.2;for(let i=0;i<6;i++){ctx.strokeRect(12,44+i*10,17,6);ctx.strokeRect(59,44+i*10,17,6);}
  mark(ctx,label,44,78,34);ctx.restore();
}
function drawTruck(ctx,label,x,y,longer){
  ctx.save();ctx.translate(x,y);iconStyle(ctx);
  round(ctx,12,0,64,40,8);ctx.fill();ctx.stroke();ctx.fillStyle='#111';ctx.fillRect(24,12,40,15);
  ctx.fillStyle='#fff';ctx.strokeStyle='#111';ctx.lineWidth=5.5;ctx.strokeRect(4,50,82,longer?94:78);
  ctx.lineWidth=3.5;[70,92,114].forEach(function(yy){ctx.beginPath();ctx.moveTo(20,yy);ctx.lineTo(70,yy);ctx.stroke();});
  mark(ctx,label,45,longer?96:88,34);ctx.restore();
}
function drawBike(ctx,label,x,y){
  ctx.save();ctx.translate(x,y);ctx.strokeStyle='#111';ctx.fillStyle='#fff';ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=5.8;
  ctx.beginPath();ctx.ellipse(42,8,20,10,0,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.ellipse(42,122,20,10,0,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#111';ctx.beginPath();ctx.ellipse(42,43,20,15,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#111';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(42,82,16,26,0,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(42,19);ctx.lineTo(42,29);ctx.moveTo(42,58);ctx.lineTo(42,67);ctx.moveTo(42,108);ctx.lineTo(42,114);ctx.stroke();
  ctx.beginPath();ctx.moveTo(15,31);ctx.lineTo(69,31);ctx.moveTo(22,67);ctx.lineTo(62,67);ctx.moveTo(27,98);ctx.lineTo(57,98);ctx.stroke();
  mark(ctx,label,42,82,23,'#111');ctx.restore();
}
function drawVehicle(ctx,label,type,x,y,scale){
  ctx.save();ctx.translate(x,y);ctx.scale(scale||1,scale||1);const t=String(type||'').toLowerCase();
  if(t.includes('motor')||t.includes('bike'))drawBike(ctx,label,0,0);
  else if(t.includes('bus'))drawBus(ctx,label,-2,-6);
  else if(t.includes('lorry')||t.includes('truck')||t.includes('trailer')||t.includes('prime'))drawTruck(ctx,label,-2,-4,t.includes('trailer')||t.includes('prime'));
  else if(t.includes('van'))drawVan(ctx,label,0,-4);
  else drawCar(ctx,label,0,0,t.includes('taxi'));
  ctx.restore();
}
function drawLegend(ctx,d){
  const rows=[];if(d.vehicle1_plate)rows.push(['A',d.vehicle1_plate,d.vehicle1_model||'Car']);if(d.vehicle2_plate)rows.push(['B',d.vehicle2_plate,d.vehicle2_type||'Car']);if(d.vehicle3_plate)rows.push(['C',d.vehicle3_plate,d.vehicle3_type||'Car']);if(!rows.length)rows.push(['A/B','Vehicles','']);
  const x=710,y=84,w=270,h=rows.length*52+70;ctx.save();ctx.fillStyle='rgba(255,255,255,.96)';ctx.strokeStyle='#111';ctx.lineWidth=3.5;round(ctx,x,y,w,h,10);ctx.fill();ctx.stroke();
  ctx.fillStyle='#111';ctx.font='bold 17px Arial';ctx.fillText('LEGEND',x+16,y+28);
  rows.forEach(function(r,i){const yy=y+64+i*52;drawVehicle(ctx,r[0],r[2],x+18,yy-42,.34);ctx.fillStyle='#111';ctx.font='bold 14px Arial';ctx.fillText(r[0],x+62,yy-10);ctx.font='bold 12px Arial';ctx.fillText((r[1]||'')+(r[2]?' '+r[2]:''),x+86,yy-10);});
  const iy=y+64+rows.length*52;ctx.font='bold 25px Arial';ctx.fillText('X',x+21,iy-10);ctx.font='bold 12px Arial';ctx.fillText('Point of Impact',x+62,iy-14);ctx.restore();
}
function drawLocation(ctx,road){if(!road)return;ctx.save();ctx.translate(52,238);ctx.rotate(-Math.PI/2);ctx.fillStyle='#111';ctx.font='bold 18px Arial';ctx.fillText('Location: '+road,0,0);ctx.restore();}
window.renderDiagram=function(d){
  const canvas=byId('diagramCanvas');if(!canvas)return;canvas.width=1000;canvas.height=320;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,1000,320);
  const p=lanePlan(d),roadW=Math.min(520,Math.max(260,p.lanes*150)),left=395-roadW/2,top=2,bottom=306,laneW=roadW/p.lanes;
  ctx.strokeStyle='#111';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(left,top);ctx.lineTo(left,bottom);ctx.stroke();ctx.beginPath();ctx.moveTo(left+roadW,top);ctx.lineTo(left+roadW,bottom);ctx.stroke();
  ctx.strokeStyle='#333';ctx.lineWidth=5;ctx.setLineDash([24,18]);for(let i=1;i<p.lanes;i++){const lx=left+laneW*i;ctx.beginPath();ctx.moveTo(lx,top);ctx.lineTo(lx,bottom);ctx.stroke();}ctx.setLineDash([]);
  const laneCentre=left+laneW*(p.idx+.5);const x=laneCentre-42,F=d.front_vehicle||'A',R=d.rear_vehicle||'B';
  drawVehicle(ctx,F,vType(F,d),x,24,1);drawVehicle(ctx,R,vType(R,d),x,176,1);
  ctx.fillStyle='#111';ctx.font='bold 48px Arial';ctx.fillText('X',laneCentre-16,166);ctx.font='bold 50px Arial';ctx.fillText('↑',laneCentre-16,318);
  drawLegend(ctx,d);drawLocation(ctx,d.road);
};
})();