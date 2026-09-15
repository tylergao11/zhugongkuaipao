import { Game, TYPES, ENEMY_TYPES, ENEMY_LIMIT, CARD_ORDER, SLOTS, locate, ROUTE_LENGTH, CAOZHANG_GATE, FLOOR_Y, WIDTH, HEIGHT } from './engine.js';
import { prepareRigs, drawRig } from './animation.js';
import {scenePoint, renderSize, BattleCamera, FrameBudget} from './viewport.js';
import {fetchAsset, decodeImage} from './asset-loader.js';
import {GameMusic} from './music.js';
import {LIUBEI_THEME,CampProfile,RARITIES,MAX_DECK_SIZE} from './theme.js';
import {createCamp} from './camp.js';
import {COMMANDER_RIGS} from './commander-rigs.js';
import {createBattlePopup,BATTLE_POPUP_ASSETS} from './assets/game/battle-popup.js';

const $ = id => document.getElementById(id);
const profile=new CampProfile();
const game = new Game(profile.snapshot()), stage = $('game'), canvas = $('scene'), ctx = canvas.getContext('2d', { alpha: false });
const sprites = { liubei: 0, guanyu: 1, zhangfei: 2, zhugeliang: 3, archer: 4, enemy: 5, enemyHeavy: 6, horse: 7 };
const actorSizes = { liubei: 155, guanyu: 222, zhangfei: 220, zhugeliang: 174, archer: 151, lancer:184,shieldbearer:160,crossbowman:163,slinger:155,enemy: 144, enemyHeavy: 158,caohong:190,xiahou:200 };
const troopSprites={lancer:0,shieldbearer:1,crossbowman:2,slinger:3};
const images = {};
let rigs = {};
const slots = [], cards = new Map();
let ready = false, portrait = innerHeight > innerWidth, previous = 0, accumulated = 0, uiClock = 0;
let rotateFallback=false, rotated=false, loading=false, loadFailed=false;
const loadedAssets = new Map();
let reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let soundEnabled = true, audio, soundTime = 0, toastUntil = 0, uiMode = '', speechUntil = 0, speech = '';
let music, soundRequest=0, starting=false;
let idleClock = 0, viewPaused = false;
let battleSpeed = 1;
let inspectedSlot = null;
let drag = null;
let speechAnchor=null,impactPause=0,lastImpact=0,hapticsEnabled=true,skillBannerUntil=0;
const enemyLabelBoxes=[];
const camera=new BattleCamera(),frameBudget=new FrameBudget(),battle=$('battle-viewport'),world=$('battle-world');
let pan=null;
const camp=createCamp(profile,()=>{
  if(game.mode==='ready'){game.reset(profile.snapshot());showLoadoutCards();updateUI();}
},()=>void begin(),()=>ready&&!portrait&&!['running','paused'].includes(game.mode),{point:stagePoint,feedback:kind=>sound(kind),canClose:()=>game.mode!=='ready'});
const battlePopup=createBattlePopup($('battle-popup'),{
  resume:()=>void begin(),
  restart:()=>{game.reset(profile.snapshot());showLoadoutCards();updateUI();camp.open('deck');},
  camp:()=>camp.open('chest'),
  replay:()=>camp.open('deck')
});
function showLoadoutCards(){
  clearDrag();
  for(const [type,{button}]of cards){button.hidden=!game.deck.includes(type);button.style.order=game.deck.indexOf(type);}
  const bar=$('cards');
  bar.style.setProperty('--card-slots',MAX_DECK_SIZE);
  bar.setAttribute('aria-label',`出征卡栏，共 ${MAX_DECK_SIZE} 格，已携带 ${game.deck.length} 张`);
  bar.querySelectorAll('.card-locked-slot').forEach(slot=>slot.remove());
  for(let index=game.deck.length;index<MAX_DECK_SIZE;index++){
    const slot=document.createElement('div');
    slot.className='card-locked-slot';slot.style.order=index;
    slot.setAttribute('role','img');slot.setAttribute('aria-label',`第 ${index+1} 格已锁定，获得并携带更多卡牌后可用`);
    const lock=document.createElement('span');lock.className='card-slot-padlock';lock.setAttribute('aria-hidden','true');
    slot.append(lock);bar.append(slot);
  }
}

function stagePoint(clientX,clientY){
  const p=scenePoint(clientX,clientY,stage.getBoundingClientRect(),rotated);
  return{x:p.x/WIDTH*stage.clientWidth,y:p.y/HEIGHT*stage.clientHeight};
}
function applyCamera(){
  const o=camera.offset;
  world.style.transform=`translate(${o.x}px,${o.y}px)`;
  $('follow-liu').classList.toggle('active',camera.follow);
}
function layoutCamera(){
  camera.resize(battle.clientWidth,battle.clientHeight,stage.clientHeight<540||matchMedia('(pointer:coarse)').matches);
  world.style.width=`${WIDTH*camera.scale}px`;world.style.height=`${HEIGHT*camera.scale}px`;
  $('zoom-view').textContent=camera.detail?'全景':'放大';
  applyCamera();resizeCanvas();
}
function stopPan(){
  const old=pan;pan=null;battle.classList.remove('panning');
  if(old&&battle.hasPointerCapture(old.id))battle.releasePointerCapture(old.id);
}
battle.addEventListener('pointerdown',event=>{
  if(drag||pan||!event.isPrimary||event.button!==0||portrait||game.mode!=='running')return;
  event.preventDefault();const p=stagePoint(event.clientX,event.clientY);
  pan={id:event.pointerId,start:p,last:p,moved:false,slot:dropSlot(event.clientX,event.clientY)?.id};
  battle.setPointerCapture(event.pointerId);
});
battle.addEventListener('pointermove',event=>{
  if(!pan||pan.id!==event.pointerId)return;
  event.preventDefault();const p=stagePoint(event.clientX,event.clientY);
  if(!pan.moved&&Math.hypot(p.x-pan.start.x,p.y-pan.start.y)>6){pan.moved=true;closeUnitMenu();battle.classList.add('panning');}
  if(pan.moved){camera.pan(p.x-pan.last.x,p.y-pan.last.y);applyCamera();}
  pan.last=p;
});
battle.addEventListener('pointerup',event=>{
  if(!pan||pan.id!==event.pointerId)return;
  event.preventDefault();const old=pan;stopPan();
  if(!old.moved&&old.slot!==undefined)inspectUnit(old.slot);else closeUnitMenu();
});
for(const name of ['pointercancel','lostpointercapture'])battle.addEventListener(name,stopPan);
$('zoom-view').addEventListener('click',()=>{closeUnitMenu();camera.toggleZoom();layoutCamera();});
$('follow-liu').addEventListener('click',()=>{closeUnitMenu();const p=locate(game.liu.s);camera.focus(p.x,p.y);applyCamera();});
$('view-gate').addEventListener('click',()=>{if(!game.caozhangGateOpen)return;clearDrag();stopPan();closeUnitMenu();camera.focus(CAOZHANG_GATE.x,CAOZHANG_GATE.y);camera.follow=false;applyCamera();});
$('guard').addEventListener('click',()=>{if(game.summonGuard()){clearDrag();closeUnitMenu();const p=locate(game.liu.s);camera.focus(p.x,p.y);applyCamera();processEvents();updateUI();}});

function dropSlot(clientX,clientY) {
  const point=stagePoint(clientX,clientY),by=point.y-battle.offsetTop;
  if(point.x<0||point.x>battle.clientWidth||by<0||by>battle.clientHeight)return;
  const {x,y}=camera.worldPoint(point.x,by);
  return SLOTS.find(s=>Math.abs(s.x-x)<=76 && y>=s.y-150 && y<=s.y+22);
}
function clearDrag() {
  const previous=drag;drag=null;game.selected=null;
  $('drag-preview').hidden=true;
  slots.forEach(slot=>slot.classList.remove('drag-over'));
  if(previous){previous.button.classList.remove('dragging');if(previous.button.hasPointerCapture(previous.pointerId))previous.button.releasePointerCapture(previous.pointerId);}
}
function moveDrag(event) {
  if(!drag||event.pointerId!==drag.pointerId)return;
  event.preventDefault();
  drag.clientX=event.clientX;drag.clientY=event.clientY;
  refreshDrag();
}
function refreshDrag(){
  if(!drag)return;
  const slot=dropSlot(drag.clientX,drag.clientY);
  const allowed=slot&&game.canBuy(drag.type)&&(TYPES[drag.type].instant||!game.units.some(u=>u.slot===slot.id));
  const preview=$('drag-preview');
  const point=stagePoint(drag.clientX,drag.clientY);
  preview.style.left=`${point.x}px`;preview.style.top=`${point.y}px`;
  preview.style.width=`${256*camera.scale}px`;
  preview.classList.toggle('valid',!!allowed);
  slots.forEach((button,id)=>button.classList.toggle('drag-over',!!allowed&&slot.id===id));
  const c=$('drag-icon').getContext('2d');c.clearRect(0,0,256,256);
  if(TYPES[drag.type].instant||TYPES[drag.type].device||drag.type==='barricade')prop(c,drag.type,128,244,132);
  else actor(c,drag.type,128,244,actorSizes[drag.type],slot?.floor===1?1:-1);
}
function startDrag(event,type,button) {
  if(drag||!event.isPrimary||event.button!==0||portrait||viewPaused||game.mode!=='running')return;
  event.preventDefault();stopPan();closeUnitMenu();
  if(!game.isUnlocked(type)){toast('这张卡还没抽到，去长坂大营开宝箱');return;}
  if(!game.isEquipped(type)){toast('未编入本次出征，到长坂大营编队后再出发');return;}
  if(!game.canBuy(type)){toast(game.cooldowns[type]>0?`还需冷却 ${Math.ceil(game.cooldowns[type])} 秒`:game.gold<TYPES[type].cost?'军饷不足，稍等片刻':'这位武将已经上阵');return;}
  camera.follow=false;game.selected=type;drag={type,button,pointerId:event.pointerId};
  button.setPointerCapture(event.pointerId);button.classList.add('dragging');$('drag-preview').hidden=false;
  updateUI();moveDrag(event);
}
function finishDrag(event,cancelled=false) {
  if(!drag||event.pointerId!==drag.pointerId)return;
  event.preventDefault();
  const slot=cancelled?null:dropSlot(event.clientX,event.clientY);
  if(slot&&!portrait&&game.mode==='running')game.place(slot.id);
  clearDrag();processEvents();updateUI();
}

