import * as T from 'three';
import {groundHeight} from '../../shared/terrain-height.mjs';
import {seededRandom} from '../../shared/living-catalog.mjs';
import type {Region} from '../core/types';

/** Remote funnel and local ice share the weather clock, independent of camera/player motion. */
export class WeatherWonders{
  private funnel:T.Mesh<T.CylinderGeometry,T.ShaderMaterial>;
  private spray:T.Mesh<T.PlaneGeometry,T.ShaderMaterial>;
  private hail:T.InstancedMesh;private hailMaterial:T.MeshStandardMaterial;
  private flow={value:0};private strength={value:0};
  constructor(scene:T.Scene,regions:Region[]){
    const funnelMaterial=new T.ShaderMaterial({side:T.DoubleSide,transparent:true,depthWrite:false,uniforms:{time:this.flow,amount:{value:0},day:{value:1}},
      vertexShader:`uniform float time;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;float h=uv.y;
        p.xz*= (.65+11.35*pow(h,2.15))/(.65+11.35*h);
        p.xz*=1.+sin(uv.x*25.13-h*12.+time*.45)*.06;
        p.x+=sin(h*4.+time*.23)*h*3.;p.z+=cos(h*3.+time*.19)*h*2.;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader:`uniform float time,amount,day;varying vec2 vUv;
        void main(){float h=vUv.y;
          float sweep=.5+.5*sin(vUv.x*31.4159-h*28.+time*1.4+sin(h*19.-time*.5));
          float wisps=.5+.5*sin(vUv.x*75.398-h*47.+time*1.1);
          float edge=smoothstep(0.,.045,h)*(1.-smoothstep(.7,1.,h));
          vec3 tint=mix(vec3(.13,.2,.27),vec3(.34,.45,.48),day);
          gl_FragColor=vec4(tint*(.76+sweep*.24),amount*edge*(.3+sweep*.3+wisps*.1));
          #include <colorspace_fragment>
        }`});
    this.funnel=new T.Mesh(new T.CylinderGeometry(12,.65,43,64,30,true),funnelMaterial);
    this.funnel.name='distant-tornado';this.funnel.position.set(-135,15.85,-105);scene.add(this.funnel);
    this.spray=new T.Mesh(new T.PlaneGeometry(11,11),new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:funnelMaterial.uniforms,
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`uniform float time,amount,day;varying vec2 vUv;void main(){vec2 p=vUv-.5;float r=length(p),a=atan(p.y,p.x);
        float ring=exp(-pow((r-.2)*13.,2.))*(.6+.4*sin(a*7.-r*30.+time*.8));
        gl_FragColor=vec4(mix(vec3(.2,.34,.4),vec3(.78,.9,.84),day),ring*amount*.48);
        #include <colorspace_fragment>
      }`}));
    this.spray.rotation.x=-Math.PI/2;this.spray.position.set(-135,-5.57,-105);this.spray.name='tornado-sea-spray';scene.add(this.spray);
    this.hailMaterial=new T.MeshStandardMaterial({color:'#d7e7e6',roughness:.4,transparent:true,opacity:1,depthWrite:false});
    this.hailMaterial.onBeforeCompile=shader=>{
      shader.uniforms.hailTime=this.flow;shader.uniforms.hailStrength=this.strength;
      shader.vertexShader='uniform float hailTime;attribute float fallOffset;varying float vHailFade;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        float age=mod(hailTime+fallOffset,3.);
        float falling=max(0.,1.7-age)*15.;
        float bounceAge=max(0.,age-1.7);
        float bounce=abs(sin(bounceAge*8.5))*exp(-bounceAge*3.)*.7;
        transformed.y+=falling+bounce;
        vHailFade=smoothstep(0.,.13,age)*(1.-smoothstep(2.5,2.95,age));`);
      shader.fragmentShader='uniform float hailStrength;varying float vHailFade;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=hailStrength*vHailFade;');
    };
    this.hailMaterial.customProgramCacheKey=()=> 'bouncing-ice-v1';
    const random=seededRandom(71892),count=620,geometry=new T.OctahedronGeometry(.065),offset=new Float32Array(count);
    this.hail=new T.InstancedMesh(geometry,this.hailMaterial,count);this.hail.name='weather-hail';this.hail.frustumCulled=false;
    const pose=new T.Object3D(),places=[{position:[0,0],radius:9},...regions];
    for(let i=0;i<count;i++){
      const region=places[i%places.length],angle=random()*Math.PI*2,r=Math.sqrt(random())*(region.radius-.9);
      const x=region.position[0]+Math.cos(angle)*r,z=region.position[1]+Math.sin(angle)*r;
      pose.position.set(x,groundHeight(x,z,regions)+.07,z);pose.rotation.set(random()*3,random()*3,random()*3);pose.scale.setScalar(.65+random()*.65);pose.updateMatrix();this.hail.setMatrixAt(i,pose.matrix);offset[i]=random()*3;
    }
    // The fall runs along world Y, so instance orientation must not rotate that displacement.
    for(let i=0;i<count;i++){this.hail.getMatrixAt(i,pose.matrix);pose.matrix.decompose(pose.position,pose.quaternion,pose.scale);pose.rotation.set(0,pose.rotation.y,0);pose.updateMatrix();this.hail.setMatrixAt(i,pose.matrix);}
    geometry.setAttribute('fallOffset',new T.InstancedBufferAttribute(offset,1));scene.add(this.hail);
  }
  update(time:number,state:{tornado:number;hail:number},day:number){
    this.flow.value=time;this.strength.value=state.hail;this.hail.visible=state.hail>.005;
    this.funnel.visible=this.spray.visible=state.tornado>.005;this.funnel.material.uniforms.amount.value=state.tornado;this.funnel.material.uniforms.day.value=day;
  }
}
