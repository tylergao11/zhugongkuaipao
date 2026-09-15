import {LIUBEI_THEME,DEFAULT_DECK,DECK_CARDS,MAX_DECK_SIZE,normalizeUnitLevel,normalizeTraining} from './theme.js';
export const WIDTH = 1440, HEIGHT = 810;
export const AIRBORNE_LIMIT = 6;
export const ENEMY_LIMIT = LIUBEI_THEME.waveTimes.length + LIUBEI_THEME.gateWaveTimes.length + AIRBORNE_LIMIT + 2;
export const GRID_SPACING = 178;
export const rangeLabel = def => def.range>=GRID_SPACING ? `${Math.round(def.range/GRID_SPACING*10)/10} 格` : def.range ? '近身' : '—';
const STARTING_GOLD = 180;
const GOLD_PER_SECOND = 5;
export const militaryIncomeFor=level=>GOLD_PER_SECOND*(1+normalizeTraining(level)*.05);
export const ALLY_STAT_MULTIPLIER = 1.1;
export const ALLY_COMBAT_MULTIPLIER = ALLY_STAT_MULTIPLIER*1.05;
export const ENEMY_STAT_MULTIPLIER = .85;
const ENEMY_HIT_RADIUS = 40;
// Feet align to the painted floor surfaces in town-v1.webp (bottom to top).
export const FLOOR_Y = [665, 433, 236];
export const CARD_ORDER = [...DECK_CARDS];
export const TYPES = {
  zhangfei: { name: '张飞', cost: 130, hp: 400, damage: 18, interval: 1.35, range: 116, unique: true, locked:true, color: '#d46b49', skill: '长坂怒吼', shortSkill: '怒吼', skillTime: 12, help: '怒吼震晕 · 短暂减伤' },
  guanyu: { name: '关羽', cost: 150, hp: 290, damage: 29, interval: 1.55, range: 165, unique: true, locked:true, color: '#81bc71', skill: '青龙横扫', shortSkill: '横扫', skillTime: 11, help: '自动横扫一片 · 近战群攻' },
  zhugeliang: { name: '诸葛亮', cost: 135, hp: 150, damage: 12, interval: 1.8, range: GRID_SPACING*4, ranged: true, unique: true, locked:true, color: '#90d9e5', skill: '借东风', shortSkill: '东风', skillTime: 13, help: '射程 4 格 · 远程风弹 · 东风吹退' },
  archer: { name: '弓箭手', cost: 65, hp: 85, damage: 14, interval: 1.4, range: GRID_SPACING*4, ranged: true, color: '#e7bd68', help: '射程 4 格 · 可越过拒马射击 · 可部署多个' },
  lancer: {name:'长枪兵',cost:60,hp:180,damage:17,interval:1.45,range:GRID_SPACING*2,locked:true,color:'#aec779',help:'攻击距离 2 格 · 长枪戳刺 · 可重复部署'},
  shieldbearer: {name:'刀盾兵',cost:80,hp:300,damage:12,interval:1.5,range:100,locked:true,armor:.25,color:'#b6bf7b',help:'厚盾抵挡 25% 伤害 · 可重复部署'},
  crossbowman: {name:'连弩兵',cost:95,hp:95,damage:15,interval:1.75,range:GRID_SPACING*4,ranged:true,locked:true,burstCount:2,color:'#78c6b2',help:'射程 4 格 · 两箭连射 · 优先射扛人的'},
  slinger: {name:'投石兵',cost:85,hp:110,damage:24,interval:2.5,range:GRID_SPACING*4,ranged:true,locked:true,color:'#dbbc89',help:'射程 4 格 · 远程抛石 · 小范围伤害'},
  barricade: { name: '拒马', cost: 50, hp: 260, damage: 0, interval: 99, range: 0, color: '#c79d69', help: '占一个格子 · 挡住追兵 · 需要火力掩护' },
  log: { name: '滚木', cost: 75, damage:100, locked:true, instant: true, cooldown:8, color: '#d6ab70', help: '滚木撞兵 · 冷却 8 秒' },
  oil: { name: '火油', cost: 85, damage:22, locked:true, instant: true, cooldown:10, color: '#ff9451', help: '持续灼烧 · 冷却 10 秒' },
  ballista: {name:'诸葛连弩车',cost:110,hp:165,damage:14,interval:2.35,range:GRID_SPACING*4,ranged:true,device:true,locked:true,color:'#92c47c',help:'射程 4 格 · 三连射 · 优先扛人的'},
  catapult: {name:'卧龙投石车',cost:130,hp:180,damage:48,interval:4.2,range:GRID_SPACING*4,minRange:150,ranged:true,device:true,locked:true,color:'#e4bb69',help:'射程 4 格 · 范围抛射 · 近处打不到'},
  snare: {name:'草鞋绊马索',cost:30,hp:1,damage:0,range:0,device:true,trap:true,locked:true,color:'#bac995',help:'踩中震晕 · 一次性'}
};
// Share these calculations with unit details and upgrade previews.
export function unitStatsFor(type,level=1,bonus=0,training={}){
  const def=TYPES[type],rank=normalizeUnitLevel(level),quality=Number.isFinite(bonus)?Math.max(0,Math.min(.5,bonus)):0;
  const damageMultiplier=(1+quality+(rank-1)*.05)*ALLY_COMBAT_MULTIPLIER;
  const controlMultiplier=(1+quality)*ALLY_STAT_MULTIPLIER,cooldownMultiplier=1-normalizeTraining(training.cooldown)*.03;
  return {...def,level:rank,damageMultiplier,cooldownMultiplier,damage:(def.damage||0)*damageMultiplier,
    hp:def.hp?(def.trap?def.hp*ALLY_COMBAT_MULTIPLIER:Math.round(def.hp*(1+(rank-1)*.06)*ALLY_COMBAT_MULTIPLIER)):def.hp,
    interval:def.interval?def.interval*cooldownMultiplier:undefined,
    skillTime:def.skillTime?def.skillTime*cooldownMultiplier:undefined,
    cooldown:def.cooldown?def.cooldown*cooldownMultiplier:undefined,
    stunDuration:type==='zhangfei'?1.5*controlMultiplier:undefined,
    slowDuration:type==='zhugeliang'?2.5*controlMultiplier:undefined,
    knockback:type==='zhugeliang'?130*controlMultiplier:type==='log'?45*ALLY_STAT_MULTIPLIER:undefined,
    trapDuration:def.trap?2.4*(1+quality+(rank-1)*.05)*ALLY_STAT_MULTIPLIER:undefined};
}
export const ENEMY_TYPES = Object.fromEntries(Object.entries({
  soldier: { name:'曹兵', hp:145, speed:74, damage:18, interval:1.1, color:'#d68b64', reward:12 },
  shield: { name:'锅盖校尉', hp:280, speed:56, damage:25, interval:1.35, color:'#e9c366', reward:20, skill:'铁壁举盾', help:'举盾减伤 · 怒吼破盾' },
  runner: { name:'草鞋飞贼', hp:115, speed:84, damage:13, interval:.9, color:'#ff985a', reward:14, skill:'加钱冲刺', help:'间歇冲刺 · 容易被震晕' },
  drummer: { name:'催命鼓手', hp:190, speed:60, damage:12, interval:1.25, color:'#bd9fff', reward:18, skill:'敲鼓催军', help:'击鼓加快附近同伴' },
  airborne: { name:'油纸伞兵', hp:135, speed:72, damage:17, interval:1.05, color:'#8ddcda', reward:16, help:'空降后排 · 落点提前预警' },
  caohong: {name:'曹洪',hp:620,speed:66,damage:28,interval:1.15,color:'#f5ca70',reward:48,skill:'重金悬赏',boss:true},
  xiahou: {name:'夏侯惇',hp:820,speed:62,damage:38,interval:1.35,color:'#ff8b64',reward:60,skill:'蛮牛冲阵',boss:true}
}).map(([id,def])=>[id,{...def,hp:Math.round(def.hp*ENEMY_STAT_MULTIPLIER),damage:def.damage*ENEMY_STAT_MULTIPLIER}]));
const points = [[65,665],[1400,665],[1300,433],[42,433],[160,236],[1370,236]];
export const SEGMENTS = [];
let length = 0;
for (let i = 0; i < points.length - 1; i++) {
  const a = points[i], b = points[i + 1], len = Math.hypot(b[0]-a[0], b[1]-a[1]);
  SEGMENTS.push({ a, b, start: length, len, floor: i === 0 ? 0 : i === 2 ? 1 : i === 4 ? 2 : -1 }); length += len;
}
export const ROUTE_LENGTH = length;
export const CAOZHANG_GATE = {x:1300,y:FLOOR_Y[1],floor:1,s:SEGMENTS[2].start,at:LIUBEI_THEME.commanders.find(c=>c.id==='caozhang').at};
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
export class Game {
  constructor(loadout={}) { this.reset(loadout); }
  reset(loadout=this.loadout||{}) {
    this.loadout={themeId:loadout.themeId,deck:[...(loadout.deck||DEFAULT_DECK)],unlocked:[...(loadout.unlocked||[])],bonuses:{...loadout.bonuses},labels:{...loadout.labels},levels:{...loadout.levels}};
    this.themeId=loadout.themeId||LIUBEI_THEME.id;
    this.deck=[...new Set(loadout.deck||DEFAULT_DECK)].filter(id=>DECK_CARDS.includes(id)&&this.isUnlocked(id)).slice(0,MAX_DECK_SIZE);
    this.loadout.training=Object.fromEntries(Object.entries(loadout.training||{}).map(([id,paths])=>[id,{...paths}]));
    this.loadout.incomeLevel=normalizeTraining(loadout.incomeLevel);
    this.incomePerSecond=militaryIncomeFor(this.loadout.incomeLevel);
    this.types=Object.fromEntries(Object.keys(TYPES).map(id=>[id,unitStatsFor(id,this.loadout.levels[id],this.boost(id),this.loadout.training[id])]));
    this.mode = 'ready'; this.time = 0; this.gold = STARTING_GOLD; this.kills = 0; this.rescues = 0;
    this.units = []; this.enemies = []; this.effects = []; this.events = [];
    this.liu = { s: 205, carrier: null, walk: 0, dash:0, skillCooldown:0 }; this.nextSpawn = LIUBEI_THEME.waveTimes[0]; this.serial = 0; this.spawned = 0;
    this.selected = null; this.shake = 0; this.nextTalk=0;this.nextChatter=8;this.talkIndex=0;
    this.groundSpawned=0;this.airborneSpawned=0;this.airborneUnlocked=false;this.nextAirborne=Infinity;
    this.cooldowns={log:0,oil:0};this.guardUsed=false;
    this.caozhangGateOpen=false;this.caozhangGateOpenedAt=0;this.lossReason=null;
    this.commanders=new Set();this.captures=0;this.bestProgress=205/ROUTE_LENGTH;this.runId=null;this.rewardReceipt=null;this.bossCoins=0;
  }
  boost(type){return Math.max(0,Math.min(.5,this.loadout.bonuses[type]||0));}
  isUnlocked(type){return !!TYPES[type]&&(DEFAULT_DECK.includes(type)||this.loadout.unlocked.includes(type));}
  isEquipped(type){return this.deck.includes(type);}
  event(type, values = {}) { this.events.push({ ...values, type }); }
  bark(text,who='liubei',force=false) {
    if(!force&&this.time<this.nextTalk)return;
    this.nextTalk=this.time+3.3;this.event('talk',{text,who});
  }
  start() {
    if(this.mode!=='ready')return false;
    if(!this.deck.length){this.event('notice',{text:'至少带上一张已拥有的卡牌再出征'});return false;}
    this.mode='running';this.runId=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;this.event('start');return true;
  }
  canBuy(type) {
    const def = this.types[type];
    return this.isUnlocked(type) && this.isEquipped(type) && this.gold >= def.cost && !(this.cooldowns[type]>0) && !(def.unique && this.units.some(u => u.type === type));
  }
  select(type) {
    if (!this.isUnlocked(type)||!this.isEquipped(type)) return;
    if (TYPES[type].unique && this.units.some(u => u.type === type)) { this.event('notice', { text: `${TYPES[type].name}已上阵` }); return; }
    this.selected = this.selected === type ? null : type;
  }
  place(id) {
    if (this.mode !== 'running') return false;
    const slot = SLOTS[id], type = this.selected, def = this.types[type];
    if (!slot || !def) { this.event('notice', { text: '拖动下方卡牌到地面格子，松手放置' }); return false; }
    if (!this.canBuy(type)) { this.event('notice', { text: this.cooldowns[type]>0 ? `还需冷却 ${Math.ceil(this.cooldowns[type])} 秒` : this.gold < def.cost ? '军饷不足，稍等片刻' : '这位武将已经上阵' }); return false; }
    if (!def.instant && this.units.some(u => u.slot === id)) { this.event('notice', { text: '这里已经有人驻守，换个空格' }); return false; }
    this.gold -= def.cost;
    if(def.cooldown)this.cooldowns[type]=def.cooldown;
    if (type === 'log') {
      this.effects.push({ kind: 'log', floor: slot.floor, x: slot.x, y: slot.y, dir: slot.floor === 1 ? 1 : -1, life: 2.8, maxLife: 2.8, hit: new Set() });
    } else if (type === 'oil') {
      this.effects.push({ kind: 'oil', floor: slot.floor, x: slot.x, y: slot.y, life: 6, maxLife: 6 });
    } else {
      this.units.push({ type, slot: id, hp: def.hp, maxHp: def.hp, cooldown: .25, skillCooldown:def.skillTime?2.5*def.cooldownMultiplier:0, guard:0, attack: 0, hit: 0, born: this.time, dir: slot.floor === 1 ? 1 : -1 });
      this.effects.push({ kind: 'summon', x: slot.x, y: slot.y, life: .55, maxLife: .55, color: def.color });
    }
    this.event('place', { unitType:type, slot:id, x: slot.x, y: slot.y });
    const line={zhangfei:'排好队，挨个儿来！',guanyu:'别挤，本刀不收挂号费！',zhugeliang:'别急，我在算风向。',archer:'箭够用，准头随缘！',lancer:'我枪长，你先别过来！',shieldbearer:'盾是借的，别给我砍坏了！',crossbowman:'一箭没中？我还有一箭！',slinger:'石头免费，管够！'}[type];
    if(line)this.bark(line,{slot:id});
    this.selected = null;
    return true;
  }
  dismantle(id) {
    if (this.mode !== 'running') return false;
    const index = this.units.findIndex(unit => unit.slot === id);
    if (index < 0) return false;
    const [unit] = this.units.splice(index, 1), refund = Math.floor(TYPES[unit.type].cost*.5*Math.max(0,Math.min(1,unit.hp/unit.maxHp)));
    this.gold += refund; this.selected = null;
    this.event('dismantle', { text: `${TYPES[unit.type].name}已撤下，返还 ${refund} 军饷` });
    return true;
  }
  summonGuard(){
    if(this.mode!=='running'||this.guardUsed)return false;
    this.guardUsed=true;
    const p=locate(this.liu.s);
    this.effects.push({kind:'guard-arrival',x:p.x,y:p.y,s:this.liu.s,dir:p.dir,life:3.6,maxLife:3.6,landed:false});
    this.event('skill',{hero:'zhaoyun',skill:'护驾！',color:'#adddf7'});
    return true;
  }
  landGuard(effect){
    effect.landed=true;
    // Follow the carried/free lord during descent, so a moving carrier cannot dodge rescue.
    effect.s=this.liu.s;const p=locate(effect.s);effect.x=p.x;effect.y=p.y;effect.dir=p.dir;
    for(const enemy of this.enemies){
      if(enemy.hp<=0||enemy.airborne>0||Math.abs(enemy.s-effect.s)>250)continue;
      enemy.guard=0;enemy.stun=2*ALLY_STAT_MULTIPLIER;enemy.dash=0;this.damage(enemy,90*ALLY_COMBAT_MULTIPLIER,'magic',true);
    }
    if(this.liu.carrier){
      const carrier=this.enemies.find(e=>e.id===this.liu.carrier);
      if(carrier)carrier.carrying=false;
      this.liu.carrier=null;this.rescues++;this.setArmyDirection();
      this.event('rescue',{text:'赵子龙救回主公！阿斗：这车有点颠！'});
    }
    this.effects.push({kind:'guard-impact',x:effect.x,y:effect.y,life:.9,maxLife:.9});
    this.event('guard-land');this.shake=.5;
  }
  spawn(role) {
    if(this.spawned>=ENEMY_LIMIT)return null;
    // Air drops and commanders must not shift the ground-wave composition.
    const n=this.groundSpawned-this.commanders.size;
    role||=LIUBEI_THEME.waveRoles[n]||'soldier';
    this.spawned++;
    const def=ENEMY_TYPES[role],hp=def.hp;
    const enemy={id:++this.serial,s:0,hp,maxHp:hp,role,type:def.boss?role:role==='shield'||role==='drummer'?'enemyHeavy':'enemy',boss:!!def.boss,heavy:role==='shield',runner:role==='runner',speed:def.speed,damage:def.damage,cooldown:.25,skillCooldown:role==='runner'?2.2:role==='drummer'?4:3,guard:0,dash:0,buff:0,bounty:0,windup:0,charge:0,exhausted:0,stun:0,attack:0,hit:0,slow:0,carrying:false,moving:true,direction:this.liu.carrier?-1:1,facing:this.liu.carrier?-1:1,walk:0,escaped:false,popDamage:0,nextPop:0};
    if(this.caozhangGateOpen&&role!=='airborne'){
      enemy.s=CAOZHANG_GATE.s;
      enemy.direction=Math.sign(this.liu.s-enemy.s)||1;
      enemy.facing=locate(enemy.s).dir*enemy.direction;
    }
    this.enemies.push(enemy);
    if(role==='airborne')this.airborneSpawned++;else this.groundSpawned++;
    if(this.spawned===ENEMY_LIMIT)this.event('notice',{text:'最后一拨追兵！顶住，出口就在前面！'});
    return enemy;
  }
  unlockAirborne(){
    if(!this.airborneUnlocked&&this.liu.s>=ROUTE_LENGTH*.5){
      this.airborneUnlocked=true;this.nextAirborne=this.time+2.4;
      this.event('notice',{text:'逃脱过半！小心油纸伞兵空降后排！'});
    }
  }
  summonCommanders(){
    for(const def of LIUBEI_THEME.commanders.slice(0,2)){
      if(this.commanders.has(def.id)||this.bestProgress<def.at)continue;
      const e=this.spawn(def.id);if(!e)continue;
      this.commanders.add(def.id);
      if(!this.caozhangGateOpen){e.s=Math.max(0,this.liu.s-640);e.airborne=1.8;e.dropDuration=1.8;}
      this.event('commander',{hero:def.id,skill:def.skill,color:ENEMY_TYPES[def.id].color,text:`${def.name}杀到！${def.id==='caohong'?'盯住带赏金旗的小兵！':'红线蓄力时，用控制打断冲锋！'}`});
    }
  }
  unlockCaozhangGate(){
    if(!this.caozhangGateOpen&&this.liu.s>=ROUTE_LENGTH*CAOZHANG_GATE.at){
      this.caozhangGateOpen=true;this.caozhangGateOpenedAt=this.time;
      this.nextSpawn=Math.min(this.nextSpawn,this.time+.2);
      this.event('gate-open',{text:'进度过半！曹彰封锁长坂桥右门，援兵正从右门涌出！'});
    }
  }
  checkCarrierExit(enemy,from=enemy.s){
    if(this.mode!=='running'||!enemy.carrying||this.liu.carrier!==enemy.id||enemy.hp<=0)return false;
    const exit=this.caozhangGateOpen?CAOZHANG_GATE.s:0;
    if(Math.min(from,enemy.s)>exit||Math.max(from,enemy.s)<exit)return false;
    enemy.s=exit;
    this.liu.s=enemy.s;this.lossReason=this.caozhangGateOpen?'caozhang-gate':'entrance';this.mode='lost';
    this.event('lost',{reason:this.lossReason});return true;
  }
  moveEnemy(enemy,destination){
    const previous=enemy.s;enemy.s=Math.max(0,Math.min(ROUTE_LENGTH,destination));
    if(enemy.carrying)this.liu.s=enemy.s;
    return this.checkCarrierExit(enemy,previous);
  }
  spawnAirborne(){
    const n=this.airborneSpawned,floor=locate(this.liu.s).floor===2?2:1+n%2;
    const candidates=SLOTS.filter(s=>s.floor===floor&&Math.abs(s.s-this.liu.s)>180);
    const slot=candidates[(n*2+1)%candidates.length];
    if(!slot)return;
    const e=this.spawn('airborne');if(!e)return;
    e.s=slot.s;e.airborne=2.2;e.dropDuration=2.2;e.moving=false;e.facing=locate(e.s).dir;
    this.nextAirborne=this.time+9;
    this.event('notice',{text:`${floor===1?'长坂桥':'山道'}第 ${slot.col+1} 格：伞兵要落下来了！`});
  }
  setArmyDirection() {
    const exit=this.caozhangGateOpen?CAOZHANG_GATE.s:0;
    const from=Math.min(exit,this.liu.s),to=Math.max(exit,this.liu.s);
    const obstacles=this.liu.carrier?this.units.filter(u=>u.hp>0&&!TYPES[u.type].trap&&SLOTS[u.slot].s>=from&&SLOTS[u.slot].s<=to):[];
    for (const enemy of this.enemies) {
      if(enemy.hp<=0||enemy.escaped)continue;
      enemy.objective='capture';enemy.goalS=this.liu.s;
      if(this.liu.carrier){
        if(enemy.carrying){enemy.objective='carry';enemy.goalS=exit;}
        else {
          // Escorts clear the delivery route instead of abandoning the carrier at the gate.
          const obstacle=obstacles.reduce((nearest,u)=>!nearest||Math.abs(SLOTS[u.slot].s-enemy.s)<Math.abs(SLOTS[nearest.slot].s-enemy.s)?u:nearest,null);
          enemy.objective=obstacle?'clear-path':'escort';
          enemy.goalS=obstacle?SLOTS[obstacle.slot].s:this.liu.s;
        }
      }
      const next=Math.sign(enemy.goalS-enemy.s)||enemy.direction||1;
      if (enemy.direction !== next) { enemy.direction = next; enemy.facing=locate(enemy.s).dir*next;enemy.attack = 0; }
    }
  }
  capture(enemy) {
    this.captures++;
    this.liu.carrier = enemy.id; enemy.carrying = true; this.liu.s = enemy.s; this.shake = .3;
    this.setArmyDirection();
    this.liu.dash=0;this.nextTalk=this.time+4;
    this.event('capture', { text: this.caozhangGateOpen?'主公被抓！曹军清路押往虎豹骑，截住扛人的！':'主公被抓！曹军正在清除押送路线，截住扛人的！' });
    this.checkCarrierExit(enemy);
  }
  damage(enemy, amount, kind='physical', big=false) {
    if (enemy.hp <= 0 || enemy.airborne>0) return;
    const blocked=enemy.guard>0&&kind==='physical';amount*=blocked?.5:1;
    enemy.hp -= amount; enemy.hit = .13;
    const p=locate(enemy.s);enemy.popDamage=(enemy.popDamage||0)+amount;
    if(kind!=='fire'||this.time>=enemy.nextPop){
      this.effects.push({kind:'hit',x:p.x,y:p.y-60,value:Math.max(1,Math.round(enemy.popDamage)),blocked,big,color:blocked?'#e9c366':kind==='fire'?'#ff995e':big?'#fff0a5':'#f4ddbd',life:.52,maxLife:.52});
      enemy.popDamage=0;enemy.nextPop=this.time+.4;
      if(kind!=='fire'){this.shake=Math.max(this.shake,big?.25:.035);this.event('impact',{heavy:big,blocked});}
    }
    if (enemy.hp > 0) return;
    const pos = locate(enemy.s);
    this.kills++; this.gold += (ENEMY_TYPES[enemy.role]?.reward||12)*.5+(enemy.bounty>0?12:0);
    if(enemy.boss)this.event('commander-defeated',{role:enemy.role,enemyId:enemy.id,x:pos.x,y:pos.y});
    this.effects.push({ kind: 'death', type: enemy.type, x: pos.x, y: pos.y, dir: pos.dir * enemy.direction, life: .65, maxLife: .65 });
    if (this.liu.carrier === enemy.id) {
      this.liu.carrier = null; this.liu.s = enemy.s; this.rescues++;
      this.setArmyDirection();
      this.nextTalk=this.time+3.3;
      this.event('rescue', { text: '救回主公！曹军重新追来，继续断后！' });
    }
    enemy.carrying = false;
  }
  castSkill(unit,targets) {
    const def=this.types[unit.type],slot=SLOTS[unit.slot],damagePower=def.damageMultiplier;
    unit.skillCooldown=def.skillTime;unit.attackDuration=.75;unit.attack=.75;unit.casting=.75;
    const remote=unit.type==='zhugeliang',center=remote?locate(targets[0].s):slot;
    const area=targets.filter(e=>Math.abs(locate(e.s).x-center.x)<(remote?140:215)).slice(0,5);
    if(unit.type==='zhangfei'){
      unit.guard=2.4;
      for(const enemy of area){enemy.guard=0;enemy.stun=def.stunDuration;enemy.dash=0;enemy.charge=0;enemy.windup=0;this.damage(enemy,12*damagePower,'magic',true);}
    }else if(unit.type==='guanyu'){
      for(const enemy of area)this.damage(enemy,44*damagePower,'physical',true);
    }else{
      for(const enemy of area){this.damage(enemy,18*damagePower,'magic',true);if(enemy.hp>0){if(this.moveEnemy(enemy,enemy.s+(Math.sign(enemy.s-slot.s)||-1)*def.knockback))return;enemy.slow=def.slowDuration;}}
    }
    this.effects.push({kind:unit.type==='zhangfei'?'roar':unit.type==='guanyu'?'dragon':'gust',x:center.x,y:center.y-55,dir:unit.dir,color:def.color,life:.8,maxLife:.8});
    this.shake=Math.max(this.shake,.28);this.event('skill',{hero:unit.type,skill:def.skill,color:def.color});
    this.bark({zhangfei:'嗓门大，也算兵器！',guanyu:'排成一排，省我一刀！',zhugeliang:'借点东风，不收电费！'}[unit.type],{slot:unit.slot});
  }
  enemySkill(enemy) {
    if(enemy.role==='soldier'||enemy.role==='airborne'||enemy.skillCooldown>0||enemy.stun>0)return;
    const p=locate(enemy.s),friends=this.enemies.filter(e=>e.hp>0&&!(e.airborne>0)&&e!==enemy&&locate(e.s).floor===p.floor&&Math.abs(e.s-enemy.s)<290);
    if(enemy.boss){
      if(enemy.carrying||this.liu.carrier||p.floor<0||enemy.exhausted>0)return;
      if(enemy.role==='caohong'){
        const chosen=friends.filter(e=>!e.boss).sort((a,b)=>Math.abs(a.s-this.liu.s)-Math.abs(b.s-this.liu.s))[0];
        if(!chosen)return;chosen.bounty=7;enemy.skillCooldown=8;
        this.bark('抓到刘备，奖金另算！',{enemy:enemy.id});
        this.effects.push({kind:'drum',x:p.x,y:p.y-55,color:'#f5ca70',life:.7,maxLife:.7});
      }else{
        enemy.windup=.9;enemy.skillCooldown=9;
        this.bark('路不够宽？我撞宽点！',{enemy:enemy.id});
      }
      this.event('enemy-skill',{role:enemy.role});return;
    }
    if(enemy.role==='shield'){
      enemy.guard=3;enemy.skillCooldown=8;
      this.bark('带盾上班，拒绝加班！',{enemy:enemy.id});
    }else if(enemy.role==='runner'){
      if(enemy.carrying||!enemy.moving)return;
      enemy.dash=1.6;enemy.skillCooldown=7;
      this.bark('抓到主公，奖金翻倍！',{enemy:enemy.id});
    }else{
      if(!friends.length||p.floor<0)return;
      enemy.skillCooldown=7.5;enemy.buff=3.5;
      for(const friend of friends)friend.buff=3.5;
      this.effects.push({kind:'drum',x:p.x,y:p.y-55,color:'#bd9fff',life:.7,maxLife:.7});
      this.bark('咚咚咚！都别摸鱼！',{enemy:enemy.id});
    }
    this.event('enemy-skill',{role:enemy.role});
  }
  hurtUnit(unit,amount) {
    if(unit.hp<=0)return;
    amount*=1-(this.types[unit.type].armor||0);
    unit.hp-=amount*(unit.guard>0?.55:1);unit.hit=.16;
    const s=SLOTS[unit.slot];this.shake=Math.max(this.shake,.025);
    this.effects.push({kind:'hit',x:s.x,y:s.y-62,value:Math.round(amount*(unit.guard>0?.55:1)),color:'#ff927f',life:.45,maxLife:.45});
    if(unit.hp<=0){
      this.effects.push({kind:'death',type:unit.type,x:s.x,y:s.y,dir:unit.dir,life:.65,maxLife:.65});
      this.event('fallen',{unitType:unit.type,slot:unit.slot});
    }
  }
  update(dt) {
    if (this.mode !== 'running') return;
    dt = Math.min(dt, .05); this.time += dt; this.gold += dt*this.incomePerSecond; this.shake = Math.max(0, this.shake-dt);
    for(const type of Object.keys(this.cooldowns))this.cooldowns[type]=Math.max(0,this.cooldowns[type]-dt);
    this.liu.dash=Math.max(0,this.liu.dash-dt);this.liu.skillCooldown=Math.max(0,this.liu.skillCooldown-dt);
    this.bestProgress=Math.max(this.bestProgress,this.liu.s/ROUTE_LENGTH);
    for(const enemy of this.enemies){
      const winding=enemy.windup>0,charging=enemy.charge>0;
      for(const key of ['cooldown','skillCooldown','attack','hit','slow','stun','guard','dash','buff','bounty','windup','charge','exhausted'])enemy[key]=Math.max(0,(enemy[key]||0)-dt);
      if(enemy.stun>0||this.liu.carrier){enemy.windup=0;enemy.charge=0;}
      else if(winding&&enemy.windup===0){enemy.charge=1.2;this.event('impact',{heavy:true});}
      if(charging&&enemy.charge===0)enemy.exhausted=1.2;
    }
    this.unlockAirborne();
    this.unlockCaozhangGate();
    this.summonCommanders();
    // Opening pairs use battle time; gate reinforcements use time since the gate opened.
    // Capture does not pause reinforcements: new arrivals help clear the escort route.
    const normalSpawned=this.groundSpawned-this.commanders.size,openingCount=LIUBEI_THEME.waveTimes.length;
    const scheduled=normalSpawned<openingCount?LIUBEI_THEME.waveTimes[normalSpawned]:this.caozhangGateOpen?this.caozhangGateOpenedAt+(LIUBEI_THEME.gateWaveTimes[normalSpawned-openingCount]??Infinity):Infinity;
    if (this.time>=Math.max(this.nextSpawn,scheduled) && this.enemies.length < 48) {
      this.spawn();
      this.nextSpawn=this.time+1.6;
    }
    if(this.airborneUnlocked&&this.airborneSpawned<AIRBORNE_LIMIT&&this.time>=this.nextAirborne)this.spawnAirborne();
    // Landing changes combat eligibility before damage and capture checks this frame.
    for(const e of this.enemies){
      if(e.hp<=0||!(e.airborne>0))continue;
      e.airborne=Math.max(0,e.airborne-dt);e.moving=false;
      if(e.airborne===0){const p=locate(e.s);this.effects.push({kind:'landing',x:p.x,y:p.y,life:.5,maxLife:.5});this.bark(e.boss?'站住！本将还没说完！':'伞是借的，奖金是我的！',{enemy:e.id});}
    }
    for (const effect of this.effects) {
      effect.life -= dt;
      if(effect.kind==='guard-arrival'&&!effect.landed){
        const p=locate(this.liu.s);effect.x=p.x;effect.y=p.y;
        if(effect.maxLife-effect.life>=.8)this.landGuard(effect);
      }
      if (effect.kind === 'log') {
        const previous = effect.x; effect.x += effect.dir * 660*dt;
        for (const e of this.enemies) {
          const p = locate(e.s);
          if (e.hp > 0 && !(e.airborne>0) && p.floor === effect.floor && p.x >= Math.min(previous,effect.x)-50 && p.x <= Math.max(previous,effect.x)+50 && !effect.hit.has(e.id)) {
            effect.hit.add(e.id); this.damage(e, this.types.log.damage,'physical',true); if(e.hp>0&&this.moveEnemy(e,e.s-this.types.log.knockback))return; this.shake = .18;
          }
        }
      } else if (effect.kind === 'oil') {
        for (const e of this.enemies) { const p = locate(e.s); if (e.hp > 0 && !(e.airborne>0) && p.floor === effect.floor && Math.abs(p.x-effect.x) < 130) this.damage(e, this.types.oil.damage*dt,'fire'); }
      } else if(effect.kind==='stone'&&effect.life<=0&&!effect.resolved){
        effect.resolved=true;
        for(const e of this.enemies){const p=locate(e.s);if(e.hp>0&&!(e.airborne>0)&&p.floor===effect.floor&&Math.abs(p.x-effect.tx)<(effect.radius||105))this.damage(e,effect.damage,'physical',!effect.small);}
        this.effects.push({kind:'landing',x:effect.tx,y:effect.ty+60,life:.5,maxLife:.5});
      } else if((effect.kind==='arrow'||effect.kind==='feather')&&effect.target){
        const target=this.enemies.find(e=>e.id===effect.target&&e.hp>0&&!(e.airborne>0));
        if(target){const p=locate(target.s);effect.tx=p.x;effect.ty=p.y-60;if(effect.life<=0&&!effect.resolved){effect.resolved=true;this.damage(target,effect.damage,effect.kind==='feather'?'magic':'physical');}}
      }
    }
    this.effects = this.effects.filter(f => f.life > 0);
    for (const u of this.units) {
      const def = this.types[u.type], slot = SLOTS[u.slot];
      u.cooldown -= dt;u.skillCooldown=Math.max(0,(u.skillCooldown||0)-dt);u.guard=Math.max(0,(u.guard||0)-dt);u.casting=Math.max(0,(u.casting||0)-dt);u.attack = Math.max(0,u.attack-dt); u.hit = Math.max(0,u.hit-dt);
      if(u.hp<=0)continue;
      if(def.trap){
        const target=this.enemies.find(e=>e.hp>0&&!(e.airborne>0)&&locate(e.s).floor===slot.floor&&Math.abs(locate(e.s).x-slot.x)<50);
        if(target){u.hp=0;target.stun=def.trapDuration;target.charge=0;target.windup=0;target.dash=0;target.guard=0;this.effects.push({kind:'snare-hit',x:slot.x,y:slot.y,life:.65,maxLife:.65});this.bark('哎！谁把鞋带拉这儿了！',{enemy:target.id});this.event('impact',{heavy:true});}
        continue;
      }
      if (!def.damage) continue;
      // Ranged shots reach the enemy's body, including troops stopped outside a barricade.
      const attackRange=def.range+(def.ranged?ENEMY_HIT_RADIUS:0);
      const targets = this.enemies.filter(e => e.hp > 0 && !(e.airborne>0) && locate(e.s).floor === slot.floor && Math.abs(locate(e.s).x-slot.x) <= Math.max(attackRange,def.skill?215:0)).sort((a,b) => Number(b.carrying)-Number(a.carrying) || Math.abs(a.s-slot.s)-Math.abs(b.s-slot.s));
      if (!targets.length) continue;
      u.dir=locate(targets[0].s).x>=slot.x?1:-1;
      if(def.skill&&u.skillCooldown<=0){this.castSkill(u,targets);if(this.mode!=='running')return;u.cooldown=Math.max(u.cooldown,.5);continue;}
      if(u.cooldown>0)continue;
      const target=targets.find(e=>Math.abs(locate(e.s).x-slot.x)<=attackRange&&Math.abs(locate(e.s).x-slot.x)>=(def.minRange||0));if(!target)continue;
      const p=locate(target.s);u.dir=p.x>=slot.x?1:-1;
      u.cooldown=def.interval;u.attackDuration=u.type==='zhugeliang'?.65:.4;u.attack=u.attackDuration;
      if(u.type==='catapult'||u.type==='slinger'){
        const small=u.type==='slinger',flight=small?.5:.85;this.effects.push({kind:'stone',floor:slot.floor,damage:def.damage,radius:small?65:105,small,x:slot.x,y:slot.y-72,tx:p.x,ty:p.y-60,dir:u.dir,life:flight,maxLife:flight});
      }else if(def.ranged){
        const flight=u.type==='zhugeliang'?Math.max(.26,Math.min(.68,Math.abs(p.x-slot.x)/820)):.22;
        if(u.type==='ballista'||def.burstCount){u.burst=(u.burst||0)+1;if(u.burst<(def.burstCount||3))u.cooldown=.16;else u.burst=0;}
        this.effects.push({kind:u.type==='zhugeliang'?'feather':'arrow',target:target.id,damage:def.damage,x:slot.x+u.dir*24,y:slot.y-78,tx:p.x,ty:p.y-60,dir:u.dir,color:def.color,life:flight,maxLife:flight});
      }else{
        this.damage(target,def.damage);
        if(u.type==='guanyu'){const second=targets.find(e=>e!==target&&Math.abs(locate(e.s).x-p.x)<90);if(second)this.damage(second,def.damage*.55);}
        this.effects.push({kind:u.type==='lancer'?'thrust':'slash',x:slot.x,y:slot.y-65,tx:p.x,ty:p.y-55,dir:u.dir,color:def.color,life:.3,maxLife:.3});
      }
      this.event('attack', { unitType:u.type,slot:u.slot,target:target.id });
    }
    // Resolve capture before movement, so escorts select route obstacles in the same tick.
    // A rescued Liu Bei can immediately be captured again; there is no immunity.
    if (!this.liu.carrier) {
      const catcher = this.enemies.find(e => e.hp > 0 && !(e.airborne>0) && !e.escaped && e.stun<=0 && Math.abs(e.s-this.liu.s) < 35);
      if (catcher) this.capture(catcher);
      if(this.mode!=='running')return;
    }
    this.setArmyDirection();
    for (const e of this.enemies) {
      if (e.hp <= 0 || e.escaped) continue;
      if(e.airborne>0){
        e.moving=false;
        continue;
      }
      const p=locate(e.s),direction=e.direction;
      if(direction)e.facing=p.dir*direction;
      if(e.carrying){this.liu.s=e.s;if(this.checkCarrierExit(e))return;}
      if(e.stun>0||e.windup>0||e.exhausted>0){e.moving=false;e.attack=0;continue;}
      let travel=e.speed*(e.carrying?.9:1)*(e.slow>0?.42:1)*(e.bounty>0?1.3:1)*(e.charge>0?2.25:1)*dt;
      const blocker = this.units.filter(u => u.hp > 0 && !TYPES[u.type].trap && SLOTS[u.slot].floor === p.floor && Math.abs(SLOTS[u.slot].s-e.s) <= 35+travel && (SLOTS[u.slot].s-e.s)*direction >= -14).sort((a,b) => Math.abs(SLOTS[a.slot].s-e.s)-Math.abs(SLOTS[b.slot].s-e.s))[0];
      const distance=Math.abs(e.goalS-e.s),stopDistance=e.objective==='escort'?55:0;
      e.moving = !blocker&&distance>stopDistance;
      this.enemySkill(e);
      if(e.windup>0){e.moving=false;continue;}
      travel*= (e.dash>0&&!e.carrying?1.65:1)*(e.buff>0?1.18:1)*(e.guard>0?.78:1);
      if (e.moving) e.attack = 0;
      if (blocker) {
        if(e.charge>0){
          this.hurtUnit(blocker,(blocker.type==='barricade'?150:100)*ENEMY_STAT_MULTIPLIER);e.charge=0;e.exhausted=1.2;
          this.effects.push({kind:'roar',x:p.x,y:p.y-35,color:'#f8875f',life:.55,maxLife:.55});this.event('impact',{heavy:true});continue;
        }
        e.facing=Math.sign(SLOTS[blocker.slot].x-p.x)||e.facing;
        if (e.cooldown <= 0) {
          e.cooldown=ENEMY_TYPES[e.role].interval/(e.buff>0?1.25:1);e.attack=.35;this.hurtUnit(blocker,e.damage);
        }
      } else if(e.moving) {
        const previous = e.s;
        if(this.moveEnemy(e,e.s+direction*Math.min(travel,Math.max(0,distance-stopDistance))))return;
        e.walk += Math.abs(e.s-previous);
        e.facing=locate(e.s).dir*direction;
      }
      if (e.carrying) {
        this.liu.s = e.s;
        if (this.checkCarrierExit(e)) return;
      }
    }
    this.enemies = this.enemies.filter(e => e.hp > 0 && !e.escaped);
    this.units = this.units.filter(u => u.hp > 0);
    if (!this.liu.carrier && this.mode === 'running') {
      if(this.liu.skillCooldown<=0&&this.enemies.some(e=>e.hp>0&&!(e.airborne>0)&&Math.abs(e.s-this.liu.s)<145)){
        this.liu.dash=1.6;this.liu.skillCooldown=12;
        this.event('skill',{hero:'liubei',skill:'脚底抹油',color:'#eed77b'});this.bark('鞋底冒烟啦！', 'liubei');
      }
      const previous = this.liu.s;
      this.liu.s = Math.min(ROUTE_LENGTH, this.liu.s+34*(this.liu.dash>0?1.6:1)*dt);
      this.liu.walk += this.liu.s-previous;
      this.bestProgress=Math.max(this.bestProgress,this.liu.s/ROUTE_LENGTH);
      this.unlockAirborne();
      this.unlockCaozhangGate();
      if (this.liu.s >= ROUTE_LENGTH) { this.mode='won'; this.event('won'); }
    }
    if(this.time>=this.nextChatter&&this.mode==='running'){
      this.nextChatter=this.time+11;
      const lines=this.liu.carrier?['抓错啦！我就是个卖草鞋的！','放我下来，我自己会跑！']:['我先探路，你们慢聊！','军师！出口是哪边？','兄弟们，我在终点等你！','我这叫战略性挪窝！'];
      this.bark(lines[this.talkIndex++%lines.length]);
    }
  }
}
