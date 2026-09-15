// Production slices of the approved render. No runtime PNGs or duplicated scenes.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const modules=process.env.CODEX_NODE_PACKAGES||'C:/Users/84720/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const sharp=createRequire(path.join(modules,'package.json'))('sharp');
const generated='C:/Users/84720/.codex/generated_images/01a0a4d7-e504-7801-b510-6c04333f0205';
const out=new URL('../../assets/game/',import.meta.url);
const masters=new URL('./',import.meta.url);
const sources={home:'exec-df12e052-8646-4a00-978f-0b5838b10343.png',header:'exec-3e9eaa7c-4caa-4e68-b201-7208132f4f7f.png',scenes:'exec-a73d81ab-f4c6-447e-bcf1-eaac273daa6f.png',kit:'exec-bb9c7063-6439-40c5-96eb-3aab0981fc28.png',design:'exec-dc47e094-5663-4ac7-b025-57b169752c8e.png'};
for(const [id,file]of Object.entries(sources))await fs.copyFile(path.join(generated,file),new URL('camp-'+id+'-v1-master.png',masters));
const report=[];
async function save(name,pipeline,width,quality=76,version=1){
 const file='camp-'+name+'-v'+version+'.webp',buffer=await pipeline.resize({width,withoutEnlargement:true}).webp({quality,alphaQuality:100,effort:6}).toBuffer();
 await fs.writeFile(new URL(file,out),buffer);const m=await sharp(buffer).metadata();report.push({file,bytes:buffer.length,width:m.width,height:m.height});
}
const original=await fs.readFile(new URL('camp-home-v1-master.png',masters));
const {data:header,info:headerInfo}=await sharp(await fs.readFile(new URL('camp-header-v1-master.png',masters))).resize(1672,941).extract({left:0,top:0,width:590,height:145}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
for(let y=0;y<145;y++)for(let x=0;x<590;x++)header[(y*590+x)*4+3]=Math.round(255*Math.min(1,(590-x)/20,(145-y)/15));
const patch=await sharp(header,{raw:headerInfo}).png().toBuffer();
const home=await sharp(original).composite([{input:patch,left:0,top:0}]).png().toBuffer();
await fs.writeFile(new URL('camp-home-v2-master.png',masters),home);
await save('home',sharp(home),1440,77,2);
await save('backdrop',sharp(await fs.readFile(new URL('camp-scenes-v1-master.png',masters))).extract({left:0,top:668,width:1182,height:662}),1182,72);
const regions={gold:[22,175,465,155,520],ivory:[500,180,455,150,480],card:[985,38,268,413,280],paper:[1300,27,455,422,560],back:[48,520,292,283,96],brush:[374,535,580,270,520],coin:[982,530,268,270,80],chest:[1294,486,458,339,440]};
for(const [name,[left,top,width,height,size]]of Object.entries(regions)){
 const {data,info}=await sharp(await fs.readFile(new URL('camp-kit-v1-master.png',masters))).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 // The render includes a gray checker matte. Remove only neutral exterior pixels;
 // an edge flood leaves the warm opaque paper interiors and ink borders intact.
 const seen=new Uint8Array(width*height),queue=new Int32Array(width*height);let head=0,tail=0;
 const visit=p=>{if(seen[p])return;seen[p]=1;const i=p*4,r=data[i],g=data[i+1],b=data[i+2];if(Math.max(r,g,b)-Math.min(r,g,b)<19&&Math.min(r,g,b)>130){data[i+3]=0;queue[tail++]=p;}};
 for(let x=0;x<width;x++){visit(x);visit((height-1)*width+x);}for(let y=0;y<height;y++){visit(y*width);visit(y*width+width-1);}
 while(head<tail){const p=queue[head++],x=p%width,y=Math.floor(p/width);if(x)visit(p-1);if(x<width-1)visit(p+1);if(y)visit(p-width);if(y<height-1)visit(p+width);}
 await save(name,sharp(data,{raw:info}).trim({threshold:8}),size,name==='chest'?80:77);
}
await fs.copyFile(new URL('camp-design-v1-master.png',masters),new URL('../../output/camp-ui-design-v1.png',import.meta.url));
const total=report.reduce((n,f)=>n+f.bytes,0);
await fs.writeFile(new URL('../../output/camp-ui-assets.json',import.meta.url),JSON.stringify({totalBytes:total,files:report},null,2));
console.log(JSON.stringify({totalBytes:total,files:report},null,2));
