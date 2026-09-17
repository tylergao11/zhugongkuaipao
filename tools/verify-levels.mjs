import {Game,SLOTS,GRID_SPACING,SEGMENTS,locate} from '../engine.js';
import {LEVELS,UNIT_NAMES,REMOVED_UNITS} from '../content.js';
import {CampProfile,DEFAULT_DECK} from '../theme.js';
import {BATTLE,LEVEL_TUNING,ECONOMY,UNIT_STATS} from '../assets/game/balance.js';
import {BattleCamera} from '../viewport.js';

const failed=[];
const ok=name=>console.log('ok  '+name);
const bad=(name,detail)=>{failed.push(name+': '+detail);console.error('fail '+name+': '+detail);}
const near=(a,b,eps=1e-6)=>Math.abs(a-b)<=eps;
const cards=Object.keys(UNIT_NAMES);
const loadout=(levelId,deck,equipment={})=>({themeId:'liubei',levelId,deck,unlocked:cards,equipment});
const skipIntro=game=>{};
const spendOil=game=>{game.liu.oilUsed=true;};
const tick=(game,seconds)=>{for(let left=seconds;left>0&&game.mode==='running';left-=1/60)game.update(1/60);};

function contentShape(){
  if(LEVELS.map(l=>l.id).join(',')!=='changban,river')return bad('levels','not changban,river');
  if(LEVELS.some(l=>l.id==='mountain'))return bad('levels','mountain still present');
  if(REMOVED_UNITS.join(',')!=='oil,snare,smoke')return bad('removed','expected oil,snare,smoke');
  if('oil' in UNIT_NAMES||'snare' in UNIT_NAMES||'smoke' in UNIT_NAMES)return bad('names','removed cards still named');
  if('oil' in UNIT_STATS||'snare' in UNIT_STATS)return bad('stats','oil/snare still statted');
  if(LEVEL_TUNING.mountain||ECONOMY.levels.mountain)return bad('tuning','mountain leftovers');
  if(BATTLE.liu.dashMultiplier!==3.6||BATTLE.liu.dashCost||BATTLE.guard)return bad('liu/guard',`dash ${BATTLE.liu.dashMultiplier} cost ${BATTLE.liu.dashCost} guard ${!!BATTLE.guard}`);
  if(LEVELS.find(l=>l.id==='river').intro)return bad('intro','river still has dilu intro');
  if(LEVEL_TUNING.river.startingGoldBonus!==40)return bad('gold',String(LEVEL_TUNING.river.startingGoldBonus));
  const rec=LEVELS.find(l=>l.id==='river').recommended.join(',');
  if(rec!=='barricade,lancer,log,zhangfei,archer,zhugeliang')return bad('river deck',rec);
  if(!LEVELS.find(l=>l.id==='changban').phases)return bad('tutorial','missing phases');
  const river=LEVELS.find(l=>l.id==='river');
  if(!river.groups)return bad('boss','missing groups');
  if(river.groups.map(g=>g.id).join(',')!=='street1,landing,air1,plank,air2')return bad('groups',river.groups.map(g=>g.id).join(','));
  if(LEVEL_TUNING.river.airborneAhead!==3||LEVEL_TUNING.river.airborneLandSeconds!==8)return bad('air',String(LEVEL_TUNING.river.airborneAhead));
  if(LEVEL_TUNING.river.bite.caught!==.2||LEVEL_TUNING.river.bite.miss!==.4||LEVEL_TUNING.river.bite.step!==2)return bad('bite',JSON.stringify(LEVEL_TUNING.river.bite));
  if(UNIT_STATS.zhangfei.skillTime!==6||UNIT_STATS.guanyu.skillTime!==6||UNIT_STATS.zhugeliang.skillTime!==7)return bad('hero cd',`${UNIT_STATS.zhangfei.skillTime}/${UNIT_STATS.guanyu.skillTime}/${UNIT_STATS.zhugeliang.skillTime}`);
  if(BATTLE.heroReadyDelay)return bad('hero ready',String(BATTLE.heroReadyDelay));
  ok('content shape');
}

