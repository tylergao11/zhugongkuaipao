export const BATTLE_COIN_MULTIPLIER=3;
export const LIUBEI_THEME = {
  id:'liubei', name:'刘备 · 长坂坡', faction:'仁义跑路团',
  story:'长坂坡上，曹军追来。刘备把“仁义”揣进怀里，把断后的事交给兄弟。守住三段退路，接住主公的求救，送他一路跑出包围。',
  quote:'我先探路，兄弟们别见外！',
  floors:['村口','长坂桥','山道'],
  // Seven opening pairs, then seven reinforcement pairs relative to the 50% gate opening.
  waveTimes:[3,5,10,12,17,19,24,26,31,33,38,40,45,47],
  gateWaveTimes:[.2,2.2,6,8,12,14,18,20,24,26,30,32,36,38],
  waveRoles:[
    'soldier','soldier','shield','soldier','runner','soldier','drummer','shield','soldier','runner','shield','soldier','drummer','runner',
    'shield','runner','soldier','drummer','shield','soldier','runner','shield','drummer','soldier','shield','runner','soldier','runner'
  ],
  commanders:[
    {id:'caohong',name:'曹洪',at:.22,coins:35*BATTLE_COIN_MULTIPLIER,skill:'重金悬赏',help:'赏金旗强化一名小兵的移动与扛人速度；击败曹洪额外获得 105 阵营金币。'},
    {id:'xiahou',name:'夏侯惇',at:.55,coins:50*BATTLE_COIN_MULTIPLIER,skill:'蛮牛冲阵',help:'红线蓄力后猛冲；控制可打断。击败夏侯惇额外获得 150 阵营金币。'},
    {id:'caozhang',name:'曹彰',at:.5,skill:'虎豹骑接应',help:'进度 50% 驻守第二层右门，后续地面援兵从此出场。敌军扛刘备到门口，立即失败。'}
  ]
};
export const LOOT_ITEMS=[
  {id:'zhangfei',name:'张飞',kind:'hero',owner:'近战武将',help:'获得张飞，怒吼震晕敌军，短时减伤断后'},
  {id:'guanyu',name:'关羽',kind:'hero',owner:'近战武将',help:'获得关羽，青龙横扫一片敌人'},
  {id:'zhugeliang',name:'诸葛亮',kind:'hero',owner:'远程武将',help:'获得诸葛亮，风弹远攻、东风吹退'},
  {id:'archer',name:'桑木强弓',kind:'weapon',owner:'弓箭手',help:'提高普通射箭伤害'},
  {id:'lancer',name:'长枪兵',kind:'troop',owner:'长兵近战',help:'获得长枪兵，长枪可攻击两格内的敌人'},
  {id:'shieldbearer',name:'刀盾兵',kind:'troop',owner:'耐打近战',help:'获得刀盾兵，厚盾被动抵挡 25% 伤害'},
  {id:'crossbowman',name:'连弩兵',kind:'troop',owner:'远程连射',help:'获得连弩兵，每轮快速连射两箭'},
  {id:'slinger',name:'投石兵',kind:'troop',owner:'远程抛石',help:'获得投石兵，抛出石头砸伤小片敌人'},
  {id:'log',name:'山寨滚木',kind:'device',owner:'同层撞兵',help:'沿道路滚动撞兵，冷却 8 秒'},
  {id:'oil',name:'猛火油盆',kind:'device',owner:'范围灼烧',help:'持续灼烧一片敌人，冷却 10 秒'},
  {id:'ballista',name:'诸葛连弩车',kind:'device',owner:'机关连射',help:'一轮三连射，优先射扛人的'},
  {id:'catapult',name:'卧龙投石车',kind:'device',owner:'抛石破阵',help:'抛石砸一片，近距离有盲区'},
  {id:'snare',name:'草鞋绊马索',kind:'device',owner:'打断冲锋',help:'踩中后震晕，打断夏侯惇冲锋'}
];
export const RARITIES=[
  {id:'common',name:'普通',chance:60,weaponBonus:.10,deviceBonus:0,color:'#d5d1af'},
  {id:'fine',name:'精良',chance:30,weaponBonus:.22,deviceBonus:.18,color:'#7ed2da'},
  {id:'rare',name:'名品',chance:10,weaponBonus:.40,deviceBonus:.35,color:'#edc16e'}
];
export const DEFAULT_DECK=['archer','barricade'];
export const MAX_DECK_SIZE=6;
export const DECK_CARDS=[...DEFAULT_DECK,'zhangfei','lancer','guanyu','zhugeliang','shieldbearer','crossbowman','slinger','log','oil','ballista','catapult','snare'];
export const CHEST_COST=50;
export const STARTER_COINS=120;
export const MAX_UNIT_LEVEL=10;
export const UNIT_UPGRADE_COSTS=[30,45,65,90,120,155,195,240,290];
export function normalizeUnitLevel(value){return Number.isFinite(value)?Math.max(1,Math.min(MAX_UNIT_LEVEL,Math.floor(value))):1;}
const LEGACY_KEY='zhugong-liubei-camp-v1';
const number=(v,max)=>Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;
export class CampProfile {
  constructor(storage,themeId=LIUBEI_THEME.id){
    this.themeId=themeId;this.key=`zhugong-theme-${themeId}-v1`;this.persistent=true;
    try{this.storage=storage??globalThis.localStorage;}catch{this.persistent=false;}
    this.data={coins:STARTER_COINS,starterGiftClaimed:true,wins:0,medals:[false,false,false],armory:[],fitted:{},unitLevels:{},deck:[...DEFAULT_DECK],claims:[],chests:0};
    try{
      const raw=JSON.parse(this.storage?.getItem(this.key)||(themeId===LIUBEI_THEME.id?this.storage?.getItem(LEGACY_KEY):null)||'null');
      if([1,2,3,4].includes(raw?.version)){
        this.data.coins=number(raw.coins,1000000)+(raw.starterGiftClaimed===true?0:STARTER_COINS);this.data.wins=number(raw.wins,1000000);this.data.chests=number(raw.chests,1000000);
        this.data.medals=[0,1,2].map(i=>raw.medals?.[i]===true);
        const seen=new Set();
        const add=(id,rarity)=>{const key=`${id}:${rarity}`;if(seen.has(key)||!LOOT_ITEMS.some(i=>i.id===id)||!RARITIES.some(r=>r.id===rarity))return;seen.add(key);this.data.armory.push({key,id,rarity});};
        if(raw.version>=2){
          for(const item of Array.isArray(raw.armory)?raw.armory:[])if(item)add(item.id,item.rarity);
          for(const [id,key]of Object.entries(raw.fitted||{}))if(this.data.armory.some(item=>item.id===id&&item.key===key))this.data.fitted[id]=key;
        }else{
          // Preserve already earned gear when migrating the short-lived direct-purchase prototype.
          for(const id of Array.isArray(raw.unlocked)?raw.unlocked:[]){add(id,'common');this.data.fitted[id]=`${id}:common`;}
          for(const [id,level]of Object.entries(raw.levels||{}))if(level>0&&LOOT_ITEMS.some(i=>i.id===id)){const rarity=level>=3?'rare':level>=2?'fine':'common';add(id,rarity);this.data.fitted[id]=`${id}:${rarity}`;}
        }
        if(Array.isArray(raw.deck)){
          const owned=[...new Set(raw.deck)].filter(id=>this.ownsCard(id));
          this.data.deck=raw.version<3?[...new Set([...DEFAULT_DECK,...owned])].slice(0,MAX_DECK_SIZE):owned.slice(0,MAX_DECK_SIZE);
        }
        // The legacy `levels` field represented equipment quality, not unit upgrades.
        if(raw.version>=4){
          for(const id of DECK_CARDS)if(this.ownsCard(id))this.data.unitLevels[id]=normalizeUnitLevel(raw.unitLevels?.[id]);
        }
        this.data.claims=Array.isArray(raw.claims)?raw.claims.filter(s=>typeof s==='string').slice(-100):[];
      }
      if(raw===null||([1,2,3,4].includes(raw?.version)&&(raw.version<4||raw.starterGiftClaimed!==true)))this.save();
    }catch{this.persistent=false;}
  }
  save(){try{if(!this.storage)throw Error('unavailable');this.storage.setItem(this.key,JSON.stringify({version:4,themeId:this.themeId,...this.data}));this.persistent=true;}catch{this.persistent=false;}return this.persistent;}
  ownedLoot(key){return this.data.armory.find(i=>i.key===key);}
  ownsCard(id){return DECK_CARDS.includes(id)&&(DEFAULT_DECK.includes(id)||this.data.armory.some(i=>i.id===id));}
  unitLevel(id){return normalizeUnitLevel(this.data.unitLevels[id]);}
  upgradeCost(id){const level=this.unitLevel(id);return level<MAX_UNIT_LEVEL?UNIT_UPGRADE_COSTS[level-1]:null;}
  upgradeUnit(id){
    if(!this.ownsCard(id))return {ok:false,reason:'locked'};
    const cost=this.upgradeCost(id);
    if(cost===null)return {ok:false,reason:'max-level'};
    if(this.data.coins<cost)return {ok:false,reason:'insufficient-coins'};
    const level=this.unitLevel(id)+1;
    this.data.coins-=cost;this.data.unitLevels[id]=level;this.save();
    return {ok:true,level,cost};
  }
  bestLoot(id){
    return this.data.armory.filter(item=>item.id===id).reduce((best,item)=>!best||RARITIES.findIndex(r=>r.id===item.rarity)>RARITIES.findIndex(r=>r.id===best.rarity)?item:best,null);
  }
  deployment(){return [...new Set(this.data.deck)].filter(id=>this.ownsCard(id)).slice(0,MAX_DECK_SIZE);}
  canDeploy(){return this.deployment().length>0;}
  snapshot(){
    const bonuses={},labels={};
    for(const [id,key]of Object.entries(this.data.fitted)){
      const loot=this.ownedLoot(key);if(!loot)continue;
      const def=LOOT_ITEMS.find(i=>i.id===id),rarity=RARITIES.find(r=>r.id===loot.rarity);
      bonuses[id]=def.kind==='weapon'?rarity.weaponBonus:rarity.deviceBonus;labels[id]=rarity.name;
    }
    const levels=Object.fromEntries(DECK_CARDS.filter(id=>this.ownsCard(id)).map(id=>[id,this.unitLevel(id)]));
    return {themeId:this.themeId,unlocked:LOOT_ITEMS.filter(i=>i.kind!=='weapon'&&this.ownsCard(i.id)).map(i=>i.id),bonuses,labels,levels,deck:this.deployment()};
  }
  toggleCard(id){
    if(!this.ownsCard(id))return '还没抽到这张卡，先到宝箱库房开箱';
    if(this.data.deck.includes(id))this.data.deck=this.data.deck.filter(key=>key!==id);
    else if(this.data.deck.length>=MAX_DECK_SIZE)return `最多携带 ${MAX_DECK_SIZE} 张，请先卸下一张再装入`;
    else {this.data.deck.push(id);if(!this.data.fitted[id]&&LOOT_ITEMS.some(i=>i.id===id&&i.kind!=='weapon')){const loot=this.bestLoot(id);if(loot)this.data.fitted[id]=loot.key;}}
    this.save();return '';
  }
  equipLoot(key){
    const loot=this.ownedLoot(key);if(!loot)return false;
    if(this.data.fitted[loot.id]===key)delete this.data.fitted[loot.id];else this.data.fitted[loot.id]=key;
    this.save();return true;
  }
  replaceCard(oldId,newId){
    if(!this.ownsCard(newId))return '还没获得这张卡';
    const index=this.data.deck.indexOf(oldId);
    if(index<0)return '这张卡已经卸下，请重新选择';
    if(this.data.deck.includes(newId))return '这张卡已经在出征阵容中';
    this.data.deck[index]=newId;
    if(!this.data.fitted[newId]&&LOOT_ITEMS.some(item=>item.id===newId&&item.kind!=='weapon')){
      const loot=this.bestLoot(newId);if(loot)this.data.fitted[newId]=loot.key;
    }
    this.save();return '';
  }
  openChest(random=Math.random){
    if(this.data.coins<CHEST_COST)return null;
    const guaranteedHero=this.data.chests===0;
    const pool=guaranteedHero?LOOT_ITEMS.filter(item=>item.kind==='hero'):LOOT_ITEMS;
    const item=pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
    const roll=random()*RARITIES.reduce((total,rarity)=>total+rarity.chance,0);
    let threshold=0;
    const rarity=RARITIES.find(candidate=>{threshold+=candidate.chance;return roll<threshold;})||RARITIES.at(-1),key=`${item.id}:${rarity.id}`;
    this.data.coins-=CHEST_COST;this.data.chests++;
    const duplicate=!!this.ownedLoot(key),refund=duplicate?15:0;
    if(duplicate)this.data.coins+=refund;else this.data.armory.push({key,id:item.id,rarity:rarity.id});
    this.save();return{key,item,rarity,duplicate,refund,guaranteedHero};
  }
  awardCommander(game,enemyId,role){
    if(!game.runId||game.themeId!==this.themeId)return 0;
    const amount=LIUBEI_THEME.commanders.find(b=>b.id===role)?.coins||0,key=`kill:${game.runId}:${enemyId}`;
    if(!amount||this.data.claims.includes(key))return 0;
    this.data.coins+=amount;this.data.claims.push(key);this.data.claims=this.data.claims.slice(-100);this.save();return amount;
  }
  settle(game){
    if(!['won','lost'].includes(game.mode)||!game.runId||game.themeId!==this.themeId||this.data.claims.includes(game.runId))return null;
    const won=game.mode==='won',first=won&&this.data.wins===0,earned=won?[true,game.captures===0,!game.guardUsed]:[false,false,false];
    const fresh=earned.map((v,i)=>v&&!this.data.medals[i]);
    const base=(won?60:game.bestProgress>=.25?Math.min(25,Math.floor(game.bestProgress*25)):0)*BATTLE_COIN_MULTIPLIER;
    // Boss coins have already been tripled and paid when the commander fell.
    const bonus=first?120*BATTLE_COIN_MULTIPLIER:0,medalCoins=fresh.filter(Boolean).length*15*BATTLE_COIN_MULTIPLIER,paid=base+bonus+medalCoins,bossCoins=game.bossCoins||0,total=paid+bossCoins;
    this.data.coins+=paid;if(won)this.data.wins++;
    this.data.medals=this.data.medals.map((v,i)=>v||earned[i]);this.data.claims.push(game.runId);this.data.claims=this.data.claims.slice(-100);this.save();
    return{total,base,bonus,medalCoins,bossCoins,earned,first};
  }
}
