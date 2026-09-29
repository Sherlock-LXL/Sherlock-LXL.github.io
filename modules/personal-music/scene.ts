import {exhibitionGallery} from '../../src/world/exhibition-gallery';
import type {SceneFactory} from '../../src/world/module-contract';
export default {version:1,create({module,region}){return exhibitionGallery((module.albums??[]).slice().sort((a,b)=>a.order-b.order).map(a=>({action:{kind:"album",id:a.id},title:`${String(a.order).padStart(2,'0')} · ${a.title}`,src:a.cover,subtitle:a.credit})),region.color,'albums',region.id);}} satisfies SceneFactory;
