import * as T from 'three';
import {material,mesh} from './architecture';
import {paintedTree} from './vernacular';
/** Mineral seasons: malachite spring, sunlit summer, cinnabar-and-gamboge autumn, lead-white winter. */
export const seasonalColors={
  spring:{ground:'#7fa56f',trees:['#eab0bd','#e9c2d6','#f2d7c8'],label:'春 · 桃花山径'},
  summer:{ground:'#a6b884',trees:['#5d8d63','#7da775','#4f8a70'],label:'夏 · 海风绿洲'},
  autumn:{ground:'#b39457',trees:['#c4552f','#dca23c','#a8432c'],label:'秋 · 金色回忆'},
  winter:{ground:'#e3e9ec',trees:['#dfe9e8','#d3e3e8','#edf0eb'],label:'冬 · 初雪实验室'}
};
/** Summer shore: weeping willows lean toward the water instead of tropical palms. */
export function palm(g:T.Object3D,x:number,z:number,scale=1){
  paintedTree(g,x,z,scale*.95,'willow');
}
export {material,mesh};
