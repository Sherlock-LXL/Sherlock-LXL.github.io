import {gardenAccents} from './garden-accents';
import {regionTexture,loadRegionTextures,configurePreviews,readyPreviews,textureStatus} from './lazy-texture';
import {islandFoundation} from './island-foundation';
import {renderSettings} from './render-settings';
import {regionLandmark} from './region-landmarks';
import {TravelerEffects} from './traveler-effects';
import {WorldResonance} from './world-resonance';
import {WorldWhispers} from './world-whispers';
import {worldFeatures} from './features';
import {bridgeLightSpan} from '../../shared/bridge-joints.mjs';
import * as T from 'three';
import {exhibitPoint,placedCollider} from '../../shared/exhibit-layout.mjs';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildExhibit,material,mesh } from './architecture';
import { dressRegion,terminal,type Obstacle } from './scenery';
import { Environment } from './environment';
import {buildHarbor} from './harbor';
import {harbor} from '../../shared/harbor.mjs';
import {surfaceDetail} from './surfaces';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import { buildHub,nightLight } from './hub';
import { batchStatic } from './optimizer';
import { Memories } from './memories';
import { Signatures } from './signatures';
import { PhotoCamera,exportPostcard } from './photo';
import {moduleExtensions} from './module-contract';
import {horizons} from './horizons';
import { groundTexture } from './terrain';
import {buildGardenRoutes} from './garden-routes';
import {Seasons} from './seasons';
import {mountainSurface,mountainScenery} from './mountain';
import {groundHeight} from '../../shared/terrain-height.mjs';
import { Discoveries } from './discoveries';
import { discoveries } from '../core/types';
import { exhibitColliders } from './colliders';
import { createWalker,advanceWalker } from '../../shared/locomotion.mjs';
import { LookControls } from './look-controls';
import { walkable } from '../../shared/navigation.mjs';
import { EYE_HEIGHT,nearestStation,lookAngles } from '../../shared/interaction.mjs';
import {nearbyActions,actionHint,type InteractionKey} from '../core/nearby-actions';
import type { Catalog,Exhibit,ArtworkInteraction } from '../core/types';
import type { EventBus } from '../core/events';
type Station={id:string;x:number;z:number;approach:{x:number;z:number}};
export class World {
  private scene=new T.Scene();private camera=new T.PerspectiveCamera(68,1,.08,900);
  private mapCamera=new T.PerspectiveCamera(43,1,.1,900);
  private renderer!:T.WebGLRenderer;private orbit!:OrbitControls;private look!:LookControls;
  private player=createWalker();private jumpRequested=false;private mode:'first-person'|'map'='first-person';
  private objects=new Map<string,T.Group>();private obstacles:Obstacle[]=[];private stations:Station[]=[];
  private artworks:ArtworkInteraction[]=[];private nearArtwork:ArtworkInteraction|null=null;
  private harborScene!:ReturnType<typeof buildHarbor>;private nearHarbor=false;
  private artworkRay=new T.Raycaster();private aim=new T.Vector2();
  private labels:{element:HTMLButtonElement;position:T.Vector3;id:string}[]=[];
  private keys=new Set<string>();private touchSide=0;private touchForward=0;private paused=false;private near:Exhibit|null=null;private region='';
  private guide=new T.Group();private selected!:T.Mesh;private environment!:Environment;
  private clock=new T.Clock();private time=0;private frame=0;private disposed=false;
  private observer!:ResizeObserver;private events=new AbortController();private disposers:(()=>void)[]=[];
  private parameters=new Map<string,number>();private mixers:T.AnimationMixer[]=[];private projected=new T.Vector3();
  private wonders!:Discoveries;
  private traveler?:TravelerEffects;private resonance?:WorldResonance;private whispers?:WorldWhispers;
  private seasons!:Seasons;
  private memories!:Memories;private signatures!:Signatures;private photo!:PhotoCamera;private photoTime={hour:9,cycling:true};private reduced=matchMedia('(prefers-reduced-motion: reduce)');
  private extensions=new Map<string,ReturnType<typeof moduleExtensions>>();
  private width=1;private height=1;private shadowTime=0;private labelTime=0;private statsTime=0;private lowQuality=false;
  private constructor(private host:HTMLElement,private data:Catalog,private bus:EventBus){}
  static async create(host:HTMLElement,data:Catalog,bus:EventBus,found:ReadonlySet<string>,memories:ReadonlySet<string>,progress:(done:number,total:number,label:string)=>void){
    const world=new World(host,data,bus),total=data.regions.length+data.modules.length+4;let done=0;
    try{
      configurePreviews(data.imagePreviews);
      for(const label of world.build(found,memories)){
        progress(++done,total,label);
        // Yield across a paint, so progress stays visible during procedural construction.
        await new Promise<void>(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
      }
      await readyPreviews((loaded,count)=>progress(done+(count?loaded/count:1),total,`封面与摄影 ${loaded}/${count}`));
      host.dataset.previewReady=String(textureStatus().filter(t=>t.ready).length);
      progress(total,total,'准备就绪');
      return world;
    }catch(error){world.dispose();throw error;}
  }
  private *build(found:ReadonlySet<string>,memories:ReadonlySet<string>){
    const host=this.host,data=this.data,bus=this.bus;
    this.renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,renderSettings.pixelRatio));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.autoUpdate=false;
    this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.0;
    const canvas=this.renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label',matchMedia('(pointer: coarse)').matches?'第一人称世界。使用左下方向键移动，拖动画面环顾，右下按钮跳跃，靠近展台后点击浮窗交互。':'第一人称世界。WASD 行走，空格跳跃，点击或拖动环顾，F 打开 GitHub 或展览，E 查看项目，R 打开 Demo、音乐或 MV，G 探索装置。');host.append(canvas);
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.setPaused(true);host.dispatchEvent(new CustomEvent('world-context-lost'));});
    this.photo=new PhotoCamera(canvas);
    host.dataset.view=this.mode;host.dataset.eyeHeight=String(EYE_HEIGHT);
    this.environment=new Environment(this.scene,data.regions);
    const lightRoom=new RoomEnvironment(),pmrem=new T.PMREMGenerator(this.renderer),reflection=pmrem.fromScene(lightRoom,.06);
    this.scene.environment=reflection.texture;this.scene.environmentIntensity=.24;lightRoom.dispose();pmrem.dispose();this.disposers.push(()=>reflection.dispose());
    for(const place of horizons)this.label('◇ '+place.title,new T.Vector3(...place.target),()=>bus.emit('horizon',place.id),'future-label',place.id);
    // Map inertia and pointer handlers can never write into the walking camera.
    this.orbit=new OrbitControls(this.mapCamera,canvas);this.orbit.enabled=false;this.orbit.enableDamping=true;
    this.orbit.minDistance=25;this.orbit.maxDistance=180;this.orbit.maxPolarAngle=Math.PI/2.25;
    this.look=new LookControls(canvas,()=>this.mode==='first-person'&&!this.paused,bus);
    this.island(0,0,9,'#e6d5b8');
    yield '中央枢纽与海面';
    for(const r of data.regions){
      const exhibits=data.modules.filter(m=>m.region===r.id);
      const [x,z]=r.position;this.island(x,z,r.radius,r.color,exhibits,r);
      // Bridge ends tuck below the island surface, never sharing its depth.
      const distance=Math.hypot(x,z),start=8.4,end=distance-r.radius+.6,length=end-start,mid=(start+end)/2;
      const bridge=mesh(this.scene,new T.BoxGeometry(5.6,.4,length),material('#efdfc2',.82,.03,'wood'),x/distance*mid,-.24,z/distance*mid);bridge.rotation.y=Math.atan2(x,z);
      // Plank seams: subtle grooves along the deck.
      const seamsPlank=material('#ba9f78',.9,0,'wood');
      for(let p=.45;p<length-.35;p+=.7)mesh(bridge,new T.BoxGeometry(5.36,.006,.025),seamsPlank,0,.203,p-length/2).castShadow=false;
      const rail=material('#a3bbb0',.5,.1),iron=material('#5c6b70',.5,.2,'metal'),glow=nightLight(r.color),stoneLight=material('#dfd2b3',.9,.02,'stone');
      // Supporting piers (down into the sea).  Keep clear of the island edge so the arches
      // never slice through the shoreline terrain.
      const safeMargin=2.4;
      const spanStart=-length/2+safeMargin,spanEnd=length/2-safeMargin,span=Math.max(0,spanEnd-spanStart);
      const pierCount=Math.max(0,Math.floor(span/4.5));
      for(let i=1;i<=pierCount;i++){
        const pz=spanStart+span*(i/(pierCount+1));
        for(const side of [-1,1]){
          mesh(bridge,new T.CylinderGeometry(.26,.36,6.4,10),stoneLight,side*2.5,-3.2,pz);
          mesh(bridge,new T.CylinderGeometry(.38,.42,.3,12),iron,side*2.5,-.4,pz).castShadow=false;
        }
        const archPoints=Array.from({length:17},(_,j)=>{const u=j/16;return new T.Vector3((u-.5)*5,-Math.sin(u*Math.PI)*2.0-.4,pz);});
        mesh(bridge,new T.TubeGeometry(new T.CatmullRomCurve3(archPoints),22,.09,8,false),iron);
      }
      for(const side of [-1,1]){
        const line=bridgeLightSpan(distance,r.radius);
        // Top handrail.
        mesh(bridge,new T.BoxGeometry(.09,.09,line.length),rail,side*2.65,1.15,line.mid-mid);
        // Mid rail for safer silhouette.
        mesh(bridge,new T.BoxGeometry(.045,.045,line.length),rail,side*2.65,.78,line.mid-mid).castShadow=false;
        const seam=mesh(bridge,new T.BoxGeometry(.035,.024,line.length),glow,side*2.65,.285,line.mid-mid);seam.name='bridge-light-seam';seam.castShadow=false;
        // Balusters, denser.
        for(let p=line.start+.55;p<line.end-.55;p+=1.1){
          mesh(bridge,new T.CylinderGeometry(.038,.04,.95,10),rail,side*2.65,.67,p-mid);
          // Topping bronze cap.
          mesh(bridge,new T.SphereGeometry(.055,8,6),iron,side*2.65,1.17,p-mid).castShadow=false;
        }
        // Lamp posts every 5m.
        for(let p=line.start+1.5;p<line.end-1.5;p+=5){
          mesh(bridge,new T.CylinderGeometry(.06,.09,1.7,10),iron,side*2.78,.72,p-mid);
          mesh(bridge,new T.BoxGeometry(.5,.05,.05),iron,side*(2.78-.25),1.6,p-mid);
          mesh(bridge,new T.SphereGeometry(.14,12,10),glow,side*(2.78-.5),1.6,p-mid).castShadow=false;
          mesh(bridge,new T.ConeGeometry(.17,.12,10),iron,side*(2.78-.5),1.74,p-mid);
        }
      }
      this.disposers.push(batchStatic(bridge));
      const scenery=r.terrain?mountainScenery(r,exhibits,this.obstacles):dressRegion(r,exhibits,this.obstacles);this.scene.add(scenery);this.disposers.push(batchStatic(scenery));
      const landmark=regionLandmark(r);
      if(landmark){
        landmark.root.position.set(r.position[0],0,r.position[1]);this.scene.add(landmark.root);this.disposers.push(batchStatic(landmark.root));
        for(const c of landmark.colliders)this.obstacles.push({...c,x:r.position[0]+c.x,z:r.position[1]+c.z});
      }
      const strip=mesh(this.scene,new T.TorusGeometry(r.radius-.28,.027,6,96),glow,x,.045,z);strip.rotation.x=-Math.PI/2;strip.castShadow=false;
      this.label(r.english,new T.Vector3(x,1,z+12),()=>this.focusRegion(r.id),'region-label');
      yield r.title;
    }
    for(const m of data.modules){
      const r=data.regions.find(r=>r.id===m.region)!;const x=r.position[0]+m.position[0],z=r.position[1]+m.position[1];
      let extension:ReturnType<typeof moduleExtensions>|undefined;
      try{extension=moduleExtensions(m,r);if(extension.scene&&!(extension.scene.root instanceof T.Group))throw new Error('scene.root must be a THREE.Group');this.extensions.set(m.id,extension);}catch(error){console.warn(`Module scene ${m.id} unavailable; using preset.`,error);extension=undefined;}
      const elevation=groundHeight(x,z,data.regions);const group=extension?.scene?.root??buildExhibit(m.visual,r.color);group.position.set(x,elevation,z);this.scene.add(group);this.objects.set(m.id,group);
      group.rotation.y=(m.rotation??0)*Math.PI/180;
      if(m.visual==='gallery')this.galleryArt(group,m);
      if(m.visualAsset&&!extension?.scene)this.loadAsset(group,m.visualAsset);
      else if(!extension?.scene)this.disposers.push(batchStatic(group));
      this.obstacles.push(...(extension?.scene?.colliders??exhibitColliders(m.visual,0,0)).map(o=>{const p=placedCollider(m,o);return {...p,x:p.x+r.position[0],z:p.z+r.position[1],height:(o.height??Infinity)+elevation,...(p.segment?{segment:p.segment.map((n:number,i:number)=>n+r.position[i%2]) as [number,number,number,number]}:{})};}));
      for(const work of extension?.scene?.artworks??[]){const p=exhibitPoint(m,...work.position),a=exhibitPoint(m,...work.approach);this.artworks.push({id:`${m.id}--${work.id}`,module:m,label:work.label,x:p.x+r.position[0],z:p.z+r.position[1],approach:{x:a.x+r.position[0],z:a.z+r.position[1]},action:work.action});}
      const front=exhibitPoint(m,0,4.35),approach=exhibitPoint(m,0,6.55),station={id:m.id,x:r.position[0]+front.x,z:r.position[1]+front.z,approach:{x:r.position[0]+approach.x,z:r.position[1]+approach.z}};this.stations.push(station);
      const stationConsole=terminal(m.wayfinding?.title??m.title,r.color,actionHint(nearbyActions(m)));stationConsole.name=`station-${m.id}`;stationConsole.position.set(station.x,groundHeight(station.x,station.z,data.regions),station.z);this.scene.add(stationConsole);
      stationConsole.rotation.y=(m.rotation??0)*Math.PI/180;
      this.disposers.push(batchStatic(stationConsole));
      this.obstacles.push({x:station.x,z:station.z,radius:.65,height:groundHeight(station.x,station.z,data.regions)+1.85});
      this.label(m.title,new T.Vector3(station.x,elevation+2.25,station.z),()=>this.bus.emit('select',m),'exhibit-label',m.id);
      yield m.portfolio?.name??m.title;
    }
    this.harborScene=buildHarbor(this.scene,this.obstacles);this.disposers.push(()=>this.harborScene.dispose());
    this.label('⚓ 海风港口',new T.Vector3(0,-1.7,26.5),()=>bus.emit('harbor',undefined),'harbor-label','harbor');
    const hub=buildHub();this.scene.add(hub);this.disposers.push(batchStatic(hub));
    this.obstacles.push({x:0,z:0,radius:2.6,height:3.1});
    // Four hub piers at distance ~1.78 — slender pillars, not full-radius wall.
    for(let i=0;i<4;i++){const a=i/4*Math.PI*2;this.obstacles.push({x:Math.sin(a)*1.78,z:Math.cos(a)*1.78,radius:.42,height:2.9});}
    mesh(this.guide,new T.SphereGeometry(.42,32,20),nightLight('#bae3d1'));this.guide.position.set(0,9.5,0);this.scene.add(this.guide);
    for(const angle of [-.45,.45]){const orbit=mesh(this.guide,new T.TorusGeometry(.82,.027,8,64),material('#c8b690',.3,.3));orbit.rotation.x=Math.PI/2;orbit.rotation.y=angle;}
    this.label('✦ 世界向导',new T.Vector3(0,10.4,0),()=>document.dispatchEvent(new CustomEvent('open-guide')),'guide-label');
    this.selected=mesh(this.scene,new T.TorusGeometry(.87,.045,6,48),new T.MeshBasicMaterial({color:'#ddffc3'}),0,.13);this.selected.rotation.x=-Math.PI/2;this.selected.visible=false;
    const wonderEntries=discoveries(data.regions);
    if(worldFeatures.worldResonance){this.resonance=new WorldResonance(hub,data.regions,wonderEntries,bus,found);this.disposers.push(()=>this.resonance?.dispose());}
    if(worldFeatures.travelerEffects){this.traveler=new TravelerEffects(this.scene,data);this.disposers.push(()=>this.traveler?.dispose());}
    if(worldFeatures.worldWhispers)this.whispers=new WorldWhispers(bus);
    this.wonders=new Discoveries(this.scene,wonderEntries,this.obstacles,bus,found);this.disposers.push(()=>this.wonders.dispose());
    const garden=buildGardenRoutes(this.scene,data,this.obstacles);this.disposers.push(garden.release);
    this.seasons=new Seasons(this.scene,data,this.obstacles);this.disposers.push(()=>this.seasons.dispose());
    this.memories=new Memories(this.scene,data,this.obstacles,bus,memories);this.signatures=new Signatures(this.scene,data);
    const accents=gardenAccents(this.scene,data,this.obstacles,[...this.memories.entries,...this.artworks.map(a=>a.approach),...this.stations.map(s=>s.approach)]);this.disposers.push(accents.release);
    this.seasons.settleSnow(data,this.obstacles,[...this.memories.entries,...this.artworks.map(a=>a.approach),...this.stations.map(s=>s.approach)]);
    yield '步道、记忆与四季';
    this.environment.collectLights();this.renderer.shadowMap.needsUpdate=true;
    this.disposers.push(bus.on('interact',m=>this.runHook(m.id,'onInteract')));
    this.player=createWalker(5.4,5.4,this.data.regions);
    Object.assign(this.look,lookAngles(5.4,5.4,-1.5,-1));this.look.pitch=.04;this.syncCamera();
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.resize();
    const options={signal:this.events.signal};
    window.addEventListener('keydown',event=>{
      if(this.paused||(event.target instanceof Element&&event.target.closest('input,textarea,select,dialog')))return;
      if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyF','Space'].includes(event.code))event.preventDefault();
      this.keys.add(event.code);
      if(['KeyF','KeyE','KeyR'].includes(event.code)&&!event.repeat&&this.mode==='first-person'){event.preventDefault();this.interactExhibit(event.code.slice(3) as InteractionKey);}
      if(event.code==='KeyG'&&!event.repeat){event.preventDefault();this.interactDiscovery();}
      if(event.code==='Space'&&!event.repeat&&this.mode==='first-person')this.jumpRequested=true;
    },options);
    window.addEventListener('keyup',e=>this.keys.delete(e.code),options);window.addEventListener('blur',()=>{this.keys.clear();this.touchSide=this.touchForward=0;this.jumpRequested=false;},options);
    document.addEventListener('visibilitychange',()=>{if(document.hidden){this.keys.clear();this.touchSide=this.touchForward=0;this.jumpRequested=false;this.look.release();}},options);
    if(new URLSearchParams(location.search).has('inspect')){
      const inspect=()=>({benches:garden.benches,walls:garden.walls,snowDrifts:this.seasons.snowDrifts,accents:accents.entries,discoveries:wonderEntries,rails:garden.rails,resonance:this.resonance?.snapshot??null,traveler:this.traveler?.snapshot??null,whispers:this.whispers?.snapshot??null,signatures:this.signatures?.snapshot??[],harbor:{near:this.nearHarbor,...harbor},clouds:{canopyPosition:this.scene.getObjectByName('weather-cloud-canopy')?.position.toArray(),canopyOrder:this.scene.getObjectByName('weather-cloud-canopy')?.renderOrder,puffsOpaque:!((this.scene.getObjectByName('drifting-clouds') as T.Mesh).material as T.Material).transparent},nearArtwork:this.nearArtwork?.id??null,artworks:this.artworks.map(({module,...a})=>({...a,moduleId:module.id})),weather:this.environment.weatherState,snowmen:this.scene.getObjectsByProperty('name','snowman').length,player:{...this.player},camera:this.camera.position.toArray(),yaw:this.look.yaw,pitch:this.look.pitch,mode:this.mode,calls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,hour:this.environment.hour,photo:this.photo.active,photoCamera:this.photo.camera.position.toArray(),gardenRoads:garden.roads,flowerCount:garden.flowerCount,flowerRoots:garden.flowerRoots,shortcuts:this.memories.shortcutPaths,obstacles:this.obstacles,memories:this.memories.entries.map(e=>({id:e.id,x:e.x,z:e.z})),trails:[...this.memories.trailPaths]});
      Object.assign(window,{__xiangmetaInspect:()=>({...inspect(),stations:this.stations.map(s=>({...s,hint:this.scene.getObjectByName(`station-${s.id}`)?.getObjectByName('solid-sign')?.userData.subtitle})),textures:textureStatus(),render:{pixelRatio:this.renderer.getPixelRatio(),shadowSize:renderSettings.shadowSize},foundations:this.scene.getObjectsByProperty('name','stratified-island').length})});this.disposers.push(()=>{delete (window as unknown as Record<string,unknown>).__xiangmetaInspect;});
    }
    this.frame=requestAnimationFrame(this.animate);
    yield '光照与首帧渲染';
  }
  private island(x:number,z:number,r:number,color:string,exhibits:Exhibit[]=[],region?:Catalog['regions'][number]){
    const foundation=islandFoundation(r,x,z);this.scene.add(foundation.group);this.disposers.push(foundation.release);
    mesh(this.scene,new T.CylinderGeometry(r,r,.22,96),material('#f7e6d3'),x,-.14,z);
    if(region?.terrain){this.scene.add(mountainSurface(region));return;}
    const surface=new T.MeshStandardMaterial({map:groundTexture(r,color,exhibits,Math.min(8,this.renderer.capabilities.getMaxAnisotropy()),region?.season,region),roughness:1,metalness:0});
    const finish=region?.season==='winter'?'snow':region?.season==='summer'?'sand':region?'grass':'paving',detail=surfaceDetail(finish);
    surface.normalMap=detail.normal;surface.roughnessMap=detail.roughness;surface.normalScale.setScalar(finish==='snow'?.28:.5);
    surface.onBeforeCompile=shader=>{shader.fragmentShader='#undef USE_ENVMAP\n'+shader.fragmentShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvNormalMapUv=position.xy/1.6;vRoughnessMapUv=position.xy/1.6;');};surface.customProgramCacheKey=()=>`island-detail-v2-${finish}`;
    const ground=mesh(this.scene,new T.CircleGeometry(r,96),surface,x,0,z);ground.rotation.x=-Math.PI/2;ground.castShadow=false;ground.name='island-surface';
  }
  private label(text:string,position:T.Vector3,click:()=>void,style:string,id=''){
    const element=document.createElement('button');element.className=`world-label ${style}`;element.textContent=text;element.onclick=click;this.host.append(element);this.labels.push({element,position,id});
  }
  private loadAsset(group:T.Group,asset:NonNullable<Exhibit['visualAsset']>){
    new GLTFLoader().load(asset.src,gltf=>{if(this.disposed){this.disposeObject(gltf.scene);return;}
      this.disposeObject(group);group.clear();gltf.scene.scale.setScalar(asset.scale);gltf.scene.rotation.y=asset.rotation;group.add(gltf.scene);
      gltf.scene.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;}});
      if(gltf.animations.length){const mixer=new T.AnimationMixer(gltf.scene);gltf.animations.forEach(clip=>mixer.clipAction(clip).play());this.mixers.push(mixer);}
    },undefined,()=>console.warn(`Unable to load ${asset.src}; using placeholder.`));
  }
  private galleryArt(group:T.Group,m:Exhibit){
    const images=m.media.filter(media=>media.kind==='image'&&media.src);
    for(let i=0;i<3;i++){const image=images[i],frame=group.getObjectByName(`gallery-art-${i}`);if(!image||!(frame instanceof T.Mesh))continue;
      const texture=regionTexture(image.thumbnail??image.src!,m.region);
      (frame.material as T.Material).dispose();frame.material=new T.MeshBasicMaterial({map:texture,toneMapped:false});
      const ratio=(image.width??1.34)/(image.height??2.29),width=Math.min(1.34,2.29*ratio),height=width/ratio;frame.geometry.dispose();frame.geometry=new T.PlaneGeometry(width,height);
    }
  }
  private resize(){const w=this.width=this.host.clientWidth,h=this.height=Math.max(1,this.host.clientHeight);this.renderer.setSize(w,h);for(const camera of [this.camera,this.mapCamera]){camera.aspect=w/h;camera.updateProjectionMatrix();}this.photo.resize(w,h);this.renderer.render(this.scene,this.photo.active?this.photo.camera:this.mode==='map'?this.mapCamera:this.camera);}
  setPaused(value:boolean){value=value||this.photo.active;this.paused=value;if(value){this.keys.clear();this.touchSide=this.touchForward=0;this.jumpRequested=false;this.look.release();this.wonders.clear();}this.orbit.enabled=!value&&this.mode==='map';}
  interactExhibit(key:InteractionKey='F'){
    if(this.paused||this.mode!=='first-person'||!nearbyActions(this.near,this.nearArtwork,this.nearHarbor).some(a=>a.key===key))return;
    const m=this.nearArtwork?.module??this.near;
    if(key==='E'){if(m)this.bus.emit('select',m);return;}
    if(key==='R'){if(m)this.bus.emit('demo',m);return;}
    if(this.nearHarbor)this.bus.emit('harbor',undefined);
    else if(this.nearArtwork)this.bus.emit('artwork',this.nearArtwork);
    else if(this.near)this.bus.emit('interact',this.near);
  }
  interactDiscovery(){if(!this.paused&&this.mode==='first-person'){if(this.memories.interact())return;this.wonders.interact();}}
  visitMemory(id:string){const e=this.memories.location(id);if(!e)return;const approaches=Array.from({length:24},(_,i)=>({x:e.x+Math.sin(i*Math.PI/12)*1.3,z:e.z+Math.cos(i*Math.PI/12)*1.3}));const p=approaches.find(p=>walkable(p.x,p.z,this.data.regions,this.obstacles))??e;this.teleport(p.x,p.z,e.x,e.z);}
  trackMemory(id:string|null){this.memories.track(id);}
  visitHarbor(){this.teleport(harbor.arrival.x,harbor.arrival.z,harbor.terminal.x,harbor.terminal.z);}
  visitConstellation(){this.teleport(0,6.3,0,4.55);}
  get isPhoto(){return this.photo.active;}
  viewHorizon(id:string){const place=horizons.find(p=>p.id===id);if(!place)return;this.photoMode(true);const camera=this.camera.clone();camera.position.set(place.camera[0],place.camera[1],place.camera[2]);camera.lookAt(place.target[0],place.target[1],place.target[2]);this.photo.enter(camera);}
  photoMode(value:boolean){if(value===this.photo.active)return;if(value){loadRegionTextures();this.photoTime={hour:this.environment.hour,cycling:this.environment.cycling};this.environment.cycling=false;this.setPaused(true);this.photo.enter(this.mode==='map'?this.mapCamera:this.camera);this.labels.forEach(l=>l.element.hidden=true);}else{this.photo.exit();this.environment.restoreTime(this.photoTime.hour,this.photoTime.cycling);this.setPaused(false);this.syncCamera();}this.bus.emit('photo',value);}
  photoFov(value:number){this.photo.fov(value);}
  async photograph(postcard:boolean){if(!this.photo.active)return;const p=this.photo.camera.position,r=this.data.regions.find(r=>Math.hypot(p.x-r.position[0],p.z-r.position[1])<r.radius);await exportPostcard(this.renderer,this.scene,this.photo.camera,r?.title??horizons.find(h=>Math.hypot(p.x-h.target[0],p.z-h.target[2])<50)?.title??(Math.hypot(p.x,p.z)<10?'记忆星图 · 中央枢纽':'群岛之间'),this.environment.hour,postcard);}
  quality(low:boolean){this.lowQuality=low;this.renderer.setPixelRatio(low?1:Math.min(devicePixelRatio,renderSettings.pixelRatio));this.renderer.shadowMap.enabled=!low;this.renderer.shadowMap.needsUpdate=true;this.resize();}
  setTouchMove(side:number,forward:number){if(this.mode==='first-person'&&!this.paused){this.touchSide=Math.max(-1,Math.min(1,side));this.touchForward=Math.max(-1,Math.min(1,forward));}else this.touchSide=this.touchForward=0;}
  requestJump(){if(this.mode==='first-person'&&!this.paused)this.jumpRequested=true;}
  get isLowQuality(){return this.lowQuality;}
  get timeOfDay(){return this.environment.hour;}
  get timeCycling(){return this.environment.cycling;}
  get weather(){return this.environment.weatherState;}
  setWeather(kind:string){const cycle=this.environment.weather.cycle;if(kind==="auto"){cycle.automatic=true;return;}cycle.automatic=false;cycle.select(kind);}
  setTime(hour:number){this.environment.setHour(hour);}
  cycleTime(value:boolean){this.environment.cycling=value;}
  overview(){loadRegionTextures();this.look.release();this.keys.clear();this.touchSide=this.touchForward=0;this.jumpRequested=false;this.mode='map';this.host.dataset.view=this.mode;this.mapCamera.position.set(96,112,124);this.orbit.target.set(0,0,0);this.orbit.enabled=!this.paused;this.orbit.update();this.near=null;this.selected.visible=false;this.bus.emit('nearby',null);this.bus.emit('view',this.mode);}
  resumeWalk(){this.jumpRequested=false;this.mode='first-person';this.host.dataset.view=this.mode;this.orbit.enabled=false;this.keys.clear();this.touchSide=this.touchForward=0;this.syncCamera();this.bus.emit('view',this.mode);}
  captureMouse(){this.look.capture();}
  private teleport(x:number,z:number,tx:number,tz:number){
    this.look.release();let point={x,z};
    if(!walkable(x,z,this.data.regions,this.obstacles)){
      const candidates=Array.from({length:48},(_,i)=>({x:x+Math.cos(i*.9)*(1+Math.floor(i/12)),z:z+Math.sin(i*.9)*(1+Math.floor(i/12))}));
      const safe=candidates.find(p=>walkable(p.x,p.z,this.data.regions,this.obstacles));if(!safe)return;point=safe;
    }
    this.player=createWalker(point.x,point.z,this.data.regions);this.jumpRequested=false;Object.assign(this.look,lookAngles(point.x,point.z,tx,tz));this.resumeWalk();
    this.traveler?.reset(point.x,point.z);
    this.host.classList.remove('arriving');void this.host.offsetWidth;this.host.classList.add('arriving');this.updateLocation();this.updateNearby();this.bus.emit('sound','ui');
  }
  focusRegion(id:string){const r=this.data.regions.find(r=>r.id===id);if(r)this.teleport(r.position[0]+(r.spawn?.[0]??0),r.position[1]+(r.spawn?.[1]??10),r.position[0],r.position[1]-4);}
  focusExhibit(m:Exhibit){this.labels.forEach(l=>l.element.classList.toggle('selected',l.id===m.id));}
  visit(m:Exhibit){const s=this.stations.find(s=>s.id===m.id)!;this.focusExhibit(m);this.teleport(s.approach.x,s.approach.z,s.x,s.z);this.runHook(m.id,'onVisit');}
  private runHook(id:string,event:'onVisit'|'onInteract'){try{this.extensions.get(id)?.hooks?.[event]?.();}catch(error){console.warn(`Module hook ${id} failed`,error);}}
  setParameter(id:string,value:number){this.parameters.set(id,value);}
  private syncCamera(){this.camera.position.set(this.player.x,this.player.y+EYE_HEIGHT,this.player.z);this.camera.rotation.set(this.look.pitch,this.look.yaw,0,'YXZ');this.host.dataset.feetHeight=this.player.y.toFixed(3);this.host.dataset.grounded=String(this.player.grounded);}
  private updateLocation(){
    const region=this.data.regions.find(r=>Math.hypot(this.player.x-r.position[0],this.player.z-r.position[1])<r.radius)?.id
      ??'nexus';
    if(region!==this.region){this.region=region;loadRegionTextures(region);this.traveler?.enter(region,this.player.x,this.player.z);this.bus.emit('region',region);}
    this.bus.emit('move',{x:this.player.x,z:this.player.z});
  }
  private updateNearby(){
    const dock=this.mode==='first-person'&&!this.paused&&Math.hypot(this.player.x-harbor.terminal.x,this.player.z-harbor.terminal.z)<2.8&&Math.abs(this.player.y-harbor.level)<.4;
    if(dock!==this.nearHarbor){this.nearHarbor=dock;this.bus.emit('harborNearby',dock);}
    const candidate=this.mode==='first-person'?nearestStation(this.player.x,this.player.z,this.stations):null;
    const next=this.data.modules.find(m=>m.id===candidate?.id)??null;
    let art:ArtworkInteraction|null=null;
    const close=this.artworks.filter(a=>Math.hypot(this.player.x-a.x,this.player.z-a.z)<2.6);
    if(this.mode==='first-person'&&!this.paused&&close.length){
      this.camera.updateMatrixWorld();this.artworkRay.setFromCamera(this.aim,this.camera);this.artworkRay.far=2.8;
      // Include walls and furniture: only the first opaque surface under the reticle wins.
      const roots=[...new Set(close.map(a=>this.objects.get(a.module.id)!))];
      const hit=this.artworkRay.intersectObjects(roots,true).find(h=>h.object.visible);
      if(hit){let object:T.Object3D|null=hit.object;while(object&&!object.userData.artworkId)object=object.parent;
        if(object){const moduleRoot=roots.find(root=>{let p:T.Object3D|null=object;while(p){if(p===root)return true;p=p.parent;}return false;});
          art=close.find(a=>this.objects.get(a.module.id)===moduleRoot&&a.id===`${a.module.id}--${object!.userData.artworkId}`)??null;}}
    }
    if(art?.id!==this.nearArtwork?.id){this.nearArtwork=art;this.bus.emit('artworkNearby',art);}

    this.selected.visible=!!candidate||!!art;const marker=art?.approach??candidate;if(marker)this.selected.position.set(marker.x,groundHeight(marker.x,marker.z,this.data.regions)+.13,marker.z);
    if(next?.id!==this.near?.id){this.near=next;this.bus.emit('nearby',next);}
  }
  private move(dt:number){
    const forward=Number(this.keys.has('KeyW')||this.keys.has('ArrowUp'))-Number(this.keys.has('KeyS')||this.keys.has('ArrowDown'))+this.touchForward;
    const side=Number(this.keys.has('KeyD')||this.keys.has('ArrowRight'))-Number(this.keys.has('KeyA')||this.keys.has('ArrowLeft'))+this.touchSide;
    const strength=Math.min(1,Math.hypot(forward,side));
    const yaw=this.look.yaw,velocity=new T.Vector3(-Math.sin(yaw)*forward+Math.cos(yaw)*side,0,-Math.cos(yaw)*forward-Math.sin(yaw)*side).normalize().multiplyScalar((this.keys.has('ShiftLeft')||this.keys.has('ShiftRight')?8.5:5.2)*strength);
    advanceWalker(this.player,{x:velocity.x,z:velocity.z,jump:this.jumpRequested},dt,this.data.regions,this.obstacles);this.jumpRequested=false;
    if(forward||side)this.updateLocation();
  }
  private animate=()=>{
    this.frame=requestAnimationFrame(this.animate);const dt=Math.min(this.clock.getDelta(),.1);if(document.hidden)return;const motion=this.photo.active?0:dt;this.time+=motion;
    const previousX=this.player.x,previousZ=this.player.z;
    this.mixers.forEach(m=>m.update(motion));this.photo.update(dt);if(this.mode==='first-person'){if(!this.paused)this.move(dt);this.syncCamera();}else if(!this.photo.active)this.orbit.update();
    const moving=Math.hypot(this.player.x-previousX,this.player.z-previousZ)>.001;
    this.traveler?.update(motion,this.player.x,this.player.z,this.player.y,this.look.yaw,moving,this.player.grounded,this.reduced.matches,this.region||'nexus');
    this.whispers?.update(motion,this.region||'nexus',moving,this.mode!=='first-person'||this.paused||!!this.near||!!this.nearArtwork||this.nearHarbor,this.environment.hour,this.resonance?.snapshot.complete);
    this.resonance?.update(motion,this.reduced.matches);
    this.guide.position.y=9.5+Math.sin(this.time*1.2)*.1;this.guide.rotation.y+=motion*.35;
    this.harborScene.update(motion);
    this.environment.update(dt,this.photo.active,this.photo.active?this.photo.camera.position:this.camera.position);this.signatures.update(motion,this.environment.hour,this.reduced.matches,this.player.x,this.player.z,worldFeatures.responsiveSignatures);
    this.seasons.update(motion,this.reduced.matches);
    for(const [id,e] of this.extensions)if(e.scene?.update)try{e.scene.update(motion,this.environment.hour);}catch(error){console.warn(`Module animation ${id} stopped`,error);e.scene.update=undefined;}
    for(const [id,obj] of this.objects){const pulse=obj.getObjectByName('pulse');if(pulse){const value=this.parameters.get(id)??.5;pulse.scale.setScalar(.7+value*.35+Math.sin(this.time*(1+value*4))*.15);}}
    const heading={x:-Math.sin(this.look.yaw),z:-Math.cos(this.look.yaw)},available=this.mode==='first-person'&&!this.paused;
    const wonderScore=!this.near&&!this.nearArtwork?this.wonders.candidate(this.player.x,this.player.z,heading).score:-Infinity;
    const memoryScore=this.memories.candidate(this.player.x,this.player.z,heading).score;
    this.wonders.update(motion,this.player.x,this.player.z,available&&wonderScore>memoryScore,this.paused,heading);
    this.memories.update(motion,this.player.x,this.player.z,available&&memoryScore>=wonderScore,this.reduced.matches,heading);
    // The sun completes an orbit in 16 minutes; three shadow updates per second retain its motion
    // without redrawing every static island at the same rate as the first-person camera.
    this.shadowTime+=dt;if(this.shadowTime>=renderSettings.shadowInterval){this.renderer.shadowMap.needsUpdate=true;this.shadowTime=0;}
    const camera=this.photo.active?this.photo.camera:this.mode==='map'?this.mapCamera:this.camera;
    this.renderer.render(this.scene,camera);
    this.labelTime+=dt;
    if(!this.photo.active&&this.labelTime>=1/30){this.labelTime=0;for(const l of this.labels){
      this.projected.copy(l.position).project(camera);const v=this.projected;const distance=l.position.distanceTo(camera.position);
      const visible=v.z<1&&v.z>-1&&Math.abs(v.x)<1&&Math.abs(v.y)<1&&(this.mode==='map'||distance<17&&!l.element.classList.contains('region-label')&&!l.element.classList.contains('exhibit-label')&&!l.element.classList.contains('harbor-label'));
      if(l.element.hidden===visible)l.element.hidden=!visible;if(visible)l.element.style.transform=`translate(-50%, -50%) translate(${((v.x*.5+.5)*this.width).toFixed(1)}px,${((-v.y*.5+.5)*this.height).toFixed(1)}px)`;
    }}
    this.statsTime+=dt;if(this.statsTime>.5){this.statsTime=0;this.host.dataset.drawCalls=String(this.renderer.info.render.calls);const hour=this.environment.hour;const clock=document.querySelector('#sky-clock');if(clock)clock.textContent=`${String(Math.floor(hour)).padStart(2,'0')}:${String(Math.floor(hour%1*60)).padStart(2,'0')}`;}
    if(!this.region)this.updateLocation();this.updateNearby();
  };
  private disposeObject(object:T.Object3D){const materials=new Set<T.Material>();object.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Points||o instanceof T.Line||o instanceof T.Sprite){if('geometry' in o)o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});materials.forEach(m=>{for(const v of Object.values(m))if(v instanceof T.Texture)v.dispose();m.dispose();});}
  dispose(){this.disposed=true;cancelAnimationFrame(this.frame);this.observer?.disconnect();this.events.abort();this.disposers.forEach(d=>d());for(const e of this.extensions.values()){try{e.scene?.dispose?.();e.hooks?.dispose?.();}catch{}}this.look?.dispose();this.orbit?.dispose();this.photo?.dispose();this.memories?.dispose();this.environment?.dispose();this.mixers.forEach(m=>m.stopAllAction());this.disposeObject(this.scene);this.renderer?.dispose();this.labels.forEach(l=>l.element.remove());this.renderer?.domElement.remove();}
}
