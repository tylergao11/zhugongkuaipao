import {LIUBEI_THEME,DEFAULT_DECK,DECK_CARDS,MAX_DECK_SIZE} from './theme.js';
import {levelById,COMMANDERS,UNIT_NAMES,equipmentById,TACTICS} from './content.js';
import {GRID_SPACING,BATTLE,UNIT_STATS,ENEMY_STATS,VARIANT_RULES,TACTIC_STATS,PERKS} from './assets/game/balance.js';
export {GRID_SPACING};
export const WIDTH = 1440, HEIGHT = 810;
export const rangeLabel = def => def.range>=GRID_SPACING ? `${Math.round(def.range/GRID_SPACING*10)/10} 格` : def.range ? '近身' : '—';
// Feet align to the painted floor surfaces in town-v1.webp (bottom to top).
export const FLOOR_Y = [665, 433, 236];
export const CARD_ORDER = [...DECK_CARDS];
export const TYPES = {
  zhangfei: {unique:true,locked:true,color:'#d46b49',skill:'长坂怒吼',shortSkill:'怒吼',help:'怒吼打断冲锋与举盾'},
  guanyu: {unique:true,locked:true,color:'#81bc71',skill:'青龙横扫',shortSkill:'横扫',help:'横扫正面敌军并破盾'},
  zhugeliang: {ranged:true,unique:true,locked:true,color:'#90d9e5',skill:'借东风',shortSkill:'东风',help:'群体击退并减速 · 方向由站位决定'},
  archer: {ranged:true,color:'#e7bd68',help:'可越过拒马射击 · 可射落伞兵'},
  lancer: {locked:true,color:'#aec779',help:'提前架枪 · 迎击截停冲锋'},
  shieldbearer: {locked:true,color:'#b6bf7b',help:'正面架盾 · 可与相邻普通兵换位'},
  barricade: {color:'#c79d69',help:'占一格 · 阻挡追兵'},
  log: {locked:true,instant:true,color:'#d6ab70',help:'滚动撞兵并推退'},
  oil: {locked:true,instant:true,color:'#ff9451',help:'持续灼烧 · 破除举盾'},
  ballista: {ranged:true,device:true,locked:true,color:'#92c47c',help:'固定朝向 · 穿透纵队 · 大盾拦截'},
  catapult: {ranged:true,device:true,locked:true,color:'#e4bb69',help:'范围抛射 · 近处打不到'},
  snare: {device:true,trap:true,locked:true,color:'#bac995',help:'踩中震晕 · 一次性'}
};
for(const [id,stats]of Object.entries(UNIT_STATS))Object.assign(TYPES[id],stats);
for(const t of TACTICS)TYPES[t.id]={name:t.name,cost:t.cost,instant:true,tactic:true,damage:0,range:0,color:'#b7d5c8',help:t.effect+' '+t.tradeoff};
for(const [id,name]of Object.entries(UNIT_NAMES))TYPES[id].name=name;
export function unitStatsFor(type,equipment){
 const def=TYPES[type],item=equipmentById(equipment),gear=item?.unit===type?item:null,variant=gear?.id||null;
 return {...def,variant,range:VARIANT_RULES[variant]?.range??def.range,skillRange:VARIANT_RULES[variant]?.skillRange??def.skillRange??0,
 help:gear?gear.effect+' '+gear.tradeoff:def.help};
}
export const ENEMY_TYPES = Object.fromEntries(Object.entries({
  soldier: {name:'曹兵',color:'#d68b64'},
  shield: {name:'锅盖校尉',color:'#e9c366',skill:'铁壁举盾',help:'举盾挡正面直射 · 控制破盾'},
  runner: {name:'草鞋飞贼',color:'#ff985a',skill:'加钱冲刺',help:'间歇冲刺 · 容易被震晕'},
  drummer: {name:'催命鼓手',color:'#bd9fff',skill:'敲鼓催军',help:'击鼓加快附近同伴'},
  airborne: {name:'油纸伞兵',color:'#8ddcda',help:'空降后排 · 落点提前预警'},
  caohong: {name:'曹洪',color:'#f5ca70',skill:'重金悬赏',boss:true},
  xiahou: {name:'夏侯惇',color:'#ff8b64',skill:'蛮牛冲阵',boss:true},
  caocao: {name:'曹操',color:'#d8362a',skill:'亲至',boss:true,sweeper:true,help:'碰到主公即败 · 不能被震晕或击退，只能减速'}
}).map(([id,def])=>[id,{...def,...ENEMY_STATS[id]}]));
const points = [[65,665],[1400,665],[1300,433],[42,433],[160,236],[1370,236]];
export const SEGMENTS = [];
let length = 0;
for (let i = 0; i < points.length - 1; i++) {
  const a = points[i], b = points[i + 1], len = Math.hypot(b[0]-a[0], b[1]-a[1]);
  SEGMENTS.push({ a, b, start: length, len, floor: i === 0 ? 0 : i === 2 ? 1 : i === 4 ? 2 : -1 }); length += len;
}
export const ROUTE_LENGTH = length;
export const CAOZHANG_GATE = {x:1300,y:FLOOR_Y[1],floor:1,s:SEGMENTS[2].start,};
export function locate(s) {
  s = Math.max(0, Math.min(ROUTE_LENGTH, s));
  const seg = SEGMENTS.find(g => s <= g.start + g.len) || SEGMENTS.at(-1);
  const t = Math.min(1, Math.max(0, (s - seg.start) / seg.len));
  return { x: seg.a[0] + (seg.b[0]-seg.a[0])*t, y: seg.a[1] + (seg.b[1]-seg.a[1])*t, floor: seg.floor, dir: Math.sign(seg.b[0]-seg.a[0]) };
}
export const SLOTS = Array.from({ length: 18 }, (_, id) => {
  const floor = Math.floor(id/6), col = id%6, x = 270 + col*GRID_SPACING, seg = SEGMENTS[floor*2];
  return { id, floor, col, x, y: FLOOR_Y[floor], s: seg.start + Math.abs(x-seg.a[0]) };
});
const live=e=>e.hp>0&&!e.escaped;
const grounded=e=>live(e)&&!(e.airborne>0);
const sweeper=e=>!!ENEMY_TYPES[e.role]?.sweeper;
export class Game{
 constructor(loadout={}){this.reset(loadout);}
 reset(loadout=this.loadout||{}){
  this.loadout={themeId:loadout.themeId||LIUBEI_THEME.id,levelId:levelById(loadout.levelId).id,deck:[...(loadout.deck||DEFAULT_DECK)],unlocked:[...(loadout.unlocked||DEFAULT_DECK)],equipment:{...loadout.equipment}};
  this.themeId=this.loadout.themeId;this.level=levelById(this.loadout.levelId);
  this.deck=[...new Set(this.loadout.deck)].filter(id=>this.isUnlocked(id)).slice(0,MAX_DECK_SIZE);
  this.types=Object.fromEntries(Object.keys(TYPES).map(id=>[id,unitStatsFor(id,this.loadout.equipment[id])]));
  this.mode='ready';this.time=0;this.gold=BATTLE.startingGold+(this.level.startingGoldBonus||0);this.incomePerSecond=BATTLE.incomePerSecond;this.kills=0;this.rescues=0;this.captures=0;
  this.liu={s:BATTLE.liu.start,carrier:null,walk:0,dash:0,mounted:false,mountWalk:0};this.bestProgress=this.liu.s/ROUTE_LENGTH;
  const mount=this.level.mount,road=mount&&SEGMENTS[mount.floor*2];
  this.mount=mount?{...mount,s:mount.progress!==undefined?ROUTE_LENGTH*mount.progress:road.start+road.len*mount.position,claimed:false}:null;
  this.intro=this.level.intro?{...this.level.intro,s:ROUTE_LENGTH*this.level.intro.progress,time:0,phase:'horse-talk'}:null;
  this.units=[];this.enemies=[];this.effects=[];this.events=[];this.selected=null;
  this.serial=0;this.spawned=0;this.groundSpawned=0;this.airborneSpawned=0;this.enemyLimit=this.level.phases.reduce((s,p)=>s+p.roles.length,0);
  this.phaseTimes={};this.spawnQueue=[];this.commanders=new Set();this.mechanisms=(this.level.mechanisms||[]).map(m=>({...m,slot:SLOTS.find(s=>s.floor===m.floor&&s.col===m.col),targetSlot:SLOTS.find(s=>s.floor===m.targetFloor&&s.col===m.col),used:false}));
  this.cooldowns={};this.heroCooldowns={};this.tacticsUsed=new Set();this.guardUsed=false;
  this.caozhangGateOpen=false;this.caozhangGateOpenedAt=0;this.gateWarningAt=null;this.gate=this.level.gate?{...CAOZHANG_GATE,...this.level.gate}:null;
  this.ferryStartedAt=null;this.ferryReady=false;this.decoy=null;this.shake=0;this.nextTalk=0;this.nextChatter=8;this.talkIndex=0;this.runId=null;this.rewardReceipt=null;this.bossCoins=0;
  this.caocao=null;this.lossBlame=null;
 }
 isUnlocked(id){return !!TYPES[id]&&(DEFAULT_DECK.includes(id)||this.loadout.unlocked.includes(id));}
 isEquipped(id){return this.deck.includes(id);}
 get defending(){return this.ferryStartedAt!==null&&!this.ferryReady;}
 get defenseRemaining(){return this.defending?Math.max(0,this.level.escape.wait-this.time+this.ferryStartedAt):0;}
 get liuCrouching(){return this.defending&&!this.liu.carrier&&this.liu.s>=ROUTE_LENGTH*this.level.escape.at;}
 event(type,values={}){this.events.push({...values,type});}
 bark(text,who='liubei',force=false){if(!force&&this.time<this.nextTalk)return;this.nextTalk=this.time+3.3;this.event('talk',{text,who});}
 start(){if(this.mode!=='ready'||!this.deck.some(id=>!TYPES[id].tactic))return false;this.mode=this.intro?'intro':'running';this.runId=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;this.event(this.intro?'intro-start':'start');return true;}
 canBuy(id){const d=this.types[id];return !!d&&this.isEquipped(id)&&this.isUnlocked(id)&&this.gold>=d.cost&&!(this.cooldowns[id]>0)&&!this.tacticsUsed.has(id)&&!(d.unique&&this.units.some(u=>u.type===id));}
 select(id){if(this.isEquipped(id))this.selected=id;}
 canPlace(type,id){return !!SLOTS[id]&&this.canBuy(type)&&(!this.requiresSlot(type)||!this.units.some(u=>u.hp>0&&u.slot===id));}
 requiresSlot(type){return !this.types[type]?.instant;}
 placementDirection(type,slot,dir){
  const road=SEGMENTS[slot.floor*2],towardEnemy=-Math.sign(road.b[0]-road.a[0]);
  return type==='log'?towardEnemy:dir===1||dir===-1?dir:towardEnemy;
 }
 deployUnit(type,slot,dir=this.placementDirection(type,slot)){
  const d=this.types[type],u={id:++this.serial,type,slot:slot.id,hp:d.hp,maxHp:d.hp,dir,fixedDir:dir,cooldown:BATTLE.deploymentDelay,skillCooldown:Math.max(BATTLE.heroReadyDelay,this.heroCooldowns[type]||0),guard:0,shieldReady:0,brace:UNIT_STATS.lancer.braceTime,attack:0,hit:0,born:this.time,variant:d.variant,level:1,invested:d.cost};
  if(d.unique)this.heroCooldowns[type]=u.skillCooldown;
  this.units.push(u);this.effect('summon',slot,{color:d.color});return u;
 }
 place(id,dir){
  if(this.mode!=='running')return false;
  const slot=SLOTS[id],type=this.selected,d=this.types[type];if(!slot||!d||!this.canBuy(type))return false;
  if(!this.canPlace(type,id))return false;
  dir=this.placementDirection(type,slot,dir);
  if(d.tactic&&!this.useTactic(type,slot))return false;
  this.gold-=d.cost;if(d.cooldown)this.cooldowns[type]=d.cooldown;
  if(type==='log')this.effects.push({kind:'log',floor:slot.floor,x:slot.x,y:slot.y,startX:slot.x,dir,life:d.duration,maxLife:d.duration,hit:new Set()});
  else if(type==='oil')this.zone('oil',slot,d.duration,d.radius,{damage:d.damage});
  else if(!d.instant)this.deployUnit(type,slot,dir);
  this.selected=null;this.event('place',{unitType:type,slot:id,x:slot.x,y:slot.y});return true;
 }
 useTactic(type,slot){
  if(type==='smoke')this.zone('smoke',slot,TACTIC_STATS.smoke.duration,TACTIC_STATS.smoke.radius);
  this.tacticsUsed.add(type);return true;
 }
 // Refund is half of everything spent on the individual (price + upgrades), scaled by remaining HP.
 dismantle(id){if(this.mode!=='running')return false;const i=this.units.findIndex(u=>u.slot===id);if(i<0)return false;const u=this.units[i];if(TYPES[u.type].tactic)return false;this.units.splice(i,1);this.gold+=this.refundOf(u);this.event('dismantle',{text:'已拆卸'});return true;}
 refundOf(u){return Math.floor((u.invested||TYPES[u.type].cost)*BATTLE.dismantleRefund*Math.max(0,Math.min(1,u.hp/u.maxHp)));}
 // Upgrades: damage scales through unitPower(); HP grows in place and the gain is healed on the spot. Level 2 unlocks the perk.
 canUpgrade(u){return !!u&&u.hp>0&&!TYPES[u.type].trap&&!TYPES[u.type].tactic&&(u.level||1)<BATTLE.upgrade.maxLevel;}
 upgradeCost(u){if(!this.canUpgrade(u))return 0;return Math.round(TYPES[u.type].cost*BATTLE.upgrade.costRatio[Math.min((u.level||1)-1,BATTLE.upgrade.costRatio.length-1)]);}
 unitPower(u){return Math.pow(BATTLE.upgrade.damageMultiplier,(u.level||1)-1);}
 perk(u){return u&&(u.level||1)>=BATTLE.upgrade.perkLevel?PERKS[u.type]||null:null;}
 upgrade(id){
  if(this.mode!=='running')return false;const u=this.units.find(u=>u.slot===id);
  const cost=this.upgradeCost(u);if(!cost||this.gold<cost)return false;
  this.gold-=cost;u.invested=(u.invested||TYPES[u.type].cost)+cost;u.level=(u.level||1)+1;
  const grown=Math.round(u.maxHp*BATTLE.upgrade.hpMultiplier);u.hp+=grown-u.maxHp;u.maxHp=grown;
  this.effect('summon',SLOTS[u.slot],{color:'#ffe07a'});this.event('upgrade',{unitType:u.type,slot:id,level:u.level,text:TYPES[u.type].name+' 升至 '+u.level+' 级'});return true;
 }
 unitAction(id,action,target){
  if(this.mode!=='running')return false;const u=this.units.find(u=>u.slot===id);if(!u)return false;
  if(action==='turn'){u.dir*=-1;u.fixedDir=u.dir;u.brace=UNIT_STATS.lancer.braceTime;u.shieldReady=UNIT_STATS.shieldbearer.turnRecovery;return true;}
  if(action==='swap'&&u.type==='shieldbearer'&&!(u.swapCooldown>0)){
   const v=this.units.find(v=>v.slot===target),d=v&&TYPES[v.type];if(!v||d.unique||d.device||d.trap||d.tactic||!d.damage||SLOTS[v.slot].floor!==SLOTS[u.slot].floor||Math.abs(SLOTS[v.slot].col-SLOTS[u.slot].col)!==1)return false;
   const a=SLOTS[u.slot].s,b=SLOTS[v.slot].s;if(this.enemies.some(e=>grounded(e)&&e.s>=Math.min(a,b)&&e.s<=Math.max(a,b)))return false;
   [u.slot,v.slot]=[v.slot,u.slot];u.swapCooldown=UNIT_STATS.shieldbearer.swapCooldown;u.shieldReady=UNIT_STATS.shieldbearer.turnRecovery;v.brace=UNIT_STATS.lancer.braceTime;this.effect('summon',SLOTS[u.slot],{color:'#b7d5c8'});return true;
  }return false;
 }
 effect(kind,p,extra={}){this.effects.push({kind,x:p.x,y:p.y,life:.65,maxLife:.65,...extra});}
 zone(kind,slot,life,radius,extra={}){this.effects.push({kind,floor:slot.floor,s:slot.s,x:slot.x,y:slot.y,life,maxLife:life,radius,...extra});}
 areaTargets({floor,x,radius}){return this.enemies.filter(e=>{const p=locate(e.s);return grounded(e)&&p.floor===floor&&Math.abs(p.x-x)<=radius;});}
 activateMechanism(id){
  const m=this.mechanisms.find(m=>m.id===id);if(this.mode!=='running'||!m||m.used||this.bestProgress<m.at)return false;
  if(id==='rockfall'){
   const target=m.targetSlot;if(!target)return false;
   this.effect('rockfall',target,{floor:target.floor,s:target.s,fromY:m.slot.y,fallTime:m.fallTime,damage:m.damage,stun:m.stun,life:m.fallTime+.6,maxLife:m.fallTime+.6,radius:m.radius,resolved:false});
  }else if(id==='war-gong'){
   const targets=this.enemies.filter(e=>live(e)&&locate(e.s).floor===m.slot.floor&&Math.abs(e.s-m.slot.s)<=m.radius);
   if(!targets.length){this.event('notice',{text:'范围内没有追兵'});return false;}
   for(const e of targets){
    if(e.airborne>0){e.airborne=0;e.parachuteBroken=true;this.effect('parachute-break',locate(e.s),{life:.8,maxLife:.8});}
    this.interrupt(e,m.stun);
   }
   this.effect('gong-wave',m.slot,{radius:m.radius,life:1,maxLife:1});
  }else if(id==='decoy'){
   if(!this.enemies.some(e=>grounded(e)&&!e.boss&&!e.carrying&&Math.abs(e.s-m.slot.s)<m.radius)){this.event('notice',{text:'附近没有能被木偶吸引的追兵。'});return false;}
   this.decoy={s:m.slot.s,carrier:null,radius:m.radius};this.bark('这个主公怎么有股稻草味？');
  }else return false;
  m.used=true;this.event('mechanism',{mechanismId:m.id,text:m.name+'已发动'});return true;
 }
 updatePhases(){
  for(const p of this.level.phases){
   if(this.phaseTimes[p.id]!==undefined||p.after&&(this.phaseTimes[p.after]===undefined||this.time-this.phaseTimes[p.after]<p.gap))continue;
   if(p.defenseAt!==undefined?this.ferryStartedAt===null||this.time-this.ferryStartedAt<p.defenseAt:this.bestProgress<p.at)continue;
   if(p.gate&&Math.abs(this.liu.s-this.gate.s)<this.gate.safeDistance)continue;
   this.phaseTimes[p.id]=this.time;
   if(p.gate)this.gateWarningAt=this.time;
   p.roles.forEach((role,i)=>this.spawnQueue.push({role,at:this.time+(p.delay||0)+(p.gate?this.gate.warning:0)+i*p.interval,gate:!!p.gate||!!this.gateWarningAt}));
  }
  if(this.gateWarningAt!==null&&!this.caozhangGateOpen&&this.time>=this.gateWarningAt+this.gate.warning&&Math.abs(this.liu.s-this.gate.s)>=this.gate.safeDistance){this.caozhangGateOpen=true;this.caozhangGateOpenedAt=this.time;this.event('gate-open',{text:'曹彰敌船已靠岸，押送接收点改为登岸口！'});}
  const due=this.spawnQueue.filter(w=>this.time>=w.at&&(!w.gate||this.caozhangGateOpen));this.spawnQueue=this.spawnQueue.filter(w=>!due.includes(w));
  for(const w of due){const e=this.spawn(w.role);if(w.role==='airborne'&&e)this.dropEnemy(e);}
  if(this.level.escape&&this.ferryStartedAt===null&&this.bestProgress>=this.level.escape.at){this.ferryStartedAt=this.time;this.liu.dash=0;this.event('defense-start');}
  const wasReady=this.ferryReady;this.ferryReady=this.ferryStartedAt!==null&&this.time-this.ferryStartedAt>=this.level.escape.wait;
  if(this.ferryReady&&!wasReady)this.event('defense-end');
  const cc=this.level.caocao;
  if(cc&&!this.caocao&&this.bestProgress>=cc.at)this.summonCaocao(cc);
 }
 spawn(role='soldier',at){
  if(this.spawned>=this.enemyLimit||!ENEMY_TYPES[role])return null;const d=ENEMY_TYPES[role];
  const e={id:++this.serial,s:at??(this.caozhangGateOpen?this.gate.s:0),hp:d.hp,maxHp:d.hp,role,type:d.boss?role:['shield','drummer'].includes(role)?'enemyHeavy':'enemy',boss:!!d.boss,heavy:role==='shield',runner:role==='runner',speed:d.speed,damage:d.damage,cooldown:BATTLE.enemy.attackDelay,skillCooldown:d.abilityDelay??BATTLE.enemy.abilityDelay,guard:0,dash:0,buff:0,bounty:0,windup:0,charge:0,exhausted:0,stun:0,root:0,attack:0,hit:0,slow:0,carrying:false,moving:true,direction:1,facing:1,walk:0,escaped:false,popDamage:0,nextPop:0};
  if(d.boss){if(at===undefined&&!this.caozhangGateOpen)e.s=Math.max(0,this.liu.s-BATTLE.enemy.bossDistance);this.commanders.add(role);this.event('commander',{hero:role,skill:COMMANDERS[role].skill,color:d.color});}
  this.enemies.push(e);this.spawned++;if(role==='airborne')this.airborneSpawned++;else this.groundSpawned++;
  if(this.spawned===this.enemyLimit)this.event('notice',{text:'最后一拨追兵！'});return e;
 }
 // 曹操亲至: he walks in at the street entrance and every Cao soldier on the map takes the drummer buff once.
 summonCaocao(cfg){
  this.enemyLimit++;const e=this.spawn('caocao',0);if(!e)return;
  this.caocao=e;e.objective='sweep';
  for(const f of this.enemies)if(live(f)&&f!==e)f.buff=Math.max(f.buff,cfg.rally);
  this.shake=.4;this.bark('曹操……他亲自来了！',true);
  this.event('caocao',{text:'曹操亲至 · 全军加速 · 被他碰到直接判负'});
 }
 dropEnemy(e){
  const drops=this.level.drops,preferred=drops?.slots[(this.airborneSpawned-1)%drops.slots.length];
  const choices=SLOTS.filter(s=>s.floor===(preferred?.floor??2)&&Math.abs(s.s-this.liu.s)>drops.safeDistance);
  const s=choices.find(s=>s.col===preferred?.col)||choices.sort((a,b)=>Math.abs(a.s-this.liu.s)-Math.abs(b.s-this.liu.s))[0];
  if(!s){e.escaped=true;return;}e.s=s.s;e.airborne=drops.warning;e.dropDuration=e.airborne;e.moving=false;
 }
 exitS(){return this.caozhangGateOpen?this.gate.s:0;}
 checkCarrierExit(e,from=e.s){if(this.mode!=='running'||!live(e)||!e.carrying||this.liu.carrier!==e.id)return false;const exit=this.exitS();if(Math.min(from,e.s)>exit||Math.max(from,e.s)<exit)return false;e.s=exit;this.liu.s=exit;this.lossReason=this.caozhangGateOpen?'caozhang-gate':'entrance';this.mode='lost';
  const blame=this.lossBlame;this.event('lost',{reason:this.lossReason,text:blame?`${ENEMY_TYPES[blame.role]?.name||'追兵'}在${this.level.floors[blame.floor]||'路上'}抓住主公，押到${this.caozhangGateOpen?'登岸口':'入口'}`:undefined});return true;}
 moveEnemy(e,s){const old=e.s;e.s=Math.max(0,Math.min(ROUTE_LENGTH,s));if(e.carrying)this.liu.s=e.s;return this.checkCarrierExit(e,old);}
 push(e,s){if(sweeper(e))return false;const p=locate(e.s);if(p.floor<0)return false;const seg=SEGMENTS[p.floor*2];return this.moveEnemy(e,Math.max(seg.start,Math.min(seg.start+seg.len,s)));}
 interrupt(e,seconds=1,keepGuard=false){if(sweeper(e))return;e.stun=Math.max(e.stun,seconds);if(!keepGuard)e.guard=0;e.dash=0;e.charge=0;e.windup=0;e.commandWindup=0;e.exhausted=Math.max(e.exhausted,BATTLE.interruptRecovery);}
 inSmoke(s){return this.effects.some(f=>f.kind==='smoke'&&f.life>0&&locate(s).floor===f.floor&&Math.abs(s-f.s)<f.radius);}
 setArmyDirection(){
  const exit=this.exitS(),lo=Math.min(exit,this.liu.s),hi=Math.max(exit,this.liu.s),obstacles=this.liu.carrier?this.units.filter(u=>this.blocks(u)&&SLOTS[u.slot].s>=lo&&SLOTS[u.slot].s<=hi):[];
  for(const e of this.enemies){if(!live(e))continue;e.objective='capture';e.goalS=this.liu.s;
   if(e.lastSeen===undefined||!this.inSmoke(this.liu.s)||Math.abs(e.s-this.liu.s)<BATTLE.enemy.smokeRevealDistance)e.lastSeen=this.liu.s;e.goalS=e.lastSeen;
   if(this.liu.carrier){if(e.carrying){e.objective='carry';e.goalS=exit;}else{const u=obstacles.reduce((a,u)=>!a||Math.abs(SLOTS[u.slot].s-e.s)<Math.abs(SLOTS[a.slot].s-e.s)?u:a,null);e.objective=u?'clear-path':'escort';e.goalS=u?SLOTS[u.slot].s:this.liu.s;}}
   else if(!e.boss&&!e.carrying){
    const taunt=this.units.find(u=>u.id===e.tauntedBy&&u.hp>0);
    if(e.taunt>0&&taunt){e.goalS=SLOTS[taunt.slot].s;e.objective='taunt';}
    else if(this.decoy?.carrier===e.id){e.goalS=0;e.objective='decoy-carry';}
    else if(this.decoy&&!this.decoy.carrier&&Math.abs(this.decoy.s-e.s)<this.decoy.radius){e.goalS=this.decoy.s;e.objective='decoy';}
    else {const chosen=this.enemies.find(f=>f.bounty>0&&grounded(f));if(chosen&&chosen!==e){const blocker=this.units.filter(u=>this.blocks(u)&&SLOTS[u.slot].s>chosen.s&&SLOTS[u.slot].s<this.liu.s).sort((a,b)=>Math.abs(SLOTS[a.slot].s-e.s)-Math.abs(SLOTS[b.slot].s-e.s))[0];if(blocker){e.goalS=SLOTS[blocker.slot].s;e.objective='clear-path';}}}
   }
   // 曹操 ignores smoke, decoys and the escort: he walks straight at Liu Bei, carried or not.
   if(sweeper(e)){e.objective='sweep';e.goalS=this.liu.s;}
   const direction=Math.sign(e.goalS-e.s)||e.direction;if(direction!==e.direction){e.guard=0;e.turning=BATTLE.enemy.turnDelay;e.direction=direction;}e.facing=locate(e.s).dir*e.direction;
  }
 }
 blocks(u){return u.hp>0&&!TYPES[u.type].trap;}
 capture(e){this.captures++;this.liu.carrier=e.id;e.carrying=true;e.dash=0;e.charge=0;this.liu.s=e.s;this.liu.dash=0;this.shake=.3;this.lossBlame={role:e.role,floor:locate(e.s).floor};this.event('capture',{text:'主公被抓！'});this.setArmyDirection();this.checkCarrierExit(e);}
 summonGuard(){if(this.mode!=='running'||this.guardUsed)return false;this.guardUsed=true;const p=locate(this.liu.s);this.effects.push({kind:'guard-arrival',...p,s:this.liu.s,life:3.6,maxLife:3.6,landed:false});this.event('skill',{hero:'zhaoyun',skill:'护驾！',color:'#adddf7'});return true;}
 landGuard(f){f.landed=true;f.s=this.liu.s;Object.assign(f,locate(f.s));for(const e of [...this.enemies])if(grounded(e)&&Math.abs(e.s-f.s)<BATTLE.guard.radius){this.interrupt(e,BATTLE.guard.stun);this.damage(e,BATTLE.guard.damage,'magic',true,f.s);}if(this.liu.carrier){const e=this.enemies.find(e=>e.id===this.liu.carrier);if(e)e.carrying=false;this.liu.carrier=null;this.rescues++;this.event('rescue',{text:'赵子龙救回主公！'});}this.effect('guard-impact',f);this.event('guard-land');}
 damage(e,amount,kind='physical',big=false,originS){
  if(!live(e)||(e.airborne>0&&kind!=='anti-air'))return false;
  const blocked=e.guard>0&&kind==='arrow'&&originS!==undefined&&(originS-e.s)*e.direction>0;
  if(blocked)amount=0;e.hp-=amount;e.hit=.13;const p=locate(e.s);
  if(kind!=='fire'||this.time>=e.nextPop){this.effect('hit',{x:p.x,y:p.y-60},{value:Math.round(amount),blocked,big,color:blocked?'#e9c366':kind==='fire'?'#ff995e':'#fff0ba'});e.nextPop=this.time+.4;}
  if(e.hp>0)return !blocked;
  this.kills++;this.gold+=ENEMY_TYPES[e.role].reward+(e.bounty>0?ENEMY_STATS.caohong.bountyReward:0);this.effect('death',p,{type:e.type,dir:e.facing});
  if(e.boss)this.event('commander-defeated',{role:e.role,enemyId:e.id,x:p.x,y:p.y});
  if(this.liu.carrier===e.id){this.liu.carrier=null;this.liu.s=e.s;this.rescues++;this.event('rescue',{text:'救回主公！'});}
  if(this.decoy?.carrier===e.id){this.decoy.carrier=null;this.decoy.s=e.s;}
  e.carrying=false;return true;
 }
 targets(u,skill=false){
  const d=this.types[u.type],slot=SLOTS[u.slot],air=u.type==='archer';
  const fixed=u.type==='ballista'||u.type==='shieldbearer';
  const reach=skill?d.skillRange:d.range+(this.perk(u)?.range||0)+(d.ranged?BATTLE.hitRadius:0);
  return this.enemies.filter(e=>live(e)&&(grounded(e)||air||skill&&u.type==='zhugeliang'&&!u.variant)&&locate(e.s).floor===slot.floor&&Math.abs(e.s-slot.s)<=reach&&(!fixed||(locate(e.s).x-slot.x)*u.fixedDir>=0)&&(!d.ranged||(!this.inSmoke(slot.s)&&!this.inSmoke(e.s)))).sort((a,b)=>{
   const rank=e=>e.carrying?0:air&&e.airborne>0?1:e.bounty>0?2:3;
   return rank(a)-rank(b)||Math.abs(a.s-slot.s)-Math.abs(b.s-slot.s);
  });
 }
 useSkill(type){
  if(this.mode!=='running')return false;const u=this.units.find(u=>u.type===type),d=this.types[type];
  if(!u||!d.skill||this.heroCooldowns[type]>0)return false;
  const targets=this.targets(u,true).filter(e=>u.variant!=='taunt'||!e.boss&&!e.carrying);if(!targets.length){this.event('notice',{text:'技能范围内没有有效目标，不消耗冷却。'});return false;}
  const slot=SLOTS[u.slot],primary=targets[0],dir=Math.sign(locate(primary.s).x-slot.x)||u.dir;u.dir=dir;
  this.heroCooldowns[type]=d.skillTime;u.skillCooldown=d.skillTime;u.attack=u.attackDuration=d.castTime;u.casting=d.castTime;
  const forward=e=>(locate(e.s).x-slot.x)*dir>=0;
  const area=type==='zhugeliang'?targets.filter(e=>Math.abs(e.s-primary.s)<d.skillRadius):targets;
  const skillDamage=d.skillDamage*this.unitPower(u),perk=this.perk(u);
  if(type==='zhangfei'){
   if(u.variant==='taunt'){for(const e of area){e.taunt=VARIANT_RULES.taunt.duration;e.tauntedBy=u.id;}}
   else for(const e of area){this.interrupt(e,d.stunDuration);this.damage(e,skillDamage,'magic',true,slot.s);}
   u.guard=d.guardDuration;
   if(perk){u.hp=Math.min(u.maxHp,u.hp+u.maxHp*perk.heal);this.effect('hit',{x:slot.x,y:slot.y-90},{value:Math.round(u.maxHp*perk.heal),color:'#9be48a'});}
  }else if(type==='guanyu'){
   if(u.variant==='hook'){const e=targets.find(forward);if(e){e.guard=0;if(!this.push(e,e.s+Math.sign(slot.s-e.s)*Math.min(VARIANT_RULES.hook.distance,Math.max(0,Math.abs(e.s-slot.s)-BATTLE.hookStopDistance))))this.damage(e,skillDamage,'physical',true,slot.s);}}
   else for(const e of area.filter(forward)){e.guard=0;e.shieldBroken=BATTLE.shieldBreakDuration;this.damage(e,skillDamage,'physical',true,slot.s);}
  }else for(const e of area){
   if(e.airborne>0){if(!u.variant)this.push(e,e.s+Math.sign(e.s-slot.s)*d.knockback);continue;}
   const dest=u.variant==='gather'?primary.s:e.s+(Math.sign(e.s-slot.s)||-1)*d.knockback;
   if(this.push(e,dest))break;e.slow=d.slowDuration;this.damage(e,skillDamage,'magic',true,slot.s);
  }
  const center=type==='zhugeliang'?locate(primary.s):slot;this.effect(type==='zhangfei'?'roar':type==='guanyu'?'dragon':'gust',center,{dir,color:d.color,life:.8,maxLife:.8});
  this.event('skill',{hero:type,skill:d.skill,color:d.color});return true;
 }
 hurtUnit(u,amount,enemy){
  if(u.hp<=0)return;
  const perk=this.perk(u);
  if(u.type==='shieldbearer'&&u.shieldReady<=0&&!(u.swapCooldown>UNIT_STATS.shieldbearer.swapCooldown-UNIT_STATS.shieldbearer.turnRecovery)&&enemy&&(locate(enemy.s).x-SLOTS[u.slot].x)*u.fixedDir>=0){
   u.shieldReady=UNIT_STATS.shieldbearer.blockCooldown;this.effect('hit',SLOTS[u.slot],{value:0,blocked:true,color:'#e9c366'});
   if(perk&&live(enemy))this.interrupt(enemy,perk.stun,true);
   return;
  }
  u.hp-=amount*(u.guard>0?this.types[u.type].guardDamageMultiplier:1);u.hit=.16;this.effect('hit',{x:SLOTS[u.slot].x,y:SLOTS[u.slot].y-65},{value:Math.round(amount),color:'#ff927f'});
  if(perk?.thorns&&enemy&&live(enemy))this.damage(enemy,perk.thorns,'impact',false);
  if(u.hp<=0)this.event('fallen',{unitType:u.type,slot:u.slot});
 }
 enemySkill(e){
  if(e.skillCooldown>0||e.stun>0||e.airborne>0||e.carrying||e.commandWindup>0||e.windup>0)return;
  const d=ENEMY_TYPES[e.role],friends=this.enemies.filter(f=>grounded(f)&&f!==e&&locate(f.s).floor===locate(e.s).floor&&Math.abs(f.s-e.s)<d.commandRadius);
  if(e.role==='shield'&&!(e.shieldBroken>0)&&!(e.turning>0)){e.guard=d.guardDuration;e.skillCooldown=d.skillCooldown;}
  else if(e.role==='runner'&&e.moving){e.windup=d.windup;e.skillCooldown=d.skillCooldown;}
  else if(e.role==='drummer'&&friends.length&&!this.liu.carrier){e.commandWindup=d.windup;e.skillCooldown=d.skillCooldown;for(const f of friends)f.rallyTo=e.id;}
  else if(e.role==='caohong'&&friends.some(f=>!f.boss)&&!this.liu.carrier){e.commandWindup=d.windup;e.skillCooldown=d.skillCooldown;}
  else if(e.role==='xiahou'&&!this.liu.carrier&&!(e.exhausted>0)&&locate(e.s).floor>=0){e.windup=d.windup;e.skillCooldown=d.skillCooldown;}
 }
 finishCommand(e){
  const d=ENEMY_TYPES[e.role],friends=this.enemies.filter(f=>grounded(f)&&f!==e&&locate(f.s).floor===locate(e.s).floor&&Math.abs(f.s-e.s)<d.commandRadius);
  if(e.role==='drummer'){for(const f of friends){f.rallyTo=null;f.buff=d.buffDuration;}this.effect('drum',locate(e.s),{color:'#bda5ee'});}
  else {const target=friends.filter(f=>!f.boss).sort((a,b)=>Math.abs(a.s-this.liu.s)-Math.abs(b.s-this.liu.s))[0];if(target){target.bounty=d.bountyDuration;this.effect('drum',locate(target.s),{color:'#f5ca70'});}}
 }
 fire(u,target){
  const d=this.types[u.type],slot=SLOTS[u.slot],p=locate(target.s),damage=d.damage*this.unitPower(u),perk=this.perk(u);
  u.cooldown=d.interval;u.attack=u.attackDuration=.4;
  if(u.type==='catapult'){
   const flight=d.flightTime;
   this.effects.push({kind:'stone',floor:slot.floor,source:u.id,sourceS:slot.s,targetId:target.id,damage,radius:d.splashRadius*(perk?.splash||1),small:false,x:slot.x,y:slot.y-72,tx:p.x,ty:p.y-60,s:target.s,life:flight,maxLife:flight});
  }else if(u.type==='ballista'){
   const targets=this.targets(u).filter(e=>Math.abs(e.s-slot.s)>=(d.minRange||0)).sort((a,b)=>Math.abs(a.s-slot.s)-Math.abs(b.s-slot.s));
   for(const e of targets){const hit=this.damage(e,damage,perk?.pierceGuard?'bolt':'arrow',false,slot.s);if(!hit)break;}
   this.effect('thrust',{x:slot.x,y:slot.y-60},{tx:slot.x+u.fixedDir*d.range,ty:slot.y-60,dir:u.fixedDir,color:d.color});
  }else if(d.ranged){
   this.effects.push({kind:u.type==='zhugeliang'?'feather':'arrow',target:target.id,source:u.id,sourceS:slot.s,unitType:u.type,damage,x:slot.x+u.dir*24,y:slot.y-78,tx:p.x,ty:p.y-60,dir:u.dir,color:d.color,life:BATTLE.projectile.arrowFlight,maxLife:BATTLE.projectile.arrowFlight,antiAir:target.airborne>0});
  }else{
   this.damage(target,damage,'physical',false,slot.s);
   if(u.type==='guanyu'){for(const second of this.targets(u).filter(e=>e!==target&&Math.abs(e.s-target.s)<BATTLE.cleaveRadius).slice(0,perk?.cleaveTargets||1))this.damage(second,damage*BATTLE.cleaveMultiplier,'physical',false,slot.s);}
   this.effect(u.type==='lancer'?'thrust':'slash',{x:slot.x,y:slot.y-65},{tx:p.x,ty:p.y-55,dir:u.dir,color:d.color});
  }
  this.event('attack',{unitType:u.type,slot:u.slot,target:target.id});
 }
 hitProjectile(f){
  let e=this.enemies.find(e=>e.id===f.target&&live(e));if(!e||e.airborne>0&&!f.antiAir)return;
  if(f.kind==='arrow'&&!f.antiAir){const sign=Math.sign(e.s-f.sourceS);const screen=this.enemies.filter(s=>grounded(s)&&s.guard>0&&locate(s.s).floor===locate(e.s).floor&&(s.s-f.sourceS)*sign>=0&&(e.s-s.s)*sign>=0&&(f.sourceS-s.s)*s.direction>0).sort((a,b)=>Math.abs(a.s-f.sourceS)-Math.abs(b.s-f.sourceS))[0];if(screen)e=screen;}
  if(f.antiAir){e.airborne=0;e.parachuteBroken=true;this.effect('parachute-break',locate(e.s),{life:.8,maxLife:.8});this.interrupt(e,BATTLE.projectile.antiAirStun);this.damage(e,f.damage,'anti-air',false,f.sourceS);return;}
  const hit=this.damage(e,f.damage,f.kind==='feather'?'magic':'arrow',false,f.sourceS);
  if(hit&&f.kind==='feather'&&live(e)){const perk=this.perk(this.units.find(u=>u.id===f.source));if(perk?.slow)e.slow=Math.max(e.slow,perk.slow);}
 }
 resolveStone(f){
  const area=this.enemies.filter(e=>grounded(e)&&locate(e.s).floor===f.floor&&Math.abs(e.s-f.s)<f.radius);
  for(const e of area){this.interrupt(e,UNIT_STATS.catapult.stunDuration);this.damage(e,f.damage,'impact',true,f.sourceS);}
  this.effect('landing',{x:f.tx,y:f.ty+60});
 }
 updateEffects(dt){
  for(const f of [...this.effects]){
   f.life-=dt;
   if(f.kind==='guard-arrival'&&!f.landed){Object.assign(f,locate(this.liu.s));if(f.maxLife-f.life>=BATTLE.guard.arrivalDelay)this.landGuard(f);}
   else if(f.kind==='rockfall'&&!f.resolved&&f.maxLife-f.life>=f.fallTime){
    f.resolved=true;for(const e of this.areaTargets(f)){this.interrupt(e,f.stun);this.damage(e,f.damage,'impact',true,f.s);}
   }
   else if(f.kind==='log'){
    const old=f.x;
    f.x+=f.dir*UNIT_STATS.log.speed*dt;
    for(const e of this.enemies){const p=locate(e.s);if(!grounded(e)||p.floor!==f.floor||p.x<Math.min(old,f.x)-UNIT_STATS.log.hitRadius||p.x>Math.max(old,f.x)+UNIT_STATS.log.hitRadius||f.hit.has(e.id))continue;f.hit.add(e.id);
     this.damage(e,this.types.log.damage,'impact',true);if(live(e)){this.interrupt(e,UNIT_STATS.log.stunDuration);if(this.push(e,e.s+f.dir*locate(e.s).dir*UNIT_STATS.log.knockback))return;}
    }
   }else if(f.kind==='oil'){
    for(const e of this.enemies){if(!grounded(e)||locate(e.s).floor!==f.floor||Math.abs(e.s-f.s)>f.radius)continue;
     e.guard=0;e.shieldBroken=.2;this.damage(e,f.damage*dt,'fire',false,f.s);
    }
   }else if(f.kind==='stone'&&f.life<=0&&!f.resolved){f.resolved=true;this.resolveStone(f);}
   else if((f.kind==='arrow'||f.kind==='feather')&&f.target){const e=this.enemies.find(e=>e.id===f.target&&live(e));if(e){const p=locate(e.s);f.tx=p.x;f.ty=p.y-60;}if(f.life<=0&&!f.resolved){f.resolved=true;this.hitProjectile(f);}}
   if(this.mode!=='running')return;
  }
  this.effects=this.effects.filter(f=>f.life>0);
 }
 updateUnits(dt){
  for(const u of this.units){const d=this.types[u.type],slot=SLOTS[u.slot];
   for(const key of ['cooldown','guard','hit','attack','casting','brace','shieldReady','swapCooldown'])u[key]=Math.max(0,(u[key]||0)-dt);
   u.skillCooldown=this.heroCooldowns[u.type]||0;
   if(u.hp<=0)continue;
   const nearby=this.enemies.filter(e=>grounded(e)&&locate(e.s).floor===slot.floor&&Math.abs(e.s-slot.s)<BATTLE.trapRadius);
   if(d.trap){if(nearby.length){u.hp=0;this.interrupt(nearby[0],d.trapDuration);this.effect('snare-hit',slot);}continue;}
   if(!d.damage)continue;
   if(u.type==='lancer'){if(nearby.length)u.brace=d.braceTime;else if(u.brace<=0){const charger=this.targets(u).find(e=>(e.dash>0||e.charge>0)&&(locate(e.s).x-slot.x)*u.dir>=0);if(charger){this.interrupt(charger,d.braceStun);u.brace=d.braceCooldown;this.effect('thrust',{x:slot.x,y:slot.y-60},{tx:locate(charger.s).x,ty:slot.y-60,dir:u.dir,color:d.color});const perk=this.perk(u);if(perk&&this.push(charger,charger.s+(Math.sign(charger.s-slot.s)||1)*perk.knockback))return;}}}
   const targets=this.targets(u);if(!targets.length)continue;
   if(u.type!=='ballista'&&u.type!=='shieldbearer'){const direction=Math.sign(locate(targets[0].s).x-slot.x)||u.dir;if(direction!==u.dir){u.dir=direction;u.brace=UNIT_STATS.lancer.braceTime;}}
   const target=targets.find(e=>Math.abs(e.s-slot.s)>=(d.minRange||0));if(!target||u.cooldown>0)continue;this.fire(u,target);if(this.mode!=='running')return;
  }
 }
 updateEnemies(dt){
  this.setArmyDirection();
  for(const e of this.enemies){if(!grounded(e))continue;
   if(e.carrying&&this.checkCarrierExit(e))return;
   if(e.stun>0||e.windup>0||e.exhausted>0||e.commandWindup>0){e.moving=false;continue;}
   const p=locate(e.s),dir=e.direction,travel=e.speed*(e.carrying?BATTLE.enemy.carryMultiplier:1)*(e.slow>0?BATTLE.enemy.slowMultiplier:1)*(e.dash>0&&!e.carrying?ENEMY_STATS.runner.dashMultiplier:1)*(e.charge>0?ENEMY_STATS.xiahou.chargeMultiplier:1)*(e.buff>0?ENEMY_STATS.drummer.buffMultiplier:1)*dt;
   const blocker=this.units.filter(u=>this.blocks(u)&&SLOTS[u.slot].floor===p.floor&&Math.abs(SLOTS[u.slot].s-e.s)<=BATTLE.contactRadius+travel&&(SLOTS[u.slot].s-e.s)*dir>=-14).sort((a,b)=>Math.abs(SLOTS[a.slot].s-e.s)-Math.abs(SLOTS[b.slot].s-e.s))[0];
   e.moving=!blocker&&e.root<=0;this.enemySkill(e);if(e.windup>0||e.commandWindup>0)continue;
   if(blocker){e.facing=Math.sign(SLOTS[blocker.slot].x-p.x)||e.facing;
    if(e.charge>0){this.hurtUnit(blocker,blocker.type==='barricade'?ENEMY_STATS.xiahou.barricadeDamage:ENEMY_STATS.xiahou.chargeDamage);e.charge=0;e.exhausted=ENEMY_STATS.xiahou.recovery;this.effect('roar',p,{color:'#f8875f'});}
    else if(e.cooldown<=0){e.cooldown=ENEMY_TYPES[e.role].interval;e.attack=.35;this.hurtUnit(blocker,e.damage,e);}
   }else if(e.moving){
    const rally=this.enemies.find(r=>r.id===e.rallyTo&&live(r)&&r.commandWindup>0);if(e.rallyTo&&!rally)e.rallyTo=null;
    const goal=rally?rally.s:e.goalS,distance=Math.abs(goal-e.s),stop=e.objective==='escort'?BATTLE.enemy.escortDistance:rally?BATTLE.enemy.rallyDistance:0;
    const previous=e.s;if(this.moveEnemy(e,e.s+Math.sign(goal-e.s)*Math.min(travel,Math.max(0,distance-stop))))return;e.walk+=Math.abs(e.s-previous);
   }
   if(this.decoy?.carrier===e.id){this.decoy.s=e.s;if(e.s<=1){this.decoy=null;this.bark('假的！这主公掉稻草！',{enemy:e.id},true);}}
   else if(e.objective==='decoy'&&this.decoy&&!this.decoy.carrier&&Math.abs(e.s-this.decoy.s)<BATTLE.contactRadius)this.decoy.carrier=e.id;
   if(e.carrying){this.liu.s=e.s;if(this.checkCarrierExit(e))return;}
  }
 }
 dashLiu(){
  if(this.liu.carrier||this.liu.mounted)return;
  this.liu.dash=BATTLE.liu.dashDuration;
  this.event('skill',{hero:'liubei',skill:'脚底抹油',color:'#eed77b'});
 }
 advanceLiu(dt,limit){
  const old=this.liu.s,mount=this.mount,rideSpeed=BATTLE.liu.speed*(mount?.speedMultiplier||1);
  const speed=this.liu.mounted?rideSpeed:BATTLE.liu.speed*(this.liu.dash>0?BATTLE.liu.dashMultiplier:1);
  let next=Math.min(limit,old+speed*dt);
  if(mount&&!mount.claimed&&!this.liu.carrier&&old<=mount.s+mount.pickupRadius&&next>=mount.s-mount.pickupRadius){
   const contact=Math.max(old,mount.s-mount.pickupRadius),remaining=Math.max(0,dt-(contact-old)/speed);
   mount.claimed=true;this.liu.mounted=true;this.liu.dash=0;this.liu.mountWalk=this.liu.walk+contact-old;
   next=Math.min(limit,contact+rideSpeed*remaining);this.event('mount',{mountId:mount.id});
  }
  this.liu.s=Math.max(old,next);this.liu.walk+=this.liu.s-old;this.bestProgress=Math.max(this.bestProgress,this.liu.s/ROUTE_LENGTH);
  if(locate(old).floor>=0&&locate(this.liu.s).floor<0)this.dashLiu();
 }
 update(dt){
  if(this.mode==='intro'){
   if(!Number.isFinite(dt)||dt<=0)return;
   const intro=this.intro;intro.time+=Math.min(dt,.1);
   if(intro.time<intro.talkDuration)intro.phase='horse-talk';
   else if(intro.time<intro.talkDuration+intro.runDuration)intro.phase='flee';
   else if(intro.time<intro.talkDuration+intro.runDuration+intro.replyDuration)intro.phase='reply';
   else{this.intro=null;this.mode='running';this.event('intro-end');this.event('start');}
   return;
  }
  if(this.mode!=='running'||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);this.time+=dt;this.gold+=this.incomePerSecond*dt;this.shake=Math.max(0,this.shake-dt);
  for(const pool of [this.cooldowns,this.heroCooldowns])for(const key of Object.keys(pool))pool[key]=Math.max(0,pool[key]-dt);
  this.liu.dash=Math.max(0,this.liu.dash-dt);
  this.bestProgress=Math.max(this.bestProgress,this.liu.s/ROUTE_LENGTH);
  for(const e of this.enemies){const wind=e.windup>0,command=e.commandWindup>0,charge=e.charge>0;
   for(const key of ['cooldown','skillCooldown','attack','hit','slow','stun','root','guard','dash','buff','bounty','windup','commandWindup','charge','exhausted','turning','shieldBroken','taunt'])e[key]=Math.max(0,(e[key]||0)-dt);
   if(e.stun>0||this.liu.carrier){e.windup=0;e.charge=0;e.commandWindup=0;}
   else {if(wind&&e.windup===0){if(e.role==='runner')e.dash=ENEMY_STATS.runner.dashDuration;else e.charge=ENEMY_STATS.xiahou.chargeDuration;}if(command&&e.commandWindup===0)this.finishCommand(e);if(charge&&e.charge===0)e.exhausted=ENEMY_STATS.xiahou.recovery;}
   if(e.airborne>0){e.airborne=Math.max(0,e.airborne-dt);if(e.airborne===0)this.effect('landing',locate(e.s));}
  }
  this.updatePhases();this.updateEffects(dt);if(this.mode!=='running')return;
  this.updateUnits(dt);if(this.mode!=='running')return;
  this.updateEnemies(dt);if(this.mode!=='running')return;
  // 曹操 reaching Liu Bei, free or carried, ends the run on the spot: no escort walk, no rescue.
  const cc=this.caocao;
  if(cc&&live(cc)&&Math.abs(cc.s-this.liu.s)<BATTLE.contactRadius+10){
   this.liu.carrier=null;for(const e of this.enemies)e.carrying=false;this.liu.s=cc.s;this.lossReason='caocao';this.mode='lost';this.shake=.5;
   this.event('lost',{reason:'caocao',text:'曹操亲手拿下主公 · '+(this.level.floors[locate(cc.s).floor]||'')});return;
  }
  if(!this.liu.carrier){const e=this.enemies.find(e=>grounded(e)&&e.stun<=0&&e.objective==='capture'&&Math.abs(e.s-this.liu.s)<BATTLE.contactRadius);if(e)this.capture(e);}
  if(this.mode!=='running')return;
  this.enemies=this.enemies.filter(live);this.units=this.units.filter(u=>u.hp>0);
  if(!this.liu.carrier){
   const wait=this.level.escape&&!this.ferryReady,limit=wait?ROUTE_LENGTH*this.level.escape.at:ROUTE_LENGTH;
   this.advanceLiu(dt,limit);
   if(this.liu.s>=ROUTE_LENGTH){this.mode='won';this.event('won');}
  }
  if(this.time>=this.nextChatter){this.nextChatter=this.time+12;const lines=this.liu.carrier?['放我下来，我自己会跑！','军师！快想个办法！']:['我先探路，兄弟们别见外！','断后的事，就拜托你们了！'];this.bark(lines[this.talkIndex++%lines.length]);}
 }
}
