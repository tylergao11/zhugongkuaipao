> 历史 v1 美术制作记录。下方旧文件名、体积和界面不代表当前游戏；旧资源已归档。当前版本以 UI-CLEANUP.md、CAMP-UI.md、ART-V2.md 为准。

# Art production notes

Generated with the built-in `image_gen.imagegen` tool using `assets/reference/zhugong-kuaipao-art-direction.png` as style reference. No CLI image model or external stock artwork was used.

## Runtime assets

| File | Size | Layout |
| --- | ---: | --- |
| `assets/game/actors.webp` | 110170 bytes | 1024 x 512; four columns, two rows; transparent RGBA |
| `assets/game/castle.webp` | 132146 bytes | 1440 x 810; opaque RGB |
| `assets/game/props.webp` | 40528 bytes | 768 x 256; three columns, one row; transparent RGBA |

Total image payload: **282844 bytes (276.2 KiB)**. JSON metadata is additional and need not be loaded by the current game. PNG masters, raw RGBA intermediates, and this build utility are not runtime dependencies.

Actor cells are 256 square, row-major: `liubei`, `guanyu`, `zhangfei`, `zhugeliang`, `archer`, `enemy`, `enemyHeavy`, `horse`. Prop cells are 256 square: `barricade`, `log`, `oil`. All actor art faces right. Every cell uses nominal anchor `(128,240)` at the ground. Per-cell coordinates are saved in `assets/game/actors.json` and `assets/game/props.json`.

The generated art is one pose per actor. Runtime walk, attack, hit, death, carrying, and spell animation is implemented by the main agent in `main.js`; no pre-rendered animation frame download is required.

## Transparency handling

Both native transparent-image requests returned RGB images containing a visible checkerboard, including the targeted alpha correction request. The checked runtime images were packed from connected actor silhouettes into real RGBA using `pack-atlas.mjs`. Pillow was used for byte-to-image encoding, resizing the background, and WebP compression. Fine isolated light details and outline edges are a limitation of this MVP asset conversion; these are not authored multi-frame character animations.

The original masters remain under `C:/Users/84720/.codex/generated_images/01a0a4f0-11ac-7cc3-bd1c-5e9bee71e77d/`:

- `exec-afff8bc3-884a-45a4-af2c-9b76c7be00ba.png`: first actor generation.
- `exec-5197abc1-3d28-4f65-b6b6-38ad6be67a0f.png`: actor correction used for runtime packing.
- `exec-c51c3188-dc05-4b56-8315-fa829d94cfa0.png`: castle background.
- `exec-db2caf2a-f0e7-429c-b9a4-faefa83d956c.png`: props.

## Generation prompt set

### Actor atlas

Use case: stylized-concept. Asset type: production sprite atlas for a lightweight 2D Three Kingdoms mobile browser tower defense game. Image 1 is STYLE REFERENCE ONLY. Create a NEW transparent PNG atlas, 4 columns by 2 rows of equal square cells, wide 2:1 canvas 2048x1024 or 1024x512. Eight isolated full-body characters, EXACTLY ONE IN EACH CELL, no labels, no text, no frames. Each character centered in its cell, feet at 92 percent of the cell height, entire silhouette and weapons fit inside its own cell with transparent gutters. Match the reference's hand drawn Chinese comedy game style: bold dark ink outline, chunky readable chibi heads, confident expressive faces, rich painted but clean flat shading. Ancient clothing only. All characters face RIGHT in side-view or right-facing three-quarter profile, ready for horizontal sidescrolling; keep action silhouettes wide and simple. Top row left to right: 1 Liu Bei terrified and sweating, light green ancient robe and topknot, legs in running stance; 2 Guan Yu heroic red face long black beard green robe green hat, holding his long crescent guandao forward, fierce attack-ready stance; 3 Zhang Fei huge black beard and angry open mouth, red headband and red-black armor, holding serpent spear, stout powerful stance; 4 Zhuge Liang white and blue ancient robes and tall hat, sly calm expression, holding large white feather fan. Bottom row left to right: 5 ordinary allied archer in green-brown armor drawing a bow to the right; 6 ordinary Cao soldier in dark grey helmet and dark leather armor carrying short sword; 7 heavy Cao soldier dark plated armor and round shield with sword, red tassel, bulky silhouette; 8 ancient white horse with brown saddle facing right, cantering. Transparent background is essential, actual alpha outside the silhouettes, no opaque studio background, no ground shadows, no scenic elements. Same scale and consistent character shading. No modern objects, no 3D, no realistic painting, no texture behind sprites. Do not reproduce the original screenshot composition.

