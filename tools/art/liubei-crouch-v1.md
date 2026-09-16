# 刘备抱头蹲下

生成方式：内置 imagegen；参考 actors-v2.webp 左上刘备，保持国漫形象。

运行素材：assets/game/liubei-crouch-v1.webp，仅第三关进入时加载。原始姿势图与背景修正版保存在本目录；运行图使用现有色键处理方式保留角色轮廓，脚底对齐 512 画布的 y=486。打包：node tools/art/pack-crouch.mjs。

## 姿势提示词

Use case: identity-preserve. Asset type: one 2D game character sprite, 1024x1024 square. Reference: ONLY the frightened Liu Bei in the TOP LEFT cell of the supplied character atlas. Draw THAT SAME Liu Bei in a new pose: squatting low with both knees deeply bent, both boots on the ground, back hunched and head tucked down, BOTH hands covering the top/back of his head, elbows lifted, visibly frightened but comical expression, looking toward the RIGHT. Preserve his exact recognizable adult face, huge expressive eyes and eyebrows, small moustache/goatee, black topknot with yellow tie, pale yellow-green tunic with white cuffs, dark green lower robe/pants and brown boots. Chinese guoman/manhua game sprite style: bold dark ink outlines, lively exaggerated proportions, crisp warm cel shading and painted fabric details, not realistic, not 3D. Full body, one isolated character centered, all fingers, hair and boots inside frame with at least 10 percent empty margin. Squatting silhouette should be short and wide, about 600px high; boots baseline around y=900. No horse, weapons, other characters, environment, text, watermark, ground shadow, frame, checkerboard or decorative symbols. Genuinely transparent background, preserve alpha. If actual transparency cannot be output, use perfectly flat chroma magenta RGB(255,0,255) outside the character for our sprite atlas packing pipeline; absolutely no checkerboard. Character identity and clothing must match the top-left reference, only change his pose.

## 背景修正提示词

Production sprite background correction only. Preserve this exact crouching Liu Bei character, pose, face, clothing, all black hair/ink outlines and every body pixel. Change ONLY the empty black backdrop outside the character and the empty gaps between his limbs to a perfectly uniform solid chroma magenta RGB(255,0,255). This is an intentional sprite packing key. No transparency simulation, no black backdrop, no checkerboard, no shadows on the backdrop, no gradients or texture. Keep the whole character inside the frame with existing margins. Do not redraw or change the character. Magenta must only be in the background, not on the character. Output one clean square image.
