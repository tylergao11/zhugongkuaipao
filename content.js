// Shared battle, camp and reward content. Changes here apply to every consumer.
import {LEVEL_TUNING,TACTIC_STATS,ECONOMY} from './assets/game/balance.js';
export const UNIT_NAMES={archer:'弓箭手',barricade:'拒马',lancer:'长枪兵',log:'滚木',zhangfei:'张飞',guanyu:'关羽',shieldbearer:'刀盾兵',crossbowman:'连弩兵',slinger:'投石兵',snare:'绊马索',zhugeliang:'诸葛亮',oil:'火油',ballista:'连弩车',catapult:'投石车',redeploy:'调兵令',lure:'诱敌旗',smoke:'烟幕罐'};
const wave=(level,id,roles,extra={})=>({id,...LEVEL_TUNING[level].phases[id],roles:Array.from({length:Math.round(roles.length*(LEVEL_TUNING[level].enemyCountMultiplier??1))},(_,i)=>roles[i%roles.length]),...extra});
export const LEVELS=[
  {id:'changban',name:'长坂逃命',tutorial:true,floors:['村口','长坂桥','山道'],background:'assets/game/changban-v1.webp',
    mount:{id:'dilu',name:'的卢',floor:1,position:.5,...LEVEL_TUNING.changban.mount},
    unlocks:['archer','barricade','lancer','log','zhangfei'],recommended:['archer','barricade','lancer','log','zhangfei'],
    phases:[wave('changban','start',['soldier','soldier']),wave('changban','bridge',['soldier','soldier','soldier','soldier']),wave('changban','runner',['runner','soldier','soldier','runner','soldier'])]},
  {id:'mountain',name:'山道设伏',floors:['山脚','隘口','山顶栈道'],background:'assets/game/level-02-mountain-v1.webp',
    mount:{id:'dilu',name:'的卢',...LEVEL_TUNING.mountain.mount},
    unlocks:['guanyu','shieldbearer','crossbowman','slinger','snare'],recommended:['archer','barricade','slinger','guanyu','snare','crossbowman'],
    mechanisms:[{id:'rockfall',name:'落石',floor:1,targetFloor:0,col:4,...LEVEL_TUNING.mountain.rockfall},{id:'decoy',name:'假主公',floor:2,col:2,...LEVEL_TUNING.mountain.decoy}],
    phases:[wave('mountain','shield',['soldier','shield','soldier']),wave('mountain','drum',['shield','drummer','soldier','soldier','runner']),wave('mountain','bounty',['caohong','soldier','runner','shield','soldier','runner'])]},
  {id:'river',name:'江津抢渡',boss:true,startingGoldBonus:LEVEL_TUNING.river.startingGoldBonus,floors:['临江街道','沿岸栈道','渡口码头'],background:'assets/game/level-03-river-v1.webp',
    intro:{id:'dilu',name:'的卢',horseLine:'我先跑了，你断后！',reply:'不是，等等我啊！',...LEVEL_TUNING.river.intro},
    mechanisms:[{id:'fire-barrel',name:'火油桶',floor:1,col:4,...LEVEL_TUNING.river.fireBarrel},{id:'war-gong',name:'震军铜锣',floor:2,col:3,...LEVEL_TUNING.river.warGong}],
    ambush:{name:'伏兵尽出',floor:2,firstCol:0,formation:['barricade','archer','archer'],...LEVEL_TUNING.river.ambush},
    unlocks:['zhugeliang','oil','ballista','catapult'],recommended:['archer','barricade','lancer','zhugeliang','oil','snare'],
    gate:{phase:'landing',floor:1,edge:'right',...LEVEL_TUNING.river.gate},escape:LEVEL_TUNING.river.escape,
    drops:{slots:[{floor:2,col:1},{floor:2,col:4},{floor:2,col:0}],...LEVEL_TUNING.river.drops},
    phases:[wave('river','charge',['soldier','xiahou','soldier']),wave('river','landing',['soldier','shield','soldier'],{after:'charge',gate:true}),wave('river','air',['airborne','airborne'],{after:'landing'}),wave('river','last',['shield','soldier','airborne','runner'],{after:'air'}),wave('river','siege',['airborne','airborne','airborne']),wave('river','lastStand',['airborne','airborne','airborne'])]}
];
export const levelById=id=>LEVELS.find(l=>l.id===id)||LEVELS[0];
export const COMMANDERS={caohong:{name:'曹洪',coins:ECONOMY.commanders.caohong,skill:'重金悬赏'},xiahou:{name:'夏侯惇',coins:ECONOMY.commanders.xiahou,skill:'蛮牛冲阵'}};
// One mutually exclusive behavior per loadout slot; no random stat rolls.
const gear=(unit,id,name,effect,tradeoff)=>({id,unit,name,kind:['barricade','log','oil','ballista','catapult','snare'].includes(unit)?'device':'weapon',effect,tradeoff});
export const EQUIPMENT=[
  gear('zhangfei','line-roar','震门铁矛','怒吼沿朝向直线打断、破盾。','不覆盖背后。'),gear('zhangfei','taunt','护阵蛇矛','附近未扛人的普通兵转攻张飞。','失去眩晕和破盾，不影响敌将。'),
  gear('guanyu','hook','钩镰刀','勾回正面首个敌人并破盾。','失去群体横扫，拉人方向由站位决定。'),gear('guanyu','spin','旋锋偃月','回旋攻击身边两侧。','失去向前延伸的范围。'),
  gear('zhugeliang','gather','回风扇','把区域内敌人聚向中心。','不再吹退或改变空降落点。'),gear('zhugeliang','wind-wall','定风幡','立起风障，截停下一名穿过者。','失去群体位移，小兵也会消耗风障。'),
  gear('archer','signal','号令弓','箭命中挂信号，引导同优先级集火。','不能射伞。'),gear('archer','spread','散羽弓','近处扇面攻击多个敌人。','射程缩短，不对空、不叠伤。'),
  gear('lancer','lance-hook','倒钩枪','枪尖勾回第一个地面目标。','不能架枪迎击。'),gear('lancer','line-lance','阵列枪','固定朝向贯刺紧随目标。','不自动转身，不截停冲锋。'),
  gear('shieldbearer','tether','捕索盾','拴住首个贴身普通兵。','不能换位，不能套住敌将。'),gear('shieldbearer','double-shield','折面盾','两侧任一方向可触发格挡。','不能换位，两侧共用重整时间。'),
  gear('crossbowman','flag-hunter','猎旗弩','优先追射鼓手和曹洪。','放弃携带者优先。'),gear('crossbowman','suppress','牵制弩','连射命中后短暂压制普攻。','不钉步，不打断敌将技能。'),
  gear('slinger','command-break','破鼓石兜','命中时打断击鼓或举旗。','只打一个目标。'),gear('slinger','scatter-stones','撒石兜','固定落点铺碎石，绊停冲刺者。','不直接伤害，每人只留一片碎石。'),
  gear('barricade','cage','捕兽架','拴住第一个普通地面敌人。','捕住后其余敌人可通行。'),gear('barricade','fold','折叠架','可放倒一次，再升起一次。','放倒时不阻挡，升起需要准备。'),
  gear('log','return-log','钩链滚木','去程碰撞，回程把人拉向投放处。','去程不推退、不打断。'),gear('log','wood-drop','碎木包','原地砸开打断范围敌人。','不滚动，不推移整队。'),
  gear('oil','sticky','黏油桶','区域内不能冲刺。','不灼烧、不破盾。'),gear('oil','fire-line','火线罐','首个经过者拍火停步并破盾。','一次触发，不持续烧整片。'),
  gear('ballista','tow','绞索弩','把正面首个敌人拉向弩车。','不贯穿、不越障拖人。'),gear('ballista','shield-break','贯盾弩','击开首个目标举盾。','弩矢不再贯穿队列。'),
  gear('catapult','net','网兜弹','网住落点内敌人，使其不能移动。','不伤害，仍可攻击和指挥。'),gear('catapult','rubble','碎石弹','落点留下地形，阻止冲刺。','失去直接伤害和瞬间打断。'),
  gear('snare','bell','响铃索','标记踩中者，引导同优先级集火。','不绊倒、不破盾。'),gear('snare','double-snare','连环索','两人同时进入时一起绊倒。','单个携带者不会触发。')
];
export const TACTICS=[
  {id:'redeploy',unit:'redeploy',name:UNIT_NAMES.redeploy,kind:'tactic',effect:'点选未贴身交战的普通兵，再拖令到空格调动。',tradeoff:'移动中不能攻击，保留生命与冷却；每局一次。',...TACTIC_STATS.redeploy},
  {id:'lure',unit:'lure',name:UNIT_NAMES.lure,kind:'tactic',effect:'空格插旗，吸引附近未抓人的普通兵。',tradeoff:'首次受击即倒，不影响敌将和携带者；每局一次。',...TACTIC_STATS.lure},
  {id:'smoke',unit:'smoke',name:UNIT_NAMES.smoke,kind:'tactic',effect:'起烟遮蔽远程锁定，追兵按主公最后位置追赶。',tradeoff:'近身仍能抓人，也妨碍友军远射；每局一次。',...TACTIC_STATS.smoke}
];
export const LOOT=[...EQUIPMENT,...TACTICS];
export const equipmentById=id=>EQUIPMENT.find(e=>e.id===id);