function migrateSave(){
  const data={};
  const storage={getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=String(v);}};
  storage.setItem('zhugong-theme-liubei-v1',JSON.stringify({
    version:7,themeId:'liubei',coins:380,wins:2,chests:1,claims:[],
    cleared:{changban:[true,false,false],mountain:[true,true,false]},
    unlocked:['oil','snare','archer','barricade','guanyu'],
    owned:['taunt'],fitted:{zhangfei:'taunt'},deck:['oil','snare','archer','barricade'],
    levelId:'mountain',legacyArmory:[],vouchers:0
  }));
  const profile=new CampProfile(storage);
  if(profile.data.unlocked.includes('oil')||profile.data.unlocked.includes('snare'))return bad('migrate cards','oil/snare kept');
  if(profile.data.deck.includes('oil')||profile.data.deck.includes('snare'))return bad('migrate deck','oil/snare kept');
  if(!profile.levelUnlocked('river'))return bad('migrate unlock','river still locked');
  if(profile.data.levelId==='mountain')return bad('migrate level','still on mountain');
  if(!profile.ownsCard('guanyu')||!profile.ownsCard('zhugeliang'))return bad('migrate owns','post-tutorial cards missing');
  if(profile.data.deck.length===0)return bad('migrate deck','empty');
  ok('old save migrate');
}

function dashAndStairs(){
  const game=new Game(loadout('changban',DEFAULT_DECK));
  if(!game.start())return bad('dash start','cannot start');
  if(!game.oilReady()||game.liu.oilUsed)return bad('oil ready','not ready at start');
  const stair=SEGMENTS.find(s=>s.floor<0);
  game.liu.s=stair.start+10;
  tick(game,0.4);
  if(game.liu.dash>0||game.liu.oilUsed)return bad('stair dash','auto dash still fires');
  game.liu.s=BATTLE.liu.start;
  const gold=game.gold;
  const e=game.spawn('soldier',game.liu.s-20);
  game.capture(e);
  if(game.liu.carrier||!game.liu.oilUsed||!near(game.liu.dash,BATTLE.liu.dashDuration)||!near(game.gold,gold))return bad('first grab',`${game.liu.carrier}/${game.liu.dash}/${game.gold}`);
  if(game.oilReady())return bad('oil spent','still ready after slip');
  tick(game,0.2);
  if(game.liu.carrier)return bad('oil regrab','caught during slip');
  if(!near(game.liuSpeed(),BATTLE.liu.speed*3.6))return bad('oil speed',String(game.liuSpeed()));
  game.liu.dash=0;
  const again=game.spawn('soldier',game.liu.s-10);
  game.capture(again);
  if(!game.liu.carrier)return bad('second grab','oil fired twice');
  ok('first grab slips at 3.6');
}

function biteAndRescue(){
  const game=new Game(loadout('river',LEVELS.find(l=>l.id==='river').recommended));
  game.start();skipIntro(game);game.gold=999;
  game.liu.s=SLOTS[3].s;
  const chaser=game.spawn('soldier',game.liu.s-GRID_SPACING*1.5);
  if(!near(game.biteDistance(),1.5,0.05))return bad('bite',String(game.biteDistance()));
  spendOil(game);game.capture(chaser);
  const between=SLOTS.filter(s=>s.floor===0&&s.s<chaser.s&&s.s>game.exitS()).sort((a,b)=>Math.abs(a.s-chaser.s)-Math.abs(b.s-chaser.s))[0];
  if(!between)return bad('rescue slot','no slot between carrier and exit');
  game.selected='barricade';
  if(!game.place(between.id))return bad('rescue wall','cannot place');
  tick(game,2.5);
  if(game.mode!=='running')return bad('rescue run',game.mode);
  if(chaser.s<between.s-50)return bad('carrier blocked',`s ${chaser.s} passed wall ${between.s}`);
  if(chaser.moving&&Math.abs(chaser.s-between.s)>BATTLE.contactRadius+20)return bad('carrier blocked','still walking past wall');
  const hp=chaser.hp;
  for(let i=0;i<20&&game.liu.carrier;i++)game.damage(chaser,80,'physical',true);
  if(game.liu.carrier)return bad('rescue kill','still carried');
  if(game.rescues<1)return bad('rescue count',String(game.rescues));
  const freed=game.liu.s;
  tick(game,0.5);
  if(game.liu.s<=freed)return bad('resume run','Liu did not continue');
  if(chaser.hp!==hp&&!game.enemies.includes(chaser)&&game.mode==='lost')return bad('rescue lose','lost after rescue');
  ok('bite and barricade rescue');
}

