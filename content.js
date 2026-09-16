// Shared battle, camp and reward content. Changes here apply to every consumer.
import {LEVEL_TUNING,TACTIC_STATS,ECONOMY} from './assets/game/balance.js';
// One unit per verb: arrow = archer, lob = catapult, line pierce = ballista, block = barricade, brace = lancer, shield = shieldbearer,
// push = log, burn = oil, trip = snare, magic = zhugeliang. Cut: 连弩兵 (second archer), 投石兵 (second lob), 诱敌旗 (= 假主公), 调兵令.
export const UNIT_NAMES={archer:'弓箭手',barricade:'拒马',lancer:'长枪兵',log:'滚木',zhangfei:'张飞',guanyu:'关羽',shieldbearer:'刀盾兵',snare:'绊马索',zhugeliang:'诸葛亮',oil:'火油',ballista:'连弩车',catapult:'投石车',smoke:'烟幕罐'};
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
const wave=(level,id,roles,extra={})=>({id,...LEVEL_TUNING[level].phases[id],roles:Array.from({length:Math.round(roles.length*(LEVEL_TUNING[level].enemyCountMultiplier??1))},(_,i)=>roles[i%roles.length]),...extra});
export const LEVELS=[
  {id:'changban',name:'长坂逃命',tutorial:true,floors:['村口','长坂桥','山道'],background:'assets/game/changban-v1.webp',
    mount:{id:'dilu',name:'的卢',floor:1,position:.5,...LEVEL_TUNING.changban.mount},
    unlocks:['archer','barricade','lancer','log','zhangfei'],recommended:['archer','barricade','lancer','log','zhangfei'],
    phases:[wave('changban','start',['soldier','soldier']),wave('changban','bridge',['soldier','soldier','soldier','soldier']),wave('changban','runner',['runner','soldier','soldier','runner','soldier'])]},
  {id:'mountain',name:'山道设伏',floors:['山脚','隘口','山顶栈道'],background:'assets/game/level-02-mountain-v1.webp',
    mount:{id:'dilu',name:'的卢',...LEVEL_TUNING.mountain.mount},
    unlocks:['guanyu','shieldbearer','snare'],recommended:['archer','barricade','lancer','guanyu','snare','shieldbearer'],
    mechanisms:[{id:'rockfall',name:'落石',floor:1,targetFloor:0,col:4,...LEVEL_TUNING.mountain.rockfall},{id:'decoy',name:'假主公',floor:2,col:2,...LEVEL_TUNING.mountain.decoy}],
    phases:[wave('mountain','shield',['soldier','shield','soldier']),wave('mountain','drum',['shield','drummer','soldier','soldier','runner']),wave('mountain','bounty',['caohong','soldier','runner','shield','soldier','runner'])]},
  {id:'river',name:'江津抢渡',boss:true,startingGoldBonus:LEVEL_TUNING.river.startingGoldBonus,floors:['临江街道','沿岸栈道','渡口码头'],background:'assets/game/level-03-river-v1.webp',
    intro:{id:'dilu',name:'的卢',horseLine:'我先跑了，你断后！',reply:'不是，等等我啊！',...LEVEL_TUNING.river.intro},
    mechanisms:[{id:'war-gong',name:'震军铜锣',floor:2,col:3,...LEVEL_TUNING.river.warGong}],
    // 曹操 enters at the street gate once Liu Bei is halfway; touching him ends the run.
    caocao:LEVEL_TUNING.river.caocao,
    unlocks:['zhugeliang','oil','ballista','catapult'],recommended:['archer','barricade','lancer','zhugeliang','oil','snare'],
    gate:{phase:'landing',floor:1,edge:'right',...LEVEL_TUNING.river.gate},escape:LEVEL_TUNING.river.escape,
    drops:{slots:[{floor:2,col:1},{floor:2,col:4},{floor:2,col:0}],...LEVEL_TUNING.river.drops},
    phases:[wave('river','charge',['soldier','xiahou','soldier']),wave('river','landing',['soldier','shield','soldier'],{after:'charge',gate:true}),wave('river','air',['airborne','airborne'],{after:'landing'}),wave('river','last',['shield','soldier','airborne','runner'],{after:'air'}),wave('river','siege',['airborne','airborne','airborne']),wave('river','lastStand',['airborne','airborne','airborne'])]}
];
export const levelById=id=>LEVELS.find(l=>l.id===id)||LEVELS[0];
export const COMMANDERS={caohong:{name:'曹洪',coins:ECONOMY.commanders.caohong,skill:'重金悬赏'},xiahou:{name:'夏侯惇',coins:ECONOMY.commanders.xiahou,skill:'蛮牛冲阵'},caocao:{name:'曹操',coins:ECONOMY.commanders.caocao,skill:'亲至'}};
// Only the three heroes carry weapons; each one swaps the hero's skill for a different play. The 25 side-grade variants were cut.
const gear=(unit,id,name,effect,tradeoff)=>({id,unit,name,kind:'weapon',effect,tradeoff});
export const EQUIPMENT=[
  gear('zhangfei','taunt','护阵蛇矛','附近未扛人的普通兵转攻张飞。','失去眩晕和破盾，不影响敌将。'),
  gear('guanyu','hook','钩镰刀','勾回正面首个敌人并破盾。','失去群体横扫，拉人方向由站位决定。'),
  gear('zhugeliang','gather','回风扇','把区域内敌人聚向中心。','不再吹退或改变空降落点。')
];
export const TACTICS=[
  {id:'smoke',unit:'smoke',name:UNIT_NAMES.smoke,kind:'tactic',effect:'起烟遮蔽远程锁定，追兵按主公最后位置追赶。',tradeoff:'近身仍能抓人，也妨碍友军远射；每局一次。',...TACTIC_STATS.smoke}
];
export const LOOT=[...EQUIPMENT,...TACTICS];
export const equipmentById=id=>EQUIPMENT.find(e=>e.id===id);
