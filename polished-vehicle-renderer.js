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
function drawCar(ctx,label,x,y,taxi){
  ctx.save();ctx.translate(x,y);ctx.lineWidth=5;ctx.strokeStyle='#111';ctx.fillStyle='#fff';ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(32,0);ctx.bezierCurveTo(55,6,63,25,63,49);ctx.bezierCurveTo(63,73,55,91,32,98);ctx.bezierCurveTo(9,91,1,73,1,49);ctx.bezierCurveTo(1,25,9,6,32,0);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#111';ctx.beginPath();ctx.ellipse(32,19,20,9,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(32,78,20,9,0,0,Math.PI*2);ctx.fill();
  ctx.lineWidth=3;ctx.strokeStyle='#111';ctx.beginPath();ctx.moveTo(10,36);ctx.lineTo(54,36);ctx.moveTo(10,61);ctx.lineTo(54,61);ctx.stroke();
  ctx.fillRect(-3,34,8,22);ctx.fillRect(60,34,8,22);
  if(taxi){ctx.fillStyle='#fff';ctx.strokeStyle='#111';ctx.lineWidth=3;ctx.strokeRect(18,41,28,15);ctx.fillStyle='#111';ctx.font='bold 8px Arial';ctx.textAlign='center';ctx.fillText('TAXI',32,51);mark(ctx,label,32,49,23,'#111');}
  else mark(ctx,label,32,49,26,'#fff');
  ctx.restore();
}
function drawVan(ctx,label,x,y){
  ctx.save();ctx.translate(x,y);ctx.lineWidth=5;ctx.strokeStyle='#111';ctx.fillStyle='#fff';
  round(ctx,2,0,64,100,10);ctx.fill();ctx.stroke();
  ctx.fillStyle='#111';ctx.fillRect(13,9,42,17);
  ctx.strokeStyle='#111';ctx.lineWidth=3;ctx.strokeRect(13,35,42,50);
  ctx.beginPath();ctx.moveTo(18,50);ctx.lineTo(50,50);ctx.moveTo(18,65);ctx.lineTo(50,65);ctx.stroke();
  mark(ctx,label,34,62,26);ctx.restore();
}
function drawBus(ctx,label,x,y){
  ctx.save();ctx.translate(x,y);ctx.lineWidth=5;ctx.strokeStyle='#111';ctx.fillStyle='#fff';
  round(ctx,0,0,72,106,10);ctx.fill();ctx.stroke();
  ctx.fillStyle='#111';ctx.fillRect(11,8,50,16);ctx.fillRect(11,84,50,15);
  ctx.strokeStyle='#111';ctx.lineWidth=3;for(let i=0;i<5;i++){ctx.strokeRect(9,31+i*9,14,5);ctx.strokeRect(49,31+i*9,14,5);}
  mark(ctx,label,36,60,26);ctx.restore();
}
function drawTruck(ctx,label,x,y,longer){
  ctx.save();ctx.translate(x,y);ctx.lineWidth=5;ctx.strokeStyle='#111';ctx.fillStyle='#fff';
  round(ctx,9,0,52,33,7);ctx.fill();ctx.stroke();ctx.fillStyle='#111';ctx.fillRect(19,9,32,12);
  ctx.fillStyle='#fff';ctx.strokeStyle='#111';ctx.strokeRect(3,40,64,longer?74:62);
  ctx.lineWidth=3;[55,72,89].forEach(function(yy){ctx.beginPath();ctx.moveTo(15,yy);ctx.lineTo(55,yy);ctx.stroke();});
  mark(ctx,label,35,longer?82:74,26);ctx.restore();
}
function drawBike(ctx,label,x,y){
  ctx.save();ctx.translate(x,y);ctx.strokeStyle='#111';ctx.fillStyle='#fff';ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=5;
  ctx.beginPath();ctx.ellipse(35,7,15,8,0,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.ellipse(35,95,15,8,0,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#111';ctx.beginPath();ctx.ellipse(35,34,15,12,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#111';ctx.lineWidth=4.5;ctx.beginPath();ctx.ellipse(35,66,13,20,0,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(35,16);ctx.lineTo(35,24);ctx.moveTo(35,47);ctx.lineTo(35,54);ctx.moveTo(35,86);ctx.lineTo(35,90);ctx.stroke();
  ctx.beginPath();ctx.moveTo(14,25);ctx.lineTo(56,25);ctx.moveTo(19,53);ctx.lineTo(51,53);ctx.moveTo(22,76);ctx.lineTo(48,76);ctx.stroke();
  mark(ctx,label,35,66,19,'#111');ctx.restore();
}
function drawVehicle(ctx,label,type,x,y,scale){
  ctx.save();ctx.translate(x,y);ctx.scale(scale||1,scale||1);const t=String(type||'').toLowerCase();
  if(t.includes('motor')||t.includes('bike'))drawBike(ctx,label,0,0);
  else if(t.includes('bus'))drawBus(ctx,label,-5,-4);
  else if(t.includes('lorry')||t.includes('truck')||t.includes('trailer')||t.includes('prime'))drawTruck(ctx,label,-3,-2,t.includes('trailer')||t.includes('prime'));
  else if(t.includes('van'))drawVan(ctx,label,-2,-2);
  else drawCar(ctx,label,0,0,t.includes('taxi'));
  ctx.restore();
}
function drawLegend(ctx,d){
  const rows=[];if(d.vehicle1_plate)rows.push(['A',d.vehicle1_plate,d.vehicle1_model||'Car']);if(d.vehicle2_plate)rows.push(['B',d.vehicle2_plate,d.vehicle2_type||'Car']);if(d.vehicle3_plate)rows.push(['C',d.vehicle3_plate,d.vehicle3_type||'Car']);if(!rows.length)rows.push(['A/B','Vehicles','']);
  const x=790,y=112,w=195,h=rows.length*38+48;ctx.save();ctx.fillStyle='rgba(255,255,255,.96)';ctx.strokeStyle='#111';ctx.lineWidth=3;round(ctx,x,y,w,h,8);ctx.fill();ctx.stroke();
  ctx.fillStyle='#111';ctx.font='bold 14px Arial';ctx.fillText('LEGEND',x+12,y+22);
  rows.forEach(function(r,i){const yy=y+45+i*38;drawVehicle(ctx,r[0],r[2],x+12,yy-24,.32);ctx.fillStyle='#111';ctx.font='bold 12px Arial';ctx.fillText(r[0],x+42,yy-6);ctx.font='bold 10px Arial';ctx.fillText((r[1]||'')+(r[2]?' '+r[2]:''),x+63,yy-6);});
  const iy=y+45+rows.length*38;ctx.font='bold 22px Arial';ctx.fillText('X',x+15,iy-3);ctx.font='bold 10px Arial';ctx.fillText('Point of Impact',x+42,iy-6);ctx.restore();
}
function drawLocation(ctx,road){if(!road)return;ctx.save();ctx.translate(60,212);ctx.rotate(-Math.PI/2);ctx.fillStyle='#111';ctx.font='bold 17px Arial';ctx.fillText('Location: '+road,0,0);ctx.restore();}
window.renderDiagram=function(d){
  const canvas=byId('diagramCanvas');if(!canvas)return;canvas.width=1000;canvas.height=320;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,1000,320);
  const p=lanePlan(d),roadW=Math.min(330,p.lanes*104),left=450-roadW/2,top=4,bottom=304,laneW=roadW/p.lanes;
  ctx.strokeStyle='#111';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(left,top);ctx.lineTo(left,bottom);ctx.stroke();ctx.beginPath();ctx.moveTo(left+roadW,top);ctx.lineTo(left+roadW,bottom);ctx.stroke();
  ctx.strokeStyle='#444';ctx.lineWidth=4.5;ctx.setLineDash([22,16]);for(let i=1;i<p.lanes;i++){const lx=left+laneW*i;ctx.beginPath();ctx.moveTo(lx,top);ctx.lineTo(lx,bottom);ctx.stroke();}ctx.setLineDash([]);
  const x=left+laneW*(p.idx+.5)-34,F=d.front_vehicle||'A',R=d.rear_vehicle||'B';drawVehicle(ctx,F,vType(F,d),x,44,1);drawVehicle(ctx,R,vType(R,d),x,181,1);
  ctx.fillStyle='#111';ctx.font='bold 42px Arial';ctx.fillText('X',x+13,170);ctx.font='bold 48px Arial';ctx.fillText('↑',left+roadW/2-15,318);
  drawLegend(ctx,d);drawLocation(ctx,d.road);
};
})();