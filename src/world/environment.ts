import * as T from 'three';
import {renderSettings} from './render-settings';
import { daylight } from '../../shared/atmosphere.mjs';
import {harbor} from '../../shared/harbor.mjs';
import { Weather } from './weather';
import {exchangeIsland,robotDistrict,researchInstitute} from './future-landmarks';
import {batchStatic} from './optimizer';
import type { Region } from '../core/types';

const NOISE=`float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+17.1;a*=.5;}return v;}`;

/** Each hour is a pair of washes: the silk sky and the mist it leaves on the water. */
const palette={
  day:{zenith:'#a6c0c6',horizon:'#ebe6d4',deep:'#5f95a0',shallow:'#9cc5b4',crest:'#f1f0e2',trough:'#3e6d7c'},
  dusk:{zenith:'#8a8fab',horizon:'#f1c39a',deep:'#4d6b80',shallow:'#88a59a',crest:'#f8e2c6',trough:'#34465c'},
  night:{zenith:'#121b30',horizon:'#2f3e57',deep:'#0c1828',shallow:'#1d3d47',crest:'#9fb4c4',trough:'#070d18'},
  storm:{zenith:'#8a969b',horizon:'#cfcdc0',deep:'#3d5a64',shallow:'#6c8f8a',crest:'#dfe3dc',trough:'#26404c'},
  snow:{zenith:'#c3cfd6',horizon:'#eceeea'}
};
type Wash=Record<string,T.Color>;
const wash=(p:Record<string,string>):Wash=>Object.fromEntries(Object.entries(p).map(([k,v])=>[k,new T.Color(v)]));

