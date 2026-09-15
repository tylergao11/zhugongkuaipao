import {LOOT_ITEMS,RARITIES,DECK_CARDS,CHEST_COST,MAX_DECK_SIZE,MAX_TRAINING_LEVEL,TRAINING_LABELS,trainingPaths} from './theme.js';
import {TYPES,GRID_SPACING,rangeLabel,unitStatsFor,militaryIncomeFor} from './engine.js';

const KIND={weapon:'兵器',hero:'武将',troop:'兵种',device:'器械'};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=(id,boss=false)=>'<span class="camp-icon '+(boss?'boss-':'icon-')+esc(id)+'" aria-hidden="true"></span>';
const rarityOf=id=>RARITIES.find(r=>r.id===id);
const itemOf=id=>LOOT_ITEMS.find(item=>item.id===id);
const bonusOf=(item,rarity)=>item.kind==='weapon'?rarity.weaponBonus:rarity.deviceBonus;

// Horizontal-game coordinates keep finger travel and scroll distance aligned.
function touchSurface(root,point){
  let gesture=null,motion=null,frame=0,suppressUntil=0;
  function stop(){cancelAnimationFrame(frame);frame=0;motion=null;}
  function removePress(){root.querySelectorAll('.touch-pressed').forEach(el=>el.classList.remove('touch-pressed'));}
  function coast(node,axis,velocity){
    let time=performance.now();motion={node,velocity};
    function tick(now){
      if(!node.isConnected||root.hidden){stop();return;}
      const dt=Math.min(32,now-time);time=now;
      const prop=axis==='x'?'scrollLeft':'scrollTop',max=axis==='x'?node.scrollWidth-node.clientWidth:node.scrollHeight-node.clientHeight;
      const next=Math.max(0,Math.min(max,node[prop]+velocity*dt));node[prop]=next;
      velocity*=Math.exp(-dt/185);motion.velocity=velocity;
      if(Math.abs(velocity)<.025||next<=0||next>=max){stop();return;}
      frame=requestAnimationFrame(tick);
    }
    frame=requestAnimationFrame(tick);
  }
  function reset(){
    const old=gesture;gesture=null;
    if(old&&root.hasPointerCapture(old.id))root.releasePointerCapture(old.id);
    removePress();stop();
  }
  root.addEventListener('pointerdown',e=>{
    if(!e.isPrimary){reset();suppressUntil=performance.now()+500;return;}
    if(e.button!==0)return;
    const node=e.target.closest('[data-scroll]'),button=e.target.closest('button'),p=point(e.clientX,e.clientY);
    const stopping=motion?.node===node&&Math.abs(motion.velocity)>.12;
    reset();
    suppressUntil=0;
    gesture={id:e.pointerId,node,axis:node?.dataset.scroll||'y',start:p,last:p,time:performance.now(),velocity:0,moved:!!stopping};
    if(button&&!button.disabled&&!stopping)button.classList.add('touch-pressed');
  },{capture:true});
  root.addEventListener('pointermove',e=>{
    const g=gesture;if(!g||e.pointerId!==g.id)return;
    const p=point(e.clientX,e.clientY),now=performance.now();
    if(!g.moved&&Math.hypot(p.x-g.start.x,p.y-g.start.y)>8){g.moved=true;removePress();root.setPointerCapture(e.pointerId);}
    if(g.moved){
      e.preventDefault();
      if(g.node){
        const prop=g.axis==='x'?'scrollLeft':'scrollTop',before=g.node[prop];
        g.node[prop]+=g.last[g.axis]-p[g.axis];
        const speed=(g.node[prop]-before)/Math.max(8,now-g.time);
        g.velocity=g.velocity*.25+Math.max(-3,Math.min(3,speed))*.75;
      }
    }
    g.last=p;g.time=now;
  },{passive:false});
  function finish(e,cancelled=false){
    const g=gesture;if(!g||g.id!==e.pointerId)return;
    gesture=null;removePress();
    if(g.moved||cancelled)suppressUntil=performance.now()+450;
    if(root.hasPointerCapture(e.pointerId))root.releasePointerCapture(e.pointerId);
    if(!cancelled&&g.moved&&g.node&&performance.now()-g.time<100&&Math.abs(g.velocity)>.08)coast(g.node,g.axis,g.velocity);
  }
  root.addEventListener('pointerup',e=>finish(e));
  root.addEventListener('pointercancel',e=>finish(e,true));
  root.addEventListener('lostpointercapture',e=>finish(e,true));
  root.addEventListener('click',e=>{
    if(e.detail!==0&&performance.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}
  },true);
  root.addEventListener('contextmenu',e=>e.preventDefault());
  return{stop,reset};
}

