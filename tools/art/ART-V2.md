# Character redraw and animation handoff

The runtime character sheet is `assets/game/actors-v2.webp`, a new drawing based directly on the approved `assets/reference/zhugong-kuaipao-art-direction.png`. It supersedes the initial generic rounded character interpretation. The original `actors.webp` is preserved. The new runtime sheet is 2048 x 1024, four columns by two rows, 512 x 512 cells, anchor `(256,486)`, in the established order: Liu Bei, Guan Yu, Zhang Fei, Zhuge Liang / allied archer, ordinary Cao soldier, heavy Cao soldier, horse.

The final image uses WebP quality 92 and takes 423078 bytes. Together with the unchanged castle and prop sheets, the image payload is 595752 bytes (581.8 KiB). Individual source bounds and actual scaling are in `tools/art/actors-v2.json`. A full transparent PNG master is in `tools/art/actors-v2-master.png`. Unscaled, transparent mobile-character crops are `liubei-master.png`, `enemy-master.png`, and `enemyHeavy-master.png` in this folder.

## Source and processing

The built-in `image_gen.imagegen` tool was used with the approved scene as the direct edit target. The hero source is `C:/Users/84720/.codex/generated_images/01a0a4f0-11ac-7cc3-bd1c-5e9bee71e77d/exec-386240ea-eb06-4547-a5b0-c6c4b4b7136f.png`. The allied/enemy/horse source is `C:/Users/84720/.codex/generated_images/01a0a4f0-11ac-7cc3-bd1c-5e9bee71e77d/exec-4ed7b0ea-5b42-4ef6-a477-dbd304b3d53f.png`.

Both images were generated on uniform magenta, deliberately avoiding fake checkerboard transparency. `pack-v2.mjs` keys out this known color, removes spill, isolates complete connected character silhouettes, packs them and writes raw RGBA and mapping metadata. PNG encoding and WebP compression use Pillow. White robes, silver blades, white horse hair and facial highlights remain opaque.

## Walking-frame outcome

Three attempts at generated four-frame animation were **rejected**. The first combined sheet repeated the same foreground leg in opposite-contact frames; its correction also changed one soldier's trouser color. Per-character 2 x 2 sheets still repeated that leg pose. No `walks.webp` was produced or used, and these failed frames are not represented as a completed animation.

The main agent implements anatomical cutout animation in `animation.js`. `assets/game/rigs.json` contains the hand-authored near/far leg polygons, hip/knee/ankle joints, outsole heel/toe axes, anti-phase offsets 0 / 0.5, and ground targets for Liu Bei, the ordinary Cao soldier and the heavy Cao soldier. `build-rigs.mjs` stores the original source-coordinate definitions and transforms them using the current atlas metadata.

The original sprite only contains visible portions of each far-side upper thigh. Liu Bei reuses his complete near-leg texture for the far leg at a separate hip and phase; his torso has an explicit silhouette mask to preserve the coat and remove the old legs. The heavy soldier's sword has a protected mask so it stays on the torso and never rotates with a thigh. Foot tracks alternate around a shared center. The user requested frantic cartoon footwork: Liu Bei now cycles 4.6 times faster, ordinary soldiers 2.7 times and heavy soldiers 3 times, with 40% higher foot lift and unchanged gameplay speed. The old contact sheet `rig-cycle.png` records the earlier slower gait. These are articulated two-dimensional cutouts, not hand-drawn four-frame walk cycles.

## Redraw prompt intent

Hero prompt: extract and reconstruct Liu Bei, Guan Yu, Zhang Fei and Zhuge Liang directly from the approved scene; preserve their elongated or angular faces, original exaggerated expressions, long black beards, clothing shapes, restrained ancient palette, textured dark outlines, white/blue Zhuge Liang costume and wind-swept silhouettes. Remove UI, speech bubbles, effects and scenery, reconstruct occluded feet and weapon tips, arrange full bodies in a 2 x 2 sheet on exact #FF00FF, with no generic baby-face redesign.

Troop prompt: extract/reconstruct an allied bowman, original angular mustached Cao sword infantry, bulky round-shield Cao infantry and the original white horse, preserving dark weathered armor, original cartoon faces and muted hand-painted shading; full bodies on exact #FF00FF, no scene or UI, no missing weapons/feet. The full exact accepted and rejected prompts are saved in `tools/art/imagegen-v2-prompts.json`.
