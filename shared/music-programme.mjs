/** Playback decisions stay separate from HTML audio; entering a region does not rewind a track. */
export class MusicProgramme {
  constructor(manifest,heard=[],random=Math.random){this.manifest=manifest;this.heard=new Set(heard);this.failed=new Set();this.random=random;this.bag=[];this.current=null;this.lastId='';}
  choose(region){
    const premiere=this.manifest.seasonal?.[region];
    if(premiere&&!this.heard.has(premiere.id)&&!this.failed.has(premiere.id)){
      if(this.current?.track.id===premiere.id)return this.current;
      return this.current={kind:'seasonal',track:premiere};
    }
    if(this.current)return this.current;
    const tracks=(this.manifest.playlist??[]).filter(t=>!this.failed.has(t.id));
    if(tracks.length){
      this.bag=this.bag.filter(t=>!this.failed.has(t.id));
      if(!this.bag.length){this.bag=[...tracks];for(let i=this.bag.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[this.bag[i],this.bag[j]]=[this.bag[j],this.bag[i]];}if(this.bag.length>1&&this.bag[0].id===this.lastId)[this.bag[0],this.bag[1]]=[this.bag[1],this.bag[0]];}
      const track=this.bag.shift();this.lastId=track.id;return this.current={kind:'playlist',track};
    }
    const src=this.manifest.regions?.[region]??this.manifest.tracks?.music;
    if(src&&!this.failed.has(src))return this.current={kind:'legacy',track:{id:src,title:'背景音乐',src}};
    return null;
  }
  started(selection){if(selection.kind==='seasonal')this.heard.add(selection.track.id);}
  end(selection){if(this.current===selection)this.current=null;}
  fail(selection){this.failed.add(selection.track.id);this.end(selection);}
}
