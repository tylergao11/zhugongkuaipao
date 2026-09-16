import {Game,SLOTS,GRID_SPACING,SEGMENTS} from '../engine.js';
import {LEVELS,UNIT_NAMES,REMOVED_UNITS} from '../content.js';
import {CampProfile,DEFAULT_DECK} from '../theme.js';
import {BATTLE,LEVEL_TUNING,ECONOMY,UNIT_STATS} from '../assets/game/balance.js';

const failed=[];
const ok=name=>console.log('ok  '+name);
const bad=(name,detail)=>{failed.push(name+': '+detail);console.error('fail '+name+': '+detail);}
const near=(a,b,eps=1e-6)=>Math.abs(a-b)<=eps;
const cards=Object.keys(UNIT_NAMES);
const loadout=(levelId,deck,equipment={})=>({themeId:'liubei',levelId,deck,unlocked:cards,equipment});
const skipIntro=game=>{if(game.mode==='intro'){game.intro=null;game.mode='running';game.event('start');}};
const tick=(game,seconds)=>{for(let left=seconds;left>0&&['running','intro'].includes(game.mode);left-=1/60)game.update(1/60);};

function contentShape(){
  if(LEVELS.map(l=>l.id).join(',')!=='changban,river')return bad('levels','not changban,river');
  if(LEVELS.some(l=>l.id==='mountain'))return bad('levels','mountain still present');
  if(REMOVED_UNITS.join(',')!=='oil,snare')return bad('removed','expected oil,snare');
  if('oil' in UNIT_NAMES||'snare' in UNIT_NAMES)return bad('names','oil/snare still named');
  if('oil' in UNIT_STATS||'snare' in UNIT_STATS)return bad('stats','oil/snare still statted');
  if(LEVEL_TUNING.mountain||ECONOMY.levels.mountain)return bad('tuning','mountain leftovers');
  if(BATTLE.liu.dashCooldown!==30||BATTLE.guard.stun!==2)return bad('liu/guard',`dash ${BATTLE.liu.dashCooldown} stun ${BATTLE.guard.stun}`);
  if(LEVEL_TUNING.river.startingGoldBonus!==40)return bad('gold',String(LEVEL_TUNING.river.startingGoldBonus));
  const rec=LEVELS.find(l=>l.id==='river').recommended.join(',');
  if(rec!=='barricade,lancer,log,zhangfei,archer,zhugeliang')return bad('river deck',rec);
  if(!LEVELS.find(l=>l.id==='changban').phases)return bad('tutorial','missing phases');
  if(!LEVELS.find(l=>l.id==='river').groups)return bad('boss','missing groups');
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
  if(!game.canLiuDash())return bad('dash ready','not ready at start');
  if(!game.useLiuDash())return bad('dash use','rejected');
  if(!near(game.liu.dash,BATTLE.liu.dashDuration)||!near(game.liuDashCooldown,30))return bad('dash values',`${game.liu.dash}/${game.liuDashCooldown}`);
  const stair=SEGMENTS.find(s=>s.floor<0);
  game.liu.dash=0;game.liuDashCooldown=30;
  game.liu.s=stair.start+10;
  tick(game,0.4);
  if(game.liu.dash>0)return bad('stair dash','auto dash still fires');
  const e=game.spawn('soldier',game.liu.s-20);
  game.capture(e);
  if(game.canLiuDash())return bad('carried dash','dash allowed while carried');
  ok('manual dash');
}

function biteAndRescue(){
  const game=new Game(loadout('river',LEVELS.find(l=>l.id==='river').recommended));
  game.start();skipIntro(game);game.gold=999;
  game.liu.s=SLOTS[3].s;
  const chaser=game.spawn('soldier',game.liu.s-GRID_SPACING*1.5);
  if(!near(game.biteDistance(),1.5,0.05))return bad('bite',String(game.biteDistance()));
  game.capture(chaser);
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
  game.capture(near);
  const target=game.hookTarget(game.units[0]);
  if(target?.id!==near.id)return bad('hook target',target?String(target.id):'none');
  game.heroCooldowns.guanyu=0;game.units[0].skillCooldown=0;
  if(!game.useSkill('guanyu'))return bad('hook skill','rejected');
  ok('hook prefers carrier');
}