function hookPrefersCarrier(){
  const game=new Game(loadout('river',['guanyu','barricade','archer','lancer','log','zhangfei'],{guanyu:'hook'}));
  game.start();skipIntro(game);game.gold=999;
  game.selected='guanyu';
  if(!game.place(0))return bad('hook place','guanyu');
  const far=game.spawn('soldier',30),near=game.spawn('soldier',160);
  if(!far||!near)return bad('hook spawn','missing enemy');
  spendOil(game);game.capture(near);
  const target=game.hookTarget(game.units[0]);
  if(target?.id!==near.id)return bad('hook target',target?String(target.id):'none');
  game.heroCooldowns.guanyu=0;game.units[0].skillCooldown=0;
  if(!game.useSkill('guanyu'))return bad('hook skill','rejected');
  ok('hook prefers carrier');
}

function heroesAutoCast(){
  const roar=new Game(loadout('river',['zhangfei','guanyu','zhugeliang','barricade','archer','lancer']));
  roar.start();skipIntro(roar);roar.gold=999;
  roar.selected='zhangfei';
  const slot=SLOTS.find(s=>s.floor===0&&s.col===1);
  if(!slot||!roar.place(slot.id))return bad('auto roar place','zhangfei');
  const soldier=roar.spawn('soldier',slot.s+80);
  if(!soldier)return bad('auto roar spawn','missing');
  roar.heroCooldowns.zhangfei=0;roar.units[0].skillCooldown=0;
  tick(roar,1/60);
  if(!(soldier.stun>0)||roar.heroCooldowns.zhangfei!==UNIT_STATS.zhangfei.skillTime)return bad('auto roar',`stun ${soldier.stun} cd ${roar.heroCooldowns.zhangfei}`);
  if(!roar.events.some(e=>e.type==='skill'&&e.hero==='zhangfei'))return bad('auto roar event','no skill event');
  const empty=new Game(loadout('changban',['guanyu','barricade','archer','lancer','log','zhangfei']));
  empty.start();skipIntro(empty);empty.gold=999;
  empty.selected='guanyu';
  if(!empty.place(0))return bad('auto empty place','guanyu');
  empty.heroCooldowns.guanyu=0;empty.units[0].skillCooldown=0;
  tick(empty,1/60);
  if(empty.enemies.length)return bad('auto empty','tutorial spawned too soon');
  if(empty.heroCooldowns.guanyu>0)return bad('auto empty','spent without target');
  const hook=new Game(loadout('river',['guanyu','barricade','archer','lancer','log','zhangfei'],{guanyu:'hook'}));
  hook.start();skipIntro(hook);hook.gold=999;
  hook.selected='guanyu';
  if(!hook.place(0))return bad('auto hook place','guanyu');
  const carrier=hook.spawn('soldier',30);
  if(!carrier)return bad('auto hook spawn','missing');
  spendOil(hook);hook.capture(carrier);
  hook.heroCooldowns.guanyu=0;hook.units[0].skillCooldown=0;
  const before=carrier.s;
  tick(hook,1/60);
  if(!(hook.heroCooldowns.guanyu>0)||!(carrier.s>before+40))return bad('auto hook',`s ${before} -> ${carrier.s} cd ${hook.heroCooldowns.guanyu}`);
  ok('hero skills auto-cast');
}

function firstHeroSkillReady(){
  const game=new Game(loadout('changban',['zhangfei','guanyu','barricade','archer','lancer','log']));
  game.start();game.gold=999;
  const slot=SLOTS.find(s=>s.floor===0&&s.col===1);
  const e=game.spawn('soldier',slot.s+80);
  game.selected='zhangfei';
  if(!slot||!e||!game.place(slot.id))return bad('first ready place','zhangfei');
  if(game.heroCooldowns.zhangfei>0)return bad('first ready gate',String(game.heroCooldowns.zhangfei));
  tick(game,1/60);
  if(game.heroCooldowns.zhangfei!==UNIT_STATS.zhangfei.skillTime)return bad('first ready cast',String(game.heroCooldowns.zhangfei));
  if(!(e.stun>0))return bad('first ready stun',String(e.stun));
  const slotId=game.units[0].slot;
  if(!game.dismantle(slotId))return bad('redeploy dismantle','failed');
  game.selected='zhangfei';
  if(!game.place(slotId))return bad('redeploy place','zhangfei');
  if(game.heroCooldowns.zhangfei>0)return bad('redeploy gate',String(game.heroCooldowns.zhangfei));
  ok('first hero skill has no ready delay');
}