function closeUnitMenu() { inspectedSlot=null; $('unit-menu').hidden=true; }
function inspectUnit(id) {
  const unit=game.units.find(u=>u.slot===id);
  if(!unit){closeUnitMenu();return;}
  inspectedSlot=id;const slot=SLOTS[id],def=TYPES[unit.type];
  $('unit-name').textContent=def.name;
  $('dismantle').textContent=`拆卸 · 退 ${Math.floor(def.cost*.5*Math.max(0,Math.min(1,unit.hp/unit.maxHp)))}`;
  const o=camera.offset;
  $('unit-menu').style.left=`${Math.max(120,Math.min(stage.clientWidth-120,o.x+slot.x*camera.scale))}px`;
  $('unit-menu').style.top=`${Math.max(battle.offsetTop+40,Math.min(stage.clientHeight-130,battle.offsetTop+o.y+(slot.y-172)*camera.scale))}px`;
  $('unit-menu').hidden=false;
}
$('dismantle').addEventListener('click',()=>{if(inspectedSlot!==null){game.dismantle(inspectedSlot);closeUnitMenu();processEvents();updateUI();}});
$('close-unit').addEventListener('click',closeUnitMenu);

function sound(kind) {
  if (!soundEnabled || !audio || audio.state !== 'running') return;
  const now = audio.currentTime;
  if (kind === 'attack' && now - soundTime < .11) return;
  soundTime = now;
  const oscillator = audio.createOscillator(), gain = audio.createGain();
  const settings = kind === 'place' ? [420,650,.12,'triangle'] : kind === 'capture' ? [240,90,.3,'sawtooth'] : kind === 'rescue' ? [450,800,.22,'triangle'] : [150,55,.07,'triangle'];
  oscillator.type = settings[3]; oscillator.frequency.setValueAtTime(settings[0], now); oscillator.frequency.exponentialRampToValueAtTime(settings[1],now+settings[2]);
  gain.gain.setValueAtTime(.055,now); gain.gain.exponentialRampToValueAtTime(.001,now+settings[2]);
  oscillator.connect(gain).connect(audio.destination); oscillator.start(now); oscillator.stop(now+settings[2]);
}
function toast(text, duration = 2.5) { $('toast').textContent=text; $('toast').classList.add('visible'); toastUntil=performance.now()+duration*1000; }
function say(text, seconds = 3, anchor=null) { speech=text; speechUntil=game.time+seconds;speechAnchor=anchor; }
function impact(heavy=false,blocked=false) {
  const now=performance.now();if(now-lastImpact<(heavy?65:160))return;lastImpact=now;
  if(hapticsEnabled&&!reducedMotion){
    if(heavy)impactPause=Math.max(impactPause,.035);
    $('impact-flash').animate([{opacity:heavy?.27:.075},{opacity:0}],{duration:heavy?180:90});
  }
  if(hapticsEnabled&&navigator.vibrate){try{navigator.vibrate(heavy?[28,22,40]:blocked?9:6);}catch{}}
}

function createControls() {
  for (const s of SLOTS) {
    const button=document.createElement('button'); button.className='slot';
    button.style.left=`${s.x/WIDTH*100}%`; button.style.top=`${s.y/HEIGHT*100}%`;
    button.setAttribute('aria-label',`${['底层','中层','顶层'][s.floor]}第${s.col+1}格`);
    button.addEventListener('click', event => {
      if(event.detail===0&&!portrait&&game.mode==='running'&&!drag)inspectUnit(s.id);
    });
    $('slots').append(button); slots.push(button);
  }
  for (const type of CARD_ORDER) {
    const def=TYPES[type], button=document.createElement('button'); button.className='card'; button.dataset.type=type;
    button.setAttribute('aria-label',`拖拽${def.name}，${def.cost}军饷`);
    button.setAttribute('aria-pressed','false'); button.title=`拖拽${def.name}到格子 · ${def.help}`;
    const icon=document.createElement('canvas'); icon.width=180; icon.height=132;
    const label=document.createElement('span'); label.className='name'; label.textContent=def.name;
    const quality=document.createElement('span');quality.className='quality-badge';quality.hidden=true;
    const cost=document.createElement('span'); cost.className='cost'; cost.textContent=def.cost;
    const badge=document.createElement('span'); badge.className='badge'; badge.textContent=def.instant ? '手动' : def.ranged||type==='archer'||type==='zhugeliang'?'远程':def.unique ? '唯一' : '';
    if (!badge.textContent) badge.hidden=true;
    const skill=document.createElement('span');skill.className='skill-status';skill.hidden=!def.skill&&!def.cooldown;
    const meter=document.createElement('span');meter.className='skill-meter';meter.hidden=true;
    const fill=document.createElement('i');meter.append(fill);button.style.setProperty('--unit-color',def.color);
    button.append(icon,label,cost,badge,quality,skill,meter);
    button.addEventListener('pointerdown',event=>startDrag(event,type,button));
    button.addEventListener('pointermove',moveDrag);
    button.addEventListener('pointerup',event=>finishDrag(event));
    button.addEventListener('pointercancel',event=>finishDrag(event,true));
    button.addEventListener('lostpointercapture',event=>finishDrag(event,true));
    button.addEventListener('click',event=>event.preventDefault());
    button.addEventListener('contextmenu',event=>event.preventDefault());
    $('cards').append(button); cards.set(type,{button,icon,cost,quality,skill,meter,fill});
  }
  showLoadoutCards();
}

