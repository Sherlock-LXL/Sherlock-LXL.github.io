import {catSculpture} from './cat-sculpture';
import {worldMirror} from './mirror';
import * as T from 'three';
import {surfaceMaterial} from './surfaces';
import {kit,place,roof,column,podium,beam,drumStool,scholarRock,bamboo,paintedTree,formForColor} from './vernacular';
import {pigmentAccent,exact} from './ink';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { artwork } from './artwork';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
type Palette={main:T.MeshStandardMaterial;dark:T.MeshStandardMaterial;glow:T.MeshStandardMaterial;stone:T.MeshStandardMaterial};
export const material=surfaceMaterial;
export function mesh(parent:T.Object3D,geo:T.BufferGeometry,mat:T.Material,x=0,y=0,z=0) {
  const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
export function softBox(w:number,h:number,d:number){
  const edge=Math.min(w,h,d);return edge<.12?new T.BoxGeometry(w,h,d):new RoundedBoxGeometry(w,h,d,edge>.5?3:2,Math.min(.12,edge*.22));
}
const box=(g:T.Object3D,p:Palette,w:number,h:number,d:number,x=0,y=0,z=0,mat=p.main)=>mesh(g,softBox(w,h,d),mat,x,y,z);
function ring(g:T.Object3D,r:number,y:number,mat:T.Material) {const m=mesh(g,new T.TorusGeometry(r,0.06,12,80),mat,0,y,0);m.rotation.x=Math.PI/2;return m;}
const foliageGeometry=new T.SphereGeometry(1,24,16);
{const p=foliageGeometry.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=1+.065*Math.sin(x*9+y*5)*Math.cos(z*8-y*3)+.04*Math.sin(x*18-z*21);p.setXYZ(i,x*r,y*r,z*r);}foliageGeometry.computeVertexNormals();}
// Hand-sculpted trunk: taper + two side limbs + root flare + crown stub.
const woodGeometry=(()=>{
  const parts:T.BufferGeometry[]=[new T.CylinderGeometry(.09,.22,2.1,14).translate(0,1.05,0)];
  for(const side of [-1,1]){
    parts.push(new T.CylinderGeometry(.038,.08,.95,10).rotateZ(-side*.65).translate(side*.26,1.72,side*.03));
    parts.push(new T.CylinderGeometry(.028,.055,.55,8).rotateZ(-side*.9).rotateX(side*.3).translate(side*.17,2.25,-.14));
    parts.push(new T.SphereGeometry(.21,12,8).scale(1,.42,1.35).translate(side*.14,.058,.07));
    parts.push(new T.SphereGeometry(.18,10,6).scale(1.1,.38,1).translate(side*.19,.05,-.14));
  }
  parts.push(new T.CylinderGeometry(.03,.07,.42,8).translate(0,2.32,.03));
  return mergeGeometries(parts)!;
})();
const barkMaterial=material('#9d8468',.95,.02,'wood');
const foliageMaterials=new Map<string,T.MeshStandardMaterial>();
/** Every caller's foliage colour maps onto one of the painted tree forms. */
export function tree(g:T.Object3D,x:number,z:number,scale=1,color='#b0d9be') {
  paintedTree(g,x,z,scale*.92,formForColor(color));
}
/** The earlier puff-crown tree, retained for small decorative accents. */
export function puffTree(g:T.Object3D,x:number,z:number,scale=1,color='#b0d9be') {
  mesh(g,woodGeometry,barkMaterial,x,0,z).scale.setScalar(scale);
  if(!foliageMaterials.has(color))foliageMaterials.set(color,material(color,.92,0,'foliage'));
  if(!foliageMaterials.has(color+'-shade'))foliageMaterials.set(color+'-shade',material(new T.Color(color).multiplyScalar(.78).getStyle(),1,0,'foliage'));
  const leaves=foliageMaterials.get(color)!,shade=foliageMaterials.get(color+'-shade')!;
  // Layered puff cloud: six main crowns, three deeper interior shadows for volume.
  const bursts=[[-.5,2.0,-.08,.95,.86,.86,leaves],[.52,2.14,.12,.9,.88,.82,leaves],[-.1,2.35,.38,.92,.86,.84,leaves],[.08,2.72,-.14,.86,.78,.82,leaves],[-.42,2.52,.24,.78,.74,.8,leaves],[.46,2.46,-.24,.82,.78,.8,leaves],[0,2.1,-.04,.72,.65,.68,shade],[-.22,2.42,.08,.68,.6,.66,shade],[.26,2.3,.14,.66,.62,.64,shade]];
  for(const [dx,dy,dz,sx,sy,sz,mat] of bursts){
    const leaf=mesh(g,foliageGeometry,mat as T.MeshStandardMaterial,x+(dx as number)*scale,(dy as number)*scale,z+(dz as number)*scale);
    leaf.scale.set((sx as number)*scale,(sy as number)*scale,(sz as number)*scale);
    leaf.rotation.set((dx as number)*.3,(dz as number)*.6,(dy as number)*.1);
  }
}
/** Small bronze wind bell, hung from eave corners. */
const windBell=new T.LatheGeometry([[0,.2],[.035,.2],[.06,.15],[.07,.05],[.09,0],[0,0]].map(([r,h])=>new T.Vector2(r,h)),10);
const serif='"Songti SC","STSong","Noto Serif CJK SC","Source Han Serif SC","SimSun",serif';
/** A hanging scroll: silk mount, paper field, one poem in vertical columns, a seal and a label. */
function hangingScroll(label:string,lines:string[],mount:string){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=768;const c=canvas.getContext('2d')!;
  c.fillStyle=mount;c.fillRect(0,0,256,768);c.fillStyle='#efe6cf';c.fillRect(26,86,204,600);
  c.strokeStyle='rgba(60,48,36,.35)';c.lineWidth=2;c.strokeRect(26,86,204,600);
  c.fillStyle='#2b2824';c.textAlign='center';c.textBaseline='middle';c.font=`600 34px ${serif}`;
  lines.forEach((line,col)=>[...line].forEach((ch,i)=>c.fillText(ch,190-col*44,140+i*46)));
  c.fillStyle='#b23e2c';c.fillRect(48,600,36,36);c.fillStyle='#f3ead7';c.font=`700 26px ${serif}`;c.fillText(label,66,619);
  c.fillStyle='#f3ead7';c.font=`600 30px ${serif}`;c.fillText(label,128,44);
  const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;
}
const builders:Record<string,(g:T.Group,p:Palette)=>void>={
  /** XiangLM: a seven-storey sutra pagoda, its lattices lit from within, bells at every eave corner. */
  tower(g,p) {
    podium(g,4.6,4.6,.55,0,0,.07);
    let y=.62;
    for(let i=0;i<7;i++){
      const w=3.3-i*.27,h=1.05-i*.03,half=w/2,top=i===6;
      place(g,new T.BoxGeometry(w-.16,h,w-.16),kit.plaster(),0,y+h/2,0);
      for(const sx of [-1,1])for(const sz of [-1,1])place(g,new T.CylinderGeometry(.085,.1,h,8),kit.lacquer(),sx*(half-.06),y+h/2,sz*(half-.06));
      for(let f=0;f<4;f++){const face=new T.Group();face.rotation.y=f*Math.PI/2;g.add(face);
        place(face,new T.BoxGeometry(w*.44,h*.7,.06),kit.lattice(),0,y+h*.42,half-.06);
        for(const s of [-1,1])place(face,new T.BoxGeometry(w*.16,h*.36,.05),kit.lattice(),s*w*.33,y+h*.55,half-.065);}
      place(g,new T.BoxGeometry(w+.06,.14,w+.06),kit.beam(),0,y+h+.07,0);
      const lift=top?.34:.26,overhang=.55-i*.02,eave=y+h+.14;
      roof(g,{width:w,depth:w,height:top?.95:.36,overhang,lift,y:eave,thickness:.1,material:kit.tileGreen()});
      const reach=(half+overhang)*.97;
      for(const sx of [-1,1])for(const sz of [-1,1])place(g,windBell,kit.bronze(),sx*reach,eave+lift-.3,sz*reach).castShadow=false;
      // The next storey rises from inside this roof, so its wall emerges from the tiles with no gap.
      y+=h+(top?0:.14);
    }
    // Spire: a mast threaded with seven bronze rings, crowned by a gilded pearl that keeps a faint light.
    const crown=y+.14+.95;
    place(g,new T.CylinderGeometry(.05,.07,1.5,8),kit.bronze(),0,crown+.7);
    for(let k=0;k<7;k++)place(g,new T.CylinderGeometry(.24-k*.018,.24-k*.018,.05,16),kit.bronze(),0,crown+.2+k*.15).castShadow=false;
    place(g,new T.SphereGeometry(.2,16,12),kit.gold(),0,crown+1.5);
    mesh(g,new T.SphereGeometry(.11,12,8),p.glow,0,crown+1.78).castShadow=false;
  },
  /** Cat recognition: a bamboo court behind a whitewashed wall; a paper-white cat sleeps on a flat stone. */
  forest(g,p) {
    void p;
    [[-2,-1],[2,-1],[0,-2.5]].forEach(([x,z],i)=>bamboo(g,x,z,{height:4.3+i*.25,culms:9,radius:.2,y:.07,seed:i+3}));
    // The wall foots below the dais rim, so its ends meet the terrace beyond the dais.
    const wall=new T.Group();wall.position.set(0,0,-3.6);g.add(wall);
    place(wall,new T.BoxGeometry(4.28,.4,.3),kit.stoneDark(),0,.1);
    place(wall,new T.BoxGeometry(4.2,2.4,.24),kit.plaster(),0,1.5);
    roof(wall,{width:4.2,depth:.24,height:.2,overhang:.2,lift:.05,thickness:.06,y:2.7});
    for(const s of [-1,1]){
      const window=place(wall,new T.CircleGeometry(.68,40),kit.lattice(),0,1.55,s*.135);window.rotation.y=s>0?0:Math.PI;window.castShadow=false;
      place(wall,new T.TorusGeometry(.72,.07,6,40),kit.stoneDark(),0,1.55,s*.14);
    }
    place(g,new T.CylinderGeometry(1,1.08,.2,9),kit.rock(),0,.17,1);
    const cat=catSculpture();cat.position.y=.27;g.add(cat);
    // Ink paw prints wander in from the visitors' side.
    for(const [i,[x,z,a]] of [[-.5,3.5,.2],[.35,2.9,-.15],[-.3,2.3,.1]].entries()){
      const paw=new T.Group();paw.position.set(x,.07,z);paw.rotation.y=a+(i%2?.2:-.2);g.add(paw);
      place(paw,new T.CylinderGeometry(.12,.12,.03,12),kit.ink(),0,.015,0).castShadow=false;
      for(const [tx,tz] of [[-.13,-.14],[-.045,-.2],[.045,-.2],[.13,-.14]])place(paw,new T.CylinderGeometry(.045,.045,.03,8),kit.ink(),tx,.015,tz).castShadow=false;
    }
  },
  /** Emotion recognition: a round bronze mirror in a seated screen; seven enamel medallions for the seven emotions. */
  mirror(g,p) {
    void p;
    podium(g,4.5,3,.4,0,0,.07);
    const frame=kit.timber(),y0=.47;
    for(const x of [-1.93,1.93]){
      place(g,new T.BoxGeometry(.24,4.9,.3),frame,x,y0+2.45,0);
      // Carved feet hold the posts upright.
      place(g,new T.BoxGeometry(.42,.34,1.5),frame,x,y0+.17,0);
      for(const s of [-1,1])place(g,new T.SphereGeometry(.12,10,6),frame,x,y0+.36,s*.62).scale.set(1,.6,1.4);
    }
    place(g,new T.BoxGeometry(4.1,.26,.32),frame,0,y0+4.85,0);
    place(g,new T.BoxGeometry(4.1,.2,.32),frame,0,y0+.72,0);
    place(g,new T.BoxGeometry(3.62,.5,.1),kit.lattice(),0,y0+.37,0);
    place(g,new T.BoxGeometry(3.62,3.9,.16),kit.ink(),0,y0+2.77,0);
    const centre=y0+2.72;
    const mirror=worldMirror(3.3,3.3,true);mirror.position.set(0,centre,.2);g.add(mirror);
    place(g,new T.TorusGeometry(1.69,.1,8,72),kit.bronze(),0,centre,.19);
    const enamel=['#b8432f','#dcb04c','#4f9a80','#3f6f8f','#7d5a8e','#d58b52','#5b554c'];
    enamel.forEach((c,i)=>{const medal=place(g,new T.CylinderGeometry(.12,.12,.05,20),material(c,.4,.05),-1.5+i*.5,y0+4.85,.18);medal.rotation.x=Math.PI/2;place(g,new T.TorusGeometry(.12,.022,5,20),kit.gold(),-1.5+i*.5,y0+4.85,.2).castShadow=false;});
    // A gilded sun disc crowns the screen.
    place(g,new T.CylinderGeometry(.34,.34,.1,32),kit.gold(),0,y0+5.3,0).rotation.x=Math.PI/2;
    for(const s of [-1,1]){const flame=place(g,new T.ConeGeometry(.08,.34,6),kit.gold(),s*.42,y0+5.08,0);flame.rotation.z=s*.9;}
  },
  /** Double-blind poetry: a moon arch draped in wisteria, a painting table, and two unsigned scrolls marked 甲 and 乙. */
  garden(g,p) {
    void p;
    for(const x of [-2,2]){place(g,new T.BoxGeometry(.34,3.7,.42),kit.stone(),x,.07+1.85,0);place(g,new T.BoxGeometry(.48,.18,.56),kit.stoneDark(),x,.16,0);}
    place(g,new T.TorusGeometry(2,.2,6,40,Math.PI),kit.stone(),0,3.77,0);
    const vine=material('#4f7d5e',.95,0,'foliage'),bloom=material('#9a7bb5',.9,0,'foliage'),bloomPale=material('#c4aed6',.9,0,'foliage');
    for(let i=1;i<15;i++){
      const a=i*Math.PI/15,x=Math.cos(a)*2,y=3.77+Math.sin(a)*2;
      const leaf=mesh(g,new T.IcosahedronGeometry(.2,0),vine,x,y+.05,.08);leaf.scale.set(1.4,.6,1.1);leaf.rotation.z=a;
      if(i%2===0)for(const z of [-.12,.18]){const raceme=mesh(g,new T.ConeGeometry(.08,.48+(i%3)*.12,6),i%4?bloom:bloomPale,x,y-.32-(i%3)*.06,z);raceme.rotation.x=Math.PI;raceme.castShadow=false;}
    }
    // A painting table with a handscroll, inkstone and brush pot.
    const top=.07+.8;
    place(g,new T.BoxGeometry(2.6,.08,1.1),kit.timber(),0,top,0);
    for(const sx of [-1,1])for(const sz of [-1,1])place(g,new T.BoxGeometry(.08,.76,.08),kit.timber(),sx*1.18,.07+.38,sz*.44);
    for(const sx of [-1,1])place(g,new T.BoxGeometry(.06,.06,.9),kit.timber(),sx*1.18,.2,0);
    const paper=place(g,new T.BoxGeometry(1.3,.006,.36),kit.paper(),-.15,top+.043,.12);paper.castShadow=false;
    for(let k=0;k<9;k++)place(g,new T.BoxGeometry(.012,.004,.26),kit.ink(),-.7+k*.12,top+.048,.12).castShadow=false;
    for(const x of [-.82,.52])place(g,new T.CylinderGeometry(.035,.035,.42,8),kit.lacquer(),x,top+.075,.12).rotation.x=Math.PI/2;
    place(g,new T.BoxGeometry(.28,.05,.2),kit.ink(),.85,top+.065,.15);
    place(g,new T.CylinderGeometry(.08,.07,.22,12),kit.celadon(),.88,top+.15,-.25);
    for(let k=0;k<4;k++){const brush=place(g,new T.CylinderGeometry(.008,.01,.36,5),kit.timberLight(),.88+(k-1.5)*.025,top+.32,-.25);brush.rotation.z=(k-1.5)*.12;}
    // Two unsigned hanging scrolls on a stand: one human, one model; the visitor decides which.
    place(g,new T.BoxGeometry(2.1,.06,.06),kit.timber(),0,top+1.6,-.42);
    for(const sx of [-1,1])place(g,new T.BoxGeometry(.06,1.65,.06),kit.timber(),sx*1.02,top+.82,-.42);
    const poems:[string,string[],string][]=[['甲',['行到水穷处','坐看云起时'],'#3f6f8f'],['乙',['山光悦鸟性','潭影空人心'],'#4f8f78']];
    poems.forEach(([label,lines,mount],i)=>{const scroll=mesh(g,new T.PlaneGeometry(.42,1.26),exact(new T.MeshBasicMaterial({map:hangingScroll(label,lines,mount),toneMapped:false,side:T.DoubleSide})),(i?.32:-.32),top+.95,-.4);scroll.castShadow=false;
      place(g,new T.CylinderGeometry(.018,.018,.5,6),kit.ink(),(i?.32:-.32),top+.32,-.4).rotation.z=Math.PI/2;});
    // Celadon garden stools for two readers.
    for(const x of [-1.65,1.65])drumStool(g,x,1.25,.3,.46,kit.celadon(),.07);
    scholarRock(g,-2.65,-.7,.9,.07);scholarRock(g,2.65,-.7,.75,.07);
    place(g,new T.CylinderGeometry(.42,.32,.24,8),kit.celadon(),0,.19,-2.55);
    paintedTree(g,0,-2.55,.42,'blossom',.31);
  },
  /** Recommendation: a three-tier lacquered carrying box, each tier a ranked shelf, tied with a silk knot. */
  gift(g,p) {
    void p;
    place(g,new T.BoxGeometry(3.1,.3,3.1),kit.stone(),0,.22,0);
    let y=.37;
    for(let i=0;i<3;i++){
      const h=.64;
      place(g,new T.BoxGeometry(2.5,h-.08,2.5),kit.lacquer(),0,y+h/2,0);
      place(g,new T.BoxGeometry(2.54,.08,2.54),kit.ink(),0,y+.04,0);
      place(g,new T.BoxGeometry(2.56,.035,2.56),kit.gold(),0,y+h-.02,0);
      for(let f=0;f<4;f++){const face=new T.Group();face.rotation.y=f*Math.PI/2;g.add(face);
        const roundel=place(face,new T.CylinderGeometry(.2,.2,.03,24),kit.gold(),0,y+h*.52,1.255);roundel.rotation.x=Math.PI/2;roundel.castShadow=false;
        for(const s of [-1,1])place(face,new T.BoxGeometry(.1,.3,.02),kit.paper(),s*(.55+i*.08),y+h*.52,1.255).castShadow=false;}
      y+=h;
    }
    place(g,new T.BoxGeometry(2.62,.16,2.62),kit.ink(),0,y+.08,0);
    place(g,new T.BoxGeometry(2.2,.14,2.2),kit.lacquer(),0,y+.23,0);
    place(g,new T.BoxGeometry(2.24,.03,2.24),kit.gold(),0,y+.31,0);
    // Bentwood handle frame arching over the lid.
    const handle=new T.CatmullRomCurve3([[-1.38,.37],[-1.38,2.9],[-1.2,3.32],[-.6,3.45],[.6,3.45],[1.2,3.32],[1.38,2.9],[1.38,.37]].map(([x,yy])=>new T.Vector3(x,yy,0)));
    place(g,new T.TubeGeometry(handle,48,.07,8,false),kit.ink());
    for(const s of [-1,1])place(g,new T.BoxGeometry(.24,.18,.5),kit.gold(),s*1.38,.46,0);
    // A cinnabar knot and tassel hang from the frame's shoulder.
    const knot=new T.Group();knot.position.set(1.45,2.62,0);g.add(knot);
    place(knot,new T.CylinderGeometry(.006,.006,.3,4),kit.lacquer(),0,.15,0);
    const diamond=place(knot,new T.BoxGeometry(.3,.3,.05),kit.lacquer(),0,-.12,0);diamond.rotation.z=Math.PI/4;
    for(let k=0;k<4;k++){const a=k*Math.PI/2,loop=place(knot,new T.TorusGeometry(.07,.02,5,12),kit.lacquer(),Math.cos(a)*.24,-.12+Math.sin(a)*.24,0);loop.castShadow=false;}
    place(knot,new T.CylinderGeometry(.03,.09,.5,8),kit.lacquer(),0,-.6,0);
  },
  bubble(g,p) {
    mesh(g,new T.CylinderGeometry(3.5,3.5,0.5,48),p.stone,0,0.25);
    mesh(g,new T.CylinderGeometry(2.6,2.6,0.15,64),material('#4f8a80',0.28,0.15),0,0.6);
    const glass=new T.MeshPhysicalMaterial({color:'#d8e6df',roughness:.15,transparent:true,opacity:.15,depthWrite:false,side:T.DoubleSide});
    mesh(g,new T.CylinderGeometry(2.15,2.15,2.8,48,1,true),glass,0,2.1).castShadow=false;
    mesh(g,new T.CylinderGeometry(2.04,2.04,2.45,48),new T.MeshPhysicalMaterial({color:'#8fbcae',roughness:.23,transparent:true,opacity:.22,depthWrite:false}),0,1.94).castShadow=false;
    const bubble=mesh(g,new T.SphereGeometry(.45,24,16),new T.MeshPhysicalMaterial({color:'#e2efe8',metalness:.1,roughness:.12,transparent:true,opacity:.48,clearcoat:1}),0,1.4);bubble.name='pulse';
    ring(g,3,0.8,kit.bronze());for(const x of [-3,3])box(g,p,0.3,3,0.3,x,1.5,0,kit.timber());
    for(let i=0;i<40;i++){
      const a=i*Math.PI/20,tick=box(g,p,.025,.018,i%5===0?.28:.13,Math.sin(a)*2.83,.695,Math.cos(a)*2.83,p.dark);tick.rotation.y=a;
    }
    for(const y of [.76,3.46])ring(g,2.16,y,kit.bronze());
    for(const x of [-3,3]){box(g,p,.44,.12,.44,x,3.02,0,p.stone);box(g,p,.06,2.4,.34,x,1.68,.03,kit.bronze());}
  },
  light(g,p) {
    builders.bubble(g,p);g.getObjectByName('pulse')!.scale.setScalar(0.65);g.getObjectByName('pulse')!.position.y=3.1;
    mesh(g,new T.IcosahedronGeometry(0.5,1),p.glow,0,3.1);
    const orbit=ring(g,2.8,3.1,kit.gold());orbit.rotation.x=0.4;
  },
  gallery(g,p) {
    box(g,p,7,0.5,5,0,0.25,0,p.stone);box(g,p,7,4.5,0.35,0,2.5,-2,kit.plaster());
    box(g,p,0.35,4.5,4,-3.3,2.5,0,kit.plaster());
    for(let i=0;i<3;i++){
      box(g,p,1.75,2.7,0.15,-2.2+i*2.2,2.8,-1.75,kit.timber());
      box(g,p,1.4,2.35,0.18,-2.2+i*2.2,2.8,-1.65,kit.paper());
      const painting=mesh(g,new T.PlaneGeometry(1.34,2.29),artwork(i),-2.2+i*2.2,2.8,-1.548);painting.castShadow=false;painting.name=`gallery-art-${i}`;
      box(g,p,.6,.16,.025,-2.2+i*2.2,1.25,-1.75,kit.paper());
    }
    box(g,p,3,0.3,0.8,0,1,1,kit.timber());
    roof(g,{width:7,depth:2.2,height:.5,overhang:.4,lift:.18,y:4.75,z:-.9});
  },
  music(g,p) {
    mesh(g,new T.CylinderGeometry(3.6,3.6,0.5,40),p.stone,0,0.25);
    box(g,p,3.6,1.8,1.5,0,1.6,0,kit.ink());
    for(let i=0;i<12;i++)box(g,p,0.25,0.12,0.6,-1.5+i*0.27,1.85,1, i%3===0?kit.ink():kit.paper());
    for(let i=0;i<11;i++)if(i%7!==2&&i%7!==6)box(g,p,.12,.12,.35,-1.365+i*.27,1.95,.86,kit.ink());
    const lid=box(g,p,3.55,.1,1.55,0,2.65,-.05,kit.lacquer());lid.rotation.x=-.12;
    box(g,p,1.25,.85,.08,0,2.4,.6,kit.paper());
    for(let i=0;i<5;i++)box(g,p,1.02,.015,.012,0,2.16+i*.105,.65,kit.ink());
    for(const x of [-1.4,1.4])box(g,p,0.25,1.2,0.25,x,0.7,0,kit.ink());
  },
  /** Weiming: a roofed pavilion stage. The MV hangs as a painted screen; drums flank it, a record turns on a lacquer stand. */
  studio(g,p) {
    place(g,new T.BoxGeometry(8,.44,6),kit.stone(),0,.22,0);
    place(g,new T.BoxGeometry(8.06,.06,6.06),kit.timberLight(),0,.47,0);
    // The back screen wall: plaster in a timber frame, the MV housing set into it.
    place(g,new T.BoxGeometry(7.5,4.75,.36),kit.plaster(),0,.5+2.375,-2);
    for(const y of [.6,5.15])place(g,new T.BoxGeometry(7.6,.12,.42),kit.timber(),0,y,-2);
    const screen=box(g,p,6.7,3.4,0.12,0,3,-1.765,kit.ink());screen.name='studio-screen-housing';
    for(const [w,h,x,y] of [[6,.08,0,1.33],[6,.08,0,4.67],[.08,3.42,-2.96,3],[.08,3.42,2.96,3]] as number[][])place(g,new T.BoxGeometry(w,h,.04),kit.gold(),x,y,-1.69).castShadow=false;
    const play=mesh(g,new T.ConeGeometry(0.7,1.1,3),p.glow,0,3,-1.5);play.name='studio-play-placeholder';play.rotation.z=-Math.PI/2;play.rotation.y=Math.PI/2;
    // Four lacquered columns carry a green-tiled hip roof over the whole stage.
    for(const x of [-3.85,3.85])for(const z of [-2,2.8])column(g,x,z,5.2,.17,kit.lacquer(),.5);
    for(const z of [-2,2.8])beam(g,8.1,0,5.98,z,0,.3,.24);
    for(const x of [-3.85,3.85])beam(g,5.1,x,5.98,.4,Math.PI/2,.3,.24);
    for(let i=0;i<12;i++)place(g,new T.BoxGeometry(.18,.14,.34),kit.malachite(),-3.6+i*.655,6.2,2.8).castShadow=false;
    place(g,new T.BoxGeometry(8.3,.12,5.3),kit.timber(),0,6.33,.4);
    roof(g,{width:7.9,depth:4.9,height:1.5,overhang:.95,lift:.42,y:6.38,z:.4,material:kit.tileGreen()});
    // Barrel drums on three-legged stands where the speakers stood.
    const drum=new T.LatheGeometry([[.3,-.26],[.36,-.16],[.39,0],[.36,.16],[.3,.26]].map(([r,h])=>new T.Vector2(r,h)),20).rotateX(Math.PI/2);
    for(const x of [-3.2,3.2]){
      for(let k=0;k<3;k++){const a=k/3*Math.PI*2+Math.PI/2,leg=place(g,new T.CylinderGeometry(.03,.04,.95,6),kit.timber(),x+Math.cos(a)*.22,.95,.9+Math.sin(a)*.22);leg.rotation.set(Math.sin(a)*.2,0,-Math.cos(a)*.2);}
      place(g,drum,kit.lacquer(),x,1.62,.9);
      for(const s of [-1,1]){const head=place(g,new T.CircleGeometry(.3,20),kit.paper(),x,1.62,.9+s*.262);head.rotation.y=s>0?0:Math.PI;head.castShadow=false;
        for(let k=0;k<16;k++){const a=k/16*Math.PI*2;place(g,new T.SphereGeometry(.018,5,4),kit.gold(),x+Math.cos(a)*.31,1.62+Math.sin(a)*.31,.9+s*.25).castShadow=false;}}
    }
    // Microphone in bronze.
    mesh(g,new T.CylinderGeometry(.04,.06,1.6,8),kit.bronze(),-1.5,1.3,1.3);mesh(g,new T.CylinderGeometry(.2,.24,.06,16),kit.bronze(),-1.5,.53,1.3);mesh(g,new T.CapsuleGeometry(.1,.22,4,8),kit.ink(),-1.5,2.2,1.3);
    // A lacquer stand with a turning record.
    place(g,new T.BoxGeometry(1.3,.1,.95),kit.lacquer(),2,1.9,1.1);
    for(const sx of [-1,1])for(const sz of [-1,1])place(g,new T.BoxGeometry(.07,1.35,.07),kit.ink(),2+sx*.58,1.18,1.1+sz*.4);
    place(g,new T.BoxGeometry(1.2,.06,.85),kit.ink(),2,.82,1.1);
    const record=mesh(g,new T.CylinderGeometry(.4,.4,.035,48),kit.ink(),2,1.97,1.1);
    mesh(g,new T.CylinderGeometry(.13,.13,.04,32),kit.lacquer(),2,1.99,1.1);
    for(const radius of [.23,.29,.35]){const groove=mesh(g,new T.TorusGeometry(radius,.005,4,48),kit.stoneDark(),2,1.993,1.1);groove.rotation.x=Math.PI/2;groove.castShadow=false;}
    record.castShadow=false;mesh(g,new T.BoxGeometry(.035,.035,.55),kit.bronze(),2.46,2.06,1.12);
    // Lotus footlights along the stage edge.
    for(let i=0;i<6;i++){const x=-2.75+i*1.1;place(g,new T.CylinderGeometry(.09,.12,.1,8),kit.bronze(),x,.55,2.75);place(g,new T.SphereGeometry(.09,10,6),kit.lamp(),x,.64,2.75).castShadow=false;}
  }
};
export function buildExhibit(kind:string,color:string) {
  const group=new T.Group(),accent=pigmentAccent(color);
  const glow=new T.MeshStandardMaterial({color:accent,emissive:accent,emissiveIntensity:.25,roughness:.5});glow.userData.nightGlow=true;
  const p:Palette={main:material(accent,.6,.04),dark:kit.ink(),stone:kit.stone(),glow};
  // A round stone dais with a moulded edge; a raised band of the island's pigment is inlaid near its rim.
  mesh(group,new T.LatheGeometry([[0,-.25],[4.05,-.25],[4.05,-.06],[3.88,.02],[3.78,.05],[3.7,.07],[0,.07]].map(([r,y])=>new T.Vector2(r,y)),72),kit.stone());
  mesh(group,new T.LatheGeometry([[3.42,.05],[3.56,.05],[3.56,.085],[3.42,.085],[3.42,.05]].map(([r,y])=>new T.Vector2(r,y)),72),p.main).castShadow=false;
  (builders[kind]??builders.gallery)(group,p);
  return group;
}