function logHelpsEscort(){
  const game=new Game(loadout('river',LEVELS.find(l=>l.id==='river').recommended));
  game.start();skipIntro(game);game.gold=999;
  const e=game.spawn('soldier',game.liu.s-40);
  spendOil(game);game.capture(e);
  const slot=SLOTS.find(s=>s.floor===0&&Math.abs(s.s-e.s)<220);
  const roadDir=Math.sign(SEGMENTS[0].b[0]-SEGMENTS[0].a[0]);
  const before=e.s;
  game.selected='log';
  if(!game.place(slot.id,-roadDir))return bad('log place','failed');
  tick(game,0.25);
  if(!(e.s<before-10))return bad('log reverse',`s ${before} -> ${e.s}`);
  ok('log reverse helps escort');
}

function caocaoInstaLose(){
  const game=new Game(loadout('river',LEVELS.find(l=>l.id==='river').recommended));
  game.start();skipIntro(game);
  game.summonCaocao(game.level.caocao);
  game.caocao.s=game.liu.s;
  tick(game,0.05);
  if(game.mode!=='lost'||game.lossReason!=='caocao')return bad('caocao',`${game.mode} ${game.lossReason}`);
  ok('cao cao instant lose');
}

function caoHongNoGrab(){
  const game=new Game(loadout('river',LEVELS.find(l=>l.id==='river').recommended));
  game.start();skipIntro(game);
  const hong=game.spawn('caohong',game.liu.s);
  tick(game,0.2);
  if(game.liu.carrier===hong.id||game.mode==='lost')return bad('caohong grab','captured or lost');
  ok('cao hong does not grab');
}

function doorsNotGapSpawn(){
  const game=new Game(loadout('river',LEVELS.find(l=>l.id==='river').recommended));
  game.start();skipIntro(game);game.gold=999;
  tick(game,0.05);
  if(game.nextGroup!==1)return bad('street1',String(game.nextGroup));
  game.liu.s+=GRID_SPACING*3;
  tick(game,0.25);
  if(game.nextGroup!==1)return bad('拉开 dumped',String(game.nextGroup));
  const wall=SLOTS.filter(s=>s.floor===0&&s.s<game.liu.s).sort((a,b)=>b.s-a.s)[0];
  game.selected='barricade';
  if(!wall||!game.place(wall.id))return bad('wall','cannot place');
  for(const e of game.enemies)if(e.hp>0&&e.s<=game.liu.s)e.s=Math.min(e.s,wall.s-30);
  tick(game,0.2);
  if(game.nextGroup!==1)return bad('wall dumped',String(game.nextGroup));
  game.liu.s=SEGMENTS[2].start+80;
  for(const e of game.enemies)if(e.hp>0)e.s=0;
  tick(game,0.05);
  if(game.caozhangGateOpen)return bad('blocked bite door','opened while 拒马 blocked');
  game.units=game.units.filter(u=>u.hp>0&&u.type!=='barricade');
  const puller=game.spawn('soldier',game.liu.s-GRID_SPACING*3);
  if(!puller)return bad('puller','missing');
  const openedAt=game.time;
  tick(game,0.05);
  if(!game.caozhangGateOpen)return bad('landing floor+拉开','still closed');
  if(game.biteBand()!=='pull')return bad('landing band',game.biteBand());
  if(game.time-openedAt>0.2)return bad('landing wait',String(game.time-openedAt));
  if(game.nextGroup!==3)return bad('landing door',String(game.nextGroup));
  game.liu.s=SEGMENTS[4].start+80;
  puller.s=game.liu.s-GRID_SPACING*3;
  tick(game,0.05);
  if(!game.plankOpen)return bad('plank floor+拉开','still closed');
  if(game.nextGroup!==5)return bad('plank door',String(game.nextGroup));
  const carried=new Game(loadout('river',LEVELS.find(l=>l.id==='river').recommended));
  carried.start();skipIntro(carried);
  carried.liu.s=SEGMENTS[2].start+80;
  const grab=carried.spawn('soldier',carried.liu.s-GRID_SPACING*0.3);
  spendOil(carried);carried.capture(grab);
  tick(carried,0.2);
  if(carried.caozhangGateOpen||carried.plankOpen)return bad('capture door','opened while carried');
  const close=new Game(loadout('river',LEVELS.find(l=>l.id==='river').recommended));
  close.start();skipIntro(close);
  close.liu.s=SEGMENTS[2].start+80;
  const cling=close.spawn('soldier',close.liu.s-GRID_SPACING*1.2);
  for(const e of close.enemies)if(e!==cling)e.s=0;
  tick(close,0.05);
  if(!(close.biteDistance()<=2))return bad('close bite setup',String(close.biteDistance()));
  if(close.caozhangGateOpen)return bad('close bite door','opened at bite<=2');
  if('safeDistance' in (LEVEL_TUNING.river.gate||{}))return bad('gate safeDistance','still tuned');
  ok('doors open on floor+拉开, 拉开 alone does not');
}

