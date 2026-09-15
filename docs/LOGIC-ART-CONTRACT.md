# 刘备阵容：代码与美术对接

## 分工

代码任务维护 `engine.js`、`theme.js` 的战斗、编队、盲盒、结算与存档逻辑，以及 `main.js` 中的流程接入。按本轮要求，代码任务同时维护 `camp.js` 的横屏触摸交互与 `style.css` 中以 Landscape camp 注释开头的营地布局。美术任务维护图片、角色动画和战场渲染；角色 ID 与逻辑事件保持一致。双方编辑共享文件时只改自己负责的部分，避免整文件覆盖。

## 初始与解锁

- 新档赠送 120 阵营金币，可开两次 50 金币宝箱。`starterGiftClaimed` 随存档保存；旧档未领过时补发一次，刷新不重复发放。
- 开局仅显示加载进度，场景、营地图片和音乐准备完成后直接进入宝箱首页；编队页点击出征时再由触摸手势开启声音。
- 美术采用完整绘制的底图，金币、奖励、进度、按钮热区及变化文字单独叠加。暂停、胜利、失败采用居中弹窗，周围露出战场。
- 新档只有两张：`archer` 弓箭手、`barricade` 拒马；底部固定六格，其余四格显示锁头。
- 第一箱在张飞、关羽、诸葛亮中等概率抽取一名武将；品质仍按品质池抽取。开箱次数保存后不再重复首箱保底。
- 张飞与长枪兵现在作为可解锁的武将和兵种进入奖池；原有同 ID 品质战利品仍有效。
- 初始两张来自 `DEFAULT_DECK`，编队上限来自 `MAX_DECK_SIZE`，当前为 6。兵器品质不额外占编队位。
- 其他武将、兵种和器械只有获得对应盲盒物品后才能编入阵容。旧档已有战利品保留。
- `CampProfile.snapshot()` 是出征快照；本局使用快照，库房改动在下局生效。
- 单位详情增加金币升级：当前等级、下一级属性与金币费用并列呈现；不足时升级按钮置灰。单位默认 1 级，上限 10 级，升级费用依次为 30、45、65、90、120、155、195、240、290 阵营金币。
- `CampProfile.upgradeUnit(id)` 检查拥有状态、满级与余额后扣费，返回 `{ok,level,cost}` 或 `{ok:false,reason}`。等级按单位 ID 保存在版本 4 存档的 `unitLevels`，切换品质、卸下编队不会丢失，旧版本存档从 1 级开始。
- `snapshot().levels` 进入战斗快照；`unitStatsFor()` 是战斗、详情、装配预览和升级预览共同使用的数值计算入口。每升一级增加基础生命 6%、基础伤害 5%；生命取整，品质与等级的伤害加成相加。拒马只增加生命，绊马索增加眩晕时间；部署费用、射程、攻速和武将控制时长不随等级增长。
- 空编队不能开战，未携带或未解锁的卡牌不能部署。

## 角色 ID 与战斗表现

| ID | 名称 | 代码行为 | 主要特效 kind |
| --- | --- | --- | --- |
| zhangfei | 张飞 | 近战、怒吼、短时减伤 | slash / roar |
| lancer | 长枪兵 | 两格近战戳刺 | thrust |
| archer | 弓箭手 | 四格远程射箭，拒马不挡友军箭 | arrow |
| barricade | 拒马 | 阻挡敌军、承受攻击 | hit / death |
| guanyu | 关羽 | 近战溅射、青龙横扫 | slash / dragon |
| zhugeliang | 诸葛亮 | 风弹、东风击退 | feather / gust |
| shieldbearer | 刀盾兵 | 近战、被动减伤 25% | slash |
| crossbowman | 连弩兵 | 每轮两箭，间隔 0.16 秒 | arrow |
| slinger | 投石兵 | 小范围抛石 | stone，small=true，radius=65 |
| log | 滚木 | 同层移动碰撞 | log |
| oil | 火油 | 持续范围伤害 | oil |
| ballista | 连弩车 | 每轮三箭 | arrow |
| catapult | 投石车 | 范围抛石，有近距离盲区 | stone，radius=105 |
| snare | 绊马索 | 单次触发、眩晕并打断冲锋 | snare-hit |

数值以 `TYPES` 为准。`GRID_SPACING=178` 为相邻格的世界坐标距离；长枪兵射程两格，所有 `ranged` 单位射程四格，仍只能攻击同层。详情通过 `rangeLabel` 显示格数。已有 `troopSprites` 排序：lancer=0、shieldbearer=1、crossbowman=2、slinger=3。