/** Painted day: silk sky, mineral sea, layered blue-green ranges and one shadow-casting light. */
export class Environment {
  hour=9;cycling=true;
  readonly light=new T.DirectionalLight('#fff0dd',1.7);
  private ambient=new T.HemisphereLight('#e2ebee','#a99c80',1.4);
  private sun=new T.Mesh(new T.SphereGeometry(9,32,20),new T.MeshBasicMaterial({color:'#ffe4b3',fog:false,depthWrite:false}));
  private moon=new T.Mesh(new T.SphereGeometry(6.4,32,20),new T.MeshBasicMaterial({color:'#e7ecf5',fog:false,depthWrite:false}));
  private halo:T.Sprite;private sky:T.Mesh;
  private skyMaterial:T.ShaderMaterial;private seaMaterial:T.ShaderMaterial;private rangeMaterial:T.ShaderMaterial;
  private stars:T.Points;private glows=new Set<T.MeshStandardMaterial>();private elapsed=0;private targetHour:number|null=null;
  private color=new T.Color();private reduced=matchMedia('(prefers-reduced-motion: reduce)');
  private washes={day:wash(palette.day),dusk:wash(palette.dusk),night:wash(palette.night),storm:wash(palette.storm),snow:wash(palette.snow)};
  private current:Wash=wash(palette.day);
  private releaseFar:()=>void;
  readonly weather:Weather;private observer=new T.Vector3();
  get weatherState(){return {...this.weather.cycle.snapshot,motionTime:this.weather.motionTime};}
  /** Linear horizon colour; the renderer's mist and every distant wash meet it. */
  get horizon(){return this.current.horizon;}
  constructor(private scene:T.Scene,regions:Region[]){
    scene.fog=new T.FogExp2('#efe3c6',.0026);
    this.skyMaterial=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,depthTest:false,uniforms:{zenith:{value:new T.Color()},horizon:{value:new T.Color()},glow:{value:new T.Color()},sunDirection:{value:new T.Vector3(0,1,0)},time:{value:0},night:{value:0}},
      vertexShader:'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:`uniform vec3 zenith,horizon,glow,sunDirection;uniform float time,night;varying vec3 vDir;${NOISE}
      void main(){vec3 d=normalize(vDir);float h=d.y,up=pow(max(h,0.),.62);
        vec3 c=mix(horizon,zenith,up);
        // Long silk streaks: the weave of the ground, not weather.
        float az=atan(d.z,d.x);float streak=fbm(vec2(az*4.,h*30.)+vec2(time*.003,0.));
        c=mix(c,mix(horizon,vec3(1.),.08),smoothstep(.56,.86,streak)*(1.-up)*.4*(1.-night));
        float toward=max(dot(d,sunDirection),0.);c+=glow*(pow(toward,5.)*.32+pow(toward,40.)*.25)*(1.-up*.5);
        c=mix(c,horizon,smoothstep(.03,-.05,h));
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
    this.sky=new T.Mesh(new T.SphereGeometry(500,48,24),this.skyMaterial);this.sky.name='silk-sky';this.sky.renderOrder=-100;this.sky.frustumCulled=false;
    scene.add(this.sky,this.ambient,this.light,this.light.target,this.sun,this.moon);
    // Bounding spheres of the hub, the harbour and the four islands; the mountain carries its pagoda above the ridge.
    const islands=[{x:0,y:3,z:0,radius:10},{x:0,y:-3,z:(harbor.rampStart+harbor.deckEnd)/2,radius:11},...regions.map(r=>({x:r.position[0],y:r.terrain?6:1,z:r.position[1],radius:r.radius+(r.terrain?4:1.5)}))];
    this.weather=new Weather(scene,islands);this.sun.material.transparent=true;this.moon.material.transparent=true;
    this.sun.name='orbit-sun';this.moon.name='orbit-moon';this.sun.renderOrder=this.moon.renderOrder=-30;
    const haloCanvas=document.createElement('canvas');haloCanvas.width=haloCanvas.height=128;
    const ctx=haloCanvas.getContext('2d')!,gradient=ctx.createRadialGradient(64,64,6,64,64,64);
    gradient.addColorStop(0,'rgba(255,226,186,.34)');gradient.addColorStop(.32,'rgba(255,205,160,.11)');gradient.addColorStop(1,'rgba(255,190,151,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
    const haloTexture=new T.CanvasTexture(haloCanvas);haloTexture.colorSpace=T.SRGBColorSpace;
    this.halo=new T.Sprite(new T.SpriteMaterial({map:haloTexture,transparent:true,depthWrite:false,fog:false,toneMapped:false}));this.halo.renderOrder=-30;this.halo.scale.set(80,80,1);scene.add(this.halo);
    this.light.castShadow=true;this.light.shadow.mapSize.set(renderSettings.shadowSize,renderSettings.shadowSize);
    Object.assign(this.light.shadow.camera,{left:-63,right:63,top:63,bottom:-63,near:.5,far:230});
    this.light.shadow.bias=-.00025;this.light.shadow.normalBias=.035;this.light.shadow.radius=2;this.light.shadow.intensity=.82;
    // Soft maria on the moon's near face.
    const craterMaterial=new T.MeshBasicMaterial({color:'#c3cbd8',transparent:true,opacity:.45,fog:false,depthWrite:false});
    for(const [x,y,r] of [[-1.9,1.6,1.1],[1.7,-1.2,1.45],[2.1,2.5,.65],[-2.3,-2,.8]]){
      const crater=new T.Mesh(new T.CircleGeometry(r,24),craterMaterial);crater.position.set(x,y,Math.sqrt(6.4**2-x*x-y*y)+.04);crater.lookAt(crater.position.clone().multiplyScalar(2));crater.renderOrder=-29;this.moon.add(crater);
    }
    const positions=[];for(let i=0;i<260;i++){
      const a=i*2.39996,y=.1+((i*47)%173)/190,r=Math.sqrt(Math.max(0,1-y*y));positions.push(Math.cos(a)*r*470,y*470,Math.sin(a)*r*470);
    }
    const starsGeometry=new T.BufferGeometry();starsGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    this.stars=new T.Points(starsGeometry,new T.PointsMaterial({color:'#f3ead2',size:.9,transparent:true,opacity:0,depthWrite:false,fog:false}));this.stars.renderOrder=-40;this.stars.frustumCulled=false;scene.add(this.stars);
    const shores=[new T.Vector3(0,0,9),...regions.map(r=>new T.Vector3(r.position[0],r.position[1],r.radius))];
    this.seaMaterial=new T.ShaderMaterial({uniforms:{time:{value:0},day:{value:1},sunDirection:{value:new T.Vector3()},shores:{value:shores},
        deep:{value:new T.Color()},shallow:{value:new T.Color()},crest:{value:new T.Color()},trough:{value:new T.Color()},horizon:{value:new T.Color()},zenith:{value:new T.Color()},sunColor:{value:new T.Color()},calm:{value:0}},
      vertexShader:`varying vec3 vWorld;void main(){vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
      fragmentShader:`uniform float time,day,calm;uniform vec3 sunDirection,deep,shallow,crest,trough,horizon,zenith,sunColor;uniform vec3 shores[${shores.length}];varying vec3 vWorld;${NOISE}
      float strokes(float v,float width){float d=abs(fract(v)-.5),aa=fwidth(v);return (1.-smoothstep(width-aa,width+aa,d))*(1.-smoothstep(.18,.42,aa));}
      void main(){vec2 p=vWorld.xz;float shore=1000.;for(int i=0;i<${shores.length};i++){shore=min(shore,length(p-shores[i].xy)-shores[i].z);}
        float distanceToEye=length(cameraPosition-vWorld);
        float shelf=exp(-max(shore,0.)*.11);
        vec3 c=mix(deep,shallow,shelf*.85+.05);
        float tone=fbm(p*.012+vec2(time*.004,0.));c*=.9+.2*tone;
        // Brushed water: two families of drifting lines, gathered into patches.
        vec2 warp=vec2(fbm(p*.03+time*.012),fbm(p*.03-time*.01+9.))*6.;
        float flow=dot(p+warp,vec2(.86,.5))*.27-time*.08,cross=dot(p+warp*.7,vec2(-.42,.91))*.19+time*.05;
        float swell=smoothstep(.42,.72,fbm(p*.018+vec2(-time*.006,time*.004)));
        float crestLine=strokes(flow,.035)*swell,troughLine=strokes(flow+.5,.025)*swell*.8+strokes(cross,.02)*(1.-swell)*.45;
        // Broken rings breathe outward from each island, like ink touched to wet silk.
        float arc=smoothstep(.38,.62,fbm(p*.07+vec2(time*.01,0.)));
        float ring=strokes(shore*.36-time*.09,.05)*exp(-max(shore,0.)*.16)*step(0.,shore)*arc;
        float foam=exp(-max(shore,0.)*1.6)*(.55+.45*noise(p*1.7+time*.4));
        vec3 eye=normalize(cameraPosition-vWorld);
        vec3 normal=normalize(vec3((noise(p*.6+time*.3)-.5)*.08,1.,(noise(p*.6-time*.25+3.)-.5)*.08));
        float fresnel=.03+.55*pow(1.-max(dot(eye,normal),0.),5.);
        c=mix(c,mix(horizon,zenith,.35),fresnel);
        float lineFade=1.-smoothstep(60.,240.,distanceToEye);
        c=mix(c,crest,crestLine*.42*lineFade*(1.-calm*.5));c=mix(c,trough,troughLine*.3*lineFade);
        c=mix(c,crest,max(ring*.5,foam*.55));
        float glint=pow(max(dot(reflect(-sunDirection,normal),eye),0.),70.);c+=sunColor*glint*.28*day;
        float haze=1.-exp(-distanceToEye*.0017);c=mix(c,horizon,haze*haze*.85+haze*.15);
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
    this.seaMaterial.extensions={clipCullDistance:false,multiDraw:false};
    const sea=new T.Mesh(new T.PlaneGeometry(1600,1600),this.seaMaterial);sea.rotation.x=-Math.PI/2;sea.position.y=-5.65;sea.name='ocean';scene.add(sea);
    this.rangeMaterial=this.buildRanges();
    // Future islands: sparse silhouettes beyond the playable shadow volume, sharing draws.
    const far=new T.Group();far.name='distant-islands';scene.add(far);
    far.add(exchangeIsland(),robotDistrict(),researchInstitute());
    far.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=false;o.receiveShadow=false;}});
    this.releaseFar=batchStatic(far);
    this.update(0);
  }
  /** Three layered ranges; nearer ones keep their mineral colour, farther ones dissolve into silk. */
  private buildRanges(){
    const material=new T.ShaderMaterial({uniforms:{horizon:{value:new T.Color()},day:{value:1},sunDirection:{value:new T.Vector3(0,1,0)}},
      vertexShader:'attribute float layer;varying float vHeight;varying float vLayer;varying vec3 vNormal;varying vec3 vWorld;void main(){vHeight=position.y;vLayer=layer;vNormal=normal;vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
      fragmentShader:`uniform vec3 horizon,sunDirection;uniform float day;varying float vHeight;varying float vLayer;varying vec3 vNormal;varying vec3 vWorld;${NOISE}
      void main(){float peak=clamp((vHeight+6.)/70.,0.,1.);
        vec3 malachite=vec3(.07,.34,.25),azurite=vec3(.04,.19,.38),ochre=vec3(.45,.3,.15);
        float vein=fbm(vWorld.xz*.03+vHeight*.05);
        vec3 c=mix(ochre,malachite,smoothstep(.04,.24,peak));c=mix(c,azurite,smoothstep(.32,.72,peak+vein*.25));
        float light=mix(.55,1.,smoothstep(0.,.5,dot(normalize(vNormal),sunDirection)));c*=mix(.35,1.,day)*light;
        float mist=clamp(.16+vLayer*.2+(1.-smoothstep(0.,.45,peak))*.6,0.,1.);
        gl_FragColor=vec4(mix(c,horizon,mist),1.);
        #include <colorspace_fragment>
      }`});
    const positions:number[]=[],layers:number[]=[],indices:number[]=[],sectors=540,rows=9;
    let seed=8821;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
    for(const [layer,radius,width,height] of [[0,300,34,52],[1,370,40,66],[2,450,46,80]] as const){
      const phase=random()*100,base=positions.length/3;
      const ridge=(a:number)=>{let v=0,amp=1,f=1;for(let i=0;i<5;i++){v+=amp*(1-Math.abs(Math.sin(a*f*3+phase*f+Math.sin(a*f*1.7+phase)*1.3)));amp*=.5;f*=2.13;}return v/1.94;};
      for(let j=0;j<=sectors;j++){
        const a=j/sectors*Math.PI*2,gap=T.MathUtils.smoothstep(Math.sin(a*3+phase)*.6+Math.sin(a*7.3+phase*2)*.4,-.75,.05),crest=Math.pow(ridge(a),2.2)*height*gap;
        for(let i=0;i<=rows;i++){
          const u=i/rows*2-1,r=radius+u*width*(1+.25*Math.sin(a*5+phase)),profile=Math.pow(Math.max(0,1-u*u),1.4);
          positions.push(Math.cos(a)*r,-8+(crest+1.2)*profile,Math.sin(a)*r);layers.push(layer);
          if(i<rows&&j<sectors){const p=base+j*(rows+1)+i,q=p+rows+1;indices.push(p,q,p+1,p+1,q,q+1);}
        }
      }
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('layer',new T.Float32BufferAttribute(layers,1));geometry.setIndex(indices);geometry.computeVertexNormals();
    const ranges=new T.Mesh(geometry,material);ranges.name='distant-ranges';ranges.frustumCulled=false;this.scene.add(ranges);
    return material;
  }
  dispose(){this.releaseFar();}
  collectLights(){this.scene.traverse(o=>{if(o instanceof T.Mesh){for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof T.MeshStandardMaterial&&m.userData.nightGlow)this.glows.add(m);}});}
  setHour(hour:number){this.targetHour=((hour%24)+24)%24;}
  restoreTime(hour:number,cycling:boolean){this.cycling=cycling;this.setHour(hour);}
  private blend(day:number,twilight:number,weather:{shade:number;snow:number}){
    const {day:d,dusk,night,storm,snow}=this.washes;
    for(const key of Object.keys(this.current)){
      const c=this.current[key].copy(night[key]).lerp(d[key],day).lerp(dusk[key],twilight*.75);
      if(storm[key])c.lerp(this.color.copy(storm[key]).lerp(night[key],1-day),weather.shade*.85);
      if(snow[key])c.lerp(this.color.copy(snow[key]).lerp(night[key],(1-day)*.9),weather.snow*.5);
    }
  }
  update(dt:number,freezeMotion=false,observer=this.observer){
    if(!freezeMotion)this.elapsed+=dt;
    if(this.targetHour!==null){const d=(this.targetHour-this.hour+36)%24-12;this.hour=(this.hour+d*(1-Math.exp(-dt*3))+24)%24;if(Math.abs(d)<.005){this.hour=this.targetHour;this.targetHour=null;}}
    else if(this.cycling)this.hour=(this.hour+dt*24/960)%24;
    const state=daylight(this.hour),day=state.day,twilight=state.twilight;
    this.weather.update(dt,freezeMotion,observer,day,this.reduced.matches);const weather=this.weather.cycle.value;
    this.blend(day,twilight,weather);
    this.sky.position.copy(observer);this.stars.position.copy(observer);
    this.sun.position.set(Math.cos(state.angle)*400,state.altitude*400,Math.cos(state.angle)*-110);
    this.moon.position.copy(this.sun.position).multiplyScalar(-1);this.moon.lookAt(0,0,0);
    this.sun.visible=state.altitude>-.085;this.moon.visible=state.altitude<.085;
    this.halo.position.copy(this.sun.position);this.halo.visible=this.sun.visible;
    // Noon is pale gold; the setting sun is the red seal of the day.
    this.sun.material.color.set('#fff3da').lerp(this.color.set('#e0552f'),T.MathUtils.smoothstep(twilight,.25,.95));
    this.light.position.copy(state.altitude>=0?this.sun.position:this.moon.position).normalize().multiplyScalar(95);
    // Change the shadow source only while its contribution has faded to zero.
    this.light.intensity=(state.sun*2.75+state.moon*.85)*(1-weather.shade*.62)*T.MathUtils.smoothstep(Math.abs(state.altitude),0,.04);
    this.sun.material.opacity=this.moon.material.opacity=1-weather.shade*.98;this.halo.material.opacity=1-weather.cover;
    const solar=T.MathUtils.smoothstep(state.altitude,-.04,.04);
    this.light.color.set('#b9c8ea').lerp(this.color.set('#fff1d8').lerp(new T.Color('#f2b08e'),twilight*.55),solar);
    this.ambient.intensity=(.62+day*.62)*(1-weather.shade*.22);
    this.ambient.color.set('#8193bd').lerp(this.color.set('#e3ecef'),day).lerp(new T.Color('#efc9b4'),twilight*.35);
    this.ambient.groundColor.set('#3e4b5e').lerp(this.color.set('#ab9c7d'),day);
    const sky=this.skyMaterial.uniforms;
    sky.zenith.value.copy(this.current.zenith);sky.horizon.value.copy(this.current.horizon);sky.time.value=this.elapsed;sky.night.value=1-day;
    sky.glow.value.set('#ffd9a8').lerp(this.color.set('#ff8a55'),twilight).multiplyScalar(this.sun.visible?(1-weather.shade)*(.35+twilight*.9):0);
    sky.sunDirection.value.copy(this.sun.position).normalize();
    this.scene.environmentIntensity=(.1+day*.16)*(1-weather.shade*.3);
    const fog=this.scene.fog as T.FogExp2;fog.color.copy(this.current.horizon);fog.density=.0019+weather.shade*.0014+weather.snow*.0006;
    (this.stars.material as T.PointsMaterial).opacity=(1-day)*.8*(1-weather.cover*.85);
    const sea=this.seaMaterial.uniforms;
    for(const key of ['deep','shallow','crest','trough','horizon','zenith'] as const)sea[key].value.copy(this.current[key]);
    sea.day.value=day;sea.time.value=this.reduced.matches?0:this.elapsed;sea.calm.value=weather.snow;
    sea.sunDirection.value.copy(this.light.position).normalize();sea.sunColor.value.copy(this.light.color);
    const ranges=this.rangeMaterial.uniforms;ranges.horizon.value.copy(this.current.horizon);ranges.day.value=day;ranges.sunDirection.value.copy(this.light.position).normalize();
    for(const m of this.glows)m.emissiveIntensity=.12+(1-day)*1.15;
  }
}
