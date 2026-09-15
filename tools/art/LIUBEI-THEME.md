# 刘备主题美术交付

生成方式：内置 image_gen；没有使用外部图像 API。母图保留 PNG，网页使用透明 WebP。地图保留完整古代场景，兵种用绿色布甲与铜件区分于曹兵。

## 运行素材

| 素材 | 路径 | 尺寸 | 字节 |
| --- | --- | --- | --- |
| 长坂坡三层背景 | assets/game/changban-v1.webp | 1672 × 941 | 435406 |
| 首屏背景预览 | assets/game/changban-preview-v1.webp | 560 × 315 | 48804 |
| 曹洪、夏侯惇 | assets/game/cao-commanders-v1.webp | 1024 × 512 | 150386 |
| 连弩车、投石车、绊马索 | assets/game/shu-devices-v3.webp | 1152 × 384 | 86246 |
| 四种蜀军步兵 | assets/game/shu-infantry-v1.webp | 1024 × 1024 | 227570 |

## 兵种图集接口

`shu-infantry-v1.webp` 为 2 列 × 2 行，每格 512 × 512；脚底基线在各格 y=492。透明背景，整体朝右，朝左由绘制时镜像。

| 序号 | 标识 | 造型 | 动作表现 |
| --- | --- | --- | --- |
| 0 | lancer | 长枪兵：龇牙、大眼、绿色头带、长枪 | 呼吸与摆重心，攻击前倾戳刺，枪尖亮线 |
| 1 | shieldbearer | 刀盾兵：圆肚、铜边木盾、绿色铁盔 | 呼吸待机，挥刀倾身，受击回缩 |
| 2 | crossbowman | 连弩兵：绿兜帽、眯眼、木制弩 | 待机摇摆、射击回弹，箭矢弹道 |
| 3 | slinger | 投石兵：布头巾、吐舌、石头袋 | 抛石前摇与倾身，旋转石块抛物线 |

此图集含基础与盲盒候选兵种，不表示全部初始解锁。用户确认初始仅四张：张飞、长枪兵、弓箭手、拒马；解锁规则由程序任务负责。

新兵图整包约 222 KiB。`pack-shu-troops.mjs` 仅将原图透明区域中的完整人物分别装入等尺寸格子并编码，不重绘角色。运行方式：设置 CODEX_NODE_PACKAGES 为含 Sharp 的 Node 依赖目录，执行 `node tools/art/pack-shu-troops.mjs`。

## 母图

### 移动网页绘制预算

- 当前加载清单图片合计 1,562,886 字节（约 1.49 MiB），加入音乐约 2.39 MiB；动作元数据另约 21 KiB。PNG 母图不进入网页加载。
- 人物有呼吸、攻击倾身、受击回缩；跑路角色使用关节驱动的交替腿部动作。固定拒马保持静止，滚木、火油、器械有对应的使用动画。
- 战斗绘制上限 60 fps；连续两个统计窗口吃力时降至 30 fps、画布尺寸缩至 78%，稳定后可恢复 60 fps。恢复时暂用 88% 分辨率，避免立即再次卡顿。
- 菜单和暂停画面以 15 fps 更新；页面隐藏、竖屏提示时不绘制战场。镜头外的驻守单位和地面追兵跳过绘制。
- 帧率调整只影响画面，战斗逻辑仍使用原来的固定时间步进。像素上限 260 万、设备像素比上限 2；没有新增动画贴图或下载量。
- 做了单次帧率调度的内联检查，未进行反复对局回放。微信真机的持续帧率尚未实测。

- tools/art/changban-v1-master.png
- tools/art/cao-commanders-v1-master.png
- tools/art/shu-devices-v3-master.png
- tools/art/shu-infantry-v1-master.png

## 完整生成提示词

### 长坂坡背景

Use case: style-transfer. Edit the supplied town game background into CHANGBANPO, Liu Bei's comic countryside escape theme. Preserve the exact flat side-view game layout and surface coordinates, 16:9 composition. The three clear walkable surfaces remain at 29.1%, 53.46%, 82.1% of image height, fully horizontal across image. Lower-right stairs connect bottom surface near x97% to middle near x90%; upper-left stairs connect middle x3% to top x11%. Keep all walkway areas empty for game actors. Replace the old walled urban city with a warmly lit ochre countryside ravine and refugee village: lower lane packed yellow-earth village road with baskets and abandoned carts BEHIND it; middle lane rustic long wooden bridge with trestles over a dusty ravine, distant burning village silhouettes and cloth market awnings; upper lane raised earth palisade path across a hillside, straw-roof watch hut and emerald Liu banners without text. Three layers in a whimsical theatrical cutaway, extensive depth behind lanes, dusty golden afternoon light, olive-green willow trees, russet roof tiles, blue-gray mountains, swallows in the sky, distant retreating wagons. Strong hand-painted dark ink outlines and rich detailed comic game textures matching the reference. Beautiful, readable and atmospheric at mobile resolution. The large center spaces behind actors should stay subdued. Foreground ground ends at the three specified heights, no fourth platform. No characters, no GUI, no letters, no watermark. Preserve path geometry, change environment identity completely. Wide 16:9.

