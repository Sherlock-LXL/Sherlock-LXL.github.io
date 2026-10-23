export const seasonalObjects={
  spring:[
    {kind:'peach-pot',name:'桃枝小陶瓶',radius:.26,height:.72},
    {kind:'pinwheel',name:'青竹风车',radius:.28,height:.82},
    {kind:'tea-basket',name:'春茶竹篮',radius:.32,height:.52},
    {kind:'inkstone',name:'青山砚台',radius:.3,height:.2},
  ],
  summer:[
    {kind:'conch',name:'海螺',radius:.3,height:.36},
    {kind:'watering-can',name:'薄荷洒水壶',radius:.35,height:.48},
    {kind:'sea-lantern',name:'海风提灯',radius:.26,height:.64},
    {kind:'shell-bowl',name:'贝壳小碟',radius:.32,height:.24},
  ],
  autumn:[
    {kind:'pumpkin',name:'小南瓜',radius:.32,height:.46},
    {kind:'acorn-basket',name:'橡果竹篮',radius:.33,height:.5},
    {kind:'maple-lantern',name:'枫叶灯笼',radius:.28,height:.64},
    {kind:'scroll-box',name:'画卷木匣',radius:.35,height:.25},
  ],
  winter:[
    {kind:'snow-bunny',name:'雪兔摆件',radius:.3,height:.5},
    {kind:'snow-globe',name:'雪景水晶球',radius:.28,height:.58},
    {kind:'ice-crystal',name:'冰晶',radius:.3,height:.62},
    {kind:'thermos',name:'暖茶保温壶',radius:.24,height:.58},
  ],
};

/** One of each species, distributed among the original four seasonal islands. */
export const animalSpecies=[
  {kind:'cat',name:'花狸猫',season:'spring',radius:.72,bodyRadius:.19,bodyLength:.23,height:1.02,speed:.72,stride:.42,ride:false,seat:0},
  {kind:'deer',name:'梅花鹿',season:'spring',radius:1.06,bodyRadius:.28,bodyLength:.42,height:2.12,speed:.85,stride:1.05,ride:true,seat:1.22},
  {kind:'rabbit',name:'桃花兔',season:'spring',radius:.62,bodyRadius:.19,bodyLength:.14,height:.98,speed:.7,stride:.48,ride:false,seat:0},
  {kind:'crab',name:'沙滩蟹',season:'summer',radius:.66,bodyRadius:.29,bodyLength:.08,height:.48,speed:.45,stride:.22,ride:false,seat:0},
  {kind:'heron',name:'苍鹭',season:'summer',radius:.7,bodyRadius:.17,bodyLength:.19,height:1.62,speed:.44,stride:.58,ride:false,seat:0},
  {kind:'tortoise',name:'小陆龟',season:'summer',radius:.63,bodyRadius:.26,bodyLength:.14,height:.48,speed:.18,stride:.22,ride:false,seat:0},
  {kind:'fox',name:'赤狐',season:'autumn',radius:.95,bodyRadius:.2,bodyLength:.25,height:1.02,speed:.85,stride:.55,ride:false,seat:0},
  {kind:'shiba',name:'柴犬',season:'autumn',radius:.75,bodyRadius:.22,bodyLength:.23,height:.96,speed:.78,stride:.5,ride:false,seat:0},
  {kind:'polar-bear',name:'北极熊',season:'winter',radius:1.18,bodyRadius:.39,bodyLength:.43,height:1.58,speed:.72,stride:.95,ride:true,seat:1.12},
  {kind:'penguin',name:'小企鹅',season:'winter',radius:.56,bodyRadius:.22,bodyLength:.08,height:.91,speed:.44,stride:.27,ride:false,seat:0},
];

export const seededRandom=(seed=0x71a2)=>()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
export const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export function turnToward(a,b,limit){return a+Math.max(-limit,Math.min(limit,angleDelta(a,b)));}
