// Convert the generated chroma-key sprite into the game's transparent, foot-aligned canvas.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const input='tools/art/liubei-crouch-v1-keyed.png';
const info=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','json',input]));
const {width,height}=info.streams[0];
const pixels=execFileSync('ffmpeg',['-v','error','-i',input,'-pix_fmt','rgba','-f','rawvideo','-'],{maxBuffer:width*height*4+1024});
let left=width,top=height,right=-1,bottom=-1;
for(let p=0;p<pixels.length;p+=4){
  const r=pixels[p],g=pixels[p+1],b=pixels[p+2],spill=Math.max(0,Math.min(1,(Math.min(r,b)-g-8)/247)),alpha=1-spill;
  if(alpha<.025){pixels.fill(0,p,p+4);continue;}
  pixels[p]=Math.max(0,Math.min(255,Math.round((r-255*spill)/alpha)));
  pixels[p+1]=Math.min(255,Math.round(g/alpha));pixels[p+2]=Math.max(0,Math.min(255,Math.round((b-255*spill)/alpha)));pixels[p+3]=Math.round(alpha*pixels[p+3]);
  if(pixels[p+3]>32){const x=p/4%width,y=Math.floor(p/4/width);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
}
if(right<left||bottom<top)throw Error('Character silhouette is empty');
const w=right-left+1,h=bottom-top+1,crop=Buffer.alloc(w*h*4);
for(let y=0;y<h;y++)pixels.copy(crop,y*w*4,((top+y)*width+left)*4,((top+y)*width+right+1)*4);
fs.writeFileSync('output/liubei-crouch-crop.rgba',crop);
execFileSync('ffmpeg',['-v','error','-y','-f','rawvideo','-pixel_format','rgba','-video_size',`${w}x${h}`,'-i','output/liubei-crouch-crop.rgba','-frames:v','1','-vf','scale=430:340:force_original_aspect_ratio=decrease:flags=lanczos,pad=512:512:(ow-iw)/2:486-ih:color=0x00000000','-c:v','libwebp','-quality','88','-compression_level','6','assets/game/liubei-crouch-v1.webp']);
console.log('Packed assets/game/liubei-crouch-v1.webp');