## 表现读取接口

- 驻守单位：`type / slot / hp / maxHp / dir / attack / attackDuration / casting / guard / hit / born`。
- 敌人：`role / s / facing / moving / attack / hit / carrying / airborne / objective`。
- `objective`：`capture` 追捕、`carry` 押送、`clear-path` 清路、`escort` 护送。
- `game.effects` 提供起终坐标、`life / maxLife` 等特效状态。伤害由引擎结算，渲染不要重复扣血。
- 事件 `type` 始终表示事件名，兵种使用 `unitType`，两者不能共用字段。`attack` 提供 `unitType / slot / target`；`place` 提供 `unitType / slot / x / y`；阵亡使用 `fallen` 的 `unitType / slot`。
- `commander`、`commander-defeated`、`gate-open`、`capture`、`rescue`、`skill`、`enemy-skill` 可驱动提示和演出。
- 曹彰在 50% 开门；后续地面兵从右门入场，其他兵清理押送路线，携带者抵达出口才失败。

## 盲盒与品质

- `LOOT_ITEMS` 是唯一物品列表；数量、类别文案和图标按该数组生成，不能再写死“九种”。
- 分类 `weapon / hero / troop / device` 分别对应兵器、武将、兵种、器械。
- `RARITIES[].chance` 是概率来源；当前普通 60%、精良 30%、名品 10%。
- 50 阵营金币开一次，同款同品质重复返还 15 金币。
- 编入尚未选用品质的单位时自动选择库房中最高品质；玩家已选品质不自动覆盖。
- `fitted` 决定本局加成，`labels` 提供品质文字，`bonuses` 提供实际加成。
- `openChest()` 返回 `{key,item,rarity,duplicate,refund}`，开箱动画使用此结果，不得为动画再次抽取或扣费。

## 横屏触摸营地

- 当前金币强化只显示「军饷获取／冷却缩减」，数据为 `profile.data.incomeLevel`（全军共享）与 `training[id].cooldown`；调用 `profile.train(id,path)` 扣费保存，详情与战斗共用 `unitStatsFor`／`militaryIncomeFor`。
- 单位详情的 `equipmentPanel` 直接显示已有装配品质，`equip-inline` 一键装卸并刷新数值；保留触摸惯性滚动。无需另点「查看／装卸」。
- 进入游戏自动按横屏排布并映射触摸坐标；全屏按钮与横屏确认弹窗已移除。

- 用户已将入口定为「宝箱」与「编队」两个，宝箱为核心；首页大图来自认可的长坂大营渲染，金币与按钮文字为可变层。取消四入口布局。
- 编队只显示六个出征位；点空位进入独立选人页，点已携带单位进入全屏立绘详情，详情内部进行装配、卸下或换人。品质比较与满编替换仍使用已有数据接口。
- `assets/game/camp-ui.css` 是从渲染设计接入的视觉样式；底图与图层来源、压缩统计见 `tools/art/CAMP-UI.md`。保留横屏坐标映射与惯性滑动。
- 列表按 `data-scroll` 指定方向滑动，使用 `stagePoint` 映射触摸坐标；支持惯性、按住停止、滑动取消点击和返回时保留位置。
- 已有图片继续通过 `.camp-icon.icon-ID` 和 `.camp-icon.boss-ID` 接入。更换图片不改 `data-action`、`data-value` 与物品 ID。
- 开箱只在 `profile.openChest()` 中扣费和抽取一次，再播放动画；跳过动画直接显示同一个结果，奖品已入库。
- 获得兵器或已携带单位的新品质时，进入装配比较后由玩家选择；不自动替换原有品质。
- 满六张时先选择换下谁，再调用 `replaceCard()` 一次完成替换和保存。

按用户要求，本次不运行测试；本轮改动尚未发布。

## UI 清理接续（2026-09-16）

- 美术当前交付见 tools/art/UI-CLEANUP.md。加载器、营地、战斗 HUD、结算各用独立样式表；禁止复用旧绿色 intro.panel。
- 奖池概率页面、入口和选人/装卸的冗余说明已移除。后台概率数据和抽奖接口不因此修改。
- 旧运行素材已移出项目；actors-v2.json、props.json 制作元数据移至 tools/art，生成脚本同步。
- 保留并行任务新增的业务逻辑，只做外观与显示文案清理。
