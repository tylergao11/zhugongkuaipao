import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const args=process.argv.slice(2);
const configName=args.find(arg=>arg.startsWith('--catalog='))?.slice('--catalog='.length)||'catalog.json';
const config=JSON.parse(fs.readFileSync(path.resolve(here,configName),'utf8'));
const pngDir=path.join(here,'png'), runtime=path.join(root,'assets/game');
fs.mkdirSync(pngDir,{recursive:true});
const selected=new Set(args.filter(arg=>!arg.startsWith('--')));
const manifestName=args.find(arg=>arg.startsWith('--manifest='))?.slice('--manifest='.length)||'art-v3.json';
const manifestFile=path.join(runtime,manifestName);
const manifest=fs.existsSync(manifestFile)?JSON.parse(fs.readFileSync(manifestFile,'utf8')):{atlases:{},sprites:{},doors:{}};
function read(file){
 const {width,height}=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','json',file])).streams[0];
 const pixels=execFileSync('ffmpeg',['-v','error','-i',file,'-frames:v','1','-f','rawvideo','-pix_fmt','rgba','pipe:1'],{maxBuffer:width*height*4+4096});
 for(let p=0;p<pixels.length;p+=4){
  const r=pixels[p],g=pixels[p+1],b=pixels[p+2];
  let spill=Math.max(0,Math.min(1,(Math.min(r,b)-g-8)/247));
  if(r>210&&b>210&&g<55)spill=1;
  const a=1-spill;
  if(a<.025){pixels.fill(0,p,p+4);continue;}
  pixels[p]=Math.max(0,Math.min(255,Math.round((r-255*spill)/a)));
  pixels[p+1]=Math.min(255,Math.round(g/a));
  pixels[p+2]=Math.max(0,Math.min(255,Math.round((b-255*spill)/a)));
  pixels[p+3]=Math.round(pixels[p+3]*a);
 }
 return{width,height,pixels};
}
function slice(image,x,y,w,h){
 const pixels=Buffer.alloc(w*h*4);
 for(let yy=0;yy<h;yy++)image.pixels.copy(pixels,yy*w*4,((y+yy)*image.width+x)*4,((y+yy)*image.width+x+w)*4);
 return{width:w,height:h,pixels};
}
function bounds(image){
 let x0=image.width,y0=image.height,x1=-1,y1=-1;
 for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++)if(image.pixels[(y*image.width+x)*4+3]>24){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 if(x1<0)throw Error('Empty sprite after chroma key');
 return{x0,y0,x1,y1,width:x1-x0+1,height:y1-y0+1};
}
// Premultiplied-alpha bilinear sampling avoids magenta/dark fringes on thin outlines.
function place(source,box,dest,destWidth,left,top,dw,dh){
 const sxScale=box.width/dw,syScale=box.height/dh;
 for(let y=0;y<dh;y++)for(let x=0;x<dw;x++){
  const sx=box.x0+(x+.5)*sxScale-.5,sy=box.y0+(y+.5)*syScale-.5,x0=Math.floor(sx),y0=Math.floor(sy);
  let aa=0,rr=0,gg=0,bb=0;
  for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
   const xx=x0+dx,yy=y0+dy;if(xx<0||yy<0||xx>=source.width||yy>=source.height)continue;
   const p=(yy*source.width+xx)*4,w=(dx?sx-x0:1-sx+x0)*(dy?sy-y0:1-sy+y0)*source.pixels[p+3]/255;
   aa+=w;rr+=source.pixels[p]*w;gg+=source.pixels[p+1]*w;bb+=source.pixels[p+2]*w;
  }
  const p=((top+y)*destWidth+left+x)*4;
  if(aa>.01){dest[p]=Math.round(rr/aa);dest[p+1]=Math.round(gg/aa);dest[p+2]=Math.round(bb/aa);dest[p+3]=Math.round(aa*255);}
 }
}
function save(file,width,height,pixels,webp=false){
 const args=['-v','error','-y','-f','rawvideo','-pixel_format','rgba','-video_size',`${width}x${height}`,'-i','pipe:0','-frames:v','1'];
 if(webp)args.push('-c:v','libwebp','-quality',String(config.quality),'-compression_level','6');
 execFileSync('ffmpeg',[...args,file],{input:pixels,maxBuffer:1024*1024});
 return fs.statSync(file).size;
}
for(const sheet of config.sheets){
 if(selected.size&&!selected.has(sheet.id))continue;
 const sourcePath=path.join(here,'sources',sheet.id+'.png');
 if(!fs.existsSync(sourcePath)){console.log('Pending '+sheet.id);continue;}
 const image=read(sourcePath);
 const tiles=sheet.names.map((_,i)=>{
  const override=sheet.sourceOverrides?.[i];
  if(override){const alternate=read(path.join(here,override.file));return slice(alternate,...override.rect);}
  if(sheet.sourceRects?.[i])return slice(image,...sheet.sourceRects[i]);
  const col=i%sheet.cols,row=Math.floor(i/sheet.cols),x=Math.round(col*image.width/sheet.cols),y=Math.round(row*image.height/sheet.rows);
  return slice(image,x,y,Math.round((col+1)*image.width/sheet.cols)-x,Math.round((row+1)*image.height/sheet.rows)-y);
 });
 const boxes=tiles.map(bounds);
 for(const group of sheet.lockedGroups||[]){
  const b={x0:Math.min(...group.map(i=>boxes[i].x0)),y0:Math.min(...group.map(i=>boxes[i].y0)),x1:Math.max(...group.map(i=>boxes[i].x1)),y1:Math.max(...group.map(i=>boxes[i].y1))};
  b.width=b.x1-b.x0+1;b.height=b.y1-b.y0+1;for(const i of group)boxes[i]=b;
 }
 const width=sheet.cols*sheet.cell,height=sheet.rows*sheet.cell,pixels=Buffer.alloc(width*height*4);
 for(let i=0;i<tiles.length;i++){
  const box=boxes[i],scale=Math.min(sheet.cell*(1-2*config.margin)/box.width,sheet.cell*(config.foot-config.margin)/box.height);
  const dw=Math.round(box.width*scale),dh=Math.round(box.height*scale),cx=i%sheet.cols*sheet.cell,cy=Math.floor(i/sheet.cols)*sheet.cell;
  const left=Math.round((sheet.cell-dw)/2),top=Math.round(sheet.align==='center'?(sheet.cell-dh)/2:sheet.cell*config.foot-dh);
  place(tiles[i],box,pixels,width,cx+left,cy+top,dw,dh);
  manifest.sprites[sheet.names[i]]={atlas:sheet.id,tile:i,rect:[cx,cy,sheet.cell,sheet.cell],bbox:[left,top,dw,dh],anchor:[sheet.cell/2,Math.round(sheet.cell*(sheet.align==='center'?.5:config.foot))]};
 }
 const png=path.join(pngDir,sheet.id+'.png');save(png,width,height,pixels);
 if(sheet.splitDoor){
  // Split the shared full frame at its central seam; equal frames preserve hinge alignment.
  for(const [side,index] of [['left',0],['right',1]]){
   const half=slice({width,height,pixels},index*width/2,0,width/2,height),id='gate-door-'+side+'-v1';
   save(path.join(pngDir,id+'.png'),half.width,half.height,half.pixels);
   const bytes=save(path.join(runtime,id+'.webp'),half.width,half.height,half.pixels,true);
   manifest.doors[side]={url:'assets/game/'+id+'.webp',png:'tools/art/v3/png/'+id+'.png',width:half.width,height:half.height,closedOffset:[index*half.width,0],bytes};
  }
  const fullSprite=manifest.sprites[sheet.names[0]];
  delete manifest.sprites[sheet.names[0]];
  manifest.doorFrame={width,height,bbox:fullSprite.bbox,anchor:fullSprite.anchor,source:'docs/maps/changban-vertical-v6.webp',note:'Two equal half frames of one closed arch. Fit together to the map aperture at integration time.'};
  console.log(sheet.id+' split into two door leaves');
  continue;
 }
 const bytes=save(path.join(runtime,sheet.id+'.webp'),width,height,pixels,true);
 manifest.atlases[sheet.id]={url:'assets/game/'+sheet.id+'.webp',cols:sheet.cols,rows:sheet.rows,cell:sheet.cell,width,height,bytes,png:'tools/art/v3/png/'+sheet.id+'.png'};
 if(sheet.exportIndividual)for(let i=0;i<sheet.names.length;i++){
  const tile=slice({width,height,pixels},i%sheet.cols*sheet.cell,Math.floor(i/sheet.cols)*sheet.cell,sheet.cell,sheet.cell);
  save(path.join(pngDir,sheet.names[i]+'.png'),sheet.cell,sheet.cell,tile.pixels);
 }
 console.log(JSON.stringify({id:sheet.id,width,height,sprites:sheet.names.length,bytes,KB:Math.round(bytes/1024)}));
}
fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
