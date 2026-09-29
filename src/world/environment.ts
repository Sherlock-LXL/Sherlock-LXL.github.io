import * as T from 'three';
import {renderSettings} from './render-settings';
import { daylight } from '../../shared/atmosphere.mjs';
import { Weather } from './weather';
import {exchangeIsland,robotDistrict,researchInstitute} from './future-landmarks';
import {batchStatic} from './optimizer';
import type { Region } from '../core/types';

/** One lightweight ocean shader and one shadow-casting light for the entire sky cycle. */
export class Environment {
  hour=9;cycling=true;
  readonly light=new T.DirectionalLight('#fff0dd',1.7);
  private ambient=new T.HemisphereLight('#e7f1ff','#bcb6a8',1.8);
  private sun=new T.Mesh(new T.SphereGeometry(3.1,32,20),new T.MeshBasicMaterial({color:'#ffe4b3',fog:false}));
  private moon=new T.Mesh(new T.SphereGeometry(2.3,32,20),new T.MeshBasicMaterial({color:'#e0e8fc',fog:false}));
  private halo:T.Sprite;
  private skyMaterial:T.ShaderMaterial;private seaMaterial:T.ShaderMaterial;
  private stars:T.Points;private glows=new Set<T.MeshStandardMaterial>();private elapsed=0;private targetHour:number|null=null;
  private color=new T.Color();private reduced=matchMedia('(prefers-reduced-motion: reduce)');
  private releaseFar:()=>void;
  readonly weather:Weather;private observer=new T.Vector3();
  get weatherState(){return {...this.weather.cycle.snapshot,motionTime:this.weather.motionTime};}
  constructor(private scene:T.Scene,regions:Region[]){
    scene.fog=new T.FogExp2('#b4dbf1',.0015);
    this.skyMaterial=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{zenith:{value:new T.Color('#79bce9')},horizon:{value:new T.Color('#c4eafa')}},
      vertexShader:'varying vec3 vPos;void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:`uniform vec3 zenith,horizon;varying vec3 vPos;void main(){float h=normalize(vPos).y;gl_FragColor=vec4(mix(horizon,zenith,pow(max(h,0.0),.55)),1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`});
    scene.add(new T.Mesh(new T.SphereGeometry(420,32,20),this.skyMaterial),this.ambient,this.light,this.light.target,this.sun,this.moon);
    this.weather=new Weather(scene);this.sun.material.transparent=true;this.moon.material.transparent=true;
    this.sun.name='orbit-sun';this.moon.name='orbit-moon';this.sun.renderOrder=this.moon.renderOrder=-30;
    const haloCanvas=document.createElement('canvas');haloCanvas.width=haloCanvas.height=128;
    const ctx=haloCanvas.getContext('2d')!,gradient=ctx.createRadialGradient(64,64,6,64,64,64);
    gradient.addColorStop(0,'rgba(255,221,174,.28)');gradient.addColorStop(.3,'rgba(255,196,157,.10)');gradient.addColorStop(1,'rgba(255,190,151,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
    const haloTexture=new T.CanvasTexture(haloCanvas);haloTexture.colorSpace=T.SRGBColorSpace;
    this.halo=new T.Sprite(new T.SpriteMaterial({map:haloTexture,transparent:true,depthWrite:false,fog:false,toneMapped:false}));this.halo.renderOrder=-30;this.halo.scale.set(24,24,1);scene.add(this.halo);
    this.light.castShadow=true;this.light.shadow.mapSize.set(renderSettings.shadowSize,renderSettings.shadowSize);
    Object.assign(this.light.shadow.camera,{left:-63,right:63,top:63,bottom:-63,near:.5,far:230});
    this.light.shadow.bias=-.00025;this.light.shadow.normalBias=.035;this.light.shadow.radius=2;
    // Fine translucent crater basins stay on the moon's near hemisphere.
    const craterMaterial=new T.MeshBasicMaterial({color:'#b6c9e4',transparent:true,opacity:.35,fog:false,depthWrite:false});
    for(const [x,y,r] of [[-.7,.6,.42],[.65,-.45,.55],[.8,.95,.25],[-.85,-.75,.3]]){
      const crater=new T.Mesh(new T.CircleGeometry(r,24),craterMaterial);crater.position.set(x,y,Math.sqrt(2.3**2-x*x-y*y)+.016);crater.lookAt(crater.position.clone().multiplyScalar(2));this.moon.add(crater);
    }
    const positions=[];for(let i=0;i<180;i++){
      const a=i*2.39996,y=.12+((i*47)%173)/200,r=Math.sqrt(1-y*y);positions.push(Math.cos(a)*r*365,y*365,Math.sin(a)*r*365);
    }
    const starsGeometry=new T.BufferGeometry();starsGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    this.stars=new T.Points(starsGeometry,new T.PointsMaterial({color:'#ece6ff',size:.55,transparent:true,opacity:0,depthWrite:false,fog:false}));this.stars.renderOrder=-40;scene.add(this.stars);
    const shores=[new T.Vector3(0,0,9),...regions.map(r=>new T.Vector3(r.position[0],r.position[1],r.radius))];
    this.seaMaterial=new T.ShaderMaterial({uniforms:{time:{value:0},day:{value:1},sunDirection:{value:new T.Vector3()},shores:{value:shores}},
      vertexShader:`uniform float time;varying vec3 vWorld;void main(){vec3 p=position;p.z+=sin(p.x*.18+time*.5)*.055+cos(p.y*.22-time*.4)*.04;vec4 world=modelMatrix*vec4(p,1.);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
      fragmentShader:`uniform float time,day;uniform vec3 sunDirection;uniform vec3 shores[${shores.length}];varying vec3 vWorld;
      void main(){vec2 p=vWorld.xz;float shore=1000.;for(int i=0;i<${shores.length};i++){shore=min(shore,length(p-shores[i].xy)-shores[i].z);}
        float wave=sin(p.x*.55+p.y*.24+time*.65)*sin(p.y*.38-p.x*.15-time*.45);
        vec3 deep=mix(vec3(.018,.045,.09),vec3(.022,.20,.32),day);
        vec3 shallow=mix(vec3(.045,.13,.16),vec3(.11,.53,.49),day);
        float shelf=exp(-max(shore,0.)*.15);
        vec3 c=mix(deep,shallow,shelf*.8+.08)+wave*.006;
        float irregular=sin(p.x*.43+p.y*.31)+sin(p.y*.62-p.x*.19)*.5;
        float foam=pow(.5+.5*sin(shore*2.5+irregular*.7-time*.8),9.)*exp(-abs(shore-.5)*.8)*.25;
        vec3 normal=normalize(vec3(cos(p.x*.55+p.y*.24+time*.65)*.075,1.,sin(p.y*.38-p.x*.15-time*.45)*.08));
        vec3 eye=normalize(cameraPosition-vWorld);
        float fresnel=.025+.45*pow(1.-max(dot(eye,normal),0.),4.);
        vec3 sky=mix(vec3(.09,.13,.23),vec3(.37,.64,.77),day);
        c=mix(c,sky,fresnel);
        float glint=pow(max(dot(reflect(-sunDirection,normal),eye),0.),150.);
        float caustic=pow(max(0.,sin(p.x*1.8+wave)*sin(p.y*1.7-wave)),8.)*shelf*.018*day;
        c+=foam*mix(vec3(.18,.3,.33),vec3(.7,.87,.82),day)+glint*.19+caustic;
        float haze=1.-exp(-length(cameraPosition-vWorld)*.0010);c=mix(c,mix(vec3(.08,.12,.21),vec3(.28,.58,.78),day),haze);
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
    const sea=new T.Mesh(new T.PlaneGeometry(1500,1500,100,100),this.seaMaterial);sea.rotation.x=-Math.PI/2;sea.position.y=-5.65;sea.name='ocean';scene.add(sea);
    // Sparse silhouettes, each with a sand shelf and rounded vegetated ridgeline.
    const far=new T.Group();far.name='distant-islands';scene.add(far);
    far.add(exchangeIsland(),robotDistrict(),researchInstitute());
    // Distant silhouettes are beyond the playable shadow volume. Share their draws.
    far.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=false;o.receiveShadow=false;}});
    this.releaseFar=batchStatic(far);
    this.update(0);
  }
  dispose(){this.releaseFar();}
  collectLights(){this.scene.traverse(o=>{if(o instanceof T.Mesh){for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof T.MeshStandardMaterial&&m.userData.nightGlow)this.glows.add(m);}});}
  setHour(hour:number){this.targetHour=((hour%24)+24)%24;}
  restoreTime(hour:number,cycling:boolean){this.cycling=cycling;this.setHour(hour);}
  update(dt:number,freezeMotion=false,observer=this.observer){
    if(!freezeMotion)this.elapsed+=dt;
    if(this.targetHour!==null){const d=(this.targetHour-this.hour+36)%24-12;this.hour=(this.hour+d*(1-Math.exp(-dt*3))+24)%24;if(Math.abs(d)<.005){this.hour=this.targetHour;this.targetHour=null;}}
    else if(this.cycling)this.hour=(this.hour+dt*24/960)%24;
    const state=daylight(this.hour),day=state.day,twilight=state.twilight;
    this.weather.update(dt,freezeMotion,observer,day,this.reduced.matches);const weather=this.weather.cycle.value;
    this.sun.position.set(Math.cos(state.angle)*145,state.altitude*145,Math.cos(state.angle)*-40);
    this.moon.position.copy(this.sun.position).multiplyScalar(-1);this.moon.lookAt(0,0,0);
    this.sun.visible=state.altitude>-.085;this.moon.visible=state.altitude<.085;
    this.halo.position.copy(this.sun.position);this.halo.visible=this.sun.visible;
    this.sun.material.color.set('#fff1cf').lerp(this.color.set('#f2ac90'),twilight*.65);
    this.light.position.copy(state.altitude>=0?this.sun.position:this.moon.position).normalize().multiplyScalar(95);
    // Change the shadow source only while its contribution has faded to zero.
    this.light.intensity=(state.sun*2.65+state.moon*.8)*(1-weather.shade*.64)*T.MathUtils.smoothstep(Math.abs(state.altitude),0,.04);
    this.sun.material.opacity=this.moon.material.opacity=1-weather.shade*.98;this.halo.material.opacity=1-weather.cover;
    const solar=T.MathUtils.smoothstep(state.altitude,-.04,.04);
    this.light.color.set('#bdcdf1').lerp(this.color.set('#fff0dd').lerp(new T.Color('#efb6a0'),twilight*.5),solar);
    this.ambient.intensity=.58+day*.52;this.ambient.color.set('#99add7').lerp(this.color.set('#dbeaf5'),day);this.ambient.groundColor.set('#526a83').lerp(this.color.set('#9faf9b'),day);
    this.ambient.color.lerp(this.color.set('#edc9bd'),twilight*.4);
    const horizon=this.skyMaterial.uniforms.horizon.value as T.Color;
    horizon.set('#657caa').lerp(this.color.set('#b5ddf4'),day).lerp(this.color.set('#edbeae'),twilight*.55);
    (this.skyMaterial.uniforms.zenith.value as T.Color).set('#283e70').lerp(this.color.set('#70b8e8'),day);
    horizon.lerp(this.color.set('#53647b').lerp(new T.Color('#9cabb8'),day),weather.shade*.85).lerp(this.color.set('#7c8fa9').lerp(new T.Color('#dce6ef'),day),weather.snow*.5);
    (this.skyMaterial.uniforms.zenith.value as T.Color).lerp(this.color.set('#34465c').lerp(new T.Color('#667d90'),day),weather.shade).lerp(this.color.set('#73849c').lerp(new T.Color('#c6d6e5'),day),weather.snow*.55);
    this.ambient.intensity*=1-weather.shade*.25;
    this.scene.environmentIntensity=(.12+day*.16)*(1-weather.shade*.3);
    (this.scene.fog as T.FogExp2).color.copy(horizon);(this.scene.fog as T.FogExp2).density=.0015+weather.shade*.0014;
    (this.stars.material as T.PointsMaterial).opacity=(1-day)*.65*(1-weather.cover*.8);
    this.seaMaterial.uniforms.day.value=day;this.seaMaterial.uniforms.time.value=this.reduced.matches?0:this.elapsed;
    this.seaMaterial.uniforms.sunDirection.value.copy(this.light.position).normalize();
    for(const m of this.glows)m.emissiveIntensity=.12+(1-day)*1.15;
  }
}
