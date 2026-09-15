import {fetchAsset} from './asset-loader.js';

// Preload and decode before enabling Start; unlock playback in the Start tap.
export class GameMusic {
  constructor(context) {
    this.context=context;
    this.output=context.createGain();
    this.output.gain.value=0;
    this.output.connect(context.destination);
    this.buffer=null; this.loading=null; this.source=null;
    this.enabled=false; this.active=false; this.offset=0; this.started=0;
  }
  async load() {
    if(this.buffer)return;
    if(!this.loading){
      this.loading=(async()=>{
        const blob=await fetchAsset('assets/game/liu-run-bgm-v1.mp3',{timeout:25000});
        await this.prepare(blob);
      })().finally(()=>{this.loading=null;});
    }
    await this.loading;
  }
  async prepare(blob) {
    if(this.buffer)return;
    let timer;
    try {
      const bytes=await blob.arrayBuffer();
      const buffer=await Promise.race([
        this.context.decodeAudioData(bytes),
        new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('音乐解码超时')),15000);}),
      ]);
      if(!buffer?.length||!buffer.duration)throw new Error('音乐文件无法播放');
      this.buffer=buffer;
    }finally{clearTimeout(timer);}
  }
  async enable() {
    this.enabled=true;
    try {await this.load();this.sync();}
    catch(error){this.enabled=false;this.sync();throw error;}
  }
  unlock() {
    // Run both calls directly inside the tap handler for mobile Web Audio.
    const resumed=this.context.resume();
    const pulse=this.context.createBufferSource();
    pulse.buffer=this.context.createBuffer(1,1,this.context.sampleRate);
    pulse.connect(this.context.destination);pulse.onended=()=>pulse.disconnect();
    pulse.start(0);
    let timer;
    return Promise.race([
      resumed,
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('请再次点击以开启声音')),4000);}),
    ]).then(()=>{
      if(this.context.state!=='running')throw new Error('声音尚未开启，请再点一次');
    }).finally(()=>clearTimeout(timer));
  }
  disable() {this.enabled=false;this.sync();}
  setActive(active) {
    if(this.active===active)return;
    this.active=active;this.sync();
  }
  sync() {
    const now=this.context.currentTime;
    if(this.enabled&&this.active&&this.buffer){
      if(this.source)return;
      const source=this.context.createBufferSource();
      source.buffer=this.buffer;source.loop=true;source.connect(this.output);
      this.started=now;this.source=source;
      this.output.gain.cancelScheduledValues(now);this.output.gain.setValueAtTime(0,now);
      this.output.gain.linearRampToValueAtTime(.65,now+.22);
      source.start(now,this.offset%this.buffer.duration);
    }else if(this.source){
      const source=this.source;this.source=null;
      this.offset=(this.offset+now-this.started)%this.buffer.duration;
      this.output.gain.cancelScheduledValues(now);
      this.output.gain.setTargetAtTime(0,now,.018);
      source.stop(now+.08);source.onended=()=>source.disconnect();
    }
  }
}
