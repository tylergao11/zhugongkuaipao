// Derive the battle lock from the approved chest render, then compress for mobile.
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const sharp=createRequire('C:/Users/84720/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json')('sharp');
const root=new URL('../../assets/game/',import.meta.url);
const source=await fs.readFile(new URL('camp-chest-v1.webp',root));
const mask=Buffer.from('<svg width="100" height="136" xmlns="http://www.w3.org/2000/svg"><path fill="white" d="M9 30 L22 16 L45 5 L64 9 L81 24 L94 37 L94 64 L83 84 L72 88 L77 105 L70 122 L54 132 L40 129 L29 117 L27 101 L31 88 L19 80 L9 63 Z"/></svg>');
const cutout=await sharp(source).extract({left:224,top:94,width:100,height:136}).composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
const buffer=await sharp(cutout).resize({height:110}).webp({quality:80,alphaQuality:100,effort:6}).toBuffer();
await fs.writeFile(new URL('battle-lock-v1.webp',root),buffer);
console.log('battle-lock-v1.webp',buffer.length,'bytes');
// The former popup exports contained an entire unused battlefield around the dialog.
for(const [name,left,top,width,height]of [['pause',296,157,1080,612],['win',296,146,1081,635],['loss',279,151,1116,647]]){
  const master=new URL('battle-popup-'+name+'-master.webp',import.meta.url);
  try{await fs.access(master);}catch{await fs.copyFile(new URL('battle-popup-'+name+'-v1.webp',root),master);}
  const cropped=await sharp(await fs.readFile(master)).extract({left,top,width,height}).resize({width:1000,withoutEnlargement:true}).webp({quality:80,effort:6}).toBuffer();
  await fs.writeFile(new URL('battle-popup-'+name+'-v2.webp',root),cropped);
  console.log('battle-popup-'+name+'-v2.webp',cropped.length,'bytes');
}
