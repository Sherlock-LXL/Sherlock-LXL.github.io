import * as T from 'three';
import {buildExhibit,material} from '../src/world/architecture';
import {pocketWonder} from '../src/world/pocket-wonders';
const r=new T.WebGLRenderer({antialias:true});r.setSize(1000,800);r.toneMapping=T.ACESFilmicToneMapping;document.body.append(r.domElement);
const camera=new T.PerspectiveCamera(40,1.25,.1,100);
function scene(){const s=new T.Scene();s.background=new T.Color('#bcd4d9');s.add(new T.HemisphereLight('#fff6e8','#94b5af',2));const l=new T.DirectionalLight('#fff4da',2);l.position.set(-3,6,6);s.add(l);return s;}
Object.assign(window,{
 catView(a:number){const s=scene(),g=buildExhibit('forest','#c2d5b5');s.add(g);camera.position.set(Math.sin(a)*5,2.7,1+Math.cos(a)*5);camera.lookAt(0,1.4,1);r.render(s,camera);return [-1,1].map(x=>g.getObjectByName(x<0?'cat-front-left':'cat-front-right')?.position.toArray());},
 pocketView(kind:string){const s=scene(),g=new T.Group();s.add(g);const p=pocketWonder(kind,g,material('#fff0dc'),material('#9aafa9'),new T.MeshStandardMaterial({color:'#f7dfb5',emissive:'#e3c67f',emissiveIntensity:.3}))!;for(let i=0;i<90;i++)p.animate(i/60,Math.sin(i/90*Math.PI/2));camera.position.set(2.4,2.5,4);camera.lookAt(0,1.5,0);r.render(s,camera);return !!p;}
});
