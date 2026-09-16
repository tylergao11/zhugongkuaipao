// Shared battle, camp and reward content. Changes here apply to every consumer.
import {LEVEL_TUNING,TACTIC_STATS,ECONOMY} from './assets/game/balance.js';
// One unit per verb: arrow = archer, lob = catapult, line pierce = ballista, block = barricade, brace = lancer, shield = shieldbearer,
// push = log, magic = zhugeliang. Cut: 火油, 绊马索, 连弩兵, 投石兵.
export const UNIT_NAMES={archer:'弓箭手',barricade:'拒马',lancer:'长枪兵',log:'滚木',zhangfei:'张飞',guanyu:'关羽',shieldbearer:'刀盾兵',zhugeliang:'诸葛亮',ballista:'连弩车',catapult:'投石车',smoke:'烟幕罐'};
// Perk text shown in the unit menu at level 2; numbers live in balance.js PERKS.
export const UNIT_PERKS={
  archer:{name:'长弓',text:'射程 +1 格'},
  barricade:{name:'铁刺',text:'每次被攻击，攻击者自伤'},
  lancer:{name:'反震',text:'截停冲锋时把对方推退半格'},
  shieldbearer:{name:'盾击',text:'格挡成功震晕攻击者 1 秒'},
  ballista:{name:'贯甲',text:'弩矢不再被举盾拦截'},
  catapult:{name:'巨石',text:'溅射范围 +40%'},
  zhangfei:{name:'战吼回气',text:'怒吼回复 20% 生命'},
  guanyu:{name:'连斩',text:'普攻溅射两名敌人'},
  zhugeliang:{name:'寒风',text:'普攻附带减速'}
};
const wave=(level,id,roles)=>({id,...LEVEL_TUNING[level].phases[id],roles:[...roles]});
export const LEVELS=[
  {id:'changban',name:'长坂逃命',tutorial:true,floors:['村口','长坂桥','山道'],background:'assets/game/changban-v1.webp',
    mount:{id:'dilu',name:'的卢',floor:0,position:.93,...LEVEL_TUNING.changban.mount},
    unlocks:['archer','barricade','lancer','log','zhangfei'],recommended:['archer','barricade','lancer','log','zhangfei'],
    phases:[wave('changban','start',['soldier','soldier']),wave('changban','bridge',['soldier','soldier','soldier','soldier']),wave('changban','end',['soldier','soldier','soldier','soldier'])]},
  {id:'river',name:'江津抢渡',boss:true,startingGoldBonus:LEVEL_TUNING.river.startingGoldBonus,floors:['临江街道','沿岸栈道','渡口码头'],background:'assets/game/level-03-river-v1.webp',
    intro:{id:'dilu',name:'的卢',horseLine:'我先跑了，你断后！',reply:'不是，等等我啊！',...LEVEL_TUNING.river.intro},
    mechanisms:[{id:'war-gong',name:'震军铜锣',floor:2,col:3,...LEVEL_TUNING.river.warGong}],
    caocao:LEVEL_TUNING.river.caocao,
    unlocks:['guanyu','shieldbearer','zhugeliang','ballista','catapult'],
    recommended:['barricade','lancer','log','zhangfei','archer','zhugeliang'],
    bite:LEVEL_TUNING.river.bite,airborneAhead:LEVEL_TUNING.river.airborneAhead,airborneWarning:LEVEL_TUNING.river.airborneWarning,
    gate:{floor:1,edge:'right',...LEVEL_TUNING.river.gate},
    groups:[
      {id:'street1',entrance:'street',roles:['soldier','soldier','soldier','xiahou']},
      {id:'street2',entrance:'street',roles:['soldier','soldier','drummer']},
      {id:'landing',entrance:'landing',roles:['caohong','soldier','runner','runner']},
      {id:'air1',ahead:LEVEL_TUNING.river.airborneAhead,roles:['airborne','airborne']},
      {id:'plank',entrance:'plank',roles:['runner','runner','soldier']},
      {id:'air2',ahead:1,beforeExit:true,roles:['airborne']}
    ]}
];
export const levelById=id=>LEVELS.find(l=>l.id===id)||LEVELS[0];
export const COMMANDERS={caohong:{name:'曹洪',coins:ECONOMY.commanders.caohong,skill:'重金悬赏'},xiahou:{name:'夏侯惇',coins:ECONOMY.commanders.xiahou,skill:'蛮牛冲阵'},caocao:{name:'曹操',coins:ECONOMY.commanders.caocao,skill:'亲至'}};
const gear=(unit,id,name,effect,tradeoff)=>({id,unit,name,kind:'weapon',effect,tradeoff});
export const EQUIPMENT=[
  gear('zhangfei','taunt','护阵蛇矛','附近未扛人的普通兵转攻张飞。','失去停步，不影响敌将和扛人者。'),
  gear('guanyu','hook','钩镰刀','勾离刘备最近的敌人，扛人者优先，拽到关羽面前。','失去群体横扫；拉扛人者时刘备一起被拽回来。'),
  gear('zhugeliang','gather','回风扇','把区域内敌人聚向中心。','不再吹退或改变空降落点。')
];
export const TACTICS=[
  {id:'smoke',unit:'smoke',name:UNIT_NAMES.smoke,kind:'tactic',effect:'起烟遮蔽远程锁定，追兵按主公最后位置追赶。',tradeoff:'近身仍能抓人，也妨碍友军远射；每局一次。',...TACTIC_STATS.smoke}
];
export const LOOT=[...EQUIPMENT,...TACTICS];
export const equipmentById=id=>EQUIPMENT.find(e=>e.id===id);
export const REMOVED_UNITS=['oil','snare'];