function updateUI() {
  music?.setActive((game.mode==='running'||starting)&&!portrait&&!document.hidden);
  if(game.mode!=='running'||portrait){if(drag)clearDrag();if(pan)stopPan();}
  if(inspectedSlot!==null && (!game.units.some(u=>u.slot===inspectedSlot)||game.mode!=='running'))closeUnitMenu();
  $('gold').textContent=Math.floor(game.gold);
  $('guard').textContent=game.guardUsed?'护驾 · 本局已用':'护驾 · 仅一次';
  $('guard').disabled=game.guardUsed||game.mode!=='running';
  const gateActive=game.caozhangGateOpen&&game.mode!=='ready'&&game.mode!=='won';
  const gateOpening=gateActive&&game.time-game.caozhangGateOpenedAt<4;
  stage.classList.toggle('gate-open',gateActive);stage.classList.toggle('gate-opening',gateOpening);
  $('view-gate').hidden=!game.caozhangGateOpen;
  $('gate-danger').hidden=!gateActive;$('gate-danger').classList.toggle('carrying',!!game.liu.carrier&&game.mode==='running');
  $('gate-warning').hidden=!gateOpening;
  if(!gateActive)for(const animation of $('gate-danger').getAnimations())animation.cancel();
  $('kill-count').textContent=`击退 ${game.kills}`;$('enemy-count').textContent=`场上 ${game.enemies.length} · 待援 ${Math.max(0,ENEMY_LIMIT-game.spawned)}`;
  $('skill-banner').hidden=game.time>=skillBannerUntil||game.mode!=='running';
  const pct=Math.min(100,Math.max(0,Math.floor(game.liu.s/ROUTE_LENGTH*100)));
  $('progress-text').textContent=`${pct}%`;
  $('progress-fill').style.width=`${pct}%`;
  $('progress-fill').parentElement.classList.toggle('captured',!!game.liu.carrier);
  const rightGateThreat=game.caozhangGateOpen;
  $('escape-label').textContent=game.liu.carrier ? rightGateThreat?'曹军清路押往长坂桥右门！':'曹军清路押送！截住扛人的！' : game.liu.dash>0?'刘备 · 脚底抹油！':gateActive?'刘备逃脱 · 右门已开':'刘备逃脱进度';
  for (const [type,{button,quality,skill,meter,fill}] of cards) {
    const def=TYPES[type],unit=game.units.find(u=>u.type===type),deployed=def.unique&&!!unit;
    button.classList.toggle('selected',game.selected===type);
    button.classList.toggle('unavailable',!game.canBuy(type));
    button.classList.toggle('locked',!game.isUnlocked(type));
    button.classList.toggle('stored',game.isUnlocked(type)&&!game.isEquipped(type));
    button.classList.toggle('deployed',!!deployed);
    button.setAttribute('aria-pressed',String(game.selected===type));
    const rarity=RARITIES.find(r=>r.name===game.loadout.labels[type]);
    quality.hidden=!rarity;quality.textContent=rarity?.name||'';
    if(rarity)button.style.setProperty('--quality-color',rarity.color);
    if(def.skill){
      skill.textContent=unit?`${def.shortSkill} · ${unit.skillCooldown>0?Math.ceil(unit.skillCooldown)+'秒':'就绪'}`:`${def.shortSkill} · 自动`;
      meter.hidden=!unit;fill.style.width=unit?`${Math.max(0,1-unit.skillCooldown/def.skillTime)*100}%`:'0%';
      button.classList.toggle('skill-ready',!!unit&&unit.skillCooldown<=0);
    }else if(def.cooldown){
      const remaining=game.cooldowns[type]||0;
      button.classList.toggle('cooling',remaining>0);
      skill.textContent=remaining>0?`冷却 ${Math.ceil(remaining)} 秒`:`冷却 ${def.cooldown} 秒`;
      meter.hidden=remaining<=0;fill.style.width=`${(1-remaining/def.cooldown)*100}%`;
    }
  }
  const def=TYPES[game.selected];
  for (let id=0;id<18;id++) {
    const occupied=game.units.some(u=>u.slot===id);
    slots[id].classList.toggle('occupied',occupied);
    slots[id].classList.toggle('available',!!def && !def.instant && !occupied && game.canBuy(game.selected));
    slots[id].classList.toggle('target',!!def?.instant && game.canBuy(game.selected));
    slots[id].disabled=game.mode!=='running';
  }
  if (uiMode!==game.mode) {
    uiMode=game.mode;
    if (game.mode==='running') $('overlay').hidden=true;
    else if (game.mode!=='ready') showOverlay(game.mode);
  }
}
function showOverlay(mode) {
  $('overlay').classList.remove('loading-only','can-retry');
  $('overlay').dataset.mode=mode;
  $('overlay').hidden=false; $('load-status').hidden=true;
  $('load-progress').hidden=true;
  if(mode==='won'||mode==='lost'){
    game.rewardReceipt||=profile.settle(game);
  }
  if(mode==='won')say('兄弟们，撤！');
  battlePopup.show(mode,game,game.rewardReceipt);
}
async function begin() {
  if (!ready || portrait || starting) return;
  if(game.mode!=='paused'&&!profile.canDeploy()){toast('至少带上一张卡牌再出征');camp.open();return;}
  starting=true;$('start').disabled=true;
  $('overlay').hidden=false;$('overlay').classList.add('loading-only');$('overlay').classList.remove('can-retry');
  $('load-progress').hidden=true;
  $('load-status').hidden=false;$('load-status').textContent='正在开启声音…';
  $('start').textContent='准备进入…';
  if(soundEnabled&&!(await startSound(false,true))){
    starting=false;$('start').disabled=false;$('start').textContent='重试开启声音';
    $('overlay').classList.add('can-retry');
    $('load-status').textContent='声音未能开启，请再次点击重试';
    return;
  }
  starting=false;
  if(portrait||document.hidden){music?.setActive(false);$('start').disabled=false;$('start').textContent='开始断后';$('overlay').classList.add('can-retry');return;}
  clearDrag();closeUnitMenu();
  if (game.mode==='paused') { game.mode='running'; viewPaused=false; }
  else { game.reset(profile.snapshot());setBattleSpeed(1); game.start();showLoadoutCards();say('我先探路，你们慢聊！',3);game.nextTalk=3;skillBannerUntil=0;impactPause=0;const p=locate(game.liu.s);camera.focus(p.x,p.y);applyCamera(); }
  accumulated=0; previous=performance.now(); updateUI();
}
async function fullscreen() {
  try { if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen({ navigationUI:'hide' }); } catch { /* Unsupported fullscreen still permits landscape play. */ }
  try { if (screen.orientation?.lock) await screen.orientation.lock('landscape-primary'); } catch { /* The portrait gate is the browser-compatible fallback. */ }
  updateViewport();
  if(!document.fullscreenElement){
    $('fullscreen-note').textContent='当前浏览器未进入全屏，可直接进入横向画面。';
    if(!portrait)toast('当前浏览器不支持全屏，已按可用区域显示');
  }
}
function pause() {
  if (game.mode==='running') { game.mode='paused'; updateUI(); }
  else if (game.mode==='paused') begin();
}
function setBattleSpeed(speed) {
  battleSpeed=speed;
  const button=$('battle-speed');
  button.textContent=speed+'×';
  button.classList.toggle('active',speed===2);
  button.setAttribute('aria-pressed',String(speed===2));
  button.setAttribute('aria-label',speed===2?'当前 2 倍速，切换正常速度':'当前正常速度，切换 2 倍速');
  button.title=speed===2?'恢复 1 倍速':'开启 2 倍速';
}
$('start').addEventListener('click',()=>{if(loadFailed){void loadAssets();return;}if(game.mode==='paused'||$('overlay').classList.contains('loading-only'))void begin();else camp.open(['won','lost'].includes(game.mode)?'deck':'chest');});
$('battle-speed').addEventListener('click',()=>{if(game.mode==='running')setBattleSpeed(battleSpeed===1?2:1);});
$('fullscreen').addEventListener('click',fullscreen);
$('haptics').addEventListener('click',()=>{hapticsEnabled=!hapticsEnabled;$('haptics').classList.toggle('active',hapticsEnabled);$('haptics').setAttribute('aria-label',hapticsEnabled?'关闭震感':'开启震感');if(!hapticsEnabled){impactPause=0;if(navigator.vibrate)navigator.vibrate(0);}});
$('rotate-fullscreen').addEventListener('click',fullscreen);
$('rotate-play').addEventListener('click',()=>{rotateFallback=true;updateViewport();});
function updateSoundButton() {
  $('sound').classList.toggle('active',soundEnabled);$('sound').textContent=soundEnabled?'♫':'♪';
  $('sound').setAttribute('aria-label',soundEnabled?'关闭音乐与音效':'开启音乐与音效');
  $('sound').setAttribute('aria-pressed',String(soundEnabled));
}
function getMusic() {
  audio ||= new (window.AudioContext||window.webkitAudioContext)();
  return music ||= new GameMusic(audio);
}
async function startSound(notify=false,forStart=false) {
  const request=++soundRequest;
  try {
    getMusic();
    if(!music.buffer)throw new Error('背景音乐尚未加载完成');
    const resume=music.unlock();
    music.setActive((forStart||game.mode==='running')&&!portrait&&!document.hidden);
    await Promise.all([resume,music.enable()]);
    if(request!==soundRequest)return false;
    if(forStart&&!music.source)throw new Error('音乐尚未开始播放');
    if(notify){sound('place');toast(game.mode==='running'?'音乐已开启 · 溜为上策':'音乐已开启，开始游戏后播放');}
    return true;
  }catch(error){
    if(request!==soundRequest)return false;
    console.warn('Music unavailable',error);music?.disable();
    if(notify)toast('声音未能开启，点击 ♫ 重试');
    return false;
  }
}
$('sound').addEventListener('click',()=>{
  soundEnabled=!soundEnabled;updateSoundButton();
  if(soundEnabled&&ready)void startSound(true);
  else {++soundRequest;music?.disable();}
});
function recoverAudio() {
  if(soundEnabled&&audio&&audio.state!=='running')void music.unlock().catch(()=>{});
}
stage.addEventListener('pointerdown',recoverAudio,{capture:true,passive:true});
document.addEventListener('WeixinJSBridgeReady',recoverAudio);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&game.mode==='running')game.mode='paused';
  updateUI();
});
function updateViewport() {
  const viewport=window.visualViewport;
  const width=viewport?.width||innerWidth, height=viewport?.height||innerHeight;
  const nextRotated=height>width&&rotateFallback;
  const changed=rotated!==nextRotated;
  rotated=nextRotated; portrait=height>width&&!rotated;
  if(drag)clearDrag();stopPan();closeUnitMenu();
  if((portrait||changed)&&game.mode==='running')game.mode='paused';
  document.body.classList.toggle('rotate-needed',portrait);
  document.body.classList.toggle('virtual-landscape',rotated);
  const safe=getComputedStyle($('safe-area'));
  const left=parseFloat(safe.paddingLeft)||0,right=parseFloat(safe.paddingRight)||0,top=parseFloat(safe.paddingTop)||0,bottom=parseFloat(safe.paddingBottom)||0;
  const aw=Math.max(1,width-left-right),ah=Math.max(1,height-top-bottom);
  const layout={width:rotated?ah:aw,height:rotated?aw:ah,left:left+aw/2,top:top+ah/2};
  stage.style.width=`${layout.width}px`;stage.style.height=`${layout.height}px`;
  stage.style.left=`${layout.left+(viewport?.offsetLeft||0)}px`;stage.style.top=`${layout.top+(viewport?.offsetTop||0)}px`;
  stage.classList.toggle('compact',layout.width<850);
  stage.style.setProperty('--hud-height',`${Math.min(82,Math.max(58,layout.height*.105))}px`);
  // Reserve real portrait space on phones; the battlefield camera uses the remaining height.
  stage.style.setProperty('--bar-height',`${Math.min(140,Math.max(96,layout.height*.24))}px`);
  stage.style.setProperty('--popup-room',`${layout.height*.84}px`);
  layoutCamera();updateUI();
}
window.addEventListener('resize',updateViewport);
window.visualViewport?.addEventListener('resize',updateViewport);
window.visualViewport?.addEventListener('scroll',updateViewport);
screen.orientation?.addEventListener('change',updateViewport);
document.addEventListener('fullscreenchange',updateViewport);
window.addEventListener('pageshow',updateViewport);
document.addEventListener('keydown',event=>{
  if (event.code==='Space' && event.target===document.body) { event.preventDefault(); pause(); }
  if (event.key==='Escape') { clearDrag();closeUnitMenu();updateUI(); }
});
window.addEventListener('blur',()=>{stopPan();if(drag){clearDrag();updateUI();}});

