// Convert generated RGB checkerboard exports into runtime RGBA sprite atlases.
// Offline build utility; never loaded by the game.
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
function extract(source,count,rows){
  const {width:w,height:h,rgb}=source,N=w*h,mask=new Uint8Array(N),seen=new Uint8Array(N),queue=new Int32Array(N);
  for(let i=0;i<N;i++){const r=rgb[i*3],g=rgb[i*3+1],b=rgb[i*3+2];mask[i]=(Math.max(r,g,b)-Math.min(r,g,b)>19||Math.min(r,g,b)<58)?1:0;}
  // Restore enclosed pale parts such as eyes and clothing, while preserving
  // checkerboard holes inside bows and between crossed weapons.
  for(let i=0;i<N;i++)if(!mask[i]&&!seen[i]){
    let start=0,end=1;queue[0]=i;seen[i]=1;let edge=false,sum=0,sum2=0;
    while(start<end){const p=queue[start++],x=p%w,y=Math.floor(p/w),v=rgb[p*3];sum+=v;sum2+=v*v;if(x===0||y===0||x===w-1||y===h-1)edge=true;const ns=[x>0?p-1:-1,x<w-1?p+1:-1,y>0?p-w:-1,y<h-1?p+w:-1];for(const q of ns)if(q>=0&&!mask[q]&&!seen[q]){seen[q]=1;queue[end++]=q;}}
    const deviation=Math.sqrt(Math.max(0,sum2/end-(sum/end)**2));
    if(!edge&&(end<700||deviation<34))for(let j=0;j<end;j++)mask[queue[j]]=1;
  }
  // Select full object components before packing: long weapons may extend
  // beyond the original visual grid but are never clipped by a cell boundary.
  seen.fill(0);const components=[];
  for(let i=0;i<N;i++)if(mask[i]&&!seen[i]){
    let start=0,end=1;queue[0]=i;seen[i]=1;let x0=w,y0=h,x1=0,y1=0;
    while(start<end){const p=queue[start++],x=p%w,y=Math.floor(p/w);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,q=yy*w+xx;if(xx>=0&&xx<w&&yy>=0&&yy<h&&mask[q]&&!seen[q]){seen[q]=1;queue[end++]=q;}}}
    if(end>100)components.push({pixels:Int32Array.from(queue.subarray(0,end)),x0,y0,x1,y1,area:end});
  }
  const big=components.filter(c=>c.area>2500).sort((a,b)=>(Math.floor((a.y0+a.y1)/2/(h/rows))-Math.floor((b.y0+b.y1)/2/(h/rows)))||a.x0-b.x0);
  if(big.length!==count*rows)throw Error(`Expected ${count*rows} objects, found ${big.length}: ${JSON.stringify(big.map(c=>[c.x0,c.y0,c.x1,c.y1,c.area]))}`);
  const outW=count*256,outH=rows*256,rgba=Buffer.alloc(outW*outH*4),placements=[];
  for(let k=0;k<big.length;k++){
    const c=big[k],pixels=new Uint8Array(N);for(const p of c.pixels)pixels[p]=1;
    // Detached sweat, tassels, and flame tips close to the body stay attached.
    for(const small of components)if(small.area<=2500&&small.x0>c.x0-24&&small.x1<c.x1+35&&small.y0>c.y0-55&&small.y1<c.y1+15){for(const p of small.pixels)pixels[p]=1;c.x0=Math.min(c.x0,small.x0);c.y0=Math.min(c.y0,small.y0);c.x1=Math.max(c.x1,small.x1);c.y1=Math.max(c.y1,small.y1);}
    const sw=c.x1-c.x0+1,sh=c.y1-c.y0+1,scale=Math.min(238/sw,228/sh),dw=Math.round(sw*scale),dh=Math.round(sh*scale),left=k%count*256+Math.round((256-dw)/2),top=Math.floor(k/count)*256+240-dh;
    for(let y=0;y<dh;y++)for(let x=0;x<dw;x++){
      const sx=c.x0+(x+.5)/scale-.5,sy=c.y0+(y+.5)/scale-.5,x0=Math.floor(sx),y0=Math.floor(sy);let aa=0,rr=0,gg=0,bb=0;
      for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const xx=x0+dx,yy=y0+dy;if(xx<0||xx>=w||yy<0||yy>=h)continue;const p=yy*w+xx,weight=(dx?sx-x0:1-sx+x0)*(dy?sy-y0:1-sy+y0)*(pixels[p]?1:0);aa+=weight;rr+=rgb[p*3]*weight;gg+=rgb[p*3+1]*weight;bb+=rgb[p*3+2]*weight;}
      const p=((top+y)*outW+left+x)*4;if(aa>0){rgba[p]=Math.round(rr/aa);rgba[p+1]=Math.round(gg/aa);rgba[p+2]=Math.round(bb/aa);rgba[p+3]=Math.round(aa*255);}
    }
    placements.push({cell:[k%count*256,Math.floor(k/count)*256,256,256],foot:[128,240],source:[c.x0,c.y0,sw,sh]});
  }
  return {rgba,width:outW,height:outH,placements};
}
const outDir=new URL('.',import.meta.url);
for(const [name,file,cols,rows] of [['props','exec-db2caf2a-f0e7-429c-b9a4-faefa83d956c.png',3,1]]){
  const result=extract(readPNG(folder+file),cols,rows);
  fs.writeFileSync(new URL(name+'.rgba',outDir),result.rgba);
  fs.writeFileSync(new URL(name+'.json',outDir),JSON.stringify({width:result.width,height:result.height,placements:result.placements},null,2));
  console.log(name,result.width,result.height,result.placements);
}