function airborneAim(){
  const game=new Game(loadout('river',LEVELS.find(l=>l.id==='river').recommended));
  game.start();skipIntro(game);
  game.liu.s=SLOTS[1].s;
  const e=game.spawn('airborne');
  if(!e)return bad('air spawn','missing');
  game.dropEnemy(e);
  const gap=(e.s-game.liu.s)/GRID_SPACING;
  if(!near(gap,3,0.05))return bad('air aim',String(gap));
  if(!e.blockRoad)return bad('air block','ahead should block');
  game.liu.s=SEGMENTS[0].start+SEGMENTS[0].len-GRID_SPACING*2.2;
  const f=game.spawn('airborne');
  if(!f)return bad('air2 spawn','missing');
  game.dropEnemy(f);
  if(f.s>=game.liu.s)return bad('short floor face',`ahead ${(f.s-game.liu.s)/GRID_SPACING}`);
  if(f.blockRoad)return bad('air chase','short floor should chase from behind');
  game.liu.s=SEGMENTS[0].start+SEGMENTS[0].len-80;
  const g=game.spawn('airborne');
  if(!g)return bad('air3 spawn','missing');
  game.dropEnemy(g);
  if(g.s>=game.liu.s||g.blockRoad)return bad('stair mouth',String(g.s-game.liu.s));
  ok('airborne 3-grid aim, no face clamp');
}

function magnetPull(){
  const game=new Game(loadout('changban',DEFAULT_DECK));
  game.start();game.gold=999;
  const slot=SLOTS.filter(s=>s.floor===0&&s.s>game.liu.s&&s.s-game.liu.s<=GRID_SPACING*2).sort((a,b)=>a.s-b.s)[0];
  game.selected='archer';
  if(!slot||!game.place(slot.id))return bad('magnet place','no slot');
  const before=game.liu.s;
  tick(game,1);
  if(!near(game.liu.s-before,BATTLE.liu.speed*1.15,3))return bad('magnet',String(game.liu.s-before));
  const other=new Game(loadout('changban',DEFAULT_DECK));
  other.start();other.gold=999;
  other.liu.s=SEGMENTS[2].start+SEGMENTS[2].len-10;
  const up=SLOTS.find(s=>s.floor===2&&s.col===0);
  other.selected='archer';
  if(!up||!other.place(up.id))return bad('magnet other floor','no slot');
  const start=other.liu.s;
  tick(other,1);
  if(!near(other.liu.s-start,BATTLE.liu.speed,3))return bad('magnet cross floor',String(other.liu.s-start));
  const stair=new Game(loadout('changban',DEFAULT_DECK));
  stair.start();stair.gold=999;
  stair.liu.s=SEGMENTS[1].start+SEGMENTS[1].len-8;
  const nearSlot=SLOTS.filter(s=>s.floor===1&&s.s>stair.liu.s&&s.s-stair.liu.s<=GRID_SPACING*2).sort((a,b)=>a.s-b.s)[0];
  stair.selected='archer';
  if(!nearSlot||!stair.place(nearSlot.id))return bad('magnet stair place','no slot');
  if(locate(stair.liu.s).floor>=0)return bad('magnet stair','not on stairs');
  if(stair.liuPull()!==1)return bad('magnet stair pull',String(stair.liuPull()));
  const stairStart=stair.liu.s;
  tick(stair,0.15);
  if(locate(stair.liu.s).floor>=0)return bad('magnet stair left','left stairs');
  if(!near(stair.liu.s-stairStart,BATTLE.liu.speed*0.15,1))return bad('magnet stair speed',String(stair.liu.s-stairStart));
  ok('magnet same floor only');
}

