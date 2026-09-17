// All input and rendering share this logical coordinate space, including CSS rotation.
export function fitViewport(width, height, insets = {}, rotated = false) {
  const {left=0, right=0, top=0, bottom=0} = insets;
  const availableWidth = Math.max(1, width-left-right);
  const availableHeight = Math.max(1, height-top-bottom);
  const scale = Math.min((rotated ? availableHeight : availableWidth)/1440,
    (rotated ? availableWidth : availableHeight)/810);
  return {width:1440*scale, height:810*scale,
    left:left+availableWidth/2, top:top+availableHeight/2};
}

export function scenePoint(clientX, clientY, rect, rotated = false) {
  return rotated
    ? {x:(clientY-rect.top)/rect.height*1440, y:(1-(clientX-rect.left)/rect.width)*810}
    : {x:(clientX-rect.left)/rect.width*1440, y:(clientY-rect.top)/rect.height*810};
}

export function renderSize(width, height, deviceRatio = 1, quality = 1) {
  const ratio = Math.min(deviceRatio, 2, Math.sqrt(2600000/(width*height)))*Math.max(.7,Math.min(1,quality));
  return {width:Math.max(1,Math.round(width*ratio)), height:Math.max(1,Math.round(height*ratio))};
}

// Paint pacing only: simulation, input coordinates and camera zoom are unchanged.
export class FrameBudget {
  constructor(){this.fps=60;this.quality=1;this.lastPaint=-Infinity;this.windowStart=0;this.work=0;this.gaps=0;this.samples=0;this.slow=0;this.fast=0;}
  due(now,active){
    const interval=1000/(active?this.fps:15),elapsed=now-this.lastPaint;
    if(elapsed<interval-.5)return false;
    this.lastPaint=!Number.isFinite(elapsed)||elapsed>100?now:this.lastPaint+Math.max(1,Math.floor((elapsed+.5)/interval))*interval;
    return true;
  }
  sample(cost,now,callbackGap,active){
    if(!active){this.windowStart=0;this.work=0;this.gaps=0;this.samples=0;this.slow=0;this.fast=0;return false;}
    if(!this.windowStart)this.windowStart=now;
    this.work+=cost;this.gaps+=callbackGap;this.samples++;
    if(now-this.windowStart<1000)return false;
    const work=this.work/this.samples,gap=this.gaps/this.samples;
    this.windowStart=now;this.work=0;this.gaps=0;this.samples=0;
    this.slow=work>11||gap>23?this.slow+1:0;
    this.fast=work<9&&gap<20?this.fast+1:0;
    if(this.fps===60&&this.slow>=2){this.fps=30;this.quality=.78;this.slow=0;this.fast=0;return true;}
    if(this.fps===30&&this.fast>=8){this.fps=60;this.quality=.88;this.slow=0;this.fast=0;return true;}
    return false;
  }
}

// Camera values are world coordinates; HUD and cards stay outside this layer.
export class BattleCamera {
  constructor(){this.x=720;this.y=530;this.width=1;this.height=1;this.scale=1;this.baseScale=1;this.detail=false;this.follow=true;this.initialized=false;}
  resize(width,height,compact=false){
    this.width=Math.max(1,width);this.height=Math.max(1,height);
    this.fit=Math.min(this.width/1440,this.height/645);
    this.detailZoom=Math.max(1.4,Math.min(2.8,.55/this.fit));
    if(!this.initialized){this.detail=compact;this.initialized=true;}
    this.baseScale=this.fit*(this.detail?this.detailZoom:1);
    this.scale=this.baseScale;this.clamp();
  }
  clamp(){
    const hx=this.width/(2*this.scale),hy=this.height/(2*this.scale);
    this.x=hx>=720?720:Math.max(hx,Math.min(1440-hx,this.x));
    this.y=hy>=322.5?382.5:Math.max(60+hy,Math.min(705-hy,this.y));
  }
  get offset(){return{x:this.width/2-this.x*this.scale,y:this.height/2-this.y*this.scale};}
  worldPoint(x,y){return{x:this.x+(x-this.width/2)/this.scale,y:this.y+(y-this.height/2)/this.scale};}
  inView(x,y,pad=80){
    const hx=this.width/(2*this.scale),hy=this.height/(2*this.scale);
    return x>this.x-hx+pad&&x<this.x+hx-pad&&y>this.y-hy+pad&&y<this.y+hy-pad;
  }
  edgeIndicator(x,y,insets={}){
    const offset=this.offset,px=x*this.scale+offset.x,py=y*this.scale+offset.y;
    if(px>=0&&px<=this.width&&py>=0&&py<=this.height)return null;
    const left=Math.min(this.width/2,insets.left||0),right=Math.max(left,this.width-(insets.right||0));
    const top=Math.min(this.height/2,insets.top||0),bottom=Math.max(top,this.height-(insets.bottom||0));
    const cx=(left+right)/2,cy=(top+bottom)/2,dx=px-cx,dy=py-cy;
    const reach=Math.min(dx?Math.max(1,(right-left)/2)/Math.abs(dx):Infinity,dy?Math.max(1,(bottom-top)/2)/Math.abs(dy):Infinity);
    return{x:Math.max(left,Math.min(right,cx+dx*reach)),y:Math.max(top,Math.min(bottom,cy+dy*reach)),angle:Math.atan2(dy,dx)*180/Math.PI};
  }
  pan(dx,dy){this.follow=false;this.x-=dx/this.scale;this.y-=dy/this.scale;this.clamp();}
  focus(x,y){this.x=x;this.y=y-85;this.follow=true;this.scale=this.baseScale;this.clamp();}
  track(x,y,dt){const k=1-Math.exp(-dt*4);this.x+=(x-this.x)*k;this.y+=(y-85-this.y)*k;this.scale+=(this.baseScale-this.scale)*k;this.clamp();}
  framePair(ax,ay,bx,by){
    const pad=140;
    let scale=this.baseScale;
    for(let i=0;i<10;i++){
      const needW=Math.abs(bx-ax)+pad*2,needH=Math.abs(by-ay)+pad*2;
      scale=Math.min(this.baseScale,this.width/Math.max(needW,1),this.height/Math.max(needH,1),scale);
      scale=Math.max(this.fit*0.45,scale);
      this.scale=scale;this.x=(ax+bx)/2;this.y=(ay+by)/2-40;this.clamp();
      if(this.inView(ax,ay,48)&&this.inView(bx,by,48))break;
      scale*=0.86;
    }
  }
  toggleZoom(){this.detail=!this.detail;this.baseScale=this.fit*(this.detail?this.detailZoom:1);this.scale=this.baseScale;this.clamp();}
}
