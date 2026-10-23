import * as T from 'three';
import {material,mesh} from './architecture';
import {skin,tapered,type Volume} from './animal-sculpt';

const clay=(color:string)=>material(color,.88,0,'plaster');
const ivory=clay('#f5edda'),dark=clay('#343734'),rose=clay('#d79e91'),horn=clay('#826c53');
const sphere=new T.SphereGeometry(1,24,16);
const oval=(g:T.Object3D,m:T.Material,p:number[],s:number[])=>{const o=mesh(g,sphere,m,...p as [number,number,number]);o.scale.set(...s as [number,number,number]);return o;};
const sculpt=(g:T.Object3D,m:T.Material,v:Volume[],k=.035,r=.026)=>mesh(g,skin(v,k,r),m);
const tube=(g:T.Object3D,m:T.Material,p:number[][],r:number[])=>mesh(g,tapered(p,r),m);
function fur(color:string,kind:string){
  const m=clay(color),compile=m.onBeforeCompile;
  m.onBeforeCompile=(shader,renderer)=>{
    compile.call(m,shader,renderer);
    shader.vertexShader='varying vec3 coatP;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ncoatP=position;');
    shader.fragmentShader='varying vec3 coatP;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      ${kind==='deer'?`vec2 cell=vec2(coatP.z*6.7,coatP.y*7.);cell.x+=floor(cell.y)*.47;
      float spots=(1.-smoothstep(.13,.22,length(fract(cell)-.5)))*smoothstep(.92,1.02,coatP.y)*smoothstep(.12,.2,abs(coatP.x));
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.93,.84,.66),spots*.95);`:
      `float stripes=smoothstep(.55,.89,sin(coatP.z*36.+sin(coatP.y*18.)*1.3));
      diffuseColor.rgb*=1.-stripes*.27;`}`);
  };m.customProgramCacheKey=()=>`animal-skin-${kind}-v3`;return m;
}
type Limb={hip:T.Vector3;upper:T.Group;lower:T.Group;foot:T.Group;l1:number;l2:number;sign:number;width:number};
type Footing=(x:number,z:number)=>number;
/** Articulated animals in metres, forward +Z. The body has an actual continuous sculpted skin;
 * appendages overlap at anatomical joints and each planted foot is solved independently. */