function stairAbandon(){
  const game=new Game(loadout('changban',DEFAULT_DECK));
  game.start();game.gold=999;
  const slot=SLOTS.find(s=>s.floor===0&&s.col===4);
  game.selected='archer';
  if(!slot||!game.place(slot.id))return bad('abandon place','no slot');
  const u=game.units[0],e=game.spawn('soldier',slot.s+120);
  if(!e)return bad('abandon spawn','missing');
  u.cooldown=5;
  game.liu.s=SEGMENTS[1].start-2;
  tick(game,0.2);
  if(locate(game.liu.s).floor>=0)return bad('abandon stair','did not enter stairs');
  if(!(u.attack>0)&&u.cooldown>4)return bad('abandon pulse',`cd ${u.cooldown} atk ${u.attack}`);
  if(!game.lookback)return bad('abandon look','no lookback');
  ok('stair abandon pulse');
}

function streetSurvivesWithWall(){
  const game=new Game(loadout('river',LEVELS.find(l=>l.id==='river').recommended));
  if(!game.start()||game.mode!=='running')return bad('survive start',game.mode);
  if(game.intro||game.decoy)return bad('survive intro','intro or decoy still live');
  game.gold=999;
  tick(game,1);
  const wall=SLOTS.filter(s=>s.floor===0&&s.s<game.liu.s).sort((a,b)=>b.s-a.s)[0];
  game.selected='barricade';
  if(!wall||!game.place(wall.id))return bad('survive wall','cannot place');
  tick(game,12);
  if(game.mode!=='running')return bad('survive mode',`${game.mode} ${game.lossReason||''}`);
  if(game.liu.carrier)return bad('survive grab','captured behind wall');
  if(game.caozhangGateOpen)return bad('survive door','opened without 拉开 on mid floor');
  ok('street wall holds, no intro horse');
}

function biteMissIsOneSecond(){
  const game=new Game(loadout('river',LEVELS.find(l=>l.id==='river').recommended));
  game.start();skipIntro(game);
  game.enemies.length=0;game.spawned=0;
  const miss=game.spawn('soldier',game.liu.s-GRID_SPACING*.4);
  if(!miss||game.biteBand()!=='miss')return bad('miss band',game.biteBand()+' '+game.biteDistance());
  miss.s=game.liu.s-GRID_SPACING*.2;
  if(game.biteBand()!=='caught')return bad('caught band',game.biteBand());
  if(!game.biteLabel().includes('咬住'))return bad('caught label',game.biteLabel());
  miss.s=game.liu.s-GRID_SPACING*1.5;
  if(game.biteBand()!=='near')return bad('near band',game.biteBand());
  if(!game.biteLabel().includes('贴身'))return bad('near label',game.biteLabel());
  miss.s=game.liu.s-GRID_SPACING*2.4;
  if(game.biteBand()!=='pull')return bad('pull band',game.biteBand());
  ok('差一步 is the 1-second band');
}

function xiahouKeepsCharge(){
  const game=new Game(loadout('river',LEVELS.find(l=>l.id==='river').recommended));
  game.start();skipIntro(game);
  const e=game.spawn('xiahou',game.liu.s-GRID_SPACING*.4);
  e.skillCooldown=0;
  game.interrupt(e,1);
  if(e.chargedOnce)return bad('xiahou interrupt','pre-charge interrupt spent the charge');
  e.stun=0;e.exhausted=0;e.skillCooldown=0;
  game.enemySkill(e);
  if(!(e.windup>0)||!e.chargedOnce)return bad('xiahou charge',`windup ${e.windup} once ${e.chargedOnce}`);
  ok('xiahou charge survives pre-windup interrupt');
}

