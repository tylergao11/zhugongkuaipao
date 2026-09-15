import fs from 'node:fs';
import zlib from 'node:zlib';
const folder = 'C:/Users/84720/.codex/generated_images/01a0a4f0-11ac-7cc3-bd1c-5e9bee71e77d/';
function readPNG(path) {
  const file=fs.readFileSync(path), chunks=[]; let width,height,type,at=8;
  while(at<file.length){const n=file.readUInt32BE(at),name=file.toString('ascii',at+4,at+8),data=file.subarray(at+8,at+8+n);if(name==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);type=data[9];if(data[8]!==8||![2,6].includes(type)||data[12])throw Error('Unsupported PNG');}if(name==='IDAT')chunks.push(data);at+=n+12;}
  const channels=type===2?3:4,stride=width*channels,raw=zlib.inflateSync(Buffer.concat(chunks)),rgb=new Uint8Array(width*height*3),line=new Uint8Array(stride),prev=new Uint8Array(stride);let offset=0;
  const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
  for(let y=0;y<height;y++){const filter=raw[offset++];for(let x=0;x<stride;x++){const a=x>=channels?line[x-channels]:0,b=prev[x],c=x>=channels?prev[x-channels]:0;line[x]=(raw[offset++]+(filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):0))&255;}for(let x=0;x<width;x++)for(let c=0;c<3;c++)rgb[(y*width+x)*3+c]=line[x*channels+c];prev.set(line);}
  return {width,height,rgb};
}
function key(source){
 const {width:w,height:h,rgb}=source,rgba=new Uint8Array(w*h*4);
 for(let i=0;i<w*h;i++){
  const r=rgb[i*3],g=rgb[i*3+1],b=rgb[i*3+2];
  let spill=Math.max(0,Math.min(1,(Math.min(r,b)-g-8)/247));
  if(r>210&&b>210&&g<55)spill=1;
  const a=1-spill;
  if(a<.025)continue;
  rgba[i*4]=Math.max(0,Math.min(255,Math.round((r-255*spill)/a)));
  rgba[i*4+1]=Math.min(255,Math.round(g/a));
  rgba[i*4+2]=Math.max(0,Math.min(255,Math.round((b-255*spill)/a)));
  rgba[i*4+3]=Math.round(a*255);
 }
 return {width:w,height:h,rgba};
}
function split(source){
 const {width:w,height:h,rgba}=source,N=w*h,seen=new Uint8Array(N),queue=new Int32Array(N),components=[];
 for(let i=0;i<N;i++)if(rgba[i*4+3]>24&&!seen[i]){
  let start=0,end=1,x0=w,y0=h,x1=0,y1=0;queue[0]=i;seen[i]=1;
  while(start<end){const p=queue[start++],x=p%w,y=Math.floor(p/w);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,q=yy*w+xx;if(xx>=0&&xx<w&&yy>=0&&yy<h&&rgba[q*4+3]>24&&!seen[q]){seen[q]=1;queue[end++]=q;}}}
  if(end>15)components.push({x0,y0,x1,y1,area:end,pixels:Int32Array.from(queue.subarray(0,end))});
 }
 const big=components.filter(c=>c.area>10000).sort((a,b)=>(Math.floor((a.y0+a.y1)/h)-Math.floor((b.y0+b.y1)/h))||a.x0-b.x0);
 if(big.length!==4)throw Error('Expected4 got'+big.length);
 const owner=new Int8Array(N).fill(-1);
 for(const c of components){let k=big.indexOf(c);if(k<0){let best=Infinity;for(let j=0;j<big.length;j++){const p=big[j],cx=(c.x0+c.x1)/2,cy=(c.y0+c.y1)/2,d=Math.max(p.x0-cx,0,cx-p.x1)**2+Math.max(p.y0-cy,0,cy-p.y1)**2;if(d<best){best=d;k=j;}}if(best>10000)continue;}for(const p of c.pixels)owner[p]=k;const main=big[k];main.x0=Math.min(main.x0,c.x0);main.y0=Math.min(main.y0,c.y0);main.x1=Math.max(main.x1,c.x1);main.y1=Math.max(main.y1,c.y1);}
 return big.map((c,k)=>{const width=c.x1-c.x0+1,height=c.y1-c.y0+1,out=Buffer.alloc(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=(c.y0+y)*w+c.x0+x;if(owner[p]===k)for(let a=0;a<4;a++)out[(y*width+x)*4+a]=rgba[p*4+a];}return{width,height,rgba:out,source:[c.x0,c.y0,width,height]};});
}
const heroSource='exec-386240ea-eb06-4547-a5b0-c6c4b4b7136f.png',troopSource='exec-4ed7b0ea-5b42-4ef6-a477-dbd304b3d53f.png';
const all=[...split(key(readPNG(folder+heroSource))),...split(key(readPNG(folder+troopSource)))];
const names=['liubei','guanyu','zhangfei','zhugeliang','archer','enemy','enemyHeavy','horse'];
const outDir=new URL('.',import.meta.url),runtimeDir=new URL('../../assets/game/',import.meta.url),atlas=Buffer.alloc(2048*1024*4),metadata={width:2048,height:1024,cell:512,anchor:[256,486],actors:{}};
for(let k=0;k<all.length;k++){
 const c=all[k],scale=Math.min(480/c.width,460/c.height),dw=Math.round(c.width*scale),dh=Math.round(c.height*scale),left=Math.round((512-dw)/2),top=486-dh,cx=k%4*512,cy=Math.floor(k/4)*512;
 for(let y=0;y<dh;y++)for(let x=0;x<dw;x++){
  const sx=(x+.5)/scale-.5,sy=(y+.5)/scale-.5,x0=Math.floor(sx),y0=Math.floor(sy);let aa=0,rr=0,gg=0,bb=0;
  for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const xx=x0+dx,yy=y0+dy;if(xx<0||xx>=c.width||yy<0||yy>=c.height)continue;const p=(yy*c.width+xx)*4,weight=(dx?sx-x0:1-sx+x0)*(dy?sy-y0:1-sy+y0)*(c.rgba[p+3]/255);aa+=weight;rr+=c.rgba[p]*weight;gg+=c.rgba[p+1]*weight;bb+=c.rgba[p+2]*weight;}
  const p=((cy+top+y)*2048+cx+left+x)*4;if(aa){atlas[p]=Math.round(rr/aa);atlas[p+1]=Math.round(gg/aa);atlas[p+2]=Math.round(bb/aa);atlas[p+3]=Math.round(aa*255);}
 }
 metadata.actors[names[k]]={rect:[cx,cy,512,512],bbox:[left,top,dw,dh],anchor:[256,486],source:c.source,scale};
 fs.writeFileSync(new URL(names[k]+'-master.rgba',outDir),c.rgba);
}
fs.writeFileSync(new URL('actors-v2.rgba',outDir),atlas);
fs.writeFileSync(new URL('actors-v2.json',outDir),JSON.stringify(metadata,null,2));
console.log(JSON.stringify(metadata,null,2));
