import {LEVELS,levelById,COMMANDERS,LOOT,EQUIPMENT,TACTICS,UNIT_NAMES} from './content.js';
import {ECONOMY} from './assets/game/balance.js';
export {LEVELS,levelById,UNIT_NAMES};
export const LIUBEI_THEME={id:'liubei',name:'刘备 · 主公快跑',faction:'仁义跑路团'};
export const LOOT_ITEMS=LOOT;
export const DEFAULT_DECK=[...LEVELS[0].recommended];
export const MAX_DECK_SIZE=6;
export const DECK_CARDS=Object.keys(UNIT_NAMES);
export const CHEST_COST=ECONOMY.chestCost,STARTER_COINS=ECONOMY.starterCoins;
const LEGACY_UNIT_COSTS=[30,45,65,90,120,155,195,240,290];
const LEGACY_TRAINING_COSTS=[...LEGACY_UNIT_COSTS,350];
const number=(v,max=1000000)=>Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;
const refund=(costs,count)=>costs.slice(0,number(count,costs.length)).reduce((s,c)=>s+c,0);
const lootById=id=>LOOT.find(i=>i.id===id);
export class CampProfile{
 constructor(storage,themeId=LIUBEI_THEME.id){
  this.themeId=themeId;this.key='zhugong-theme-'+themeId+'-v1';this.persistent=true;
  try{this.storage=storage??globalThis.localStorage;}catch{this.persistent=false;}
  this.data={coins:STARTER_COINS,starterGiftClaimed:true,wins:0,cleared:{},levelId:LEVELS[0].id,legacyArmory:[],unlocked:[],owned:[],fitted:{},deck:[...DEFAULT_DECK],claims:[],chests:0,pending:null,vouchers:0};
  try{
   const raw=JSON.parse(this.storage?.getItem(this.key)||this.storage?.getItem('zhugong-liubei-camp-v1')||'null');
   if(raw&&[1,2,3,4,5,6,7].includes(raw.version)){
    this.data.coins=number(raw.coins)+(raw.starterGiftClaimed===true?0:STARTER_COINS);this.data.wins=number(raw.wins);this.data.chests=number(raw.chests);
    this.data.claims=Array.isArray(raw.claims)?raw.claims.filter(x=>typeof x==='string').slice(-100):[];
    if(raw.version===7){
     for(const l of LEVELS)if(Array.isArray(raw.cleared?.[l.id]))this.data.cleared[l.id]=[0,1,2].map(i=>raw.cleared[l.id][i]===true);
     this.data.owned=[...new Set(Array.isArray(raw.owned)?raw.owned:[])].filter(id=>lootById(id));
     this.data.unlocked=[...new Set(Array.isArray(raw.unlocked)?raw.unlocked:[])].filter(id=>DECK_CARDS.includes(id)&&!TACTICS.some(t=>t.id===id));
     this.data.legacyArmory=Array.isArray(raw.legacyArmory)?raw.legacyArmory:[];
     this.data.vouchers=number(raw.vouchers,1000);
     for(const [unit,id]of Object.entries(raw.fitted||{}))if(this.data.owned.includes(id)&&EQUIPMENT.some(e=>e.id===id&&e.unit===unit))this.data.fitted[unit]=id;
     if(Array.isArray(raw.pending?.choices)){const choices=[...new Set(raw.pending.choices)].filter(id=>lootById(id)&&!this.data.owned.includes(id));if(choices.length)this.data.pending={choices:choices.slice(0,3)};}
     if(this.levelUnlocked(raw.levelId))this.data.levelId=raw.levelId;
    }else{
     const old=Array.isArray(raw.armory)?raw.armory.filter(i=>i&&DECK_CARDS.includes(i.id)):[];
     if(raw.version===1){for(const id of Array.isArray(raw.unlocked)?raw.unlocked:[])if(DECK_CARDS.includes(id))old.push({id,rarity:'common'});for(const [id,rank]of Object.entries(raw.levels||{}))if(rank>0&&DECK_CARDS.includes(id))old.push({id,rarity:rank>=3?'rare':rank>=2?'fine':'common'});}
     this.data.legacyArmory=[...new Map(old.map(i=>[i.id+':'+i.rarity,i])).values()];
     this.data.unlocked=[...new Set(old.map(i=>i.id))];this.data.vouchers=this.data.legacyArmory.length;
     if(this.data.wins>0)this.data.cleared[LEVELS[0].id]=[true,raw.medals?.[1]===true,raw.medals?.[2]===true];
     if(raw.version>=4&&raw.version<6){for(const id of DECK_CARDS)if(this.ownsCard(id)){const lv=raw.unitLevels?.[id];this.data.coins+=refund(LEGACY_UNIT_COSTS,Number.isFinite(lv)?Math.floor(lv)-1:0);if(raw.version>=5&&!['barricade','snare'].includes(id))this.data.coins+=refund(LEGACY_TRAINING_COSTS,raw.training?.[id]?.cooldown);}if(raw.version>=5)this.data.coins+=refund(LEGACY_TRAINING_COSTS,raw.incomeLevel);}
    }
    if(Array.isArray(raw.deck)){this.data.deck=[...new Set(raw.deck)].filter(id=>this.ownsCard(id)).slice(0,MAX_DECK_SIZE);if(!this.data.deck.length)this.data.deck=[...DEFAULT_DECK];}
   }
   this.save();
  }catch{this.persistent=false;}
 }
 save(){try{if(!this.storage)throw Error('unavailable');this.storage.setItem(this.key,JSON.stringify({version:7,themeId:this.themeId,...this.data}));this.persistent=true;}catch{this.persistent=false;}return this.persistent;}
 levelUnlocked(id){const i=LEVELS.findIndex(l=>l.id===id);return i>=0&&(i===0||this.data.cleared[LEVELS[i-1].id]?.[0]===true);}
 selectLevel(id){if(!this.levelUnlocked(id))return false;this.data.levelId=id;this.save();return true;}
 ownsCard(id){if(!DECK_CARDS.includes(id))return false;return this.data.unlocked.includes(id)||LEVELS.some(l=>this.levelUnlocked(l.id)&&l.unlocks.includes(id))||TACTICS.some(t=>t.id===id&&this.data.owned.includes(id));}
 ownedLoot(id){return this.data.owned.includes(id)?lootById(id):undefined;}
 deployment(){return [...new Set(this.data.deck)].filter(id=>this.ownsCard(id)).slice(0,MAX_DECK_SIZE);}
 canDeploy(){return this.deployment().some(id=>!TACTICS.some(t=>t.id===id));}
 snapshot(){return{themeId:this.themeId,levelId:this.data.levelId,unlocked:DECK_CARDS.filter(id=>this.ownsCard(id)),equipment:{...this.data.fitted},deck:this.deployment()};}
 recommend(){this.data.deck=levelById(this.data.levelId).recommended.filter(id=>this.ownsCard(id)).slice(0,MAX_DECK_SIZE);this.save();}
 toggleCard(id){if(!this.ownsCard(id))return '尚未解锁';if(this.data.deck.includes(id))this.data.deck=this.data.deck.filter(x=>x!==id);else if(this.data.deck.length>=MAX_DECK_SIZE)return '编队已满 · 上限 '+MAX_DECK_SIZE+' 张';else this.data.deck.push(id);this.save();return '';}
 replaceCard(oldId,newId){if(!this.ownsCard(newId))return '尚未解锁';const i=this.data.deck.indexOf(oldId);if(i<0)return '请重新选择换下的卡';if(this.data.deck.includes(newId))return '已经在编队中';this.data.deck[i]=newId;this.save();return '';}
 equipLoot(id){const item=this.ownedLoot(id);if(!item||item.kind==='tactic'||!this.ownsCard(item.unit)||this.data.fitted[item.unit]===id)return false;this.data.fitted[item.unit]=id;this.save();return true;}
 unequipLoot(unit){if(!this.data.fitted[unit])return false;delete this.data.fitted[unit];this.save();return true;}
 chestPool(){return LOOT.filter(i=>!this.data.owned.includes(i.id)&&(i.kind==='tactic'||this.ownsCard(i.unit)));}
 openChest(random=Math.random){
  if(this.data.pending)return this.data.pending;
  const pool=this.chestPool();if(!pool.length||(!this.data.vouchers&&this.data.coins<CHEST_COST))return null;
  const choices=[];while(pool.length&&choices.length<3){const n=Math.max(0,Math.min(pool.length-1,Math.floor(random()*pool.length)));choices.push(pool.splice(n,1)[0].id);}
  if(this.data.vouchers)this.data.vouchers--;else this.data.coins-=CHEST_COST;
  this.data.chests++;this.data.pending={choices};this.save();return this.data.pending;
 }
 chooseLoot(id){if(!this.data.pending?.choices.includes(id)||this.data.owned.includes(id))return null;const item=lootById(id);if(!item)return null;this.data.owned.push(id);this.data.pending=null;this.save();return item;}
 awardCommander(game,enemyId,role){if(!game.runId||game.themeId!==this.themeId||game.level.tutorial||!game.level.phases.some(p=>p.roles.includes(role)))return 0;const amount=COMMANDERS[role]?.coins||0,key='kill:'+game.runId+':'+enemyId;if(!amount||this.data.claims.includes(key))return 0;this.data.coins+=amount;this.data.claims.push(key);this.data.claims=this.data.claims.slice(-100);this.save();return amount;}
 settle(game){
  if(!['won','lost'].includes(game.mode)||!game.runId||game.themeId!==this.themeId||this.data.claims.includes(game.runId))return null;
  const won=game.mode==='won',prior=this.data.cleared[game.level.id]||[false,false,false],first=won&&!prior[0],earned=won?[true,game.captures===0,!game.guardUsed]:[false,false,false];
  const reward=ECONOMY.levels[game.level.id],progress=Math.max(0,Math.min(1,game.bestProgress)),rewardAllowed=!game.level.tutorial||first;
  const base=!rewardAllowed?0:won?reward.win:progress>=ECONOMY.failureStart?Math.floor(reward.win*progress*ECONOMY.failureFraction):0,bonus=first?reward.first:0,medalCoins=rewardAllowed?earned.filter((v,i)=>v&&!prior[i]).length*ECONOMY.medalCoins:0,bossCoins=game.level.tutorial?0:game.bossCoins||0;
  this.data.coins+=base+bonus+medalCoins;if(won){this.data.wins++;this.data.cleared[game.level.id]=prior.map((v,i)=>v||earned[i]);}
  const next=LEVELS[LEVELS.findIndex(l=>l.id===game.level.id)+1];if(won&&next)this.data.levelId=next.id;
  this.data.claims.push(game.runId);this.data.claims=this.data.claims.slice(-100);this.save();
  return{total:base+bonus+medalCoins+bossCoins,base,bonus,medalCoins,bossCoins,earned,first,nextLevel:won&&next?next.id:null};
 }
}
