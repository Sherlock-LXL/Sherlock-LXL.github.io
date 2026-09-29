import {exhibitionGallery} from '../../src/world/exhibition-gallery';
import type {SceneFactory} from '../../src/world/module-contract';
export default {version:1,create({module,region}){return exhibitionGallery(module.media.filter(m=>m.kind==='image'&&m.src).map((m,index)=>({action:{kind:"photo",index},subtitle:m.location?`拍摄于 ${m.location}`:"摄影原作",title:m.title,src:m.thumbnail??m.src!,width:m.width,height:m.height})),region.color,'photography',region.id);}} satisfies SceneFactory;
