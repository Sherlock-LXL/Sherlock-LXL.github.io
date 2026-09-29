import * as T from 'three';
import {WeatherCycle} from '../../shared/weather.mjs';
import {precipitationSamples} from '../../shared/precipitation.mjs';

/** Shared draws for drifting puffs, overcast canopy, rain and snow. */
export class Weather {
  readonly cycle=new WeatherCycle();
  private clouds:T.InstancedMesh;private rain:T.LineSegments;private snow:T.Points;
  private ceiling:T.Mesh<T.PlaneGeometry,T.ShaderMaterial>;
  private cloudMaterial=new T.MeshStandardMaterial({color:'#fff7e9',roughness:1,emissive:'#dce8ef',emissiveIntensity:.22});
  private pose=new T.Object3D();private time=0;private interval=0;private bases:Float32Array;private precipitationCount=7200;
  private flow={value:0};
  get motionTime(){return this.time;}
  constructor(scene:T.Scene){
    const puff=new T.SphereGeometry(1,28,18),vertices=puff.attributes.position;
    for(let i=0;i<vertices.count;i++){const x=vertices.getX(i),y=vertices.getY(i),z=vertices.getZ(i),s=1+.018*Math.sin(x*6+z*4)*Math.sin(y*5-z*3);vertices.setXYZ(i,x*s,y*s,z*s);}puff.computeVertexNormals();
    this.clouds=new T.InstancedMesh(puff,this.cloudMaterial,48*6);this.clouds.name='drifting-clouds';this.clouds.instanceMatrix.setUsage(T.DynamicDrawUsage);this.clouds.frustumCulled=false;scene.add(this.clouds);
    const material=new T.ShaderMaterial({side:T.DoubleSide,transparent:true,depthWrite:false,uniforms:{time:{value:0},cover:{value:0},tint:{value:new T.Color()}},vertexShader:'varying vec3 vWorld;void main(){vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}',fragmentShader:`
      uniform float time,cover;uniform vec3 tint;varying vec3 vWorld;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){vec2 p=vWorld.xz*.026-vec2(time*.010,time*.004);
        float n=noise(p)*.55+noise(p*2.03)*.3+noise(p*4.01)*.15;
        float cloud=smoothstep(.84-cover*.70,1.04-cover*.76,n);
        float alpha=cloud*(1.-smoothstep(250.,820.,length(vWorld-cameraPosition)))*smoothstep(.24,.75,cover)*.97;
        gl_FragColor=vec4(tint*(.78+n*.28),alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
    this.ceiling=new T.Mesh(new T.PlaneGeometry(2400,2400),material);this.ceiling.rotation.x=-Math.PI/2;this.ceiling.position.y=82;this.ceiling.renderOrder=-20;this.ceiling.name='weather-cloud-canopy';scene.add(this.ceiling);
    this.bases=new Float32Array(this.precipitationCount*3);
    // A world-space volume covers all playable islands. Walking never translates
    // existing drops; the GPU advances their fall in place, including distant rain.
    const drops=precipitationSamples(this.precipitationCount);
    drops.forEach((p,i)=>this.bases.set([p.x,p.y,p.z],i*3));
    const rainGeometry=new T.BufferGeometry();rainGeometry.setAttribute('position',new T.BufferAttribute(new Float32Array(this.precipitationCount*6),3).setUsage(T.DynamicDrawUsage));
    this.rain=new T.LineSegments(rainGeometry,new T.LineBasicMaterial({color:'#c0dbea',transparent:true,opacity:0,depthWrite:false}));this.rain.name='weather-rain';this.rain.frustumCulled=false;
    const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const c=canvas.getContext('2d')!,g=c.createRadialGradient(16,16,1,16,16,15);g.addColorStop(0,'#fff');g.addColorStop(.4,'#fffffff0');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fillRect(0,0,32,32);
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(this.precipitationCount*3),3).setUsage(T.DynamicDrawUsage));
    this.snow=new T.Points(geometry,new T.PointsMaterial({map:new T.CanvasTexture(canvas),color:'#f3f7ff',size:.17,transparent:true,opacity:0,depthWrite:false}));this.snow.name='weather-snow';this.snow.frustumCulled=false;scene.add(this.rain,this.snow);
    const rp=rainGeometry.attributes.position as T.BufferAttribute,sp=geometry.attributes.position as T.BufferAttribute,tips=new Float32Array(this.precipitationCount*2),speeds=new Float32Array(this.precipitationCount*2),colors=new Float32Array(this.precipitationCount*6),snowSpeeds=new Float32Array(this.precipitationCount);
    drops.forEach((p,i)=>{rp.setXYZ(i*2,p.x,p.y,p.z);rp.setXYZ(i*2+1,p.x+p.tiltX,p.y,p.z+p.tiltZ);tips[i*2+1]=p.length;speeds[i*2]=speeds[i*2+1]=p.speed;colors.fill(p.brightness,i*6,i*6+6);sp.setXYZ(i,p.x,p.y,p.z);snowSpeeds[i]=.7+(p.speed-9)*.12;});
    rainGeometry.setAttribute('rainTip',new T.BufferAttribute(tips,1));
    rainGeometry.setAttribute('fallSpeed',new T.BufferAttribute(speeds,1));rainGeometry.setAttribute('color',new T.BufferAttribute(colors,3));(this.rain.material as T.LineBasicMaterial).vertexColors=true;
    geometry.setAttribute('fallSpeed',new T.BufferAttribute(snowSpeeds,1));
    for(const [mat,snow] of [[this.rain.material,false],[this.snow.material,true]] as const){
      (mat as T.Material).onBeforeCompile=shader=>{shader.uniforms.weatherFlow=this.flow;shader.vertexShader=`uniform float weatherFlow;attribute float fallSpeed;${snow?'':'attribute float rainTip;'}\n`+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\ntransformed.y=-7.+mod(position.y-weatherFlow*fallSpeed,56.)${snow?'':'+rainTip'};${snow?'transformed.x+=sin(weatherFlow*.5+position.z)*.65;transformed.z+=cos(weatherFlow*.4+position.x)*.4;':''}`);};
      (mat as T.Material).customProgramCacheKey=()=>`world-precipitation-${snow?'snow':'rain'}-v2`;
    }
    this.update(0,false,new T.Vector3(),1);
  }
  update(dt:number,freeze:boolean,camera:T.Vector3,day:number,reduced=false){
    const state=this.cycle.update(dt,freeze);if(!freeze)this.time+=dt*(.6+state.wind*.4)*(reduced?.45:1);
    this.flow.value=this.time;this.cloudMaterial.emissiveIntensity=.06+day*.2;
    this.cloudMaterial.color.set('#71869e').lerp(new T.Color('#fff6e5'),day).lerp(new T.Color('#46566b').lerp(new T.Color('#758897'),day),state.shade*.9).lerp(new T.Color('#93a5bf').lerp(new T.Color('#e2e9f0'),day),state.snow*.65);
    // The canopy shader has zero alpha below .24 coverage; skip the full-screen pass then.
    this.ceiling.visible=state.cover>.24;
    const uniforms=this.ceiling.material.uniforms;uniforms.time.value=this.time;uniforms.cover.value=state.cover;uniforms.tint.value.copy(this.cloudMaterial.color);
    // Opaque cloud puffs write depth, so the higher canopy cannot sort in front of them.
    this.interval+=dt;if(this.interval>.1||dt===0){this.interval=0;
      for(let i=0;i<48;i++){
        const a=i*2.39996,r=40+i%7*19,activation=i<7?1:T.MathUtils.smoothstep(state.cover,(i-7)/46,(i-7)/46+.15),size=(.001+activation)*(1+state.cover*.6);
        const x=((Math.cos(a)*r+this.time*.72+170)%340+340)%340-170,z=((Math.sin(a)*r+this.time*.25+170)%340+340)%340-170;
        const edge=T.MathUtils.smoothstep(170-Math.max(Math.abs(x),Math.abs(z)),0,16);
        for(let n=0;n<6;n++){const crown=Math.sin(n/5*Math.PI),width=2.8+Math.sin(i*1.7+n)*.6;this.pose.position.set(x+(n-2.5)*2.25*size,38+i%4*5-state.shade*9+crown*1.6*size,z+Math.sin(n*2.4+i)*1.15*size);this.pose.rotation.set(0,a+n*.3,0);this.pose.scale.set(width*size*edge,(1.05+crown*1.15)*size*edge,(2.45+Math.cos(n+i)*.4)*size*edge);this.pose.updateMatrix();this.clouds.setMatrixAt(i*6+n,this.pose.matrix);}
      }this.clouds.instanceMatrix.needsUpdate=true;
    }
    this.rain.visible=state.rain>.005;this.snow.visible=state.snow>.005;
    (this.rain.material as T.LineBasicMaterial).opacity=state.rain*.52;(this.snow.material as T.PointsMaterial).opacity=state.snow*.9;
  }
}
