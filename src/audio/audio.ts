import type {EventBus} from '../core/events';
import type {MusicManifest,MusicTrack} from '../core/types';
import {MusicProgramme} from '../../shared/music-programme.mjs';
type Selection={kind:string;track:MusicTrack};
type Deck={element:HTMLAudioElement;source:MediaElementAudioSourceNode;gain:GainNode;selection:Selection;started:boolean};
const journeyKey='xiangmeta:seasonal-music:v1';
/** No media element or MP3 request until a deliberate sound-button click. */
export class AudioSystem {
  private context?:AudioContext;private muted=true;private voices=new Set<OscillatorNode>();
  private programme:MusicProgramme;private region='nexus';private active?:Deck;private outgoing?:Deck;
  private fadeTimer?:ReturnType<typeof setTimeout>;private disposed=false;private events=new AbortController();
  private unsubscribers:(()=>void)[];
  constructor(bus:EventBus,manifest:MusicManifest={playlist:[],seasonal:{}},private report=(text:string,playing:boolean)=>{void text;void playing;}){
    let heard:string[]=[];try{const value=JSON.parse(sessionStorage.getItem(journeyKey)??'[]');if(Array.isArray(value))heard=value.filter(x=>typeof x==='string');}catch{}
    this.programme=new MusicProgramme(manifest,heard);
    this.unsubscribers=[bus.on('sound',kind=>this.tone(kind==='ui'?540:720,.02,.18)),
      bus.on('melody',notes=>notes.slice(0,8).forEach((note,i)=>this.tone(note,.035,1.3,i*.18))),
      bus.on('region',id=>{this.region=id;if(!this.muted&&!document.hidden)void this.play().catch(()=>this.report('点击声音按钮重试',false));})];
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){this.pause();void this.context?.suspend();}
      else if(!this.muted){void this.context?.resume();void this.play().catch(()=>this.report('点击声音按钮重试',false));}
    },{signal:this.events.signal});
  }
  async setMuted(muted:boolean){
    this.muted=muted;
    if(muted){this.pause();this.voices.forEach(v=>v.stop());this.voices.clear();this.report('音乐已暂停 · 点击 ♪ 继续',false);await this.context?.suspend();return;}
    this.context??=new AudioContext();
    // Both calls run inside the click's activation, before any await.
    const resume=this.context.resume(),play=this.play();
    try{await Promise.all([resume,play]);}
    catch(error){this.muted=true;this.pause();this.report('音乐暂不可用 · 点击 ♪ 重试',false);throw error;}
  }
  private pause(){this.active?.element.pause();this.clearOutgoing();}
  private clearOutgoing(){clearTimeout(this.fadeTimer);if(this.outgoing)this.release(this.outgoing);this.outgoing=undefined;}
  private release(deck:Deck){
    deck.element.onended=null;deck.element.onerror=null;deck.element.pause();
    deck.element.removeAttribute('src');deck.element.load();deck.source.disconnect();deck.gain.disconnect();
  }
  private level(deck:Deck){return .62*(deck.selection.track.gain??1);}
  private async play():Promise<void>{
    if(this.muted||this.disposed||document.hidden||!this.context)return;
    const selection=this.programme.choose(this.region) as Selection|null;
    if(!selection){this.report('音乐暂不可用 · 风铃与音效已开启',false);return;}
    if(this.active?.selection===selection){
      const deck=this.active;
      if(!deck.element.paused)return;
      await deck.element.play();
      if(this.active===deck&&!this.muted&&!document.hidden)this.started(deck);
      return;
    }
    this.clearOutgoing();
    const ctx=this.context,element=new Audio();element.preload='none';element.src=selection.track.src;
    const source=ctx.createMediaElementSource(element),gain=ctx.createGain();source.connect(gain);gain.connect(ctx.destination);gain.gain.value=0;
    const deck:Deck={element,source,gain,selection,started:false};
    this.outgoing=this.active;this.active=deck;
    // Stale pending loads never mark a seasonal premiere heard.
    element.onended=()=>{if(this.active!==deck)return;this.programme.end(selection);this.active=undefined;this.release(deck);void this.play().catch(()=>{});};
    const failed=()=>{if(this.active!==deck)return;this.programme.fail(selection);this.active=this.outgoing;this.outgoing=undefined;this.release(deck);void this.play().catch(()=>{});};
    element.onerror=failed;
    this.report(`正在载入 · ${selection.track.title}`,false);
    try{
      await element.play();
      if(this.active!==deck||this.muted||this.disposed||document.hidden)return;
      this.started(deck);
      if(this.outgoing){
        const old=this.outgoing;old.gain.gain.cancelScheduledValues(ctx.currentTime);
        old.gain.gain.setValueAtTime(old.gain.gain.value,ctx.currentTime);old.gain.gain.linearRampToValueAtTime(0,ctx.currentTime+1.2);
        this.fadeTimer=setTimeout(()=>{if(this.outgoing===old)this.clearOutgoing();},1300);
      }
    }catch(error){
      if(this.active!==deck||this.muted||this.disposed||document.hidden)return;
      if((error as DOMException).name==='NotAllowedError')throw error;
      failed();
    }
  }
  private started(deck:Deck){
    const ctx=this.context!;deck.gain.gain.cancelScheduledValues(ctx.currentTime);
    deck.gain.gain.setValueAtTime(deck.gain.gain.value,ctx.currentTime);
    deck.gain.gain.linearRampToValueAtTime(this.level(deck),ctx.currentTime+.8);
    if(!deck.started){deck.started=true;this.programme.started(deck.selection);try{sessionStorage.setItem(journeyKey,JSON.stringify([...this.programme.heard]));}catch{}}
    this.report(`${deck.selection.kind==='seasonal'?'四季':'BGM'} · ${deck.selection.track.title}`,true);
  }
  get snapshot(){
    return {muted:this.muted,region:this.region,track:this.active?.selection.track.id??null,time:this.active?.element.currentTime??0,
      playing:!!this.active&&!this.active.element.paused,heard:[...this.programme.heard],context:this.context?.state??'uninitialized'};
  }
  private tone(frequency:number,volume:number,duration:number,delay=0){
    if(this.muted||!this.context)return;
    const ctx=this.context,voice=ctx.createOscillator(),gain=ctx.createGain(),start=ctx.currentTime+delay;
    voice.type='sine';voice.frequency.value=frequency;gain.gain.setValueAtTime(.0001,start);
    gain.gain.linearRampToValueAtTime(volume,start+.018);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    voice.connect(gain);gain.connect(ctx.destination);this.voices.add(voice);voice.start(start);voice.stop(start+duration+.02);
    voice.onended=()=>{this.voices.delete(voice);voice.disconnect();gain.disconnect();};
  }
  dispose(){this.disposed=true;this.muted=true;this.events.abort();this.unsubscribers.forEach(f=>f());this.clearOutgoing();if(this.active)this.release(this.active);this.active=undefined;this.voices.forEach(v=>v.stop());this.voices.clear();void this.context?.close();}
}
