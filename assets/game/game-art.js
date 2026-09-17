// Atlas layout only. Names, effects, costs and unlock rules stay in content.js.
const lootOrder=['line-roar','taunt','hook','spin','gather','wind-wall','signal','spread','lance-hook','line-lance','tether','double-shield','flag-hunter','suppress','command-break','scatter-stones','cage','fold','return-log','wood-drop','sticky','fire-line','tow','shield-break','net','rubble','bell','double-snare','redeploy','lure','smoke'];
export const ART_ATLASES={
  loot:{url:'assets/game/loot-icons-v1.webp',cols:4,rows:8},
  mountain:{url:'assets/game/mountain-props-v1.svg',cols:3,rows:1},
  river:{url:'assets/game/river-props-v1.svg',cols:3,rows:1},
  siege:{url:'assets/game/siege-props-v1.svg',cols:2,rows:1},
  defense:{url:'assets/game/liubei-crouch-v1.webp',cols:1,rows:1},
  tactics:{url:'assets/game/tactic-props-v1.svg',cols:3,rows:1},
  dilu:{url:'assets/game/dilu-v1.webp',cols:3,rows:2},
  caocao:{url:'assets/game/caocao-v1.webp',cols:1,rows:1}
};
export const ART_SPRITES=Object.fromEntries(lootOrder.map((id,tile)=>[id,{atlas:'loot',tile}]));
Object.assign(ART_SPRITES,{
  rockfall:{atlas:'mountain',tile:0},'rockfall-spent':{atlas:'mountain',tile:1},decoy:{atlas:'mountain',tile:2},
  'enemy-boat':{atlas:'river',tile:0},ferry:{atlas:'river',tile:1},'broken-parachute':{atlas:'river',tile:2},
  'fire-barrel':{atlas:'siege',tile:0},'war-gong':{atlas:'siege',tile:1},
  'liubei-crouch':{atlas:'defense',tile:0},
  'lure-prop':{atlas:'tactics',tile:0},'smoke-prop':{atlas:'tactics',tile:1},'redeploy-prop':{atlas:'tactics',tile:2},
  'dilu-wait':{atlas:'dilu',tile:0},'dilu-mounted':{atlas:'dilu',tile:1},
  caocao:{atlas:'caocao',tile:0}
});
export const MOUNT_ART={size:240,footAnchor:470/512,stride:100,frames:['dilu-run-0','dilu-run-1','dilu-run-2','dilu-run-3']};
for(const [i,id]of MOUNT_ART.frames.entries())ART_SPRITES[id]={atlas:'dilu',tile:i+2};
export function artIcon(id,extra=''){
  const sprite=ART_SPRITES[id];if(!sprite)return '';
  const {url,cols,rows}=ART_ATLASES[sprite.atlas],x=cols===1?0:sprite.tile%cols/(cols-1)*100,y=rows===1?0:Math.floor(sprite.tile/cols)/(rows-1)*100;
  return '<span class="game-art '+extra+'" aria-hidden="true" style="background-image:url('+url+');background-size:'+cols*100+'% '+rows*100+'%;background-position:'+x+'% '+y+'%"></span>';
}
export function drawArt(ctx,images,id,x,y,width,height=width){
  const sprite=ART_SPRITES[id];if(!sprite)return false;
  const atlas=ART_ATLASES[sprite.atlas],img=images[sprite.atlas];if(!img)return false;
  const sw=img.width/atlas.cols,sh=img.height/atlas.rows;
  ctx.drawImage(img,sprite.tile%atlas.cols*sw,Math.floor(sprite.tile/atlas.cols)*sh,sw,sh,x,y,width,height);return true;
}
export function battleArtKeys(level,deck){
  return [...new Set(['dilu',...(level.mount?[level.mount.id]:[]),...(level.mechanisms||[]).map(m=>ART_SPRITES[m.id]?.atlas).filter(Boolean),...(level.gate||level.boss?['river']:[]),...(deck.includes('smoke')?['tactics']:[]),...(level.caocao?['caocao']:[])])];
}
