import measurements from '../../asset-sources/metadata/audio-loudness.json';

export const MEDIA_VOLUME=.95;
let context:AudioContext|undefined,limiter:DynamicsCompressorNode|undefined;
const routes=new WeakMap<HTMLMediaElement,{source:MediaElementAudioSourceNode;gain:GainNode;connected:boolean}>();
const levels=measurements as Record<string,{lufs:number}>;
function normalization(media:HTMLMediaElement){
  const url=new URL(media.currentSrc||media.src,location.href);
  const file=url.pathname.replace(/^\/assets\/modules\/([^/]+)\//,'modules/$1/assets/');
  const level=levels[file]?.lufs;
  return Number.isFinite(level)?Math.min(8,Math.max(.2,10**((-14-level)/20))):1;
}
/** Preserve recordings, calibrate their playback loudness, and catch transient peaks. */
export function connectMedia(media:HTMLMediaElement){
  if(media.srcObject||!media.getAttribute('src'))return;
  if(!context){context=new AudioContext();limiter=context.createDynamicsCompressor();limiter.threshold.value=-1.5;limiter.knee.value=0;limiter.ratio.value=20;limiter.attack.value=.002;limiter.release.value=.12;limiter.connect(context.destination);}
  let route=routes.get(media);
  if(!route){
    route={source:context.createMediaElementSource(media),gain:context.createGain(),connected:false};routes.set(media,route);
    media.addEventListener('loadedmetadata',()=>{const r=routes.get(media);if(r&&context)r.gain.gain.setTargetAtTime(normalization(media),context.currentTime,.04);});
    media.addEventListener('play',()=>{connectMedia(media);void context?.resume().catch(()=>{});});
  }
  route.gain.gain.setValueAtTime(normalization(media),context.currentTime);
  if(!route.connected){route.source.connect(route.gain);route.gain.connect(limiter!);route.connected=true;}
  void context.resume().catch(()=>{});
}
export function disconnectMedia(media:HTMLMediaElement){const route=routes.get(media);if(route?.connected){route.source.disconnect();route.gain.disconnect();route.connected=false;}}
