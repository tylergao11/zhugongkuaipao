# 暂停与结算弹窗

沿用用户认可的三张渲染设计。当前 v2 已在制作阶段裁掉弹窗外未显示的战场，只加载中央人物、纸面、装饰、标题和按钮，外围使用当前战场遮罩。

## 运行文件

- assets/game/battle-popup.js：按钮热区、回调、真实奖励与战绩。
- assets/game/battle-popup.css：尺寸与动态文字；不承担加载页样式。
- battle-popup-pause-v2.webp：103,454 B。
- battle-popup-win-v2.webp：123,838 B。
- battle-popup-loss-v2.webp：126,620 B。

三张合计 353,912 B（约 346 KiB），旧版 804,128 B（约 785 KiB）。v1 已归档至项目外。可用 node tools/art/pack-battle-ui.mjs 从 tools/art/battle-popup-*-master.webp 重新裁切压缩。

## 交互

- 暂停：继续断后 / 重新开局并进入编队。
- 胜利：回营开箱 / 再跑一回并进入编队。
- 失败：重新整备 / 回营开箱。
- 奖励使用 game.rewardReceipt 原有结果，不重复发奖。仅显示实际奖励明细，移除空明细时的套话。
- 按钮保持最小 44px 触摸高度，弹窗尺寸按可用游戏空间适配。

已在本地浏览器查看裁切后的结算状态；没有新增测试文件或发布公网。整轮资源核对见 [UI-CLEANUP.md](UI-CLEANUP.md)。

原始渲染存于 Codex generated_images/01a0a528-1460-7470-9f3d-56d13a2b73a4：暂停 exec-8dfaadc2-bbee-47a7-bf6f-54bb52ebf8ac.png，胜利 exec-c06f52ca-2783-4e4a-b0fa-38667e2fae67.png，失败 exec-90831120-5e37-43d0-8b14-e281c9bc5c4d.png。