function processEvents() {
  for (const e of game.events.splice(0)) {
    if (e.text&&e.type!=='talk') toast(e.text,e.type==='capture'?3.5:2.5);
    if (e.type==='capture') {say('抓错啦！我就是个卖草鞋的！',4);impact(true);}
    if (e.type==='rescue') {say('好兄弟！我先溜了！',3);impact(true);}
    if(e.type==='talk')say(e.text,2.8,e.who);
    if(e.type==='place'&&!reducedMotion){
      const card=cards.get(e.unitType)?.button;
      if(card)card.animate([{filter:'brightness(1.35)'},{filter:'brightness(1)'}],{duration:220});
    }
    if(e.type==='commander-defeated'){
      const amount=profile.awardCommander(game,e.enemyId,e.role);
      if(amount){game.bossCoins+=amount;toast(`${ENEMY_TYPES[e.role].name}战败 · 金币 +${amount}`,3);game.effects.push({kind:'loot',x:e.x,y:e.y,amount,life:1.4,maxLife:1.4});sound('rescue');}
    }
    if(e.type==='commander'){
      $('skill-banner').textContent=`${ENEMY_TYPES[e.hero].name} · ${e.skill}`;
      $('skill-banner').style.setProperty('--skill-color',e.color);skillBannerUntil=game.time+2.4;impact(true);sound('capture');
    }
    if(e.type==='impact')impact(e.heavy,e.blocked);
    if(e.type==='gate-open'){
      updateUI();game.shake=.45;impact(true);sound('capture');
      if(!reducedMotion)$('gate-danger').animate([
        {opacity:1,backgroundColor:'#c4121266'},
        {opacity:.45,backgroundColor:'#c412120a',offset:.35},
        {opacity:.95,backgroundColor:'#c412124d',offset:.6},
        {opacity:.36,backgroundColor:'transparent'}
      ],{duration:2600,easing:'ease-out'});
    }
    if(e.type==='skill'){
      $('skill-banner').textContent=`${e.hero==='zhaoyun'?'赵子龙':TYPES[e.hero]?.name||'刘备'} · ${e.skill}`;
      $('skill-banner').style.setProperty('--skill-color',e.color);skillBannerUntil=game.time+1.25;
      const card=cards.get(e.hero)?.button;if(card)card.animate([{boxShadow:`0 0 25px ${e.color}`,transform:'translateY(-5px)'},{boxShadow:'none',transform:'translateY(0)'}],{duration:450});
      impact(true);sound('rescue');
    }
    if(e.type==='guard-land'){impact(true);sound('rescue');}
    if (['place','attack','capture','rescue'].includes(e.type)) sound(e.type);
    if (e.type==='won'||e.type==='lost') updateUI();
  }
}