### 曹军主将

Use case: stylized-concept. Asset type: production sprite atlas, transparent background. Exactly TWO separate full-body male ancient Chinese Three Kingdoms enemy commanders arranged side by side in TWO equal square cells of a 2:1 landscape canvas. Left cell Cao Hong: bulky gold-trimmed black lamellar armor, emerald jade buckle, a conspicuously enormous tied coin purse at waist, thick dark moustache, red-plumed gold helmet, mischievously greedy stern expression; holds a curved dao upward at chest height. Right cell Xiahou Dun: huge muscular broad-shouldered general, single black eyepatch, iron blue-black armor, large red shoulder scarf, spiky helmet, heavy broad saber held horizontally at chest level, angry overconfident shouting face. All face RIGHT in full profile/three-quarter side view. Both have BOTH hands and weapon above the waist; short armored skirts end above visible knees; both legs anatomically separate and readable below skirt, knees bent in a grounded wide walking stance, left foot behind, right foot ahead, boots flat at 95% height of each cell, no weapon overlapping lower legs. Big expressive heads, squat heroic cartoon proportions, thick black ink contours, detailed metal rivets and fabric shading, earthy jewel palette, same polished hand-painted comedic siege-game style as Chinese tower-defense illustration. Full figures fit within their own square with 5% padding, heads near 6% and soles at 95%; no overlapping across cells. True transparent alpha background with no floor or shadows, no text, no labels, no scenery, no frame.

### 蜀军器械（选用 v3）

Use case: stylized-concept. Create ONE transparent PNG sprite atlas for a hand-painted comedic ancient Chinese tower defense game. Genuine transparent alpha background. Canvas 3:1 landscape, three equal square cells horizontally. Every object is SMALLER than its cell with 15 percent empty transparent padding on ALL sides. Large completely empty vertical gaps between objects. Each full object must fit inside the CENTER 70 percent of its respective square cell, including arrows, flags and stones. Cell one: green-and-brass Chinese repeating crossbow cart, chunky wood grain, two wheels, magazine of short bolts, compact horizontal bow aimed RIGHT, small jade feather ornament. Cell two: rustic jade-green Chinese trebuchet cart, wooden wheels, raised throwing arm with a stone, a SMALL green flag, compact silhouette aimed RIGHT, no extra stone pile outside the silhouette. Cell three: funny tripwire trap made of two low bamboo stakes joined by a tight braided rope, small bronze bells and a tiny tied straw shoe. No people. Dark thick ink outline, rich painterly shadows, antique bronze hardware, emerald cloth and warm golden wood, high-detail playful Three Kingdoms strategy game style. Whole silhouettes. Bottom of each object at 85 percent of its cell height. No ground shadow, no grid, NO checkerboard texture, no background color, no scenery, no text, no lines between cells. TRANSPARENT pixels outside objects.

### 蜀军步兵

Use case: stylized-concept. Create a production-ready transparent PNG sprite atlas for a funny Three Kingdoms mobile tower-defense game, exactly 4 DIFFERENT Shu infantry characters, in an exact 2-column 2-row grid, square canvas. Each cell is square with a full-body character, centered, feet on a shared baseline at 94 percent of its own cell. Genuine transparent alpha background, no ground, no shadows, no checkerboard painted into the image. All four look toward screen RIGHT, in a wide standing ready-to-fight pose. Weapons and bodies remain completely inside their own cells with 6 percent transparent padding; clean transparent gaps between cells. Thick lively black ink outlines, hand-painted detailed comic textures, big expressive heads, compact sturdy bodies, expressive funny Chinese faces, antique green Shu faction tunics with bronze fittings, readable weapon silhouettes, warm highlights, elaborate wrinkles and material edges matching a high-quality humorous historical Chinese comic game. TOP LEFT: a tall skinny spear militia man, green cloth headband with tied tails, alarmed buck teeth and brave bulging eyes, short patched green tunic and wrapped shins, gripping a long wooden spear horizontally diagonally up toward the right, spear fits cell, both boots planted apart, no shield. TOP RIGHT: a stocky pot-bellied sword-and-shield soldier, green helmet, determined eyebrows, broad round wooden shield with bronze rim held ahead on right, short iron saber, heavy patched green lamellar chest and visible chunky legs. BOTTOM LEFT: a small wiry crossbow marksman, dark green hood and sly confident face, holding a clearly recognizable chunky wooden ancient Chinese crossbow aimed RIGHT, bolts quiver on his back, leather vest, planted boots, not a modern firearm. BOTTOM RIGHT: a round-faced stone thrower with a cloth turban, cheeky tongue poking out, short green shirt, large bulging stone pouch tied to belt, lifting a small rock in right hand above his shoulder ready to throw RIGHT, other hand holding sling cord, visible bent knees and planted feet. Consistent character scale and the same side-view three-quarter perspective. Detailed attractive finished game art, no lettering, no UI, no decorations or background. Four distinct infantry units only.
