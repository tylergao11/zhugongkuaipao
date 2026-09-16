# 新增美术素材交付 · v3

已完成 ART-REQUESTS-V3.md 的八组需求，共 47 个素材单元（含三帧火墙与左右门板）。使用原生 image_gen 绘制；保持现有国漫角色风格。

网页版本合计 **1,728,606 字节（约 1.65 MiB）**，相对对应的透明 PNG 减少 **81.6%**。WebP 品质 88；尺寸、透明通道与脚底位置保留。

## 文件

| 组 | 网页素材 | 布局 / 尺寸 | 单元数 | 体积 |
|---|---|---|---:|---:|
| 曹军新兵种 | [cao-troops-v3.webp](../assets/game/cao-troops-v3.webp) | 4×2，2048×1024 | 8 | 360 KiB |
| 刘备姿态 | [liubei-poses-v1.webp](../assets/game/liubei-poses-v1.webp) | 2×2，1024×1024 | 4 | 158 KiB |
| 机关状态 | [mechanism-states-v1.webp](../assets/game/mechanism-states-v1.webp) | 4×3，2048×1536 | 12 | 462 KiB |
| 百姓 | [folk-v1.webp](../assets/game/folk-v1.webp) | 3×2，1536×1024 | 6 | 280 KiB |
| 效果 | [effects-v1.webp](../assets/game/effects-v1.webp) | 4×2，2048×1024 | 8 | 311 KiB |
| 新锦囊 | [stratagem-icons-v1.webp](../assets/game/stratagem-icons-v1.webp) | 3×1，576×192 | 3 | 34 KiB |
| 天象 | [weather-v1.webp](../assets/game/weather-v1.webp) | 2×2，512×512 | 4 | 51 KiB |
| 门板 | [左门](../assets/game/gate-door-left-v1.webp) / [右门](../assets/game/gate-door-right-v1.webp) | 每扇 256×512 | 2 | 共 32 KiB |

PNG 原稿：`tools/art/v3/sources/`。保留纯品红底原始生成图，未覆盖。

透明 PNG：`tools/art/v3/png/`。上述各图集均有同名 PNG，此外包含：
- 三张 192×192 锦囊单图：`golden-cicada.png`、`scatter-wealth.png`、`provoke.png`。
- 四张 256×256 天象单图：`rain.png`、`night.png`、`wind.png`、`sun.png`。
- 左右两扇门的独立 PNG：`gate-door-left-v1.png`、`gate-door-right-v1.png`。

## 接入位置表

唯一导出位置表：[assets/game/art-v3.json](../assets/game/art-v3.json)。记录图集地址、尺寸、格数、每个素材的 rect、bbox 与 anchor。所有序号从 0 起，按行从左到右。

| 图集 | 从左到右、从上到下的标识 |
|---|---|
| cao-troops-v3 | climber, cao-archer, fire-raider, shield-cart, strategist, water-raider, cavalry, escort-pair |
| liubei-poses-v1 | liubei-struggle, liubei-hide, liubei-water-climb, liubei-captive |
| mechanism-states-v1 | well-splash, sluice-open, log-landed, log-broken, arrow-tower-fire, shrine-lot, shu-banner, winch-active, hanging-basket, prison-cart, planks-falling, boulder |
| folk-v1 | refugee-elder, refugee-mother, refugee-youth, trapped-merchant, fisherman, boatman |
| effects-v1 | fire-wall-0, fire-wall-1, fire-wall-2, mud, splash, coin, wind-parasol, rescue-glow |
| stratagem-icons-v1 | golden-cicada, scatter-wealth, provoke |
| weather-v1 | rain, night, wind, sun |

角色朝右，反向由代码镜像。512 格的脚底锚点为 (256,486)。天象居中。火墙三帧使用统一裁切范围、缩放与基线，切帧不会因独立对齐而上下跳动。

囚车保持空心透明，刘备囚禁姿态不含车与栏杆；押送杆中间留空。锦囊暂为独立补充图集，便于后续重排既有军需图集，不覆盖旧图。

左右门共用一个 512×512 闭合框，按中缝分成等宽的两半，闭合时依照 closedOffset 并排绘制。doorFrame.bbox 给出实际门板范围。需求中门洞坐标注明为近似值，精确裁切框待接入时确定；当前门板未写死到地图坐标。

本次交付素材和位置表，未修改地图、玩法、现有素材注册或线上版本。

## 生成与打包

- 原生生成提示词：[generation.json](../tools/art/v3/generation.json)、[generation-extra.json](../tools/art/v3/generation-extra.json)。
- 骑兵和押送队边缘修补：[generation-repair.json](../tools/art/v3/generation-repair.json)。
- 原始文件来源：[sources.json](../tools/art/v3/sources.json)。
- 打包规格：[catalog.json](../tools/art/v3/catalog.json)；脚本：[pack.mjs](../tools/art/v3/pack.mjs)。
- 在项目根目录执行 `node tools/art/v3/pack.mjs` 可重新输出 PNG、WebP 和位置表。

按原有 pack-v2 的品红抠色方式处理，使用预乘透明度采样缩放，保留透明孔洞和细小线条。对越过生成网格边界的手、箭、红绸使用单独裁切范围；骑兵和押送队补齐边缘后才装入图集。

打包下载：[WebP 素材包](../output/art-v3-runtime.zip)。

