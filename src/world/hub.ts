import * as T from 'three';
import {material,mesh} from './architecture';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export function nightLight(color:string){const m=new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.14,roughness:.55});m.userData.nightGlow=true;return m;}
/** Celestial Spire: tiered stone plinth, oculus arcade, bronze orrery, crystal lantern. */
export function buildHub(){
  const hub=new T.Group();hub.name='celestial-hub';
  const limestone=material('#f3e5c6',.9,.03,'stone'),travertine=material('#e2d1a9',.85,.04,'stone'),deep=material('#2f4e4d',.5,.22,'stone'),brass=material('#c8a764',.3,.65,'metal'),copper=material('#8c6a40',.42,.55,'metal'),glow=nightLight('#d7f0ef'),emberGlow=nightLight('#f6d08a'),crystal=new T.MeshPhysicalMaterial({color:'#d4f1ec',metalness:.1,roughness:.08,transmission:.75,ior:1.42,thickness:1.1,clearcoat:1,attenuationColor:'#8fc9c6',attenuationDistance:3.5});
  // Stepped plinth with inlaid bronze zodiac.
  mesh(hub,new T.CylinderGeometry(2.6,2.95,.25,96),limestone,0,.125);
  mesh(hub,new T.CylinderGeometry(2.3,2.55,.18,96),travertine,0,.34);
  const compass=mesh(hub,new T.CylinderGeometry(2.08,2.08,.03,96),brass,0,.44);compass.castShadow=false;
  for(let i=0;i<32;i++){const a=i/32*Math.PI*2,tick=mesh(hub,new T.BoxGeometry(.035,.035,i%4===0?.4:.14),copper,Math.sin(a)*1.96,.46,Math.cos(a)*1.96);tick.rotation.y=a;tick.castShadow=false;}
  // Oculus arcade: four open arches around a hollow drum.
  const drum=new T.Group();drum.position.y=.44;hub.add(drum);
  for(let i=0;i<4;i++){
    const a=i/4*Math.PI*2;
    // Pier
    const pier=mesh(drum,new T.BoxGeometry(.52,2.6,.52),limestone,Math.sin(a)*1.78,1.3,Math.cos(a)*1.78);pier.rotation.y=a;
    // Shaft fluting lines
    for(const side of [-1,1]){const flute=mesh(drum,new T.BoxGeometry(.04,2.3,.04),deep,Math.sin(a)*1.78+Math.cos(a)*.18*side,1.3,Math.cos(a)*1.78-Math.sin(a)*.18*side);flute.rotation.y=a;flute.castShadow=false;}
    // Capital
    mesh(drum,new T.BoxGeometry(.72,.12,.72),travertine,Math.sin(a)*1.78,2.66,Math.cos(a)*1.78).rotation.y=a;
    mesh(drum,new T.BoxGeometry(.9,.09,.9),limestone,Math.sin(a)*1.78,2.78,Math.cos(a)*1.78).rotation.y=a;
  }
  // Arches between the piers.
  for(let i=0;i<4;i++){const a=i/4*Math.PI*2+Math.PI/4;
    const archPoints=Array.from({length:17},(_,j)=>{const t=j/16;const r=1.78;return new T.Vector3(Math.sin(a-.7+t*1.4)*r,1.78+Math.sin(t*Math.PI)*.72,Math.cos(a-.7+t*1.4)*r);});
    mesh(drum,new T.TubeGeometry(new T.CatmullRomCurve3(archPoints),20,.09,8,false),travertine);
    mesh(drum,new T.CylinderGeometry(.018,.018,.52,6),copper,Math.sin(a)*1.08,2.25,Math.cos(a)*1.08).castShadow=false;
    mesh(drum,new T.ConeGeometry(.19,.16,12),copper,Math.sin(a)*1.08,1.98,Math.cos(a)*1.08).rotation.x=Math.PI;
    mesh(drum,new T.SphereGeometry(.105,12,8),emberGlow,Math.sin(a)*1.08,1.91,Math.cos(a)*1.08).castShadow=false;
  }
  // Entablature: thick stone cornice above the arcade.
  mesh(drum,new T.CylinderGeometry(2.08,2.08,.24,64),limestone,0,2.95);
  mesh(drum,new T.CylinderGeometry(2.0,2.08,.1,64),travertine,0,3.07);
  const bronzeBelt=mesh(drum,new T.TorusGeometry(2.04,.045,8,96),brass,0,3.13);bronzeBelt.rotation.x=Math.PI/2;
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2;const dentil=mesh(drum,new T.BoxGeometry(.11,.11,.14),copper,Math.sin(a)*2.03,3.0,Math.cos(a)*2.03);dentil.rotation.y=a;dentil.castShadow=false;}
  // Observation balcony with railing posts.
  mesh(drum,new T.CylinderGeometry(1.95,1.98,.08,64),travertine,0,3.22);
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2;mesh(drum,new T.CylinderGeometry(.03,.03,.6,8),copper,Math.sin(a)*1.92,3.52,Math.cos(a)*1.92).castShadow=false;}
  const railRing=mesh(drum,new T.TorusGeometry(1.92,.025,6,96),copper,0,3.84);railRing.rotation.x=Math.PI/2;railRing.castShadow=false;
  // Second tier: narrower lantern drum.
  const lantern=new T.Group();lantern.position.y=4.0;hub.add(lantern);
  mesh(lantern,new T.CylinderGeometry(1.3,1.4,.22,48),limestone,0,.11);
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;mesh(lantern,new T.CylinderGeometry(.13,.13,2.6,16),limestone,Math.sin(a)*1.12,1.42,Math.cos(a)*1.12);}
  mesh(lantern,new T.CylinderGeometry(1.3,1.3,.14,48),travertine,0,2.8);
  // Octagonal copper roof with ribs.
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const rib=Array.from({length:16},(_,j)=>{const t=j/15;return new T.Vector3(Math.sin(a)*1.3*(1-t*.95),2.9+t*t*2.3,Math.cos(a)*1.3*(1-t*.95));});
    mesh(lantern,new T.TubeGeometry(new T.CatmullRomCurve3(rib),20,.055,8,false),copper);}
  // Roof surface — a smooth cone sitting on the ribs.
  const roof=new T.ConeGeometry(1.3,2.4,32,1,false);mesh(lantern,roof,copper,0,4.1).castShadow=true;
  // Crystal lantern suspended inside the drum.
  const crystalShape=mergeGeometries([new T.ConeGeometry(.42,.56,10).translate(0,.28,0),new T.CylinderGeometry(.42,.42,.6,10).translate(0,-.3,0),new T.ConeGeometry(.42,.4,10).rotateZ(Math.PI).translate(0,-.8,0)])!;
  const beacon=mesh(lantern,crystalShape,crystal,0,1.55);beacon.name='celestial-beacon';
  mesh(lantern,new T.SphereGeometry(.28,20,14),glow,0,1.55).castShadow=false;
  // Bronze orrery crowning the roof — raised to clear the cone peak.
  const orrery=new T.Group();orrery.position.set(0,6.9,0);hub.add(orrery);
  // Spire + weathervane base.
  mesh(orrery,new T.CylinderGeometry(.07,.14,.9,10),copper,0,-.4);
  mesh(orrery,new T.CylinderGeometry(.17,.22,.42,16),brass,0,.1);
  mesh(orrery,new T.SphereGeometry(.3,20,14),material('#e8c88a',.4,.5,'metal'),0,.42);
  for(let i=0;i<3;i++){const r=.6+i*.14,ring=mesh(orrery,new T.TorusGeometry(r,.022,6,72),i===1?emberGlow:brass,0,.42);ring.rotation.set(.4+i*.6,i*.9,.3);}
  for(let i=0;i<4;i++){const a=i/4*Math.PI*2;mesh(orrery,new T.SphereGeometry(.07,10,8),emberGlow,Math.sin(a)*.78,.42+Math.sin(a*2)*.14,Math.cos(a)*.78).castShadow=false;}
  // Antenna spike with pennant beacon.
  mesh(orrery,new T.CylinderGeometry(.02,.04,1.2,8),copper,0,1.1);
  mesh(orrery,new T.SphereGeometry(.14,16,12),glow,0,1.8).castShadow=false;
  // Decorative ground rings reach outward.
  for(const radius of [3.4,5.6,8.1]){const ring=mesh(hub,new T.TorusGeometry(radius,.03,6,120),glow,0,.03);ring.rotation.x=-Math.PI/2;ring.castShadow=false;}
  return hub;
}