export function createCamp(profile,onChanged,onLaunch,canLaunch,options={}){
  const root=document.getElementById('camp'),point=options.point||((x,y)=>({x,y}));
  const touch=touchSurface(root,point),positions=new Map();
  let page='chest',filter='owned',dialogs=[],replacing=null,opening=false,openTimer=0,noticeTimer=0;
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const current=()=>dialogs.at(-1);
  const quality=id=>profile.ownedLoot(profile.data.fitted[id]);
  const role=id=>TYPES[id].unique?'武将':TYPES[id].instant||TYPES[id].device||id==='barricade'?'器械':'兵种';
  function toast(message){
    clearTimeout(noticeTimer);const el=root.querySelector('.camp-feedback');if(!el)return;
    el.textContent=message;el.classList.add('visible');noticeTimer=setTimeout(()=>el.classList.remove('visible'),2200);
  }
  function commit(message){onChanged();render();if(message)toast(message);options.feedback?.('place');}
  function savePositions(){root.querySelectorAll('[data-scroll-key]').forEach(el=>positions.set(el.dataset.scrollKey,{x:el.scrollLeft,y:el.scrollTop}));}
  function scrollAttrs(key,axis='y'){return ' data-scroll="'+axis+'" data-scroll-key="'+esc(key)+'"';}
  function action(label,id,value='',secondary=false,disabled=false){return '<button class="camp-action '+(secondary?'secondary':'primary-action')+'" data-action="'+id+'" data-value="'+esc(value)+'" '+(disabled?'disabled':'')+'>'+label+'</button>';}
  function roster(){
    const deck=profile.deployment();
    return '<div class="roster-tray"'+scrollAttrs('roster','x')+'>'+Array.from({length:MAX_DECK_SIZE},(_,i)=>{
      const id=deck[i],fitted=id&&quality(id);
      if(!id)return '<button class="roster-slot empty-slot" data-action="choose" aria-label="第'+(i+1)+'格，选择出征单位"><span>＋</span><small>选择兄弟</small></button>';
      return '<div class="roster-slot roster-equipped"><strong>'+TYPES[id].name+'</strong>'+icon(id)+'<small>'+role(id)+(fitted?' · '+rarityOf(fitted.rarity).name:'')+'</small><i>'+(i+1)+'</i><button class="roster-details" data-action="card" data-value="'+id+'" aria-label="查看已携带的'+TYPES[id].name+'"></button><button class="roster-remove" data-action="remove-card" data-value="'+id+'" aria-label="卸下'+TYPES[id].name+'"><span aria-hidden="true">×</span></button></div>';
    }).join('')+'</div>';
  }
  function filters(list,selected,name){return '<div class="camp-filters"'+scrollAttrs(name,'x')+'>'+list.map(([id,label])=>'<button data-action="'+name+'" data-value="'+id+'" aria-pressed="'+(id===selected)+'">'+label+'</button>').join('')+'</div>';}
  function cardTile(id){
    const owned=profile.ownsCard(id),selected=profile.data.deck.includes(id),loot=quality(id);
    return '<button class="camp-tile '+(!owned?'is-locked ':'')+(selected?'is-carried':'')+'" data-action="card" data-value="'+id+'" aria-label="查看'+TYPES[id].name+'">'+icon(id)+'<strong>'+TYPES[id].name+'</strong><small>'+(owned?(loot?rarityOf(loot.rarity).name:role(id)):'宝箱解锁')+'</small>'+(selected?'<span class="tile-tag">已带</span>':'')+'</button>';
  }
  function deckPage(){
    return '<section class="camp-view deck-view"><div class="roster-heading"><span>已携带 <b>'+profile.deployment().length+' / '+MAX_DECK_SIZE+'</b></span></div>'+roster()+'<footer class="deck-footer">'+action('出征','launch','',false,!canLaunch()||!profile.canDeploy())+'</footer></section>';
  }
  function pickerPage(){
    const ids=DECK_CARDS.filter(id=>filter==='all'||filter==='owned'&&profile.ownsCard(id)||filter===role(id));
    return '<section class="camp-view picker-view">'+filters([['owned','已拥有'],['all','全部'],['武将','武将'],['兵种','兵种'],['器械','器械']],filter,'filter')+'<div class="camp-catalog"'+scrollAttrs('deck:'+filter)+'>'+ids.map(cardTile).join('')+'</div></section>';
  }
  function chestArt(){return '<div class="camp-chest-art" aria-hidden="true"><div class="chest-aura"></div><img class="painted-chest" src="assets/game/camp-chest-v1.webp" alt=""><i class="chest-glint glint-one">✦</i><i class="chest-glint glint-two">✦</i></div>';}
  function chestPage(){
    const enough=profile.data.coins>=CHEST_COST;
    return '<section class="camp-home" aria-label="长坂大营，宝箱与编队"><div class="home-artboard"><h2 class="sr-only">长坂大营</h2><div class="home-hit home-money" aria-label="阵营金币 '+profile.data.coins+'">'+profile.data.coins+'</div><button class="home-hit home-settings" data-action="settings" aria-label="设置"></button><button class="home-hit home-open" data-action="open-chest" '+(enough?'':'disabled ')+'aria-label="开启军需宝箱，'+CHEST_COST+'金币'+(enough?'':'，金币不足')+'">开宝箱 <span>· '+CHEST_COST+'</span></button><button class="home-hit home-deck" data-action="page" data-value="deck">编队出征</button></div></section>';
  }
  function stat(label,value){return '<div><dt>'+label+'</dt><dd>'+value+'</dd></div>';}
  const statNumber=value=>Math.round(value*100)/100;
  function unitStats(id,bonus=profile.snapshot().bonuses[id]||0){
    const def=unitStatsFor(id,profile.unitLevel(id),bonus,profile.trainingFor(id)),more=(def.range?stat('射程',rangeLabel(def)):'')+(def.interval&&def.damage?stat('攻击间隔',statNumber(def.interval)+' 秒'):'')+(def.cooldown?stat('冷却',statNumber(def.cooldown)+' 秒'):'')+(def.stunDuration?stat('眩晕',statNumber(def.stunDuration)+' 秒'):'')+(def.slowDuration?stat('减速',statNumber(def.slowDuration)+' 秒'):'')+(def.knockback?stat('击退',statNumber(def.knockback/GRID_SPACING)+' 格'):'');
    return '<dl class="camp-stats">'+stat('军饷',def.cost)+(def.hp&&!def.trap?stat('生命',def.hp):'')+(def.damage?stat(def.instant&&id==='oil'?'每秒伤害':'伤害',statNumber(def.damage)):'')+(def.trap?stat('眩晕',statNumber(def.trapDuration)+' 秒'):'')+'</dl>'+(more?'<details class="unit-more"><summary>射程与冷却</summary><dl class="camp-stats">'+more+'</dl></details>':'');
  }
  function upgradePanel(id){
    if(!profile.ownsCard(id))return '';
    const paths=trainingPaths(id),selected=paths.includes(current()?.training)?current().training:paths[0];
    const level=profile.trainingLevel(id,selected),cost=profile.trainingCost(id,selected),maxed=level>=MAX_TRAINING_LEVEL,bonus=profile.snapshot().bonuses[id]||0;
    const training=profile.trainingFor(id),before=unitStatsFor(id,profile.unitLevel(id),bonus,training),after=unitStatsFor(id,profile.unitLevel(id),bonus,{...training,[selected]:level+1}),changes=[];
    const change=(label,from,to)=>'<span>'+label+' <b>'+statNumber(from)+'</b> <i>→</i> <em>'+statNumber(to)+'</em></span>';
    if(selected==='income')changes.push(change('每秒军饷',militaryIncomeFor(level),militaryIncomeFor(level+1)));
    else {
      if(before.interval&&before.damage)changes.push(change('攻击间隔（秒）',before.interval,after.interval));
      if(before.skillTime)changes.push(change('技能冷却（秒）',before.skillTime,after.skillTime));
      if(before.cooldown)changes.push(change('使用冷却（秒）',before.cooldown,after.cooldown));
    }
    const scope=selected==='income'?'全军共享 · 每级 +5%':'当前单位 · 每级缩短 3%';
    return '<section class="unit-upgrade" aria-label="金币强化"><div class="training-tabs">'+paths.map(path=>'<button data-action="training-path" data-value="'+path+'" aria-pressed="'+(path===selected)+'">'+TRAINING_LABELS[path]+'</button>').join('')+'</div><div class="upgrade-summary"><div class="upgrade-heading"><strong>'+level+' 级'+(maxed?'':' <i>→</i> '+(level+1)+' 级')+'</strong><span>金币 '+profile.data.coins+'</span></div><small>'+scope+'</small><div class="upgrade-preview">'+(maxed?'<span>已满级 · '+(selected==='income'?'每秒军饷 '+statNumber(militaryIncomeFor(level)):'冷却缩短 30%')+'</span>':changes.join(''))+'</div></div><button class="camp-action unit-upgrade-button" data-action="train-unit" data-value="'+selected+'" '+(maxed||profile.data.coins<cost?'disabled ':'')+'aria-label="'+(maxed?'已满级':'强化'+TRAINING_LABELS[selected]+'，消耗'+cost+'金币')+'">'+(maxed?'已满级':'强化<small><span class="painted-coin" aria-hidden="true"></span>'+cost+'</small>')+'</button></section>';
  }
  function cardDialog(d){
    const def=unitStatsFor(d.id,profile.unitLevel(d.id),profile.snapshot().bonuses[d.id]||0,profile.trainingFor(d.id)),owned=profile.ownsCard(d.id),selected=profile.data.deck.includes(d.id);
    return {title:'武将与军备',body:'<div class="unit-portrait">'+icon(d.id)+'<span class="portrait-caption">'+(def.skill||role(d.id))+'</span></div><div class="unit-parchment"'+scrollAttrs('unit:'+d.id)+'><span class="camp-eyebrow">'+role(d.id)+' · '+(owned?'已拥有':'宝箱解锁')+'</span><h3 class="unit-title">'+def.name+'</h3>'+upgradePanel(d.id)+(def.skill?'<div class="camp-note"><strong>'+def.skill+'</strong><p>每 '+statNumber(def.skillTime)+' 秒自动施放</p></div>':'')+unitStats(d.id)+equipmentPanel(d.id)+'</div>',footer:owned?action(selected?'卸下出征':replacing?'换入阵容':'带上出征','toggle-card',d.id)+(selected?action('换个兄弟','choose',d.id,true):action('返回','back','',true)):action('前往开箱','goto-chest')+action('返回','back','',true)};
  }
  function equipmentPanel(id){
    const item=itemOf(id);if(!item||!profile.ownsCard(id))return '';
    const fitted=quality(id),choices=RARITIES.filter(r=>profile.ownedLoot(id+':'+r.id)),def=TYPES[id];
    const effect=bonus=>{
      if(!bonus)return '基础属性';
      const affected=[];if(def.damage)affected.push('伤害');if(['zhangfei','zhugeliang','snare'].includes(id))affected.push('控制');
      return affected.join('、')+' +'+Math.round(bonus*100)+'%';
    };
    const cards=choices.map(r=>{
      const selected=fitted?.rarity===r.id,key=id+':'+r.id;
      return '<button class="inline-gear '+(selected?'is-equipped':'')+'" data-action="equip-inline" data-value="'+key+'" aria-pressed="'+selected+'" aria-label="'+(selected?'卸下':'装配')+r.name+item.name+'" style="--gear-color:'+r.color+'">'+icon(id)+'<span class="inline-gear-info"><strong>'+item.name+' <small>'+r.name+'</small></strong><span>'+effect(bonusOf(item,r))+'</span></span><span class="inline-gear-state">'+(selected?'<b>✓ 已装配</b><small>点击卸下</small>':'装配')+'</span></button>';
    }).join('');
    return '<section class="unit-equipment" aria-label="'+def.name+'的装配"><header><h4>装配</h4><span>'+(fitted?rarityOf(fitted.rarity).name+' · 已生效':'未装配')+'</span></header><div class="inline-gear-list">'+(cards||'<div class="inline-gear-empty">'+icon(id)+'<span>暂无'+(item.kind==='weapon'?'兵器':'可选品质')+'</span><button class="camp-text-action" data-action="goto-chest">开宝箱 ›</button></div>')+'</div></section>';
  }
  function gearDialog(d){
    const item=itemOf(d.id),fitted=quality(d.id),loot=profile.ownedLoot(d.key)||fitted||profile.bestLoot(d.id),rarity=rarityOf(loot.rarity),selected=fitted?.key===loot.key;
    const bonus=bonusOf(item,rarity),old=fitted?bonusOf(item,rarityOf(fitted.rarity)):0,choices=RARITIES.filter(r=>profile.ownedLoot(d.id+':'+r.id));
    return {title:'装配',body:'<div class="unit-portrait">'+icon(d.id)+'<span class="portrait-caption">'+item.owner+'</span></div><div class="unit-parchment"'+scrollAttrs('gear:'+d.id)+'><span class="camp-eyebrow">'+KIND[item.kind]+' · '+item.owner+'</span><h3 class="unit-title">'+item.name+'</h3><div class="camp-quality-picker" aria-label="选择品质">'+choices.map(r=>'<button data-action="quality" data-value="'+d.id+':'+r.id+'" aria-pressed="'+(r.id===loot.rarity)+'" style="--loot-color:'+r.color+'">'+r.name+(fitted?.rarity===r.id?'<small>当前装配</small>':'')+'</button>').join('')+'</div><div class="camp-comparison"><span>效果加成</span><strong>'+Math.round(old*100)+'% <i>→</i> '+Math.round(bonus*100)+'%</strong></div>'+unitStats(d.id,bonus)+'</div>',footer:action(selected?'卸下装配':'装配 · '+rarity.name,'equip',loot.key)+action('返回','back','',true)};
  }
  function replacementDialog(d){return {title:'换谁下来？',body:'<div class="camp-replacement">'+profile.deployment().map(id=>'<button class="camp-tile" data-action="replace" data-value="'+id+'">'+icon(id)+'<strong>'+TYPES[id].name+'</strong><small>替换这张</small></button>').join('')+'</div>',footer:action('取消替换','back','',true)};}
  function revealDialog(d){
    const drop=d.drop,r=drop.rarity,showGear=drop.item.kind==='weapon'||profile.deployment().includes(drop.item.id);
    return {title:drop.duplicate?'重复战利品':'获得新战利品',body:'<div class="camp-reveal" style="--loot-color:'+r.color+'"><div class="reveal-rays" aria-hidden="true"></div>'+icon(drop.item.id)+'<span class="reveal-rarity">'+r.name+' · '+KIND[drop.item.kind]+'</span><h3>'+drop.item.name+'</h3><strong>'+(drop.duplicate?'已返还 '+drop.refund+' 金币':'已收入库房')+'</strong></div>',footer:drop.duplicate?action('收下','collect')+action('再开一个 · '+CHEST_COST,'open-chest','',true,profile.data.coins<CHEST_COST):action(showGear?'查看装配':'加入编队','use-drop')+action('收下','collect','',true)};
  }
  function settingsDialog(){
    return {title:'设置',body:'<div class="camp-reading settings-reading">'+[['sound','音乐与音效'],['haptics','震感']].map(([id,label])=>'<button class="camp-setting-row" data-action="setting" data-value="'+id+'"><span>'+label+'</span><b>'+(document.getElementById(id).classList.contains('active')?'开':'关')+'</b></button>').join('')+'</div>',footer:action('回大营','back')};
  }
  function dialogHTML(){
    const d=current();if(!d)return '';
    if(d.kind==='opening')return '<div class="camp-layer"><section class="camp-sheet opening-sheet" role="dialog" aria-modal="true" aria-label="正在开启军需箱"><button class="camp-skip" data-action="skip-open">跳过动画 ›</button><div class="camp-opening">'+chestArt()+'</div></section></div>';
    const content=d.kind==='card'?cardDialog(d):d.kind==='gear'?gearDialog(d):d.kind==='replace'?replacementDialog(d):d.kind==='settings'?settingsDialog():revealDialog(d);
    const full=d.kind==='card'||d.kind==='gear';
    return '<div class="camp-layer"><section class="camp-sheet '+(d.kind==='reveal'?'reveal-sheet':full?'unit-sheet':'reading-sheet')+'" role="dialog" aria-modal="true" aria-labelledby="camp-detail-title"><header><button class="camp-back" data-action="back" aria-label="返回上一层"></button><h3 id="camp-detail-title">'+content.title+'</h3></header><div class="camp-sheet-body"'+(full?'':scrollAttrs('detail:'+d.kind+':'+(d.id||d.drop?.key||'')))+'>'+content.body+'</div><footer>'+content.footer+'</footer></section></div>';
  }
  function render(){
    root.classList.toggle('camp-home-root',options.canClose?.()===false);
    savePositions();touch.reset();
    const focus=root.querySelector(':focus'),focusAction=focus?.dataset.action,focusValue=focus?.dataset.value;
    const modal=!!current();
    root.innerHTML='<div class="camp-app painted-camp page-'+page+'"><div class="camp-base" '+(modal?'inert aria-hidden="true"':'')+'>'+(page==='chest'?chestPage():'<header class="camp-topbar"><button class="camp-back" data-action="page" data-value="'+(page==='picker'?'deck':'chest')+'" aria-label="'+(page==='picker'?'返回编队':'回营开箱')+'"></button><h2>'+(page==='deck'?'整军出征':'选一位兄弟')+'</h2><div class="camp-money" aria-label="金币"><span class="painted-coin"></span>'+profile.data.coins+'</div></header><div class="camp-content">'+(page==='deck'?deckPage():pickerPage())+'</div>')+'</div>'+dialogHTML()+'<div class="camp-feedback" role="status" aria-live="polite"></div></div>';
    root.querySelectorAll('[data-scroll-key]').forEach(el=>{const saved=positions.get(el.dataset.scrollKey);if(saved){el.scrollLeft=saved.x;el.scrollTop=saved.y;}});
    if(focusAction){const next=[...root.querySelectorAll('button')].find(el=>el.dataset.action===focusAction&&el.dataset.value===focusValue&&!el.closest('[inert]'));next?.focus({preventScroll:true});}
  }
  function push(d){dialogs.push(d);render();root.querySelector('.camp-sheet .camp-back, .camp-skip')?.focus({preventScroll:true});}
  function back(){if(opening){reveal();return;}dialogs.pop();render();}
  function go(next){dialogs=[];page=['chest','deck','picker'].includes(next)?next:'chest';if(page!=='picker')replacing=null;render();}
  function reveal(){
    if(!opening)return;clearTimeout(openTimer);opening=false;
    const drop=current().drop;dialogs=[{kind:'reveal',drop}];render();options.feedback?.('rescue');
  }
  function openChest(){
    if(opening)return;
    const drop=profile.openChest();if(!drop){render();return;}
    opening=true;dialogs=[{kind:'opening',drop}];onChanged();render();
    openTimer=setTimeout(reveal,reduced()?0:1400);
  }
  function addToDeck(id){
    if(profile.data.deck.includes(id)){toast('已经在出征阵容中了');return;}
    if(replacing){const message=profile.replaceCard(replacing,id);if(message){toast(message);return;}replacing=null;dialogs=[];page='deck';commit('已换上 '+TYPES[id].name);return;}
    if(profile.data.deck.length>=MAX_DECK_SIZE){push({kind:'replace',id});return;}
    const message=profile.toggleCard(id);if(message){toast(message);return;}
    dialogs=[];page='deck';commit('已带上 '+TYPES[id].name);
  }
  root.addEventListener('click',e=>{
    const button=e.target.closest('button[data-action]');if(!button||button.disabled||button.closest('[inert]'))return;
    const {action:a,value:v}=button.dataset;
    if(opening&&a!=='skip-open')return;
    if(a==='page')go(v);
    else if(a==='choose'){replacing=v||null;filter='owned';go('picker');}
    else if(a==='filter'){filter=v;render();}
    else if(a==='card')push({kind:'card',id:v});
    else if(a==='gear')push({kind:'gear',id:v});
    else if(a==='quality'){current().key=v;render();}
    else if(a==='settings')push({kind:'settings'});
    else if(a==='setting'){document.getElementById(v)?.click();render();}
    else if(a==='back')back();
    else if(a==='collect'){dialogs=[];render();}
    else if(a==='goto-chest')go('chest');
    else if(a==='training-path'){
      if(current()?.kind==='card'&&trainingPaths(current().id).includes(v)){current().training=v;render();}
    }
    else if(a==='train-unit'){
      if(current()?.kind!=='card')return;
      if(profile.train(current().id,v)){commit();root.querySelector('.unit-upgrade')?.classList.add('just-upgraded');}
      else render();
    }
    else if(a==='remove-card'){
      if(!profile.data.deck.includes(v))return;
      const message=profile.toggleCard(v);
      if(message)toast(message);else commit();
    }
    else if(a==='toggle-card'){
      if(profile.data.deck.includes(v)){const message=profile.toggleCard(v);if(message)toast(message);else{dialogs=[];page='deck';commit('已卸下 '+TYPES[v].name);}}
      else addToDeck(v);
    }else if(a==='replace'){
      const id=current().id,message=profile.replaceCard(v,id);if(message)toast(message);else{dialogs=[];page='deck';commit('已换上 '+TYPES[id].name);}
    }else if(a==='equip-inline'){
      const loot=profile.ownedLoot(v);
      if(!loot||current()?.kind!=='card'||current().id!==loot.id)return;
      if(profile.equipLoot(v))commit();
    }else if(a==='equip'){
      const loot=profile.ownedLoot(v),wasFitted=profile.data.fitted[loot.id]===v;
      if(profile.equipLoot(v)){dialogs.pop();commit(wasFitted?'已卸下':'已装配');}
    }else if(a==='open-chest')openChest();
    else if(a==='skip-open')reveal();
    else if(a==='use-drop'){
      const {drop}=current();
      if(drop.item.kind==='weapon'||profile.deployment().includes(drop.item.id))push({kind:'gear',id:drop.item.id,key:drop.key});
      else addToDeck(drop.item.id);
    }else if(a==='close')close();
    else if(a==='launch'&&canLaunch()&&profile.canDeploy()){touch.reset();root.hidden=true;onLaunch();}
  });
  root.addEventListener('keydown',e=>{
    if(root.hidden)return;
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(dialogs.length)back();else if(page!=='chest')go(page==='picker'?'deck':'chest');else close();}
    if(e.key==='Tab'&&current()){
      const buttons=[...root.querySelectorAll('.camp-sheet button:not(:disabled)')],first=buttons[0],last=buttons.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    }
  });
  function close(){if(options.canClose?.()===false){if(opening)reveal();else go('chest');return;}if(opening)reveal();savePositions();touch.reset();root.hidden=true;(document.querySelector('#battle-popup:not([hidden]) button')||document.getElementById('battle-speed'))?.focus({preventScroll:true});}
  return{open(target='chest'){const keyboard=document.activeElement?.matches(':focus-visible');if(opening)reveal();dialogs=[];page=target==='deck'?'deck':'chest';replacing=null;root.hidden=false;render();if(keyboard)root.querySelector('.home-open, .camp-back')?.focus({preventScroll:true});},close,refresh(){if(!root.hidden&&!opening)render();}};
}