function logHelpsEscort(){
  const game=new Game(loadout('river',LEVELS.find(l=>l.id==='river').recommended));
  game.start();skipIntro(game);game.gold=999;
  const e=game.spawn('soldier',game.liu.s-40);
  game.capture(e);
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

function wallReleasesNextGroup(){
  const game=new Game(loadout('river',LEVELS.find(l=>l.id==='river').recommended));
  game.start();skipIntro(game);game.gold=999;
  tick(game,0.05);
  const first=game.nextGroup;
  if(first<1)return bad('street1','did not release');
  const members=game.groupMembers[0];
  for(let i=0;i<200&&(game.spawnQueue.some(w=>w.ids===members)||members.length<4);i++)tick(game,0.05);
  if(members.length<4)return bad('street1 spawn',String(members.length));
  if(game.nextGroup!==first)return bad('one group','dumped before street1 finished');
  tick(game,0.2);
  if(game.nextGroup!==first)return bad('closing hold','dumped while previous group still closing');
  const wall=SLOTS.filter(s=>s.floor===0&&s.s<game.liu.s).sort((a,b)=>b.s-a.s)[0];
  game.selected='barricade';
  if(!wall||!game.place(wall.id))return bad('wall','cannot place');
  for(const e of game.enemies)if(e.hp>0&&e.s<=game.liu.s)e.s=Math.min(e.s,wall.s-30);
  if(Number.isFinite(game.biteDistance()))return bad('blocked bite',String(game.biteDistance()));
  tick(game,0.15);
  if(game.nextGroup<=first)return bad('wall release','walling still withheld the next group');
  ok('wall 拉开 releases next group');
}

function pullAwayReleases(){
  const game=new Game(loadout('river',LEVELS.find(l=>l.id==='river').recommended));
  game.start();skipIntro(game);
  tick(game,0.05);
  const first=game.nextGroup;
  const members=game.groupMembers[0];
  for(let i=0;i<200&&(game.spawnQueue.some(w=>w.ids===members)||members.length<4);i++)tick(game,0.05);
  for(let i=0;i<80&&game.mode==='running';i++){
    for(const e of game.enemies)if(members.includes(e.id)&&e.hp>0){e.s=Math.max(0,game.liu.s-GRID_SPACING);e.airborne=0;}
    tick(game,0.05);
  }
  if(game.nextGroup!==first)return bad('step hold','released while still 差一步');
  game.liu.s+=GRID_SPACING*3;
  tick(game,0.2);
  if(game.nextGroup<=first)return bad('拉开 release','next group still blocked after 拉开');
  ok('拉开 after 差一步 releases next group');
}

function airGroupHold(){
  const game=new Game(loadout('river',LEVELS.find(l=>l.id==='river').recommended));
  game.start();skipIntro(game);
  game.caozhangGateOpen=true;game.plankOpen=true;game.landingArmed=true;game.plankArmed=true;game.gapAfterLanding=true;game.gapAfterPlank=true;
  game.nextGroup=3;game.groupMembers=[[1,2,3]];game.liu.s=SEGMENTS[4].start+200;
  tick(game,1.4);
  if(game.nextGroup!==4)return bad('air1',`nextGroup ${game.nextGroup}`);
  tick(game,1.5);
  if(game.nextGroup!==4)return bad('air hold',`dumped next group ${game.nextGroup}`);
  ok('air group does not dump next wave');
}

function xiahouKeepsCharge(){
  const game=new Game(loadout('river',LEVELS.find(l=>l.id==='river').recommended));
  game.start();skipIntro(game);
  const e=game.spawn('xiahou',game.liu.s-GRID_SPACING*1.5);
  e.skillCooldown=0;
  game.interrupt(e,1);
  if(e.chargedOnce)return bad('xiahou interrupt','pre-charge interrupt spent the charge');
  e.stun=0;e.exhausted=0;e.skillCooldown=0;
  game.enemySkill(e);
  if(!(e.windup>0)||!e.chargedOnce)return bad('xiahou charge',`windup ${e.windup} once ${e.chargedOnce}`);
  ok('xiahou charge survives pre-windup interrupt');
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
logHelpsEscort();
caocaoInstaLose();
caoHongNoGrab();
warGongPush();
wallReleasesNextGroup();
pullAwayReleases();
airGroupHold();
xiahouKeepsCharge();

if(failed.length){
  console.error('\n'+failed.length+' checks failed');
  for(const line of failed)console.error(' - '+line);
  process.exit(1);
}
console.log('\nall checks passed');
