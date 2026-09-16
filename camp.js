import {LOOT_ITEMS,LEVELS,DECK_CARDS,CHEST_COST,MAX_DECK_SIZE} from './theme.js';
import {TYPES,rangeLabel,unitStatsFor} from './engine.js';
import {artIcon} from './assets/game/game-art.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=id=>TYPES[id]?.tactic?artIcon(id,'camp-icon tactic-art'):'<span class="camp-icon icon-'+esc(id)+'" aria-hidden="true"></span>';
const itemOf=id=>LOOT_ITEMS.find(item=>item.id===id);

// Horizontal-game coordinates keep finger travel and scroll distance aligned.
function touchSurface(root,point){
  let gesture=null,motion=null,frame=0,suppressClick=false;
  function stop(){cancelAnimationFrame(frame);frame=0;motion=null;}
  function removePress(){root.querySelectorAll('.touch-pressed').forEach(el=>el.classList.remove('touch-pressed'));}
  function scrollNode(target){
    for(let node=target.closest('[data-scroll]');node&&root.contains(node);node=node.parentElement?.closest('[data-scroll]')){
      const max=node.dataset.scroll==='x'?node.scrollWidth-node.clientWidth:node.scrollHeight-node.clientHeight;
      if(max>0)return node;
    }
    return null;
  }
  function coast(node,axis,velocity){
    let time=performance.now();motion={node,velocity};
    function tick(now){
      if(!node.isConnected||root.hidden||document.hidden){stop();return;}
      const dt=Math.min(32,now-time);time=now;
      const prop=axis==='x'?'scrollLeft':'scrollTop',max=Math.max(0,axis==='x'?node.scrollWidth-node.clientWidth:node.scrollHeight-node.clientHeight);
      const next=Math.max(0,Math.min(max,node[prop]+velocity*dt));node[prop]=next;
      velocity*=Math.exp(-dt/185);motion.velocity=velocity;
      if(Math.abs(velocity)<.025||next<=0||next>=max){stop();return;}
      frame=requestAnimationFrame(tick);
    }
    frame=requestAnimationFrame(tick);
  }
  function reset(){
    const old=gesture;gesture=null;
    if(old)suppressClick=true;
    if(old&&root.hasPointerCapture(old.id))root.releasePointerCapture(old.id);
    removePress();stop();
  }
  root.addEventListener('pointerdown',e=>{
    if(!e.isPrimary){reset();suppressClick=true;return;}
    if(e.button!==0)return;
    const node=scrollNode(e.target),button=e.target.closest('button'),p=point(e.clientX,e.clientY);
    const stopping=motion?.node===node&&Math.abs(motion.velocity)>.12;
    reset();
    suppressClick=false;
    const axis=node?.dataset.scroll||'y',prop=axis==='x'?'scrollLeft':'scrollTop';
    gesture={id:e.pointerId,node,button,axis,prop,start:p,last:p,clientX:e.clientX,clientY:e.clientY,offset:node?.[prop]||0,time:performance.now(),velocity:0,moved:!!stopping,scrolling:false};
    if(button&&!button.disabled&&!stopping)button.classList.add('touch-pressed');
  },{capture:true});
  function move(e){
    const g=gesture;if(!g||e.pointerId!==g.id)return;
    const p=point(e.clientX,e.clientY),now=performance.now();
    if(!g.scrolling&&Math.hypot(e.clientX-g.clientX,e.clientY-g.clientY)>8){
      g.moved=true;removePress();
      const delta=p[g.axis]-g.start[g.axis],cross=g.axis==='x'?'y':'x';
      if(g.node&&Math.abs(delta)>=Math.abs(p[cross]-g.start[cross]))g.scrolling=true;
      if(!root.hasPointerCapture(e.pointerId))root.setPointerCapture(e.pointerId);
    }
    if(g.moved){
      if(e.cancelable)e.preventDefault();
      if(g.scrolling){
        const before=g.node[g.prop],max=Math.max(0,g.axis==='x'?g.node.scrollWidth-g.node.clientWidth:g.node.scrollHeight-g.node.clientHeight);
        g.node[g.prop]=Math.max(0,Math.min(max,g.offset+g.start[g.axis]-p[g.axis]));
        const speed=(g.node[g.prop]-before)/Math.max(8,now-g.time);
        g.velocity=g.velocity*.25+Math.max(-3,Math.min(3,speed))*.75;
      }
    }
    g.last=p;g.time=now;
  }
  root.addEventListener('pointermove',move,{passive:false});
  function finish(e,cancelled=false){
    const g=gesture;if(!g||g.id!==e.pointerId)return;
    if(!cancelled){
      // Apply the final movement even when the browser coalesced intermediate moves.
      const end=point(e.clientX,e.clientY);
      if(end.x!==g.last.x||end.y!==g.last.y)move(e);
      if(!g.moved&&g.button&&!g.button.contains(document.elementFromPoint(e.clientX,e.clientY)))cancelled=true;
    }
    gesture=null;removePress();
    if(g.moved||cancelled){suppressClick=true;if(e.cancelable)e.preventDefault();}
    if(root.hasPointerCapture(e.pointerId))root.releasePointerCapture(e.pointerId);
    if(!cancelled&&g.scrolling&&performance.now()-g.time<100&&Math.abs(g.velocity)>.08)coast(g.node,g.axis,g.velocity);
  }
  root.addEventListener('pointerup',e=>finish(e));
  root.addEventListener('pointercancel',e=>finish(e,true));
  root.addEventListener('lostpointercapture',e=>{
    // Touch starts captured by the child button. Its transfer to root bubbles here.
    if(e.target===root)finish(e,true);
  });
  root.addEventListener('click',e=>{
    if(suppressClick&&(e.detail!==0||e.pointerType)){e.preventDefault();e.stopImmediatePropagation();}
  },true);
  root.addEventListener('wheel',stop,{passive:true});
  root.addEventListener('contextmenu',e=>e.preventDefault());
  window.addEventListener('blur',reset);
  window.addEventListener('resize',reset);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  return{stop,reset};
}

