# 逻辑与表现接口

- assets/game/balance.js：唯一运行数值配置，战斗、内容与结算共同读取；表现层不另存费用、倍率或冷却。
- content.js：唯一关卡、基础单位解锁、武器变体、计策内容。地图布局继续共用三层十八格；第二、三关使用各自背景图。
- engine.js：Game 负责伤害、目标选择、控制、抓捕、营救、波次、机关、登船胜负。unitStatsFor(type, equipmentId) 提供同一套单位属性与装备规则；渲染不能结算伤害。
- theme.js：CampProfile 负责 v7 存档、金币、解锁、编队、装配、待选箱与结算。snapshot() 返回 levelId、deck、unlocked、equipment。本局使用出征快照。
- camp.js：原有触摸与惯性滚动保留。编队页选择已解锁关卡、推荐编队或自选六张；空编队和纯计策编队不能出征。
- main.js：拖卡部署；按住已上阵武将卡显示范围，松手发动；拖移取消技能释放。点击单位菜单可拆卸、转向、换防或折叠。机关支持点击场景中的落石或假主公本体，左上角按钮仍保留，两处共享同一发动入口；拖动画面和取消触摸不发动机关。

## 解锁与宝箱

初始提供弓箭手、拒马、长枪兵、滚木、张飞。第一关通关解锁第二关及关羽、刀盾兵、连弩兵、投石兵、绊马索；第二关通关解锁第三关及诸葛亮、火油、连弩车、投石车。旧档已拥有单位保留。

openChest() 仅扣费一次并持久保存 {choices:[装备ID]}，选择前不能购买下一箱。chooseLoot(id) 只领取一件，领取后由玩家装配；不自动覆盖。每个单位的 fitted 只存一个互斥变体，标准装备始终可用。武器和改装不占额外编队位，计策作为卡牌占位且每局限一次。

旧品质不再进入战斗计算，保存于 legacyArmory；每个不同旧记录换一张通用军需券，券从当时已开放的未拥有内容中三选一。数量持久化，不重复发放。

## 表现读取

- 我方：type、slot、hp、maxHp、dir、fixedDir、variant、attack、casting、skillCooldown；移动时读取 moveS，destination 是已预留的目标格。folded、folds 表示折叠状态与次数。
- 敌方：role、s、facing、carrying、airborne、objective；guard 表示举盾，windup 表示冲锋准备，commandWindup 表示击鼓或悬赏准备，stun/root/mark/tether 表示控制与标记。
- 关卡：game.level、mechanisms、phaseTimes、caozhangGateOpen、gateWarningAt、ferryStartedAt、ferryReady。门的旧字段名保留兼容，产品文字为第三关登岸口。
- 坐骑：第一关 level.mount 提供位置和倍率，game.mount.claimed 表示已领取；liu.mounted 决定骑乘表现，liu.mountWalk 记录上马时的行走里程。的卢图集仅在含坐骑的关卡进入时加载，待机和四帧奔跑共用一张图；画面不能自行修改速度或触发上马。
- 特效：game.effects 中 kind、life/maxLife、起终点坐标；新增 smoke、sticky、fire-line、wind-wall、scatter-stones、rubble、rockfall 的基础范围反馈。
- 事件 type 只表示事件名，单位类型使用 unitType。commander-defeated 当场发金币，settle() 用 runId 防重复结算。

当前战场角色继续复用。独立卡牌插画暂缓；不把战场角色截图当作已完成的卡面设计。第二、三关机关设计稿仍是美术母版，运行时只接入背景与可识别的基础机关反馈。
