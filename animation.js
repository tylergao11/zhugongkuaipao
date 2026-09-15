// Anatomical cutout animation. Only explicitly authored leg silhouettes move;
// a weapon or coat is never assigned to a leg by its rectangular position.
const TAU = Math.PI*2;
const angle = (a,b) => Math.atan2(b[1]-a[1],b[0]-a[0]);
const distance = (a,b) => Math.hypot(b[0]-a[0],b[1]-a[1]);

function polygon(c, points, ox=0, oy=0) {
  c.beginPath();
  points.forEach(([x,y],i)=>i?c.lineTo(x-ox,y-oy):c.moveTo(x-ox,y-oy));
  c.closePath();
}
function surface(w,h) {
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  return canvas;
}
function extract(image,points) {
  const x=Math.floor(Math.min(...points.map(p=>p[0])))-6,y=Math.floor(Math.min(...points.map(p=>p[1])))-6;
  const w=Math.ceil(Math.max(...points.map(p=>p[0])))-x+6,h=Math.ceil(Math.max(...points.map(p=>p[1])))-y+6;
  const canvas=surface(w,h),c=canvas.getContext('2d'),mask=surface(w,h),mc=mask.getContext('2d');
  polygon(mc,points,x,y);mc.lineWidth=8;mc.lineJoin='round';mc.stroke();mc.fill();
  c.drawImage(image,-x,-y);c.globalCompositeOperation='destination-in';c.drawImage(mask,0,0);
  return {canvas,x,y};
}
function drawPart(c,part,sourcePivot,targetPivot,rotation,stretch=1,axis=0) {
  c.save();c.translate(targetPivot[0],targetPivot[1]);c.rotate(rotation);
  if(stretch!==1){c.rotate(axis);c.scale(stretch,1);c.rotate(-axis);}
  c.drawImage(part.canvas,part.x-sourcePivot[0],part.y-sourcePivot[1]);c.restore();
}
function kneeAt(hip,ankle,a,b,bend) {
  const dx=ankle[0]-hip[0],dy=ankle[1]-hip[1],raw=Math.hypot(dx,dy)||.001;
  const d=Math.min(a+b-.05,Math.max(Math.abs(a-b)+.05,raw));
  const along=(a*a-b*b+d*d)/(2*d),height=Math.sqrt(Math.max(0,a*a-along*along));
  return [hip[0]+dx/raw*along-dy/raw*height*bend,hip[1]+dy/raw*along+dx/raw*height*bend];
}

export function prepareRigs(atlas, metadata, spriteIndices) {
  const result={},cell=metadata.cell||512,columns=metadata.columns||4,rows=metadata.rows||2;
  for(const [type,spec]of Object.entries(metadata.actors||{})) {
    const index=spriteIndices[type];if(index===undefined)continue;
    const original=surface(cell,cell),c=original.getContext('2d');
    c.drawImage(atlas,(index%columns)*atlas.width/columns,Math.floor(index/columns)*atlas.height/rows,atlas.width/columns,atlas.height/rows,0,0,cell,cell);
    const legSource=surface(cell,cell),lc=legSource.getContext('2d');lc.drawImage(original,0,0);
    for(const points of spec.protect||[]){lc.globalCompositeOperation='destination-out';polygon(lc,points);lc.fill();}
    const body=surface(cell,cell),bc=body.getContext('2d');
    if(spec.torso){bc.save();polygon(bc,spec.torso);bc.clip();bc.drawImage(original,0,0);bc.restore();}
    else bc.drawImage(original,0,0);
    const legs=spec.legs.map((leg,i)=>{
      const parts={};
      for(const key of ['upper','lower','foot']){
        const points=leg[key];
        parts[key]=extract(legSource,points);
        if(!spec.torso){bc.globalCompositeOperation='destination-out';polygon(bc,points);bc.lineWidth=18;bc.lineJoin='round';bc.stroke();bc.fill();}
      }
      return {...leg,parts,offset:leg.offset??i*.5,a:distance(leg.hip,leg.knee),b:distance(leg.knee,leg.ankle),upperAngle:angle(leg.hip,leg.knee),lowerAngle:angle(leg.knee,leg.ankle),footAngle:leg.heel&&leg.toe?angle(leg.heel,leg.toe):0};
    });
    for(const points of spec.protect||[]){bc.save();bc.globalCompositeOperation='source-over';polygon(bc,points);bc.clip();bc.drawImage(original,0,0);bc.restore();}
    result[type]={...spec,cell,body,legs,runRate:type==='liubei'?4.6:type==='enemyHeavy'?3:2.7};
  }
  return result;
}

export function drawRig(c,rig,size,travel) {
  const cell=rig.cell,amplitude=rig.amplitude||21,scale=size/cell;
  // Deliberately frantic cartoon footwork; gameplay travel speed is unchanged.
  // Distance still drives the cycle, so blocked or paused actors stop stepping.
  const cycle=travel*rig.runRate/(4*amplitude*scale),bob=-((rig.bob??1.5)+2)*(1-Math.cos(cycle*TAU*2))*.5;
  const anchor=rig.anchor||[cell/2,cell*.95];
  c.save();c.scale(scale,scale);c.translate(-anchor[0],-anchor[1]);
  for(const leg of rig.legs) {
    const phase=((cycle+leg.offset)%1+1)%1,swing=phase>=.5,t=swing?(phase-.5)*2:phase*2;
    const dx=swing?-amplitude*Math.cos(t*Math.PI):amplitude*(1-2*t);
    const footHeight=swing?(rig.lift||22)*1.4*Math.sin(t*Math.PI):0;
    const pivot=leg.targetHip||leg.hip;
    const hip=[pivot[0],pivot[1]+bob],ankle=[(leg.centerX??pivot[0])+dx,leg.ground-footHeight];
    let a=leg.lengths?.[0]||leg.a,b=leg.lengths?.[1]||leg.b;
    const reach=Math.max(1,distance(hip,ankle)/(a+b-1));a*=reach;b*=reach;
    const knee=kneeAt(hip,ankle,a,b,leg.bend??-1);
    drawPart(c,leg.parts.upper,leg.hip,hip,angle(hip,knee)-leg.upperAngle,a/leg.a,leg.upperAngle);
    drawPart(c,leg.parts.lower,leg.knee,knee,angle(knee,ankle)-leg.lowerAngle,b/leg.b,leg.lowerAngle);
    const toeLift=swing?-.32*Math.sin(t*Math.PI):0;
    drawPart(c,leg.parts.foot,leg.ankle,ankle,-leg.footAngle+toeLift);
  }
  c.drawImage(rig.body,0,bob);c.restore();
}
