// Shared by walking, geometry and boarding UI. Destinations remain unavailable until authored.
export const harbor={title:'海风港口',rampStart:8.6,rampEnd:22,halfWidth:1.8,deckHalfWidth:3.7,deckEnd:29,level:-4.6,terminal:{x:0,z:26.5},arrival:{x:0,z:24}};
export function harborContains(x,z,padding=0){return z>=harbor.rampStart&&z<=harbor.deckEnd-padding&&Math.abs(x)<(z<harbor.rampEnd?harbor.halfWidth:harbor.deckHalfWidth)-padding;}
export function harborHeight(x,z){if(!harborContains(x,z))return null;const t=Math.max(0,Math.min(1,(z-9.2)/(harbor.rampEnd-9.2)));return harbor.level*t;}
export const harborRoutes=[
 {id:'quant-exchange',title:'量化投资交易所岛',theme:'数据与海潮',description:'驶向未来的量化研究与交易系统。',status:'locked'},
 {id:'robot-island',title:'机器人岛',theme:'让想象开始行动',description:'驶向机械工坊与具身智能的探索。',status:'locked'},
 {id:'ai-institute',title:'AI 研究院',theme:'下一段未知',description:'驶向更远的模型与科学研究。',status:'locked'}
];