export function animalModel(kind:string){
  const root=new T.Group(),body=new T.Group(),head=new T.Group(),tail=new T.Group();
  root.name=`animal-model-${kind}`;root.add(body,head,tail);
  const parts:T.Object3D[]=[body,head,tail],legs:T.Group[]=[],limbs:Limb[]=[],ears:T.Group[]=[],eyes:T.Group[]=[],wings:T.Group[]=[];
  let headBase=new T.Vector3(),headRest=0,eyePhase=kind.length*.77;
  const pivot=(parent:T.Object3D,p:number[])=>{const g=new T.Group();g.position.set(...p as [number,number,number]);parent.add(g);parts.push(g);return g;};
  const eye=(parent:T.Object3D,x:number,y:number,z:number,size:number,sideAngle=.35,iris='#9d935d')=>{
    for(const s of [-1,1]){
      const socket=pivot(parent,[s*x,y,z]);socket.rotation.y=s*sideAngle;
      oval(socket,dark,[0,0,0],[size*1.17,size*.82,size*.47]);
      const lid=pivot(socket,[0,0,.006]);eyes.push(socket);
      oval(lid,clay(iris),[0,0,size*.2],[size*.77,size*.64,size*.36]);
      oval(lid,dark,[0,0,size*.48],[size*.34,size*.59,size*.16]);
      oval(lid,ivory,[-size*.2,size*.28,size*.63],[size*.19,size*.17,size*.07]);
    }
  };
  const pinna=(parent:T.Object3D,coat:T.Material,p:number[],h:number,w:number,angle:number,round=false)=>{
    const e=pivot(parent,p);e.rotation.z=angle;e.userData.angle=angle;ears.push(e);
    if(round){
      oval(e,coat,[0,h*.35,0],[w,h*.55,w*.52]);oval(e,rose,[0,h*.36,w*.43],[w*.58,h*.32,w*.12]);
    }else{
      // Curved lenticular ear with a cupped front, not a four-sided cone.
      const v:number[]=[],indices:number[]=[],uv:number[]=[];
      const rows=12,cols=12;
      for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
        const t=j/rows,u=i/cols*2-1,pointed=['cat','fox','shiba'].includes(kind);
        const width=w*(pointed?Math.pow(1-t,.7):Math.pow(Math.sin(Math.PI*(t*.965+.035)),.85));
        v.push(u*width,t*h,.018+width*.42*(1-u*u)-t*t*.035);uv.push(i/cols,t);
        if(j<rows&&i<cols){const a=j*(cols+1)+i,b=a+cols+1;indices.push(a,a+1,b,b,a+1,b+1);}
      }
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
      const outside=coat.clone();outside.side=T.DoubleSide;mesh(e,geo,outside);
      const inner=mesh(e,geo.clone(),rose);inner.scale.set(.63,.77,1);inner.position.set(0,h*.1,.006);
    }
    return e;
  };
  const leg=(coat:T.Material,p:number[],width:number,front:boolean,hoof=false,longFoot=false)=>{
    const h=p[1],upper=pivot(root,p),lower=pivot(root,p),foot=pivot(root,[p[0],.035,p[2]]);
    const l1=h*.53,l2=h*.55;
    sculpt(upper,coat,[[0,-l1*.26,0,width*1.2,l1*.60,width*1.12],
      [0,-l1*.72,0,width*.79,l1*.33,width*.76]],width*.5,Math.max(.012,width*.27));
    oval(lower,coat,[0,0,0],[width*.64,width*.66,width*.64]);
    sculpt(lower,coat,[[0,-l2*.32,0,width*.59,l2*.40,width*.59],
      [0,-l2*.66,0,width*.46,l2*.22,width*.48]],width*.32,Math.max(.010,width*.23));
    const f=hoof?horn:coat;
    foot.userData.sole=hoof?.024:.012;
    const footHeight=hoof?.048:Math.max(.035,width*.48);
    oval(foot,f,[0,footHeight-.012,.027],[width*(hoof?1.15:1.22),footHeight,width*(longFoot?2.1:1.55)]);
    if(hoof)tube(foot,dark,[[0,.058,.072],[0,.022,.078]],[.004,.003]);
    else for(const s of [-1,1])tube(foot,hoof?dark:horn,[[s*width*.4,.035,width*1.4],[s*width*.4,.012,width*1.53]],[.003,.001]);
    limbs.push({hip:new T.Vector3(...p),upper,lower,foot,l1,l2,sign:front?-1:1,width});legs.push(upper,lower,foot);
  };
  const muzzle=(coat:T.Material,hw:number,hy:number,z:number,length:number)=>{
    sculpt(head,coat,[[0,hy,z,hw,.067,length],[0,hy+.016,z+length*.68,hw*.64,.049,length*.5]],.026,.013);
    oval(head,dark,[0,hy+.03,z+length*1.08],[hw*.52,.028,.028]);
    tube(head,horn,[[0,hy-.005,z+length*1.11],[0,hy-.028,z+length],[hw*.55,hy-.035,z+length*.7]],[.005,.004,.002]);
    tube(head,horn,[[0,hy-.028,z+length],[-hw*.55,hy-.035,z+length*.7]],[.004,.002]);
  };
  const four=['cat','deer','fox','shiba','polar-bear'].includes(kind);
  if(four){
    const deer=kind==='deer',bear=kind==='polar-bear',fox=kind==='fox',cat=kind==='cat';
    const coat=clay(bear?'#eee9d9':deer?'#b88758':fox?'#c98551':cat?'#a99b82':'#cda16b');
    const y=deer?1.02:bear?.78:.42,w=deer?.25:bear?.39:cat?.165:.19,len=deer?.47:bear?.57:.31;
    sculpt(body,deer||cat?fur(deer?'#b88758':'#a99b82',kind):coat,[
      [0,y,0,w,deer?.27:bear?.37:.20,len],
      [0,y+.025,len*.58,w*.92,deer?.30:bear?.4:.23,len*.64],
      [0,y-.015,-len*.6,w*.93,deer?.29:bear?.34:.215,len*.65],
    ],deer||bear?.09:.052,deer||bear?.044:.025);
    if(!cat)oval(body,ivory,[0,y-.11,len*.66],[w*.72,deer?.22:bear?.27:.15,len*.37]);
    for(const z of [-len*.63,len*.64])for(const s of [-1,1])
      leg(coat,[s*w*.71,deer?.85:bear?.56:.29,z],deer?.063:bear?.14:cat?.046:.053,z>0,deer);
    head.position.set(0,deer?1.04:bear?.85:.49,deer?.34:bear?.49:.28);
    const hy=deer?.36:bear?.17:.1,hw=deer?.155:bear?.245:fox?.137:.16,hz=deer?.14:bear?.19:.07;
    sculpt(head,coat,[
      [0,0,-.045,deer?.14:bear?.24:.115,deer?.23:bear?.24:.15,deer?.17:bear?.27:.17],
      [0,hy,hz,hw,deer?.20:bear?.215:.152,deer?.20:bear?.27:.165],
      [0,hy-.06,hz+(cat?.005:.08),hw*.85,.115,deer?.19:bear?.23:cat?.105:.13],
    ],deer||bear?.055:.038,deer||bear?.026:.018);
    if(cat){
      for(const s of [-1,1])oval(head,ivory,[s*.05,hy-.066,hz+.134],[.069,.045,.05]);
      const nose=oval(head,rose,[0,hy-.039,hz+.19],[.024,.017,.018]);
      nose.rotation.z=Math.PI;for(const s of [-1,1])for(let i=0;i<3;i++)
        tube(head,ivory,[[s*.065,hy-.061,hz+.163],[s*.18,hy-.04-i*.022,hz+.175],[s*.26,hy-.02-i*.035,hz+.146]],[.0027,.0015,.0005]);
      for(const s of [-1,1])tube(head,horn,[[0,hy-.051,hz+.191],[0,hy-.078,hz+.18],[s*.042,hy-.085,hz+.173]],[.004,.003,.001]);
    }else muzzle(deer?coat:ivory,deer?.07:bear?.125:fox?.055:.081,hy-.074,hz+(bear?.19:deer?.19:.16),fox?.147:bear?.14:deer?.14:.10);
    if(fox)for(const s of [-1,1]){
      const cheek=oval(head,ivory,[s*.074,hy-.061,hz+.112],[.063,.059,.056]);cheek.rotation.z=s*.35;
    }
    eye(head,hw*.72,hy+.025,hz+hw*.72,deer?.028:bear?.031:.030,deer?.9:.47,cat?'#a6af78':'#927857');
    for(const s of [-1,1]){
      if(bear)pinna(head,coat,[s*.205,hy+.15,hz-.06],.16,.085,-s*.26,true);
      else pinna(head,coat,[s*hw*.76,hy+.11,hz-.045],deer?.28:fox?.215:cat?.16:.19,deer?.073:fox?.081:.083,-s*(deer?.8:.20));
      if(deer){
        tube(head,horn,[[s*.085,hy+.14,hz-.06],[s*.13,hy+.34,hz-.11],[s*.20,hy+.54,hz-.12],[s*.25,hy+.69,hz-.05]],[.030,.024,.015,.002]);
        tube(head,horn,[[s*.14,hy+.38,hz-.11],[s*.09,hy+.49,hz+.015],[s*.075,hy+.57,hz+.09]],[.017,.011,.001]);
        tube(head,horn,[[s*.205,hy+.55,hz-.115],[s*.32,hy+.60,hz-.16],[s*.36,hy+.66,hz-.12]],[.016,.01,.001]);
      }
      if(kind==='shiba')oval(head,ivory,[s*.10,hy+.066,hz+.136],[.045,.022,.013]);
    }
    tail.position.set(0,y,-len*.83);
    if(cat)tube(tail,coat,[[0,0,0],[.04,.10,-.15],[.1,.30,-.19],[.06,.43,-.16],[-.025,.45,-.12]],[.05,.044,.037,.028,.004]);
    else if(fox){
      tube(tail,coat,[[0,0,0],[.05,-.12,-.2],[.09,-.12,-.39],[.13,-.06,-.53]],[.065,.143,.12,.027]);
      tube(tail,ivory,[[.085,-.127,-.37],[.115,-.08,-.48],[.13,-.035,-.58]],[.12,.085,.002]);
    }else if(kind==='shiba')tube(tail,coat,[[0,0,0],[.01,.2,-.1],[.13,.26,-.08],[.18,.16,.025],[.11,.1,.06]],[.072,.067,.063,.051,.009]);
    else if(deer)tube(tail,ivory,[[0,.055,0],[0,.04,-.12],[0,-.025,-.23]],[.067,.07,.003]);
    else oval(tail,coat,[0,.08,-.07],[.10,.11,.11]);
  }else if(kind==='rabbit'){
    sculpt(body,ivory,[[0,.25,-.09,.205,.23,.26],[0,.30,.1,.155,.19,.16]],.07);
    head.position.set(0,.39,.19);sculpt(head,ivory,[[0,.06,.02,.153,.15,.15],[0,.001,.12,.099,.081,.102]],.038,.018);
    eye(head,.108,.089,.108,.025,.70,'#ac836d');oval(head,rose,[0,.014,.219],[.019,.015,.012]);
    for(const s of [-1,1]){pinna(head,ivory,[s*.066,.162,-.01],.34,.05,-s*.18);leg(ivory,[s*.12,.15,-.15],.079,false,false,true);leg(ivory,[s*.089,.23,.16],.038,true);}
    tail.position.set(0,.26,-.34);oval(tail,ivory,[0,0,0],[.086,.079,.076]);
  }else if(kind==='tortoise'){
    const green=clay('#83987a'),shell=clay('#8a8c60');
    sculpt(body,shell,[[0,.24,-.025,.284,.205,.32]],.01);
    oval(body,horn,[0,.125,-.02],[.287,.055,.324]);
    // Hexagonal scute boundaries follow the shell surface.
    for(const [x,z,r] of [[0,0,.10],[-.155,-.12,.085],[.155,-.12,.085],[-.15,.11,.085],[.15,.11,.085],[0,.21,.07],[0,-.23,.06]]){
      const p=Array.from({length:7},(_,i)=>{const a=i*Math.PI/3,px=x+Math.sin(a)*r,pz=z+Math.cos(a)*r;return [px,.24+.207*Math.sqrt(Math.max(.02,1-(px/.29)**2-((pz+.025)/.33)**2)),pz];});
      tube(body,horn,p,[.005,.005]);
    }
    head.position.set(0,.19,.29);sculpt(head,green,[[0,0,0,.061,.06,.12],[0,.015,.12,.089,.077,.10]],.025,.018);
    eye(head,.067,.041,.157,.018,.8,'#b8a975');
    for(const z of [-.17,.18])for(const s of [-1,1])leg(green,[s*.22,.12,z],.051,z>0);
    tail.position.set(0,.15,-.30);tube(tail,green,[[0,0,0],[0,-.045,-.10],[0,-.065,-.16]],[.035,.020,.001]);
  }else if(kind==='heron'){
    const slate=clay('#879fa5'),wing=clay('#607b87');
    sculpt(body,slate,[[0,.85,-.075,.16,.235,.28],[0,.94,.08,.12,.17,.15]],.045);
    head.position.set(0,.99,.13);
    tube(head,ivory,[[0,-.07,-.015],[0,.07,.1],[0,.24,-.05],[0,.39,.06],[0,.43,.15]],[.078,.066,.053,.054,.055]);
    sculpt(head,ivory,[[0,.43,.16,.086,.082,.122]],.01,.015);
    tube(head,horn,[[0,.42,.24],[0,.413,.39],[0,.408,.50]],[.04,.023,.001]);eye(head,.071,.452,.206,.015,1.05,'#d3af5d');
    for(const s of [-1,1]){
      tube(head,dark,[[s*.057,.48,.14],[s*.052,.47,-.005],[s*.047,.40,-.12]],[.016,.012,.001]);
      const w=pivot(body,[s*.123,.92,-.03]);wings.push(w);
      for(let i=0;i<5;i++){const feather=oval(w,wing,[s*i*.011,-i*.018,-.03-i*.035],[.048,.14,.17]);feather.rotation.x=-.28;}
      leg(horn,[s*.072,.76,0],.021,true);
      const foot=limbs[limbs.length-1].foot;
      for(const j of [-1,0,1])tube(foot,horn,[[0,.012,.035],[j*.05,.008,.125],[j*.07,.004,.19]],[.012,.008,.001]);
    }
    tail.position.set(0,.84,-.24);tube(tail,wing,[[0,0,0],[0,-.025,-.15],[0,-.07,-.23]],[.08,.052,.001]);
  }else if(kind==='penguin'){
    const slate=clay('#536e7b'),beak=clay('#b99462');
    sculpt(body,slate,[[0,.33,-.018,.207,.30,.175],[0,.57,.008,.157,.20,.149]],.075);
    oval(body,ivory,[0,.35,.108],[.16,.265,.079]);
    head.position.set(0,.63,.018);sculpt(head,slate,[[0,.03,0,.153,.15,.142]],.01,.02);
    for(const s of [-1,1])oval(head,ivory,[s*.083,.001,.10],[.055,.080,.039]);
    eye(head,.086,.039,.131,.024,.45,'#aa9472');tube(head,beak,[[0,-.022,.13],[0,-.03,.205],[0,-.04,.24]],[.042,.036,.001]);
    for(const s of [-1,1]){
      const w=pivot(body,[s*.18,.46,0]);wings.push(w);w.userData.side=s;
      tube(w,slate,[[0,0,0],[s*.08,-.17,-.015],[s*.095,-.28,.015]],[.050,.049,.005]);
      leg(beak,[s*.105,.10,0],.06,true,false,true);
    }
    tail.position.set(0,.20,-.15);tube(tail,slate,[[0,0,0],[0,-.07,-.13]],[.085,.002]);
  }else{
    const shell=clay('#c8886e'),edge=clay('#e0ac8b');
    sculpt(body,shell,[[0,.185,0,.255,.105,.191],[0,.2,.068,.217,.085,.155]],.04,.024);
    tube(body,edge,[[-.23,.175,.08],[-.13,.163,.176],[0,.16,.205],[.13,.163,.176],[.23,.175,.08]],[.012,.012]);
    for(const s of [-1,1]){
      for(let i=0;i<4;i++){
        const l=pivot(root,[s*.18,.17,.12-i*.085]);legs.push(l);l.userData.side=s;l.userData.index=i;
        tube(l,shell,[[0,0,0],[s*.16,.025,-.03],[s*.31,-.17,-.065]],[.029,.022,.002]);
      }
      const claw=pivot(body,[s*.20,.19,.12]);wings.push(claw);claw.userData.side=s;
      tube(claw,shell,[[0,0,0],[s*.105,.04,.12],[s*.10,.06,.19]],[.032,.03,.035]);
      oval(claw,shell,[s*.105,.055,.21],[.075,.065,.093]);
      for(const j of [-1,1])tube(claw,edge,[[s*.105+j*.045,.061,.25],[s*.105+j*.055,.067,.33],[s*.105+j*.016,.062,.35]],[.029,.023,.002]);
      tube(head,shell,[[s*.095,.23,.1],[s*.12,.34,.13]],[.022,.015]);
    }
    eye(head,.12,.355,.145,.031,.16,'#b7a27b');
  }
  headBase.copy(head.position);headRest=head.rotation.x;
  parts.forEach(p=>p.userData.dynamic=true);
  const bodyBase=body.position.clone(),tailBase=tail.rotation.clone();
  let blendMood='',moodMix=0,lastTime=0,moveBlend=0,airBlend=0;
  return {root,head,tail,legs,parts,animate(phase:number,moving:number,headYaw:number,mood:string,time:number,footing?:Footing,gait={run:0,air:false}){
    const dt=Math.max(0,Math.min(.1,time-lastTime));lastTime=time;
    moveBlend=T.MathUtils.damp(moveBlend,moving,12,dt);
    airBlend=T.MathUtils.damp(airBlend,gait.air?1:0,12,dt);
    if(blendMood!==mood){blendMood=mood;moodMix=0;}moodMix=Math.min(1,moodMix+dt*3);
    const pet=mood==='pet'?moodMix:0,sniff=['sniff','graze','forage'].includes(mood)?moodMix:0;
    const groom=['groom','preen'].includes(mood)?moodMix:0,stretch=mood==='stretch'?moodMix:0;
    const hop=kind==='rabbit'?Math.max(0,Math.sin(phase))*moveBlend*.075:0;
    const bob=hop+Math.sin(phase*2)*moveBlend*.008,breath=Math.sin(time*2.1)*.004;
    body.position.copy(bodyBase);body.position.y+=bob+breath;
    body.scale.y=1+Math.sin(time*2.1)*.009;
    body.rotation.x=stretch*.085;body.rotation.z=kind==='penguin'?Math.sin(phase)*moveBlend*.075:0;
    head.position.copy(headBase);head.position.y+=bob+breath;
    const targetPitch=headRest+sniff*(kind==='deer'?.7:.24)+stretch*.16-pet*.14+groom*.25;
    head.rotation.x=T.MathUtils.damp(head.rotation.x,targetPitch+Math.sin(time*3.4)*sniff*.065,9,dt);
    head.rotation.y=T.MathUtils.damp(head.rotation.y,headYaw+groom*Math.sin(time*2)*.65,9,dt);
    head.rotation.z=T.MathUtils.damp(head.rotation.z,pet*Math.sin(time*3.5)*.13+(mood==='watch'?Math.sin(time*1.8)*.075:0),8,dt);
    const blinkCycle=(time+eyePhase)%4.1,blink=blinkCycle<.16?Math.abs(blinkCycle-.08)/.08:1;
    eyes.forEach(e=>e.scale.y=Math.max(.06,blink*(1-pet*.48)));
    ears.forEach((e,i)=>{
      e.rotation.z=e.userData.angle+Math.sin(time*2.5+i*2)*pet*.12;
      e.rotation.y=Math.sin(time*.85+i*2)*.12+Math.pow(Math.max(0,Math.sin(time*3.1+i)),14)*.17;
    });
    tail.rotation.copy(tailBase);tail.rotation.y=Math.sin(time*(pet?7:2.3))*(pet?.32:kind==='shiba'?.18:.08);
    tail.rotation.x=Math.sin(time*1.8)*.035;
    limbs.forEach((l,i)=>{
      const offset=kind==='rabbit'?(i<2?0:.9):limbs.length===2?i*Math.PI:((i===0||i===3)?0:Math.PI);
      const t=phase+offset,swing=Math.max(0,Math.sin(t)),stride=(kind==='deer'?.20:kind==='polar-bear'?.16:kind==='heron'?.12:.075)*moveBlend*(1+gait.run*.45)*(1-airBlend);
      const z=l.hip.z+Math.cos(t)*stride,x=l.hip.x,y=(footing?.(x,z)??0)+l.foot.userData.sole+swing*moveBlend*(kind==='heron'?.12:.07)+hop+airBlend*.18;
      const lift=groom&&i===2?.10*groom:0,hipY=l.hip.y+bob;
      const dy=y+lift-hipY,dz=z-l.hip.z,distance=Math.hypot(dy,dz);
      const d=Math.max(.001,Math.min(l.l1+l.l2-.0001,distance)),ny=distance>.0001?dy/distance:-1,nz=distance>.0001?dz/distance:0;
      const along=(l.l1*l.l1-l.l2*l.l2+d*d)/(2*d),bend=Math.sqrt(Math.max(0,l.l1*l.l1-along*along))*l.sign;
      const ky=ny*along-nz*bend,kz=nz*along+ny*bend;
      l.upper.position.set(x,hipY,l.hip.z);l.upper.rotation.x=Math.atan2(-kz,-ky);
      l.lower.position.set(x,hipY+ky,l.hip.z+kz);l.lower.rotation.x=Math.atan2(-(dz-kz),-(dy-ky));
      l.foot.position.set(x,y+lift,z);l.foot.rotation.x=-swing*moveBlend*.18;
    });
    if(kind==='crab')legs.forEach((l,i)=>{
      l.rotation.z=Math.sin(phase+i*Math.PI*.55)*moveBlend*.20;l.rotation.y=Math.cos(phase+i*Math.PI*.55)*moveBlend*.19;
      l.position.y=.173+Math.max(0,-Math.sin(l.rotation.z)*l.userData.side*.31);
    });
    wings.forEach((w,i)=>{
      w.rotation.z=kind==='penguin'?(w.userData.side??1)*(-.08+Math.sin(time*3)*.08+pet*.45):kind==='crab'?Math.sin(time*2+i)*.12:Math.sin(time*1.7+i)*.018+groom*.20;
      if(kind==='crab')w.rotation.x=Math.sin(time*2.5+i)*.14+pet*.25;
    });
  }};
}
