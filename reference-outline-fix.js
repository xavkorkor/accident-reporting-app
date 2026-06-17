(function(){
let ICON_DATA=null;
function byId(id){return document.getElementById(id)}
function lanePlan(d){
  const p=String(d.lane_position||'').toLowerCase().trim();
  const explicit=parseInt(d.road_lane_count,10);
  if(p.includes('middle')||p.includes('centre')||p.includes('center'))return{lanes:3,laneIndex:1};
  if(p.includes('left'))return{lanes:2,laneIndex:0};
  if(p.includes('right'))return{lanes:2,laneIndex:1};
  if(explicit>=2&&explicit<=5)return{lanes:explicit,laneIndex:Math.floor(explicit/2)};
  return{lanes:1,laneIndex:0};
}
function vehicleType(label,d){
  if(label==='A')return d.vehicle1_model||'Car';
  if(label==='B')return d.vehicle2_type||'Car';
  if(label==='C')return d.vehicle3_type||'Car';
  return 'Car';
}
function iconKey(type){
  const t=String(type||'').toLowerCase();
  if(t.includes('taxi'))return'taxi';
  if(t.includes('motor')||t.includes('bike'))return'motorcycle';
  if(t.includes('bus'))return'bus';
  if(t.includes('prime')||t.includes('trailer'))return'prime';
  if(t.includes('lorry')||t.includes('truck'))return'truck';
  if(t.includes('van'))return'van';
  return'car';
}
function rr(ctx,x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);
}
function drawLabel(ctx,label,x,y,size){
  ctx.save();
  ctx.font='bold '+size+'px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.lineWidth=3;ctx.strokeStyle='#fff';ctx.strokeText(label,x,y);
  ctx.fillStyle='#111';ctx.fillText(label,x,y);
  ctx.restore();
}
function drawReferenceIcon(ctx,key,x,y,w,h,rot){
  const D=ICON_DATA&&ICON_DATA[key]?ICON_DATA[key]:ICON_DATA&&ICON_DATA.car;
  if(!D)return;
  ctx.save();
  ctx.translate(x+w/2,y+h/2);
  if(rot)ctx.rotate(Math.PI/2);
  const dw=rot?h:w,dh=rot?w:h;
  const s=Math.min(dw/D.w,dh/D.h);
  const ox=-D.w*s/2,oy=-D.h*s/2;
  ctx.strokeStyle='#111';ctx.lineWidth=Math.max(0.9,s*2.2);ctx.lineCap='round';ctx.lineJoin='round';
  ctx.fillStyle='#fff';
  ctx.fillRect(-dw/2,-dh/2,dw,dh);
  D.p.forEach(path=>{
    ctx.beginPath();
    path.forEach((pt,i)=>{const px=ox+pt[0]*s,py=oy+pt[1]*s;if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py);});
    ctx.closePath();
    ctx.stroke();
  });
  ctx.restore();
}
function drawVehicle(ctx,label,type,x,y,w,h,rot){
  drawReferenceIcon(ctx,iconKey(type),x,y,w,h,rot);
  drawLabel(ctx,label,x+w/2,y+h*0.53,Math.max(13,Math.min(22,w*0.28)));
}
function drawLocation(ctx,road){
  if(!road)return;
  ctx.save();ctx.translate(58,210);ctx.rotate(-Math.PI/2);
  ctx.fillStyle='#111';ctx.font='bold 17px Arial';ctx.fillText('Location: '+road,0,0);ctx.restore();
}
function drawLegend(ctx,d){
  const rows=[];
  if(d.vehicle1_plate)rows.push(['A',d.vehicle1_plate,d.vehicle1_model||'Car']);
  if(d.vehicle2_plate)rows.push(['B',d.vehicle2_plate,d.vehicle2_type||'Car']);
  if(d.vehicle3_plate)rows.push(['C',d.vehicle3_plate,d.vehicle3_type||'Car']);
  if(!rows.length)rows.push(['A/B','Vehicles','']);
  ctx.save();const x=805,y=120,w=170,h=rows.length*32+42;
  ctx.fillStyle='rgba(255,255,255,0.96)';ctx.strokeStyle='#111';ctx.lineWidth=2.6;rr(ctx,x,y,w,h,8);ctx.fill();ctx.stroke();
  ctx.fillStyle='#111';ctx.font='bold 13px Arial';ctx.fillText('LEGEND',x+10,y+19);
  rows.forEach((r,i)=>{const yy=y+38+i*32;drawVehicle(ctx,r[0],r[2],x+8,yy-24,38,24,false);ctx.fillStyle='#111';ctx.font='bold 12px Arial';ctx.fillText(r[0],x+42,yy-3);ctx.font='bold 10px Arial';ctx.fillText((r[1]||'')+(r[2]?' '+r[2]:''),x+58,yy-3);});
  const iy=y+38+rows.length*32;ctx.font='bold 19px Arial';ctx.fillText('X',x+14,iy-2);ctx.font='bold 10px Arial';ctx.fillText('Point of Impact',x+36,iy-4);ctx.restore();
}
function install(){
  if(!ICON_DATA)return;
  window.renderDiagram=function(d){
    const c=byId('diagramCanvas');if(!c)return;c.width=1000;c.height=320;
    const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);
    const plan=lanePlan(d),n=plan.lanes,roadW=Math.min(300,n*92),left=455-roadW/2,top=12,bottom=296,laneW=roadW/n;
    ctx.strokeStyle='#111';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(left,top);ctx.lineTo(left,bottom);ctx.stroke();ctx.beginPath();ctx.moveTo(left+roadW,top);ctx.lineTo(left+roadW,bottom);ctx.stroke();
    ctx.strokeStyle='#555';ctx.lineWidth=4;ctx.setLineDash([18,16]);for(let i=1;i<n;i++){const lx=left+laneW*i;ctx.beginPath();ctx.moveTo(lx,top);ctx.lineTo(lx,bottom);ctx.stroke();}ctx.setLineDash([]);
    const laneCentre=left+laneW*(plan.laneIndex+0.5),front=d.front_vehicle||'A',rear=d.rear_vehicle||'B';
    drawVehicle(ctx,front,vehicleType(front,d),laneCentre-34,54,68,96,true);
    drawVehicle(ctx,rear,vehicleType(rear,d),laneCentre-34,174,68,96,true);
    ctx.fillStyle='#111';ctx.font='bold 34px Arial';ctx.fillText('X',laneCentre-15,170);ctx.font='bold 44px Arial';ctx.fillText('↑',left+roadW/2-13,316);
    drawLegend(ctx,d);drawLocation(ctx,d.road);
  };
  if(typeof window.renderAll==='function')window.renderAll();
}
fetch('reference-icon-renderer.js?v=1').then(r=>r.text()).then(txt=>{
  const m=txt.match(/const D=(.*?);function q/s);
  if(!m)throw new Error('icon data not found');
  ICON_DATA=JSON.parse(m[1]);
  install();
}).catch(err=>console.error('reference outline icon fix failed',err));
window.addEventListener('load',()=>setTimeout(()=>{if(typeof window.renderAll==='function')window.renderAll();},250));
})();