function dashThroughCircle(){
  const game=new Game(loadout('river',LEVELS.find(l=>l.id==='river').recommended));
  game.start();skipIntro(game);
  const e=game.spawn('airborne',game.liu.s+20);
  if(!e)return bad('dash air','missing');
  e.airborne=0;e.blockRoad=true;e.moving=false;e.objective='block';e.dropDuration=4;
  game.capture(e);
  if(!game.liu.oilUsed||!(game.liu.dash>0)||game.liu.carrier)return bad('dash slip',`${game.liu.oilUsed} ${game.liu.dash}`);
  tick(game,0.25);
  if(game.liu.carrier)return bad('dash grab','captured while crossing drop');
  if(!(e.s<game.liu.s-BATTLE.contactRadius))return bad('dash peel',`liu ${game.liu.s} air ${e.s}`);
  if(e.blockRoad||e.objective==='block')return bad('dash chase',e.objective||'block');
  const soldier=new Game(loadout('river',LEVELS.find(l=>l.id==='river').recommended));
  soldier.start();skipIntro(soldier);
  const grab=soldier.spawn('soldier',soldier.liu.s);
  soldier.capture(grab);
  tick(soldier,0.05);
  if(soldier.liu.carrier)return bad('dash soldier','caught during slip');
  const cao=new Game(loadout('river',LEVELS.find(l=>l.id==='river').recommended));
  cao.start();skipIntro(cao);
  const bait=cao.spawn('soldier',cao.liu.s-20);
  cao.capture(bait);
  cao.summonCaocao(cao.level.caocao);
  cao.caocao.s=cao.liu.s;
  tick(cao,0.05);
  if(cao.mode!=='lost'||cao.lossReason!=='caocao')return bad('dash cao',`${cao.mode} ${cao.lossReason}`);
  ok('dash passes airborne circle');
}

function cameraKeepsPair(){
  const cam=new BattleCamera();
  cam.resize(1280,720,false);
  cam.detail=true;cam.baseScale=cam.fit*cam.detailZoom;cam.scale=cam.baseScale;
  cam.x=200;cam.y=665;
  cam.framePair(200,665,1300,236);
  if(!cam.inView(200,665,40)||!cam.inView(1300,236,40))return bad('camera pair',`scale ${cam.scale} at ${cam.x},${cam.y}`);
  const short=new BattleCamera();
  short.resize(1280,400,true);
  short.framePair(200,665,1300,236);
  if(!short.inView(200,665,24)||!short.inView(1300,236,24))return bad('camera short',`scale ${short.scale} at ${short.x},${short.y}`);
  ok('camera hard-frames split floors');
}

function warGongPush(){
  const game=new Game(loadout('river',LEVELS.find(l=>l.id==='river').recommended));
  game.start();skipIntro(game);
  const e=game.spawn('soldier',SLOTS.find(s=>s.floor===2&&s.col===3).s+80);
  const before=e.s,stunned=e.stun;
  if(!game.activateMechanism('war-gong'))return bad('gong','not fired');
  if(e.stun>stunned)return bad('gong stun','still stuns');
  if(near(e.s,before,1))return bad('gong push',String(e.s-before));
  ok('war gong knockback');
}

contentShape();
migrateSave();
dashAndStairs();
biteAndRescue();
hookPrefersCarrier();
heroesAutoCast();
firstHeroSkillReady();
logHelpsEscort();
caocaoInstaLose();
caoHongNoGrab();
warGongPush();
doorsNotGapSpawn();
airborneAim();
magnetPull();
stairAbandon();
streetSurvivesWithWall();
biteMissIsOneSecond();
xiahouKeepsCharge();
dashThroughCircle();
cameraKeepsPair();

if(failed.length){
  console.error('\n'+failed.length+' checks failed');
  for(const line of failed)console.error(' - '+line);
  process.exit(1);
}
console.log('\nall checks passed');
