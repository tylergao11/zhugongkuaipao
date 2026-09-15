// Read-only reference audit for the browser entrypoint. No game or save data is executed.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const queue=['index.html'],visited=new Set(),missing=[];
const textTypes=new Set(['.html','.css','.js','.json','.webmanifest']);
while(queue.length){
  const relative=queue.shift();if(visited.has(relative))continue;visited.add(relative);
  const full=path.resolve(root,relative);
  if(!fs.existsSync(full)){missing.push(relative);continue;}
  if(!textTypes.has(path.extname(relative)))continue;
  const body=fs.readFileSync(full,'utf8');
  for(const hit of body.matchAll(/["']([^"'\r\n]+\.(?:js|css|webp|png|svg|mp3|json|webmanifest))["']/g)){
    const ref=hit[1];if(/^(https?:|data:)/.test(ref)||ref.includes('${')||ref.startsWith('.')){
      if(!ref.startsWith('./')&&!ref.startsWith('../'))continue;
    }
    const target=path.resolve(ref.startsWith('assets/')?root:path.dirname(full),ref);
    if(!target.startsWith(root))continue;
    queue.push(path.relative(root,target).replaceAll('\\','/'));
  }
}
const dir=path.join(root,'assets/game');
const assets=fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isFile()).map(e=>{
  const file='assets/game/'+e.name;
  return{file,bytes:fs.statSync(path.join(dir,e.name)).size,referenced:visited.has(file)};
});
const report={entry:'index.html',missing,referenced:assets.filter(a=>a.referenced),unused:assets.filter(a=>!a.referenced),totalBytes:assets.reduce((n,a)=>n+a.bytes,0),runtimeBytes:assets.filter(a=>a.referenced).reduce((n,a)=>n+a.bytes,0)};
if(process.argv[2])fs.writeFileSync(path.resolve(root,process.argv[2]),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({missing,unused:report.unused,totalBytes:report.totalBytes,runtimeBytes:report.runtimeBytes},null,2));
if(missing.length)process.exitCode=1;
