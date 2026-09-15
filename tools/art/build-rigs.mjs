// Hand-authored anatomical regions on the unscaled transparent source crops.
// These polygons avoid weapons, belts, coat tails and the shield.
import fs from 'node:fs';
const runtime=new URL('../../assets/game/',import.meta.url);
const atlas=JSON.parse(fs.readFileSync(new URL('actors-v2.json',import.meta.url),'utf8'));
const definitions={
 liubei:{amplitude:40,lift:32,bob:2,torso:[[0,0],[460,0],[460,309],[300,309],[267,300],[245,298],[220,290],[202,292],[178,304],[145,315],[110,321],[79,318],[49,308],[17,313],[0,320]],notes:'Far upper thigh is partly hidden by the robe and overlapping near thigh. Only visible green trouser and boot pixels are available; no hidden texture is fabricated.',legs:[
  {label:'far',hip:[207,317],knee:[129,357],ankle:[61,351],centerX:185,offset:0,bend:-1,
   upper:[[80,321],[116,323],[151,318],[183,309],[213,310],[222,326],[205,348],[177,370],[145,389],[119,393],[95,385],[80,367],[75,343]],
   lower:[[136,336],[152,361],[132,385],[108,388],[79,372],[55,365],[51,344],[72,337],[97,338]],
   foot:[[62,337],[61,363],[40,370],[24,381],[8,383],[0,374],[3,359],[17,335],[25,321],[35,319],[43,331]],heel:[29,321],toe:[3,376]},
  {label:'near',hip:[230,317],knee:[290,349],ankle:[323,401],centerX:244,offset:.5,bend:-1,
   upper:[[213,306],[249,305],[288,311],[312,322],[328,343],[327,359],[315,372],[295,367],[276,353],[255,352],[230,355],[206,345]],
   lower:[[288,350],[310,352],[323,365],[334,384],[339,400],[325,416],[309,413],[297,395],[282,378]],
   foot:[[320,392],[332,395],[345,387],[358,374],[366,369],[373,372],[374,386],[369,401],[352,420],[326,439],[312,442],[303,434],[301,423],[308,410]],heel:[313,437],toe:[370,384]}
 ]},
 enemy:{amplitude:43,lift:34,bob:1.5,notes:'Far thigh is partially occluded by red hanging cloth. The upper polygons begin under the belt; cloak, blade and lamellar skirt remain in the torso.',legs:[
  {label:'far',hip:[184,396],knee:[132,443],ankle:[62,457],centerX:178,offset:0,bend:-1,
   upper:[[144,383],[180,389],[202,408],[187,435],[174,458],[157,475],[132,479],[109,470],[94,451],[96,429],[109,408]],
   lower:[[119,419],[140,437],[130,461],[111,475],[87,478],[61,474],[47,460],[48,442],[68,431],[94,421]],
   foot:[[57,440],[68,451],[66,467],[59,484],[55,499],[48,509],[36,515],[23,509],[18,497],[18,483],[24,468],[35,454],[42,440]],heel:[45,443],toe:[29,506]},
  {label:'near',hip:[269,411],knee:[306,458],ankle:[319,512],centerX:282,offset:.5,bend:-1,
   upper:[[251,413],[273,416],[293,414],[319,423],[333,443],[337,458],[328,475],[308,485],[286,480],[274,463],[261,447]],
   lower:[[286,463],[309,468],[330,464],[335,486],[338,503],[335,520],[316,528],[299,520],[290,504],[281,481]],
   foot:[[308,505],[328,508],[343,505],[356,500],[371,500],[381,508],[389,521],[385,535],[365,544],[337,551],[307,557],[293,551],[289,539],[293,522]],heel:[300,552],toe:[383,530]}
 ]},
 enemyHeavy:{amplitude:40,lift:29,bob:1.5,protect:[[[110,304],[307,362],[332,380],[357,426],[292,428],[111,365],[106,329]]],notes:'Far upper thigh partly disappears behind the skirt and shield. Near boot and both visible shins have complete pixels; the hidden hip texture is not reconstructed.',legs:[
  {label:'far',hip:[338,396],knee:[387,438],ankle:[399,506],centerX:344,offset:0,bend:-1,
   upper:[[324,390],[348,391],[373,401],[396,417],[413,440],[411,456],[395,469],[372,470],[351,457],[335,435],[324,414]],
   lower:[[366,451],[392,457],[414,451],[418,474],[416,492],[416,512],[395,520],[376,514],[367,498],[359,475]],
   foot:[[386,500],[407,502],[422,500],[442,500],[456,506],[465,516],[468,532],[461,539],[431,543],[397,542],[367,539],[355,532],[355,519],[365,508]],heel:[360,538],toe:[465,536]},
  {label:'near',hip:[193,397],knee:[139,450],ankle:[93,506],centerX:179,offset:.5,bend:-1,
   upper:[[154,377],[188,388],[215,407],[217,431],[201,451],[180,466],[155,474],[136,468],[116,457],[104,440],[110,420],[131,396]],
   lower:[[116,432],[141,441],[158,461],[145,481],[129,501],[116,516],[93,520],[71,511],[69,493],[79,470],[93,447]],
   foot:[[76,491],[98,496],[116,501],[122,514],[123,530],[118,542],[102,545],[66,544],[40,539],[35,529],[37,516],[48,504],[60,497]],heel:[40,537],toe:[118,541]}
 ]}
};
const result={cell:512,actors:{}};
for(const [name,spec]of Object.entries(definitions)){
 const m=atlas.actors[name],s=m.scale,left=m.bbox[0],top=m.bbox[1];
 const point=p=>[+(left+p[0]*s).toFixed(2),+(top+p[1]*s).toFixed(2)];
 const legs=spec.legs.map(leg=>{
  const out={label:leg.label,hip:point(leg.hip),knee:point(leg.knee),ankle:point(leg.ankle),centerX:+(left+leg.centerX*s).toFixed(2),offset:leg.offset,bend:leg.bend};
  for(const key of ['upper','lower','foot'])out[key]=leg[key].map(point);
  out.heel=point(leg.heel);out.toe=point(leg.toe);
  const rotation=-Math.atan2(out.toe[1]-out.heel[1],out.toe[0]-out.heel[0]);
  const sole=Math.max(...out.foot.map(p=>(p[0]-out.ankle[0])*Math.sin(rotation)+(p[1]-out.ankle[1])*Math.cos(rotation)));
  out.ground=+(486-sole).toFixed(2);
  return out;
 });
 if(name==='liubei'){const far=legs[0],near=legs[1];legs[0]={...near,label:'far',targetHip:far.hip,centerX:far.centerX,offset:0};}
 legs[0].centerX=name==='liubei'?240:238;legs[1].centerX=250;
 result.actors[name]={protect:spec.protect?.map(poly=>poly.map(point)),torso:spec.torso?.map(point),anchor:[256,486],amplitude:spec.amplitude,lift:spec.lift,bob:spec.bob,notes:spec.notes,legs};
}
fs.writeFileSync(new URL('rigs.json',runtime),JSON.stringify(result,null,2));
console.log(JSON.stringify(Object.fromEntries(Object.entries(result.actors).map(([k,v])=>[k,v.legs.map(l=>({hip:l.hip,knee:l.knee,ankle:l.ankle,ground:l.ground}))])),null,2));