function resizeCanvas() {
  const size=renderSize(WIDTH*camera.scale,HEIGHT*camera.scale,devicePixelRatio||1,frameBudget.quality);
  if(canvas.width!==size.width||canvas.height!==size.height){canvas.width=size.width;canvas.height=size.height;}
}
function roundRect(c,x,y,w,h,r,fill,stroke) { c.beginPath(); c.roundRect(x,y,w,h,r); if(fill){c.fillStyle=fill;c.fill();} if(stroke){c.strokeStyle=stroke;c.stroke();} }
function text(c,value,x,y,size=20,color='#f5dfaf',align='center') { c.font=`bold ${size}px "Microsoft YaHei",sans-serif`;c.textAlign=align;c.fillStyle=color;c.fillText(value,x,y); }
// Reuse the approved parchment and ink artwork; cache static labels outside the frame loop.
const signCache=new Map();
function paintedSign(label,x,y,width,height,size=18,ink='#382717',material='ivory'){
  const paper=images['camp-'+material];if(!paper)return;
  const key=[label,width,height,size,ink,material].join('|');
  let sign=signCache.get(key);
  if(!sign){
    sign=document.createElement('canvas');sign.width=width*2;sign.height=height*2;
    const c=sign.getContext('2d');c.scale(2,2);c.drawImage(paper,0,0,width,height);
    c.fillStyle=ink;c.font=`900 ${size}px KaiTi,STKaiti,serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(label,width/2,height*.51,width*.86);
    // Changing combat messages must not grow this cache indefinitely.
    if(signCache.size>80)signCache.clear();signCache.set(key,sign);
  }
  ctx.drawImage(sign,x,y,width,height);
}

function actor(c,type,x,y,size,dir=1,state='idle',phase=0,flash=0,alpha=1) {
  const boss=type==='caohong'||type==='xiahou';
  const infantry=troopSprites[type]!==undefined;
  let sheet=infantry?images.troops:boss?images.commanders:images.actors; const index=infantry?troopSprites[type]:boss?(type==='caohong'?0:1):sprites[type];
  if (!sheet || index===undefined) return;
  const columns=infantry||boss?2:4,rows=boss?1:2;
  let cw=sheet.width/columns,ch=sheet.height/rows,sx=(index%columns)*cw,sy=Math.floor(index/columns)*ch;
  const run=state==='run'||state==='carry', attack=state==='attack'||state==='skill', dying=state==='death';
  const attackProgress=Math.min(1,Math.max(0,phase)), strike=Math.sin(attackProgress*Math.PI);
  const clock=game.mode==='ready'?idleClock:game.time,beat=clock*(type==='zhugeliang'?3.1:type==='zhangfei'?2.6:3.7)+x*.023+y*.009;
  c.save();c.globalAlpha=alpha;
  c.translate(x+(attack?strike*dir*4:0),y);
  c.scale(dir,1);
  if(dying)c.rotate(-phase*1.5);
  if(!run&&!dying){
    const breath=Math.sin(beat),sway=Math.sin(beat*.63);
    c.transform(1,0,sway*.014,1+breath*.013,0,0);
    c.rotate(sway*(type==='zhugeliang'?.018:.012));
    if(attack){
      const snap=attackProgress<.3?-attackProgress/.3:Math.exp(-(attackProgress-.3)*7);
      if(type==='archer'||type==='crossbowman'){c.rotate(snap*.06);c.transform(1,0,-snap*.035,1,0,0);}
      else if(type==='lancer'){c.translate(strike*12,0);c.transform(1,0,-strike*.09,1,0,0);}
      else if(type==='slinger'){c.rotate(snap*.13);c.translate(strike*5,-strike*3);}
      else if(type==='guanyu'){c.rotate(-Math.sin(attackProgress*Math.PI*2)*(state==='skill'?.23:.14));}
      else if(type==='zhangfei'){c.scale(1+strike*.055,1-strike*(state==='skill'?.085:.045));c.rotate(snap*.04);}
      else if(type==='zhugeliang'){c.rotate(Math.sin(attackProgress*Math.PI*2)*.075);c.transform(1,0,-strike*.035,1,0,0);}
      else c.rotate(snap*.075);
    }
  }
  if(flash>0&&!dying)c.translate(-Math.sin(flash/.16*Math.PI)*3,0);
  if(flash>0)c.filter='brightness(1.45)';
  if(run&&rigs[type])drawRig(c,rigs[type],size,phase);
  else c.drawImage(sheet,sx,sy,cw,ch,-size/2,-size*.95,size,size);
  c.restore();
}
function prop(c,type,x,y,size=125,angle=0,dir=1,attack=0,hit=0) {
  const device=TYPES[type]?.device,image=device?images.devices:images.props;
  if (!image) return;
  const index={barricade:0,log:1,oil:2,ballista:0,catapult:1,snare:2}[type];
  c.save();c.translate(x,device?y:y-size*.42);c.scale(dir,1);c.rotate(angle);
  if(hit>0){c.translate(-Math.sin(hit/.16*Math.PI)*3,0);c.filter='brightness(1.3)';}
  if(device){const clock=game.mode==='ready'?idleClock:game.time,recoil=Math.sin(Math.min(1,attack/.4)*Math.PI);c.translate(-recoil*5,Math.sin(clock*2+x)*.7);c.rotate(type==='catapult'?-recoil*.06:0);}
  c.drawImage(image,index*image.width/3,0,image.width/3,image.height,-size/2,-size*(device?[.87,.86,.80][index]:.5),size,size);c.restore();
}
function shadow(x,y,w=52) { ctx.fillStyle='#090c11a0';ctx.beginPath();ctx.ellipse(x,y+1,w,9,0,0,Math.PI*2);ctx.fill(); }
function health(x,y,hp,max,enemy=false) {
  const w=enemy?51:68; ctx.fillStyle='#131819';ctx.fillRect(x-w/2-2,y-2,w+4,8);
  ctx.fillStyle=enemy?'#d66a4c':'#acd278';ctx.fillRect(x-w/2,y,w*Math.max(0,hp/max),4);
}
function banner(x,y,label,color) {
  ctx.strokeStyle='#2d211d';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x-30,y-10);ctx.lineTo(x-30,y+97);ctx.stroke();
  ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x-24,y);ctx.lineTo(x+25,y+3);ctx.lineTo(x+22,y+77);ctx.lineTo(x,y+65);ctx.lineTo(x-24,y+75);ctx.closePath();ctx.fill();
  text(ctx,label,x,y+43,27,'#ead3a7');
}
function drawBackground(t) {
  ctx.fillStyle='#252c36';ctx.fillRect(0,0,WIDTH,HEIGHT);
  if(images.castle) ctx.drawImage(images.castle,0,0,WIDTH,HEIGHT);
  else if(preview.complete&&preview.naturalWidth)ctx.drawImage(preview,0,0,WIDTH,HEIGHT);
  const haze=ctx.createLinearGradient(0,0,0,HEIGHT);haze.addColorStop(0,'#0d162522');haze.addColorStop(.8,'#111c2722');haze.addColorStop(1,'#0b121766');ctx.fillStyle=haze;ctx.fillRect(0,0,WIDTH,HEIGHT);
  // Platforms and staircases belong to the approved painting, never draw a second set.
  paintedSign('曹军入口',18,FLOOR_Y[0]+4,128,34,18,'#7d2e20');
  paintedSign('逃生出口 →',1225,FLOOR_Y[2]+4,195,34,19);
  for(let f=0;f<3;f++){
    paintedSign(LIUBEI_THEME.floors[f],13,FLOOR_Y[f]-160,96,38,21);
    ctx.globalAlpha=.24;for(let j=0;j<5;j++){const x=390+j*163,y=FLOOR_Y[f]-11;ctx.fillStyle='#f4d78f';ctx.beginPath();const d=f===1?-1:1;ctx.moveTo(x-5*d,y-5);ctx.lineTo(x+3*d,y);ctx.lineTo(x-5*d,y+5);ctx.fill();}ctx.globalAlpha=1;
  }
  // Small embers: no large particle textures or heavy filters.
  if(!reducedMotion)for(let i=0;i<11;i++){const x=(i*137+37)%1440,y=130+(i*79-t*17)%500;ctx.globalAlpha=(Math.sin(t*2+i)+1)*.18;ctx.fillStyle='#f8b66a';ctx.fillRect(x,y,2,3);}ctx.globalAlpha=1;
}
function drawCaozhangGate(t){
  if(!game.caozhangGateOpen)return;
  const {x,y}=CAOZHANG_GATE,enter=Math.min(1,(t-game.caozhangGateOpenedAt)/.8);
  ctx.save();ctx.globalAlpha=enter;
  const glow=ctx.createRadialGradient(x+25,y-65,10,x+25,y-65,130);
  glow.addColorStop(0,'#d6272490');glow.addColorStop(1,'#b50d0900');ctx.fillStyle=glow;ctx.fillRect(x-120,y-205,265,245);
  ctx.fillStyle='#1d0809';ctx.strokeStyle='#bd6b42';ctx.lineWidth=5;ctx.beginPath();ctx.roundRect(x-24,y-151,140,157,[60,60,0,0]);ctx.fill();ctx.stroke();
  for(const side of [-1,1]){
    const bx=x+46+side*(35+enter*34);
    roundRect(ctx,bx-20,y-134,39,134,2,'#592318','#bc703b');
    ctx.fillStyle='#d69c50';for(let j=0;j<4;j++)ctx.fillRect(bx-9,y-116+j*26,4,4);
  }
  ctx.fillStyle='#f06a4266';ctx.beginPath();ctx.ellipse(x+26,y+1,105,14,0,0,Math.PI*2);ctx.fill();
  // Gate sentries are scenery with a breathing stance, never members of the pursuing army.
  if(images.caozhang){
    const bob=reducedMotion?0:Math.sin(t*2.4)*1.6,w=212,h=w*images.caozhang.height/images.caozhang.width;
    ctx.save();ctx.translate(x+30+(1-enter)*90,y-2);ctx.scale(1,1+bob*.004);
    ctx.drawImage(images.caozhang,-w/2,-h,w,h);ctx.restore();
  }
  paintedSign('曹彰 · 虎豹骑',x-66,y-199,188,37,21,'#ffdf9f','brush');
  paintedSign('接应出口',x-52,y+3,174,34,19,'#8c291e');
  ctx.strokeStyle='#ff7153';ctx.lineWidth=3;ctx.setLineDash([6,5]);ctx.beginPath();ctx.moveTo(x,y-50);ctx.lineTo(x,y+4);ctx.stroke();ctx.setLineDash([]);
  ctx.restore();
}
function drawEffect(e) {
  const a=1-e.life/e.maxLife;
  ctx.save();
  if(e.kind==='loot'){ctx.globalAlpha=Math.min(1,e.life*2);text(ctx,`金币 +${e.amount}`,e.x,e.y-110-a*55,25,'#ffe798');for(let i=0;i<5;i++){const x=e.x+(i-2)*20*Math.sin(a*Math.PI),y=e.y-50-a*80-Math.sin(a*Math.PI)*32;ctx.fillStyle='#ebc652';ctx.strokeStyle='#856329';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,7,10,a*6+i,0,Math.PI*2);ctx.fill();ctx.stroke();}}
  if(e.kind==='stone'){
    const x=e.x+(e.tx-e.x)*a,y=e.y+(e.ty-e.y)*a-Math.sin(a*Math.PI)*(e.small?90:165);
    ctx.save();ctx.translate(x,y);if(e.small)ctx.scale(.55,.55);ctx.rotate(a*7);ctx.fillStyle='#a99b7c';ctx.strokeStyle='#493f32';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-14,-12);ctx.lineTo(7,-18);ctx.lineTo(18,4);ctx.lineTo(2,15);ctx.lineTo(-17,7);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    if(!e.small){ctx.strokeStyle='#e6cf83';ctx.setLineDash([5,5]);ctx.beginPath();ctx.ellipse(e.tx,e.ty+60,90,15,0,0,Math.PI*2);ctx.stroke();}
  }
  if(e.kind==='snare-hit'){ctx.globalAlpha=1-a;ctx.strokeStyle='#e9d08d';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(e.x,e.y-14-a*30,30+a*24,16,0,0,Math.PI*2);ctx.stroke();text(ctx,'绊！',e.x,e.y-60-a*60,36,'#e7e7b6');}
  if(e.kind==='guard-arrival'){
    const age=e.maxLife-e.life,fall=Math.min(1,age/.8),after=Math.max(0,age-.8);
    const y=e.y-(1-fall*fall)*460;
    const squash=after<.2?Math.sin(after/.2*Math.PI)*.18:0;
    ctx.globalAlpha=Math.min(1,e.life/.55);
    if(fall<1){ctx.strokeStyle='#d2efff';ctx.lineWidth=4;for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(e.x+i*24,y-215-i%2*25);ctx.lineTo(e.x+i*24,y-290-i%2*20);ctx.stroke();}}
    ctx.translate(e.x,y);ctx.rotate(fall<1?Math.sin(age*16)*.12:Math.sin(after*11)*.018);ctx.scale(e.dir*(1+squash),1-squash);
    if(images.zhaoyun)ctx.drawImage(images.zhaoyun,-137,-270-Math.sin(after*5)*2,274,274);
    ctx.restore();ctx.save();
    if(after>.2&&e.life>.55)speechBubble(e.x,e.y-145,after<1.4?'主公别慌！孩子没醒！':'阿斗：这车有点颠！');
  }
  if(e.kind==='landing'||e.kind==='guard-impact'){
    const big=e.kind==='guard-impact',r=(big?45:15)+a*(big?245:70);
    ctx.globalAlpha=1-a;ctx.strokeStyle=big?'#c4edff':'#d8c6a3';ctx.lineWidth=big?10*(1-a)+2:3;
    ctx.beginPath();ctx.ellipse(e.x,e.y,r,r*.22,0,0,Math.PI*2);ctx.stroke();
    for(let i=0;i<9;i++){const angle=i*.73;ctx.fillStyle=big?'#eee0b8':'#c4aa85';ctx.beginPath();ctx.ellipse(e.x+Math.cos(angle)*r,e.y-6-Math.abs(Math.sin(angle))*r*.22,8*(1-a)+2,5,0,0,Math.PI*2);ctx.fill();}
    if(big&&a<.55){text(ctx,'轻点！娃睡着了！',e.x,e.y-30-a*85,28,'#ffebb6');}
  }
  if(e.kind==='death') {
    if(e.type==='barricade'||TYPES[e.type]?.device){ctx.globalAlpha=1-a;prop(ctx,e.type,e.x+e.dir*a*12,e.y+18*a,145,a*.65*e.dir,e.dir);}
    else actor(ctx,e.type,e.x+e.dir*a*24,e.y+8*a,actorSizes[e.type]||125,e.dir,'death',a,0,1-a);
  }
  if(e.kind==='hit'){
    ctx.globalAlpha=Math.min(1,e.life*5);
    if(a<.45){ctx.strokeStyle=e.color;ctx.lineWidth=e.big?4:2;for(let i=0;i<5;i++){const r=i*1.26;ctx.beginPath();ctx.moveTo(e.x+Math.cos(r)*(5+a*16),e.y+Math.sin(r)*(5+a*16));ctx.lineTo(e.x+Math.cos(r)*(12+a*42),e.y+Math.sin(r)*(12+a*42));ctx.stroke();}}
    const value=e.blocked?'挡 '+e.value:String(e.value),x=e.x+12,y=e.y-14-a*40;
    ctx.font=`900 ${e.big?30:22}px "Microsoft YaHei",sans-serif`;ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#211913';ctx.strokeText(value,x,y);ctx.fillStyle=e.color;ctx.fillText(value,x,y);
  }
  if(['roar','dragon','gust','drum'].includes(e.kind)){
    ctx.translate(e.x,e.y);ctx.globalAlpha=Math.min(1,(1-a)*1.5);ctx.lineCap='round';
    if(e.kind==='roar'||e.kind==='drum'){
      for(let i=0;i<3;i++){const r=25+((a+i*.19)%1)*210;ctx.strokeStyle=i%2?'#fff3bb':e.color;ctx.lineWidth=(1-a)*6+1;ctx.beginPath();ctx.ellipse(0,30,r,r*.34,0,0,Math.PI*2);ctx.stroke();}
    }
    if(e.kind==='dragon'){
      ctx.scale(e.dir,1);
      for(let i=0;i<3;i++){ctx.strokeStyle=i===0?'#def9a1':i===1?'#7adc70':'#37855a';ctx.lineWidth=20-i*6;ctx.beginPath();ctx.ellipse(28,0,90+a*110-i*12,72-i*13,-.25,-1.6+a*.3,1.4+a*.5);ctx.stroke();}
    }
    if(e.kind==='gust'){
      ctx.scale(e.dir,1);ctx.translate(a*75,0);
      for(let i=0;i<7;i++){ctx.strokeStyle=i%2?'#efffff':'#9ddfea';ctx.lineWidth=6-i*.5;ctx.beginPath();ctx.ellipse(i*15,30-i*15,35+i*12,10+i*2,-.1,game.time*12+i,game.time*12+i+5);ctx.stroke();}
    }
    if(a<.55){ctx.scale(e.kind==='dragon'?e.dir:1,1);ctx.font=`900 ${e.kind==='drum'?38:48}px KaiTi,serif`;ctx.textAlign='center';ctx.lineWidth=5;ctx.strokeStyle='#231b15';const word={roar:'吼！',dragon:'斩！',gust:'呼——',drum:'咚！'}[e.kind];ctx.strokeText(word,0,-55-a*25);ctx.fillStyle=e.kind==='drum'?'#e0c5ff':'#fff2c6';ctx.fillText(word,0,-55-a*25);}
  }
  if(e.kind==='summon') { ctx.globalAlpha=1-a;ctx.strokeStyle=e.color;ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(e.x,e.y,30+a*42,8+a*7,0,0,Math.PI*2);ctx.stroke(); }
  if(e.kind==='log') { shadow(e.x,e.y,60);prop(ctx,'log',e.x,e.y,125,e.dir*(game.time*10)); }
  if(e.kind==='oil') {
    ctx.globalAlpha=Math.min(1,e.life);prop(ctx,'oil',e.x,e.y,130);
    if(!reducedMotion)for(let i=0;i<9;i++){const dx=(i-4)*25, h=25+Math.sin(game.time*10+i*2)*15;ctx.fillStyle=i%2?'#ffad3988':'#ee5b2877';ctx.beginPath();ctx.ellipse(e.x+dx,e.y-h*.5,11,h*.5,Math.sin(game.time*4+i)*.2,0,Math.PI*2);ctx.fill();}
  }
  if(e.kind==='arrow'||e.kind==='feather') {
    const x=e.x+(e.tx-e.x)*a,y=e.y+(e.ty-e.y)*a-20*Math.sin(a*Math.PI),dir=e.dir;
    if(e.kind==='feather'){
      ctx.translate(x,y);ctx.scale(dir,1);ctx.lineCap='round';
      for(let i=0;i<3;i++){ctx.strokeStyle=i===0?'#efffff':'#86d9ed';ctx.lineWidth=4-i;ctx.beginPath();ctx.ellipse(-i*10,0,15+i*6,9+i*3,game.time*8+i,0,Math.PI*1.6);ctx.stroke();}
      ctx.strokeStyle='#b7edf7';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-50,7);ctx.lineTo(-24,7);ctx.moveTo(-39,-8);ctx.lineTo(-14,-8);ctx.stroke();
    }else{
      ctx.strokeStyle='#f3d88f';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-dir*32,y);ctx.lineTo(x,y);ctx.stroke();ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-dir*9,y-4);ctx.lineTo(x-dir*9,y+4);ctx.fillStyle='#e7e4c4';ctx.fill();
    }
  }
  if(e.kind==='thrust'){
    ctx.globalAlpha=1-a;ctx.strokeStyle='#eff5bf';ctx.lineWidth=4*(1-a)+1;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.tx,e.ty);ctx.stroke();
    for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(e.tx-e.dir*18,e.ty+i*10);ctx.lineTo(e.tx+e.dir*(12+a*20),e.ty+i*18);ctx.stroke();}
  }
  if(e.kind==='slash') {
    ctx.translate(e.tx,e.ty);ctx.scale(e.dir,1);ctx.globalAlpha=1-a;
    ctx.strokeStyle=e.color;ctx.lineWidth=15*(1-a)+2;ctx.beginPath();ctx.ellipse(0,0,65,50,-.6,-1.3+a*.5,1.6+a*.6);ctx.stroke();
    ctx.strokeStyle='#fff7db';ctx.lineWidth=3;ctx.stroke();
    for(let i=0;i<5;i++){ctx.fillStyle=e.color;ctx.fillRect(20+Math.cos(i*2)*a*52,Math.sin(i*2)*a*44,5,3);}
  }
  if(e.kind==='wind') {
    ctx.translate(e.x+(e.tx-e.x)*a,e.y);ctx.scale(e.dir,1);ctx.globalAlpha=(1-a)*.85;
    for(let i=0;i<5;i++){ctx.strokeStyle=i%2?'#d2ffff':'#7bc7d4';ctx.lineWidth=7-i*.8;ctx.beginPath();ctx.ellipse(i*14,25-i*17,35+i*13,9+i*3,-.2,game.time*8+i,game.time*8+i+4.8);ctx.stroke();}
  }
  ctx.restore();
}
function speedLines(x,y,dir,t,color='#f1d791') {
  ctx.save();ctx.strokeStyle=color;ctx.lineWidth=2;
  for(let i=0;i<4;i++){const phase=(t*5+i*.22)%1;ctx.globalAlpha=(1-phase)*.7;ctx.beginPath();ctx.moveTo(x-dir*(12+phase*40),y-8-i*11);ctx.lineTo(x-dir*(28+phase*62),y-7-i*11);ctx.stroke();}ctx.restore();
}
function drawAirborne(e,t){
  const p=locate(e.s),a=e.airborne/e.dropDuration,sway=Math.sin(t*5+e.id)*13*a;
  if(e.boss){
    ctx.save();ctx.globalAlpha=1-a*.75;actor(ctx,e.type,p.x-70*a,p.y,actorSizes[e.type],p.dir,'idle',t);
    ctx.globalAlpha=1;ctx.strokeStyle=ENEMY_TYPES[e.role].color;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(p.x,p.y,70,12,0,0,Math.PI*2);ctx.stroke();text(ctx,`${ENEMY_TYPES[e.role].name}集结 · ${Math.ceil(e.airborne)}秒`,p.x,p.y-actorSizes[e.type]-20,20,ENEMY_TYPES[e.role].color);ctx.restore();return;
  }
  const x=p.x+sway,y=p.y-a*230,dir=p.dir*e.direction;
  ctx.save();ctx.strokeStyle='#a9e6df';ctx.lineWidth=3;ctx.setLineDash([7,5]);
  ctx.beginPath();ctx.ellipse(p.x,p.y,55+Math.sin(t*9)*7,12,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  text(ctx,`空降 ${Math.ceil(e.airborne)} 秒`,p.x,p.y-18,17,'#c7f1e3');
  actor(ctx,e.type,x,y,128,dir,'run',t*12,0,.95);
  ctx.translate(x,y-170);ctx.rotate(Math.sin(t*4)*.07);
  ctx.strokeStyle='#443629';ctx.lineWidth=3;
  for(const dx of [-66,66]){ctx.beginPath();ctx.moveTo(dx,2);ctx.lineTo(dx*.25,65);ctx.stroke();}
  const canopy=ctx.createLinearGradient(0,-44,0,12);canopy.addColorStop(0,'#dbc898');canopy.addColorStop(.55,'#91c8bc');canopy.addColorStop(1,'#477f77');
  ctx.fillStyle=canopy;ctx.beginPath();ctx.moveTo(-76,8);ctx.quadraticCurveTo(-65,-37,0,-44);ctx.quadraticCurveTo(65,-37,76,8);ctx.quadraticCurveTo(0,-5,-76,8);ctx.fill();ctx.stroke();
  ctx.strokeStyle='#655c3b';ctx.lineWidth=1.6;for(const dx of [-52,-26,0,26,52]){ctx.beginPath();ctx.moveTo(0,-44);ctx.quadraticCurveTo(dx*.8,-22,dx,2);ctx.stroke();}
  text(ctx,'曹',0,-15,23,'#443a28');ctx.restore();
}
function enemyDetails(e,p,dir,size,t) {
  const def=ENEMY_TYPES[e.role]||ENEMY_TYPES.soldier;
  ctx.save();
  if(e.windup>0){ctx.save();ctx.strokeStyle='#ff6d48';ctx.lineWidth=6;ctx.globalAlpha=.5+.3*Math.sin(t*18);ctx.beginPath();ctx.moveTo(p.x,p.y-6);ctx.lineTo(p.x+dir*250,p.y-6);ctx.stroke();text(ctx,'冲阵蓄力！',p.x,p.y-size-34,21,'#ffb486');ctx.restore();}
  if(e.bounty>0){banner(p.x-42,p.y-size-28,'赏','#927128');text(ctx,'赏金兵',p.x,p.y-size-32,17,'#ffe59c');}
  if(e.exhausted>0)text(ctx,'喘口气…',p.x,p.y-size-28,18,'#ead9b4');
  if(e.charge>0)speedLines(p.x,p.y,dir,t,'#ff8158');
  if(e.role==='drummer'){
    ctx.translate(p.x,p.y);ctx.scale(dir,1);
    const drum=ctx.createLinearGradient(25,-110,75,-45);drum.addColorStop(0,'#a96642');drum.addColorStop(.5,'#dfb67b');drum.addColorStop(1,'#795037');
    ctx.lineWidth=3;ctx.strokeStyle='#32241c';ctx.fillStyle=drum;ctx.beginPath();ctx.ellipse(49,-77,27,39,-.12,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.strokeStyle='#ead1a2';ctx.lineWidth=2;for(const y of [-99,-79,-58]){ctx.beginPath();ctx.moveTo(27,y);ctx.lineTo(72,y+5);ctx.stroke();}
    text(ctx,'催',49,-69,24,'#673c36');
    const beat=Math.sin(t*(e.buff>0?20:5))*9;ctx.strokeStyle='#553622';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(10,-70);ctx.lineTo(36,-94+beat);ctx.stroke();ctx.fillStyle='#e2b773';ctx.beginPath();ctx.arc(36,-94+beat,6,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();ctx.save();
  if(e.role!=='soldier'&&!e.carrying){
    const label=e.role==='shield'&&e.guard>0?'举盾 · 减伤':e.role==='runner'&&e.dash>0?'冲刺！':e.role==='drummer'&&e.buff>0?'击鼓 · 加速':def.name;
    ctx.font='bold 16px "Microsoft YaHei",sans-serif';const w=ctx.measureText(label).width+16;
    const box={x:p.x-w/2,y:p.y-size-24,w,h:22};
    if(!enemyLabelBoxes.some(b=>box.x<b.x+b.w+6&&box.x+box.w>b.x-6&&box.y<b.y+b.h+3&&box.y+box.h>b.y-3)){
      enemyLabelBoxes.push(box);paintedSign(label,box.x-7,box.y-4,w+14,30,17,'#fff0cf','brush');
    }
  }
  if(e.guard>0){ctx.save();ctx.translate(p.x,p.y);ctx.scale(dir,1);ctx.strokeStyle='#f3d57c';ctx.lineWidth=4;ctx.globalAlpha=.6+.25*Math.sin(t*9);ctx.beginPath();ctx.ellipse(28,-72,43,61,0,-Math.PI*.6,Math.PI*.6);ctx.stroke();ctx.restore();}
  if(e.stun>0){for(let i=0;i<3;i++){const q=t*6+i*Math.PI*2/3;text(ctx,'★',p.x+Math.cos(q)*25,p.y-size+Math.sin(q)*8,19,'#ffdf79');}}
  if(e.slow>0&&e.stun<=0){ctx.strokeStyle='#a8e5f4';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,37,8,0,0,Math.PI*2);ctx.stroke();}
  if(e.buff>0)text(ctx,'↑',p.x-31,p.y-100-Math.sin(t*6)*4,24,'#d6b5ff');
  if(e.dash>0)speedLines(p.x,p.y,dir,t,'#ffbb73');
  ctx.restore();
}
function speechBubble(x,y,message) {
  ctx.font='bold 21px "Microsoft YaHei",sans-serif';const w=Math.min(340,ctx.measureText(message).width+32),left=Math.max(10,Math.min(1430-w,x-w/2)),top=Math.max(86,y-188);
  paintedSign(message,left,top,w,48,22);
}
function render() {
  ctx.setTransform(canvas.width/WIDTH,0,0,canvas.height/HEIGHT,0,0);
  ctx.save();if(game.shake>0&&hapticsEnabled&&!reducedMotion)ctx.translate(Math.sin(game.time*97)*game.shake*24,Math.cos(game.time*73)*game.shake*13);
  const t=game.mode==='ready'?idleClock:game.time;
  enemyLabelBoxes.length=0;
  drawBackground(t);
  drawCaozhangGate(t);
  for(const e of game.effects)if(e.kind==='oil')drawEffect(e);
  const actors=[];
  const halfW=camera.width/(2*camera.scale),halfH=camera.height/(2*camera.scale);
  const visible=(x,y,size)=>x+size*.65>camera.x-halfW-40&&x-size*.65<camera.x+halfW+40&&y+40>camera.y-halfH&&y-size-60<camera.y+halfH;
  for(const u of game.units){const s=SLOTS[u.slot];if(visible(s.x,s.y,actorSizes[u.type]||145))actors.push({kind:'unit',y:s.y,u,s});}
  for(const enemy of game.enemies){if(enemy.airborne>0)continue;const p=locate(enemy.s);if(visible(p.x,p.y,actorSizes[enemy.type]||160))actors.push({kind:'enemy',y:p.y,enemy,p});}
  actors.sort((a,b)=>a.y-b.y);
  for(const item of actors){
    if(item.kind==='unit'){
      const {u,s}=item;shadow(s.x,s.y);
      if(u.type==='barricade'||TYPES[u.type].device)prop(ctx,u.type,s.x,s.y,u.type==='snare'?100:145,0,u.dir,u.attack,u.hit);
      else actor(ctx,u.type,s.x,s.y,actorSizes[u.type],u.dir,u.casting>0?'skill':u.attack>0?'attack':'idle',u.attack>0?1-u.attack/(u.attackDuration||.4):t,u.hit);
      const quality=RARITIES.find(r=>r.name===game.loadout.labels[u.type]);
      if(quality){
        if(game.boost(u.type)>0){ctx.strokeStyle=quality.color;ctx.globalAlpha=.3+.15*Math.sin(t*3);ctx.beginPath();ctx.ellipse(s.x,s.y,45,8,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
      }
      if(u.guard>0){ctx.strokeStyle='#f6be78';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(s.x,s.y-66,66,79,0,0,Math.PI*2);ctx.stroke();}
      if(u.hp<u.maxHp)health(s.x,s.y-153,u.hp,u.maxHp);
    }else{
      const {enemy:e,p}=item,dir=e.facing??p.dir*e.direction,size=actorSizes[e.type]*(e.role==='runner'?.91:1);shadow(p.x,p.y,40);
      actor(ctx,e.type,p.x,p.y,size,dir,e.attack>0?'attack':e.moving?'run':'idle',e.attack>0?1-e.attack/.35:e.moving?e.walk:t,e.hit);
      enemyDetails(e,p,dir,size,t);
      if(e.hp<e.maxHp||e.carrying)health(p.x,p.y-actorSizes[e.type]-2,e.hp,e.maxHp,true);
      if(e.carrying){
        // Lie Liu Bei across the shoulder instead of drawing him upright over it.
        ctx.save();ctx.translate(p.x+dir*7,p.y-actorSizes[e.type]*.70);ctx.rotate(-Math.PI*.46*dir);actor(ctx,'liubei',0,44,105,dir,'idle',t);ctx.restore();
        ctx.strokeStyle='#f5b049';ctx.lineWidth=3;ctx.setLineDash([7,5]);ctx.beginPath();ctx.ellipse(p.x,p.y-67,68,91,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
        text(ctx,'拦住他！',p.x,p.y-169,20,'#ffdda2');
      }
    }
  }
  const liu=locate(game.liu.s);
  if(!game.liu.carrier){shadow(liu.x,liu.y,34);actor(ctx,'liubei',liu.x,liu.y,actorSizes.liubei,liu.dir,game.mode==='ready'?'idle':'run',game.liu.walk);}
  if(game.liu.dash>0)speedLines(liu.x,liu.y,liu.dir,t);
  for(const e of game.enemies)if(e.airborne>0)drawAirborne(e,t);
  for(const e of game.effects)if(e.kind!=='oil')drawEffect(e);
  if(speechUntil>game.time && speech && game.mode==='running'&&!game.effects.some(e=>e.kind==='guard-arrival')){
    let speaker=liu;
    if(speechAnchor?.slot!==undefined){const unit=game.units.find(u=>u.slot===speechAnchor.slot);if(unit)speaker=SLOTS[unit.slot];else speaker=null;}
    else if(speechAnchor?.enemy){const enemy=game.enemies.find(e=>e.id===speechAnchor.enemy);speaker=enemy?locate(enemy.s):null;}
    if(speaker)speechBubble(speaker.x,speaker.y,speech);
  }
  ctx.restore();
}
function drawCards(){
  const heads={guanyu:[116,134,290,253],zhangfei:[130,145,280,250],zhugeliang:[210,35,270,300],archer:[130,55,245,265]};
  for(const [type,{icon}]of cards){
    const c=icon.getContext('2d');c.clearRect(0,0,180,132);
    if(TYPES[type].instant||TYPES[type].device||type==='barricade')prop(c,type,90,143,177);
    else if(images.troops&&troopSprites[type]!==undefined){const i=troopSprites[type],w=images.troops.width/2,h=images.troops.height/2;c.drawImage(images.troops,i%2*w,Math.floor(i/2)*h,w,h,8,-8,164,164);}
    else if(images.actors&&heads[type]){
      const [x,y,w,h]=heads[type],i=sprites[type],cell=images.actors.width/4,scale=cell/512;
      c.drawImage(images.actors,(i%4)*cell+x*scale,Math.floor(i/4)*cell+y*scale,w*scale,h*scale,14,0,152,138);
    }
  }
}
function loop(now){
  if(!previous)previous=now;const delta=Math.min((now-previous)/1000,.1);previous=now;idleClock+=delta;
  const battleDelta=delta*battleSpeed;
  if(game.mode==='running'&&!portrait&&!document.hidden){
    if(impactPause>0){impactPause=Math.max(0,impactPause-battleDelta);accumulated=0;}
    // Speed up the battle clock while keeping collision steps and paint pacing unchanged.
    else{accumulated+=battleDelta;while(accumulated>=1/60){game.update(1/60);accumulated-=1/60;}processEvents();}
  }else accumulated=0;
  if(now>toastUntil)$('toast').classList.remove('visible');
  uiClock+=delta;if(uiClock>.1){updateUI();uiClock=0;}
  if(!document.hidden&&!portrait){
    if(game.mode==='running'&&!pan){
      if(drag){
        const p=stagePoint(drag.clientX,drag.clientY),y=p.y-battle.offsetTop,w=battle.clientWidth,h=battle.clientHeight;
        if(p.x>=0&&p.x<=w&&y>=0&&y<=h){
          const edge=(v,max)=>v<28?(28-v)/28:v>max-28?-(v-max+28)/28:0;
          const dx=edge(p.x,w)*220*delta,dy=edge(y,h)*190*delta;
          if(dx||dy){camera.pan(dx,dy);applyCamera();refreshDrag();}
        }
      }else if(camera.follow){const p=locate(game.liu.s),guard=game.effects.some(e=>e.kind==='guard-arrival');camera.track(p.x,p.y-(guard?45:0),battleDelta);applyCamera();}
    }
    const active=game.mode==='running'&&$('camp').hidden;
    if(frameBudget.due(now,active)){
      resizeCanvas();
      const paintStart=performance.now();render();
      frameBudget.sample(performance.now()-paintStart,now,delta*1000,active);
    }
  }requestAnimationFrame(loop);
}
async function loadAssets(){
  if(loading)return;
  loading=true;loadFailed=false;ready=false;
  $('overlay').hidden=false;$('overlay').classList.add('loading-only');$('overlay').classList.remove('can-retry');
  $('load-status').hidden=false;
  $('start').disabled=true;$('start').textContent='整备中…';
  $('load-progress').hidden=false;
  $('sound').disabled=true;
  const files=[['castle','assets/game/changban-v1.webp',435406],['actors','assets/game/actors-v2.webp',423078],['troops','assets/game/shu-infantry-v1.webp',227570],['props','assets/game/props.webp',40528],['rigs','assets/game/rigs.json',21102],['commanders','assets/game/cao-commanders-v1.webp',150386],['devices','assets/game/shu-devices-v3.webp',86246],['zhaoyun','assets/game/zhaoyun-adou-v1.webp',76330],['caozhang','assets/game/caozhang-cavalry-v1.webp',74538],['bgm','assets/game/liu-run-bgm-v1.mp3',947053]];
  files.push(
    ['camp-home','assets/game/camp-home-v2.webp',181174],
    ['camp-backdrop','assets/game/camp-backdrop-v1.webp',136548],
    ['camp-back','assets/game/camp-back-v1.webp',3678],
    ['camp-brush','assets/game/camp-brush-v1.webp',31904],
    ['camp-card','assets/game/camp-card-v1.webp',6702],
    ['camp-chest','assets/game/camp-chest-v1.webp',34758],
    ['camp-coin','assets/game/camp-coin-v1.webp',3458],
    ['camp-gold','assets/game/camp-gold-v1.webp',11496],
    ['camp-ivory','assets/game/camp-ivory-v1.webp',5920],
    ['camp-paper','assets/game/camp-paper-v1.webp',13512]
  );
  files.push(['battle-lock','assets/game/battle-lock-v1.webp',4292]);
  files.push(['military-pay','assets/game/military-pay-v1.svg',1800]);
  files.push(...BATTLE_POPUP_ASSETS);
  const received=new Map(),total=files.reduce((n,f)=>n+f[2],0);
  const status=message=>{$('load-status').textContent=message;$('rotate-load-status').textContent=message;};
  let highWater=0;
  const setProgress=value=>{$('load-progress').value=value;$('rotate-load-progress').value=value;status(`${value}%`);};
  const progress=()=>{
    const amount=files.reduce((n,[key,,size])=>n+Math.min(size,received.get(key)||0),0);
    highWater=Math.max(highWater,Math.min(94,Math.floor(amount/total*94)));
    setProgress(highWater);
  };
  try {
    setProgress(0);
    const results=await Promise.allSettled(files.map(async([key,url,size])=>{
      if(!loadedAssets.has(key)){
        const blob=await fetchAsset(url,{onProgress:bytes=>{received.set(key,bytes);progress();}});
        const value=key==='bgm'?await getMusic().prepare(blob):key==='rigs'?JSON.parse(await blob.text()):await decodeImage(blob);
        if(key!=='rigs'&&key!=='bgm')images[key]=value;
        loadedAssets.set(key,value);
      }
      received.set(key,size);progress();
    }));
    const failed=results.find(result=>result.status==='rejected');
    if(failed)throw failed.reason;
    setProgress(96);
    await new Promise(resolve=>requestAnimationFrame(resolve));
    rigs={...prepareRigs(images.actors,loadedAssets.get('rigs'),sprites),...prepareRigs(images.commanders,COMMANDER_RIGS,{caohong:0,xiahou:1})};
    drawCards();ready=true;setProgress(100);
    $('sound').disabled=false;
    $('start').textContent='进入大营';$('start').disabled=false;
    if(game.mode==='ready'){$('overlay').hidden=true;camp.open('chest');}else camp.refresh();
  } catch(error){
    console.warn(error);loadFailed=true;status('加载未完成，检查网络后可重试');
    $('overlay').classList.add('can-retry');
    $('start').textContent='重试加载';$('start').disabled=false;
  } finally {loading=false;}
}
const preview=new Image();preview.src='assets/game/changban-preview-v1.webp';
createControls();updateViewport();requestAnimationFrame(loop);
void loadAssets();
