// Pack the imagegen sheet by connected silhouettes, since generated frames can cross cell edges.
// Input: ffmpeg -i tools/art/dilu-v1-master.png -pix_fmt rgba -f rawvideo output/dilu-source.rgba
import fs from 'node:fs';
const width=1536,height=1024,source=fs.readFileSync('output/dilu-source.rgba');
if(source.length!==width*height*4)throw Error('Unexpected source dimensions');
// Match the existing actor packer's key removal, including color spill at ink edges.
for(let p=0;p<source.length;p+=4){
  const r=source[p],g=source[p+1],b=source[p+2],spill=Math.max(0,Math.min(1,(Math.min(r,b)-g-8)/247)),alpha=1-spill;
  if(alpha<.025){source.fill(0,p,p+4);continue;}
  source[p]=Math.max(0,Math.min(255,Math.round((r-255*spill)/alpha)));
  source[p+1]=Math.min(255,Math.round(g/alpha));source[p+2]=Math.max(0,Math.min(255,Math.round((b-255*spill)/alpha)));source[p+3]=Math.round(alpha*255);
}
const seen=new Uint8Array(width*height),queue=new Int32Array(width*height),parts=[];
for(let i=0;i<seen.length;i++){
  if(seen[i]||source[i*4+3]<16)continue;
  let read=0,end=1,left=width,top=height,right=0,bottom=0;queue[0]=i;seen[i]=1;
  while(read<end){
    const p=queue[read++],x=p%width,y=Math.floor(p/width);
    left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const xx=x+dx,yy=y+dy,n=yy*width+xx;
      if(xx>=0&&xx<width&&yy>=0&&yy<height&&!seen[n]&&source[n*4+3]>=16){seen[n]=1;queue[end++]=n;}
    }
  }
  parts.push({left,top,right,bottom,pixels:Int32Array.from(queue.subarray(0,end))});
}
const frames=parts.filter(p=>p.pixels.length>15000).sort((a,b)=>Math.floor(a.top/512)-Math.floor(b.top/512)||a.left-b.left);
if(frames.length!==6)throw Error('Expected six distinct silhouettes, got '+frames.length);
const owner=new Int8Array(width*height).fill(-1);
for(const part of parts){
  let frame=frames.indexOf(part);
  if(frame<0){
    if(part.right-part.left>64||part.bottom-part.top>64||part.pixels.length<3)continue;
    const x=(part.left+part.right)/2,y=(part.top+part.bottom)/2;
    const distances=frames.map(f=>Math.max(f.left-x,0,x-f.right)**2+Math.max(f.top-y,0,y-f.bottom)**2);
    frame=distances.indexOf(Math.min(...distances));if(distances[frame]>80**2)continue;
  }
  for(const p of part.pixels)owner[p]=frame;
}
// Authored registration at the saddle keeps the gallop torso steady; leg suspension remains visible.
const anchors=[[256,505],[754,505],[1272,504],[287,991],[790,983],[1281,983]];
const scale=.8,cell=512,atlas=Buffer.alloc(width*height*4);
for(let k=0;k<frames.length;k++){
  const [ax,ay]=anchors[k],ox=k%3*cell,oy=Math.floor(k/3)*cell;
  for(let y=0;y<cell;y++)for(let x=0;x<cell;x++){
    const sx=Math.round(ax+(x-256)/scale),sy=Math.round(ay+(y-470)/scale),p=sy*width+sx;
    if(sx<0||sx>=width||sy<0||sy>=height||owner[p]!==k)continue;
    source.copy(atlas,((oy+y)*width+ox+x)*4,p*4,p*4+4);
  }
}
fs.writeFileSync('output/dilu-atlas.rgba',atlas);
console.log(JSON.stringify({frames:frames.map(({left,top,right,bottom})=>({left,top,right,bottom})),width,height}));
