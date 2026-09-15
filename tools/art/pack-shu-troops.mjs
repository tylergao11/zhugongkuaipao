// Atlas packing only. Keep the generated paintings intact; separate transparent
// islands before fitting each whole soldier into one mobile sprite cell.
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
const require=createRequire(process.env.CODEX_NODE_PACKAGES+'/package.json');
const sharp=require('sharp');
const source=new URL('./shu-infantry-v1-master.png',import.meta.url);
const target=new URL('../../assets/game/shu-infantry-v1.webp',import.meta.url);
const {data,info}=await sharp(await fs.readFile(source)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const width=info.width,height=info.height,labels=new Int32Array(width*height),queue=new Int32Array(labels.length),parts=[];
for(let p=0;p<labels.length;p++){
  if(labels[p]||!data[p*4+3])continue;
  const part={id:parts.length+1,count:0,left:width,top:height,right:0,bottom:0};
  let head=0,tail=1;labels[p]=part.id;queue[0]=p;
  while(head<tail){
    const v=queue[head++],x=v%width,y=Math.floor(v/width);
    part.left=Math.min(part.left,x);part.top=Math.min(part.top,y);part.right=Math.max(part.right,x);part.bottom=Math.max(part.bottom,y);
    for(const n of [x>0?v-1:-1,x<width-1?v+1:-1,y>0?v-width:-1,y<height-1?v+width:-1])if(n>=0&&!labels[n]&&data[n*4+3]){labels[n]=part.id;queue[tail++]=n;}
  }
  part.count=tail;parts.push(part);
}
const major=parts.filter(p=>p.count>2000).sort((a,b)=>Math.floor(a.top/(height/2))-Math.floor(b.top/(height/2))||a.left-b.left);
if(major.length!==4)throw Error('Expected four separate illustrated soldiers');
const owners=new Map();
for(const part of parts){
  const cx=(part.left+part.right)/2,cy=(part.top+part.bottom)/2;
  const nearest=major.reduce((a,b)=>Math.hypot(cx-(a.left+a.right)/2,cy-(a.top+a.bottom)/2)<Math.hypot(cx-(b.left+b.right)/2,cy-(b.top+b.bottom)/2)?a:b);
  owners.set(part.id,major.includes(part)?major.indexOf(part):major.indexOf(nearest));
}
const overlays=[];
for(let index=0;index<4;index++){
  const group=parts.filter(p=>owners.get(p.id)===index),left=Math.min(...group.map(p=>p.left)),top=Math.min(...group.map(p=>p.top)),right=Math.max(...group.map(p=>p.right)),bottom=Math.max(...group.map(p=>p.bottom));
  const w=right-left+1,h=bottom-top+1,raw=Buffer.alloc(w*h*4);
  for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)if(owners.get(labels[y*width+x])===index)data.copy(raw,((y-top)*w+x-left)*4,(y*width+x)*4,(y*width+x)*4+4);
  const factor=Math.min(488/w,470/h),dw=Math.round(w*factor),dh=Math.round(h*factor);
  const input=await sharp(raw,{raw:{width:w,height:h,channels:4}}).resize(dw,dh).png().toBuffer();
  overlays.push({input,left:index%2*512+Math.floor((512-dw)/2),top:Math.floor(index/2)*512+492-dh});
}
const output=await sharp({create:{width:1024,height:1024,channels:4,background:'#00000000'}}).composite(overlays).webp({quality:80,alphaQuality:100,effort:6}).toBuffer();
await fs.writeFile(target,output);
console.log(JSON.stringify({file:target.pathname,bytes:output.length,width:1024,height:1024}));