### Actor correction

Use case: background-extraction. This image is an EDIT TARGET: eight game characters on a checkerboard. Preserve all eight character identities, poses, clothing, weapons, color, scale, and positions exactly. Remove the grey and white checkerboard background entirely. Deliver a truly transparent PNG with actual alpha = 0 outside each character, including holes within bow/weapon contours. NOT a picture of a checkerboard. Keep this same 4 columns x 2 rows arrangement. Each sprite must be detached with transparent gutters. Correct only one issue if needed: in the top row, Guan Yu's guandao and Zhang Fei's spear must stay inside their own square cells; slightly uniformly scale those characters down to leave a gutter. Do not add shadows, labels, framing, or any background color. This must be a real alpha-transparent sprite atlas usable in a web game.

### Castle background

Use case: historical-scene. Asset type: background layer for a 16:9 landscape mobile Three Kingdoms tower defense game. Image 1 is STYLE REFERENCE ONLY. Create a NEW EMPTY ancient Chinese fortified town wall background, horizontal 16:9 around 1440x810 or 1536x864. Match the reference's hand-drawn dark ink cartoon style, dusk indigo blue and slate grey ruined masonry, warm amber wall torches, weathered wood beams, occasional muted red cloth pennants with NO text. No humans, no animals, no weapons, no traps, no game UI, no lettering. The game is a side-on building cutaway three storeys high: leave broad calm empty playable bands with masonry behind them: top floor visual space y=80-245 of 810, middle floor y=275-445, bottom floor y=480-645. A horizontal ground/platform masonry strip at y=250,450,650 is acceptable but keep these narrow. Most of the image is FLAT SIDE ELEVATION grey stonework for three vertically stacked lanes; far ancient skyline and night clouds only across the top 80 pixels. At far left and far right aged timber posts can frame the view. Do NOT put diagonal stairs anywhere; the game will draw staircases on top at exact coordinates. No foreground objects or clutter inside play lanes. Top 70 px and bottom 100px will be covered by HUD. Use readable muted dark background, subtly detailed chipped stone and timber, no bright white wall, big negative spaces for characters. Keep camera straight-on like the reference game screenshot, no isometric angle, no 3D.

### Prop atlas

Use case: stylized-concept. Asset type: transparent sprite atlas of three ancient Chinese tower defense props. Image 1 is STYLE REFERENCE ONLY. Create a NEW 3 columns by 1 row spritesheet, exact equal square cells, 3:1 wide canvas. ONE item per cell, no labels or text. First cell: wooden spiked cheval-de-frise barricade, three crossed dark wooden braces with five big sharp pale wooden spikes, like the reference 拒马. Second cell: a heavy horizontal brown rolling log with iron bands and several sturdy spikes, readable rounded silhouette. Third cell: a squat black iron brazier/oil pan on short legs with bright orange-yellow flames rising from it, like the reference 火油. All three isolated side view or shallow three-quarter view, bold chunky dark ink outlines and painted clean cel shading, ancient Chinese comedy game style consistent with Image 1. Full object contained within its square cell with generous transparent gutter; each grounded at 90 percent of cell height. Genuine transparent PNG with actual alpha outside the objects, not a checkerboard drawing. No white background, no grey background, no checkerboard, no floor, no UI, no text, no other objects.