export function createCamp(profile,onChanged,onLaunch,canLaunch,options={}){
  const root=document.getElementById('camp'),point=options.point||((x,y)=>({x,y}));
  const touch=touchSurface(root,point),positions=new Map();
  let page='chest',filter='owned',dialogs=[],replacing=null,opening=false,openTimer=0,noticeTimer=0;
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const current=()=>dialogs.at(-1);
  const equippedLoot=id=>profile.ownedLoot(profile.data.fitted[id]);
  const role=id=>TYPES[id].tactic?'计策':TYPES[id].unique?'武将':TYPES[id].instant||TYPES[id].device||id==='barricade'?'器械':'兵种';
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
      const id=deck[i],fitted=id&&equippedLoot(id);
      if(!id)return '<button class="roster-slot empty-slot" data-action="choose" aria-label="第'+(i+1)+'格，选择出征单位"><span>＋</span><small>添加</small></button>';
      return '<div class="roster-slot roster-equipped"><strong>'+TYPES[id].name+'</strong>'+icon(id)+'<small>'+role(id)+(fitted?' · '+fitted.name:'')+'</small><i>'+(i+1)+'</i><button class="roster-details" data-action="card" data-value="'+id+'" aria-label="查看已携带的'+TYPES[id].name+'"></button><button class="roster-remove" data-action="remove-card" data-value="'+id+'" aria-label="卸下'+TYPES[id].name+'"><span aria-hidden="true">×</span></button></div>';
    }).join('')+'</div>';
  }
  function filters(list,selected,name){return '<div class="camp-filters"'+scrollAttrs(name,'x')+'>'+list.map(([id,label])=>'<button data-action="'+name+'" data-value="'+id+'" aria-pressed="'+(id===selected)+'">'+label+'</button>').join('')+'</div>';}
  function cardTile(id){
    const owned=profile.ownsCard(id),selected=profile.data.deck.includes(id),loot=equippedLoot(id);
    return '<button class="camp-tile '+(!owned?'is-locked ':'')+(selected?'is-carried':'')+'" data-action="card" data-value="'+id+'" aria-label="查看'+TYPES[id].name+'">'+icon(id)+'<strong>'+TYPES[id].name+'</strong><small>'+(owned?(loot?loot.name:role(id)):unlockText(id))+'</small>'+(selected?'<span class="tile-tag">已带</span>':'')+'</button>';
  }
  function unlockText(id){const i=LEVELS.findIndex(l=>l.unlocks.includes(id));return i>0?'通关'+LEVELS[i-1].name+'解锁':TYPES[id].tactic?'宝箱计策':'初始可用';}
  function levelTile(level,index){
    const unlocked=profile.levelUnlocked(level.id),selected=level.id===profile.data.levelId,cleared=profile.data.cleared[level.id]?.[0];
    const state=!unlocked?'未解锁':cleared?'已通关':selected?'当前关卡':'可出征';
    const detail=level.tutorial?'教学关 · '+(cleared?'奖励已领':'仅首通金币'):level.boss?'BOSS 关 · 军饷 +'+level.startingGoldBonus:state;
    return '<button class="chapter-tab '+(!unlocked?'chapter-locked':cleared?'chapter-cleared':'')+(level.boss?' chapter-boss':'')+'" data-action="level" data-value="'+level.id+'" aria-label="第'+(index+1)+'关 · '+esc(level.name)+' · '+state+((level.tutorial||level.boss)?' · '+detail:'')+'" aria-pressed="'+selected+'" '+(unlocked?'':'disabled')+'><span class="chapter-order" aria-hidden="true">'+String(index+1).padStart(2,'0')+'</span><span class="chapter-copy"><strong>'+esc(level.name)+'</strong><small>'+detail+'</small></span><span class="chapter-mark" aria-hidden="true">'+(level.boss?'煞':level.tutorial?'教':cleared?'通':selected?'战':'')+'</span></button>';
  }
  function deckPage(){
    return '<section class="camp-view deck-view"><nav class="level-picker" aria-label="选择关卡">'+LEVELS.map(levelTile).join('')+'</nav><div class="roster-heading"><button data-action="recommend">推荐编队</button><span>已带 '+profile.deployment().length+' / '+MAX_DECK_SIZE+'</span></div>'+roster()+'<footer class="deck-footer">'+action('开始出征','launch','',false,!canLaunch()||!profile.canDeploy())+'</footer></section>';
  }
  function pickerPage(){
    const ids=DECK_CARDS.filter(id=>filter==='all'||filter==='owned'&&profile.ownsCard(id)||filter===role(id));
    return '<section class="camp-view picker-view">'+filters([['owned','已拥有'],['all','全部'],['武将','武将'],['兵种','兵种'],['器械','器械'],['计策','计策']],filter,'filter')+'<div class="camp-catalog"'+scrollAttrs('deck:'+filter)+'>'+ids.map(cardTile).join('')+'</div></section>';
  }
  function chestArt(){return '<div class="camp-chest-art" aria-hidden="true"><div class="chest-aura"></div><img class="painted-chest" src="assets/game/camp-chest-v1.webp" alt=""><i class="chest-glint glint-one">✦</i><i class="chest-glint glint-two">✦</i></div>';}
  function chestPage(){
    const enough=!!profile.data.pending||profile.chestPool().length>0&&(profile.data.vouchers>0||profile.data.coins>=CHEST_COST),label=profile.data.pending?'继续选择':!profile.chestPool().length?'军需已齐':profile.data.vouchers?'领取军需':'开宝箱';
    return '<section class="camp-home" aria-label="长坂大营，宝箱与编队"><div class="home-artboard"><h2 class="sr-only">长坂大营</h2><div class="home-hit home-money" aria-label="阵营金币 '+profile.data.coins+'">'+profile.data.coins+'</div><button class="home-hit home-settings" data-action="settings" aria-label="设置"></button><button class="home-hit home-open" data-action="open-chest" '+(enough?'':'disabled ')+'aria-label="军需宝箱，'+CHEST_COST+'金币'+(enough?'':profile.chestPool().length?'，金币不足':'，当前军需已集齐')+'">'+label+' <span>· '+(profile.data.pending?'三选一':profile.data.vouchers?'兑换券 '+profile.data.vouchers:CHEST_COST)+'</span></button><button class="home-hit home-deck" data-action="page" data-value="deck">编队出征</button></div></section>';
  }
  function stat(label,value){return '<div><dt>'+label+'</dt><dd>'+value+'</dd></div>';}
  function unitStats(id){
    const d=unitStatsFor(id,profile.data.fitted[id]);
    return '<dl class="camp-stats">'+stat('军饷',d.cost)+stat('射程',rangeLabel(d))+(d.cooldown?stat('冷却',d.cooldown+' 秒'):'')+'</dl>';
  }
  function cardDialog(d){
    const def=unitStatsFor(d.id,profile.data.fitted[d.id]),owned=profile.ownsCard(d.id),selected=profile.data.deck.includes(d.id);
    return {title:'武将与军备',body:'<div class="unit-portrait">'+icon(d.id)+'<span class="portrait-caption">'+(def.skill||role(d.id))+'</span></div><div class="unit-parchment"><div class="unit-scroll"'+scrollAttrs('unit:'+d.id)+'><span class="camp-eyebrow">'+role(d.id)+' · '+(owned?'已拥有':unlockText(d.id))+'</span><h3 class="unit-title">'+def.name+'</h3><div class="camp-note"><p>'+esc(def.help)+'</p>'+(def.skill?'<p>主动技能 · 冷却 '+def.skillTime+' 秒</p>':'')+'</div>'+unitStats(d.id)+equipmentPanel(d.id)+'</div></div>',footer:owned?action(selected?'移出编队':replacing?'换入阵容':'加入编队','toggle-card',d.id)+(selected?action('替换','choose',d.id,true):''):''};
  }
  function equipmentPanel(id){
    if(!profile.ownsCard(id)||TYPES[id].tactic)return '';
    const fitted=equippedLoot(id),choices=LOOT_ITEMS.filter(e=>e.unit===id&&profile.ownedLoot(e.id));
    if(!choices.length)return '<section class="unit-equipment"><button class="camp-text-action" data-action="goto-chest">军需宝箱 ›</button></section>';
    const cards=[{id:'',name:'标准装备',effect:TYPES[id].help},...choices].map(item=>{
      const selected=(fitted?.id||'')===item.id;
      return '<button class="inline-gear '+(selected?'is-equipped':'')+'" data-action="equip-inline" data-value="'+item.id+'" aria-pressed="'+selected+'">'+(item.id?artIcon(item.id,'camp-icon gear-art'):icon(id))+'<span class="inline-gear-info"><strong>'+item.name+'</strong>'+(selected?'':'<span>'+esc(item.effect)+'</span>'+(item.tradeoff?'<span>'+esc(item.tradeoff)+'</span>':''))+'</span><span class="inline-gear-state">'+(selected?'✓ 已装配':'装配')+'</span></button>';
    }).join('');
    return '<section class="unit-equipment"><header><h4>战术装配</h4></header><div class="inline-gear-list">'+cards+'</div><button class="camp-text-action" data-action="goto-chest">军需宝箱 ›</button></section>';
  }
  function replacementDialog(){return {title:'替换编队',body:'<div class="camp-replacement">'+profile.deployment().map(id=>'<button class="camp-tile" data-action="replace" data-value="'+id+'">'+icon(id)+'<strong>'+TYPES[id].name+'</strong><small>替换</small></button>').join('')+'</div>',footer:''};}
  function revealDialog(){
    const choices=(profile.data.pending?.choices||[]).map(itemOf).filter(Boolean);
    return {title:'三选一',body:'<div class="loot-choices">'+choices.map(item=>'<button class="loot-choice" data-action="choose-loot" data-value="'+item.id+'">'+artIcon(item.id,'camp-icon loot-art')+'<small>'+TYPES[item.unit].name+'</small><h3>'+item.name+'</h3><p>'+esc(item.effect)+'</p><p class="tradeoff">'+esc(item.tradeoff)+'</p><strong>选择</strong></button>').join('')+'</div>',footer:action('稍后选择','back','',true)};
  }
  function receivedDialog(d){
    const item=itemOf(d.id),hasMore=profile.chestPool().length>0,voucher=profile.data.vouchers>0,affordable=voucher||profile.data.coins>=CHEST_COST;
    const cost=voucher?'兑换券 × 1':CHEST_COST+' 金币',label=!hasMore?'军需已齐':affordable?'再开一次 <small>· '+cost+'</small>':'再开一次 <small>· 金币不足</small>';
    return {title:'获得军需',body:'<div class="loot-received"><div class="received-art">'+artIcon(item.id,'loot-art')+'<span>已获得</span></div><div class="received-info"><span class="camp-eyebrow">'+TYPES[item.unit].name+' · '+(item.kind==='tactic'?'一次性计策':'战术装配')+'</span><h3>'+item.name+'</h3><p>'+esc(item.effect)+'</p><p class="tradeoff">'+esc(item.tradeoff)+'</p><div class="received-balance"><span class="painted-coin" aria-hidden="true"></span>金币 <b>'+profile.data.coins+'</b>'+(voucher?' · 兑换券 '+profile.data.vouchers:'')+'</div></div></div>',footer:action('回大营','goto-chest','',true)+action(item.kind==='tactic'?'查看计策':'前往装配','card',item.unit,true)+action(label,'open-chest','',false,!hasMore||!affordable)};
  }
  function settingsDialog(){
    return {title:'设置',body:'<div class="camp-reading settings-reading">'+[['sound','音乐与音效'],['haptics','震感']].map(([id,label])=>'<button class="camp-setting-row" data-action="setting" data-value="'+id+'"><span>'+label+'</span><b>'+(document.getElementById(id).classList.contains('active')?'开':'关')+'</b></button>').join('')+'</div>',footer:''};
  }
  function dialogHTML(){
    const d=current();if(!d)return '';
    if(d.kind==='opening')return '<div class="camp-layer"><section class="camp-sheet opening-sheet" role="dialog" aria-modal="true" aria-label="正在开启军需箱"><button class="camp-skip" data-action="skip-open">跳过动画 ›</button><div class="camp-opening">'+chestArt()+'</div></section></div>';
    const content=d.kind==='card'?cardDialog(d):d.kind==='replace'?replacementDialog():d.kind==='settings'?settingsDialog():d.kind==='received'?receivedDialog(d):revealDialog();
    const full=d.kind==='card';
    return '<div class="camp-layer"><section class="camp-sheet '+(d.kind==='reveal'?'choice-sheet':d.kind==='received'?'received-sheet':full?'unit-sheet':'reading-sheet')+'" role="dialog" aria-modal="true" aria-labelledby="camp-detail-title"><header><button class="camp-back" data-action="back" aria-label="返回上一层"></button><h3 id="camp-detail-title">'+content.title+'</h3></header><div class="camp-sheet-body"'+(full?'':scrollAttrs('detail:'+d.kind+':'+(d.id||'')))+'>'+content.body+'</div>'+(content.footer?'<footer>'+(full?'<div class="unit-actions">'+content.footer+'</div>':content.footer)+'</footer>':'')+'</section></div>';
  }
  function render(){
    savePositions();touch.reset();
    const focus=root.querySelector(':focus'),focusAction=focus?.dataset.action,focusValue=focus?.dataset.value;
    const modal=!!current();
    root.innerHTML='<div class="camp-app painted-camp page-'+page+'"><div class="camp-base" '+(modal?'inert aria-hidden="true"':'')+'>'+(page==='chest'?chestPage():'<header class="camp-topbar"><button class="camp-back" data-action="page" data-value="'+(page==='picker'?'deck':'chest')+'" aria-label="'+(page==='picker'?'返回编队':'回营开箱')+'"></button><h2>'+(page==='deck'?'整军出征':'选择单位')+'</h2><div class="camp-money" aria-label="金币"><span class="painted-coin"></span>'+profile.data.coins+'</div></header><div class="camp-content">'+(page==='deck'?deckPage():pickerPage())+'</div>')+'</div>'+dialogHTML()+'<div class="camp-feedback" role="status" aria-live="polite"></div></div>';
    root.querySelectorAll('[data-scroll-key]').forEach(el=>{const saved=positions.get(el.dataset.scrollKey);if(saved){el.scrollLeft=saved.x;el.scrollTop=saved.y;}});
    if(focusAction){const next=[...root.querySelectorAll('button')].find(el=>el.dataset.action===focusAction&&el.dataset.value===focusValue&&!el.closest('[inert]'));next?.focus({preventScroll:true});}
  }
  function push(d){dialogs.push(d);render();root.querySelector('.camp-sheet .camp-back, .camp-skip')?.focus({preventScroll:true});}
  function back(){if(opening){reveal();return;}dialogs.pop();render();}
  function go(next){dialogs=[];page=['chest','deck','picker'].includes(next)?next:'chest';if(page!=='picker')replacing=null;render();}
  function reveal(){
    if(!opening)return;clearTimeout(openTimer);opening=false;
    dialogs=[{kind:'reveal'}];render();options.feedback?.('rescue');
  }
  function openChest(){
    if(opening)return;
    const pending=!!profile.data.pending,drop=profile.openChest();if(!drop){toast(profile.chestPool().length?'金币不足':'军需已集齐');return;}if(pending){dialogs=[{kind:'reveal'}];render();return;}
    opening=true;dialogs=[{kind:'opening'}];onChanged();render();
    openTimer=setTimeout(reveal,reduced()?0:1400);
  }
  function addToDeck(id){
    if(profile.data.deck.includes(id)){toast('已在编队中');return;}
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
    else if(a==='level'){if(profile.selectLevel(v))commit();}
    else if(a==='recommend'){profile.recommend();commit('已使用本关推荐编队');}
    else if(a==='settings')push({kind:'settings'});
    else if(a==='setting'){document.getElementById(v)?.click();render();}
    else if(a==='back')back();
    else if(a==='goto-chest')go('chest');
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
      const unit=current()?.id;if(!unit)return;
      if(!v){if(profile.unequipLoot(unit))commit();}
      else if(profile.ownedLoot(v)?.unit===unit&&profile.equipLoot(v))commit();
    }else if(a==='open-chest')openChest();
    else if(a==='skip-open')reveal();
    else if(a==='choose-loot'){
      const item=profile.chooseLoot(v);if(item){dialogs=[{kind:'received',id:item.id}];commit();root.querySelector('.received-sheet button[data-action="open-chest"]:not(:disabled), .received-sheet button[data-action="card"]')?.focus({preventScroll:true});}
    }else if(a==='launch'&&canLaunch()&&profile.canDeploy()){touch.reset();root.hidden=true;onLaunch();}
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
