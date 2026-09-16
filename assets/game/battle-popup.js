export const BATTLE_POPUP_ASSETS=[
  ['popup-pause','assets/game/battle-popup-pause-v2.webp',103454],
  ['popup-win','assets/game/battle-popup-win-v2.webp',123838],
  ['popup-loss','assets/game/battle-popup-loss-v2.webp',126620]
];

// Cropped from the approved renders; the surrounding unused battlefield is not downloaded.
const LAYOUTS={
  paused:{asset:0,title:'稍作休整',crop:[296,157,1080,612],buttons:[[32.5,74,32,20],[65.7,74,30.9,20]],labels:['继续断后','重新开局'],actions:['resume','restart']},
  won:{asset:1,title:'主公脱身！',crop:[296,146,1081,635],buttons:[[28.4,78.7,34.3,17.3],[64.2,78.7,32.2,17.3]],labels:['回营开箱','重新整备'],actions:['camp','replay']},
  lost:{asset:2,title:'主公被掳！',crop:[279,151,1116,647],buttons:[[32.4,76.6,32,17.3],[66.1,76.6,30.2,17.3]],labels:['重新整备','回营开箱'],actions:['replay','camp']}
};
const whole=value=>Math.max(0,Math.floor(Number(value)||0));
const stat=(label,value)=>'<div><dt>'+label+'</dt><dd>'+value+'</dd></div>';

export function createBattlePopup(root,actions){
  let mode='paused';
  root.addEventListener('click',event=>{
    const button=event.target.closest('[data-popup-action]');
    if(!button||button.disabled||root.hidden)return;
    actions[button.dataset.popupAction]?.();
  });
  root.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&mode==='paused'){event.preventDefault();event.stopPropagation();actions.resume();return;}
    if(event.key!=='Tab')return;
    const buttons=[...root.querySelectorAll('button')],first=buttons[0],last=buttons.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
  return{show(nextMode,game,reward){
    const layout=LAYOUTS[nextMode];if(!layout)return;
    mode=nextMode;
    const [x,y,width,height]=layout.crop;
    root.dataset.mode=mode;
    root.style.setProperty('--popup-ratio',width/height);
    const breakdown=[];
    if(reward?.bonus)breakdown.push('首通 +'+whole(reward.bonus));
    if(reward?.medalCoins)breakdown.push('勋章 +'+whole(reward.medalCoins));
    if(reward?.bossCoins)breakdown.push('斩将 +'+whole(reward.bossCoins));
    if(game.level.tutorial&&!reward?.first)breakdown.push('教学关仅首次通关奖励金币');
    const rewardHTML=mode==='paused'?'':'<div class="popup-reward" role="status"><img src="assets/game/camp-coin-v1.webp" alt=""><div><strong>+'+whole(reward?.total)+' <span>金币</span></strong><small>'+breakdown.join(' · ')+'</small></div></div>';
    const statsHTML=mode==='paused'?'':'<dl class="popup-stats">'+(mode==='won'?stat('用时',whole(game.time)+'秒')+stat('击退',whole(game.kills)+'人')+stat('救回',whole(game.rescues)+'次'):stat('击退',whole(game.kills)+'人')+stat('逃脱进度',Math.min(100,whole(game.bestProgress*100))+'%'))+'</dl>';
    const description=mode==='paused'?'整备好后，继续护送主公。':mode==='lost'?'调整布阵，再战一回。':'';
    const labels=mode==='won'&&reward?.nextLevel?['下一关','回营开箱']:layout.labels,buttonActions=mode==='won'&&reward?.nextLevel?['next','camp']:layout.actions;
    root.innerHTML='<img class="popup-painting" src="'+BATTLE_POPUP_ASSETS[layout.asset][1]+'" alt="" aria-hidden="true" style="inset:0;width:100%;height:100%"><div class="popup-copy"><p class="popup-kicker">'+game.level.name+(game.level.tutorial?' · 教学关':'')+'</p><h2 class="popup-title" id="battle-popup-title">'+layout.title+'</h2><p class="popup-description">'+description+'</p></div>'+rewardHTML+statsHTML+layout.buttons.map(([left,top,w,h],i)=>'<button class="popup-hotspot '+(i===0?'is-primary':'')+'" data-popup-action="'+buttonActions[i]+'" aria-label="'+labels[i]+'" style="left:'+left+'%;top:'+top+'%;width:'+w+'%;height:'+h+'%">'+labels[i]+'</button>').join('');
    root.hidden=false;
    root.querySelector('button')?.focus({preventScroll:true});
  }};
}
