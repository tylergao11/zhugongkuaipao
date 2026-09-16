# 第三关地图：原图局部修订

基底：changban-vertical-v2.webp。未采用此前被否决的整图修补结果。
修改：底层城门打开；第二层右侧台阶接到上层；第三、四、五层保留；第六层楼梯移到右侧并移除原左侧楼梯；第七层楼梯补在左侧。
成品：changban-vertical-v4.webp，887 × 1774，WebP quality 90。
方法：原生 image_gen 分别编辑三个局部裁切，再将指定局部合成回原图；合成范围之外沿用原像素，最后统一编码。
合成参数及无损合成稿：output/map-stair-approved-v4/assembly.json。

## 原生生成记录

### gate

Generated images are saved to C:\Users\Tylergao\.codex\generated_images\01a0a7ec-ceb8-7080-b26b-330918548c75 as C:\Users\Tylergao\.codex\generated_images\01a0a7ec-ceb8-7080-b26b-330918548c75\exec-c079bd0a-246a-4a4e-80b6-ba1a36b161c9.png by default.

Precise local image edit, same crop, same camera and art. This is a 270 x 230 crop of an approved guoman side-view game map. Change ONLY the closed double wooden city gate into an OPEN gateway. Preserve the stone arch exactly, the surrounding wall, torches, warm fire lighting, ground level, debris, ink outlines and painting style. The two doors are swung inward along the interior walls so there is a broad visibly unobstructed central passage. Show a dim tunnel through the arch, with a stone floor continuing out onto the existing foreground road. No closed wooden boards across the opening, no portcullis, no fire blocking passage, no stairs, no people, no labels. The gate bottom stays exactly at the existing road height. Keep the image framing and every exterior area unchanged. Return only this same crop, with its gate opened.

### stairs-two

Generated images are saved to C:\Users\Tylergao\.codex\generated_images\01a0a7ec-ceb8-7080-b26b-330918548c75 as C:\Users\Tylergao\.codex\generated_images\01a0a7ec-ceb8-7080-b26b-330918548c75\exec-5d99a65a-c0d7-41be-a8b0-2e9cbe9f3e79.png by default.

Precise local edit of this 227 x 270 cropped edge of an approved side-view guoman game map. Keep the exact crop, style, all surroundings, and the heights of both horizontal platforms. Repair ONLY the incomplete right-side stone staircase. The upper field path walking surface is at y about 48, the lower burning-street walking surface is at y about 243 (origin upper-left). The existing staircase stops halfway up with a tall vertical gap before the upper platform. Replace that incomplete flight with ONE continuous, properly connected staircase ascending RIGHT from foot near (74,243) to upper landing near (208,48). About 20 solid visible steps, no vertical cliff or wall replacing the top steps, no missing treads, no jump, no ladder. The top landing must cut through the platform rim and open directly onto the upper field path at y48. The bottom must be flush with the burning-street road at y243. Use the full available vertical distance between the two platforms. This can be a steep stair but all treads remain inside the crop. Keep the LEFT 60 pixels of the shopfront untouched and preserve all imagery outside the stair area. Same chunky ink-outlined stone, warm fire illumination, existing perspective. Do not shift or add floors, no characters or labels. Return this same crop only.

### stairs-six-seven

Generated images are saved to C:\Users\Tylergao\.codex\generated_images\01a0a7ec-ceb8-7080-b26b-330918548c75 as C:\Users\Tylergao\.codex\generated_images\01a0a7ec-ceb8-7080-b26b-330918548c75\exec-ac766727-d543-4e01-b610-13cd567fcc5f.png by default.

Surgical edit of this exact 887 x 330 wide crop from an approved side-view cartoon guoman platform game map. Preserve the crop framing, style, colors, water, woodwork and THREE horizontal platform heights. This is NOT a new map. There are three walking surfaces: upper stone quay at y35, middle wooden bridge at y163, lower stone ledge at y290. Fix only the two edge connections, forming a zigzag: FROM THE LOWER LEDGE go UP AT THE RIGHT to the middle bridge; then walk across the bridge and go UP AT THE LEFT to the upper quay.

1. REMOVE the existing wrong staircase at LOWER LEFT between the lower ledge and middle bridge (x0..190,y165..290). Restore believable stationary stone abutment, rock, bridge support and glimpses of river in its place. No traversable steps in this lower-left gap. Keep the lowest platform at y290 continuous and exactly where it was. Do not change anything BELOW that platform.
2. ADD its replacement staircase at LOWER RIGHT: a continuous flight rising RIGHT from lower foot near (707,290) to upper landing near (860,163). Every tread must connect to the next; both landings join the exact walking surfaces with an open platform-rim passage. Remove only props directly obstructing this stair.
3. ADD a staircase at UPPER LEFT from the middle bridge to upper quay, rising LEFT from lower foot near (184,163) to upper landing near (25,35). Both ends flush with platform walking surfaces, no blocked rim at top and no floating steps. Move only the torch/crates if they obstruct the flight.
4. NO stairs at upper right. No other stairs or floors. The CENTRAL span x230..655 must remain identical to the source: water, flags, bridge deck, support structure and scenery unchanged.

Ensure the lower flight is unmistakably on the RIGHT and the upper flight unmistakably on the LEFT. Follow the existing side-on game perspective and hand-inked cartoon painting style exactly. No text, arrows, diagram marks or characters. Return only this edited wide crop with the same three platforms and framing.

