export const aiProjects=[
  {id:'gift-chooser',moduleId:'recommendation',title:'送礼选择器',english:'GIFT CHOOSER',symbol:'◇',description:'把心意变成一个更有把握的选择。',size:'4 KB'},
  {id:'expression-recognition-cnn',moduleId:'emotion-recognition',title:'表情识别',english:'EXPRESSION CNN',symbol:'◎',description:'让三个卷积网络一起读一张表情。',size:'5.5 MB'},
  {id:'blind-verse-rnn',moduleId:'poetry',title:'双盲诗',english:'BLIND VERSE',symbol:'☾',description:'两句互不知晓的诗，偶然相遇。',size:'139 MB'},
];
export const aiProjectForModule=id=>aiProjects.find(p=>p.moduleId===id);
export const generationModes=[{name:'稳健',temperature:.55,topK:5},{name:'适中',temperature:.7,topK:15},{name:'激进',temperature:.9,topK:30}];

/** Original NumPy MLP, including its unclipped linear output. */
export function giftPredict(model,scores,category){
  if(scores.length!==7||scores.some(x=>!Number.isFinite(x)||x<0||x>10)||!Number.isInteger(category)||category<0||category>6)
    throw new Error('七项评分须为 0–10，且需要选择礼物类别。');
  const x=[...scores.map(x=>x/10),...Array.from({length:7},(_,i)=>Number(i===category))];
  const hidden=model.b1.map((bias,j)=>Math.max(0,x.reduce((sum,v,i)=>sum+v*model.W1[i][j],bias)));
  const raw=hidden.reduce((sum,v,j)=>sum+v*model.W2[j][0],model.b2[0]);
  return {raw,score:Math.max(0,Math.min(1,raw))*10};
}

/** Pillow RGB -> L uses fixed-point ITU-R 601 coefficients, before resize. */
export function grayscale(rgba){
  const result=new Uint8Array(rgba.length/4);
  for(let i=0;i<result.length;i++)result[i]=(rgba[i*4]*19595+rgba[i*4+1]*38470+rgba[i*4+2]*7471+32768)>>16;
  return result;
}

// Pillow's antialiased bilinear filter: 22-bit coefficients, rounded after EACH
// pass. Canvas drawImage resizing is not equivalent to the original transform.
function coefficients(input,output){
  const scale=input/output,filterScale=Math.max(1,scale),support=filterScale;
  return Array.from({length:output},(_,i)=>{
    const center=(i+.5)*scale;
    const start=Math.max(0,Math.trunc(center-support+.5));
    const end=Math.min(input,Math.trunc(center+support+.5));
    const weights=Array.from({length:end-start},(_,j)=>Math.max(0,1-Math.abs((j+start-center+.5)/filterScale)));
    const sum=weights.reduce((a,b)=>a+b,0);
    return {start,weights:weights.map(w=>Math.trunc(w/sum*4194304+.5))};
  });
}
export function expressionTensor(rgba,width,height){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||rgba.length!==width*height*4)
    throw new Error('无法读取图片像素。');
  const gray=grayscale(rgba),cx=coefficients(width,48),cy=coefficients(height,48);
  const horizontal=new Uint8Array(48*height);
  for(let y=0;y<height;y++)for(let x=0;x<48;x++){
    const c=cx[x];let sum=2097152;
    for(let k=0;k<c.weights.length;k++)sum+=gray[y*width+c.start+k]*c.weights[k];
    horizontal[y*48+x]=Math.max(0,Math.min(255,Math.floor(sum/4194304)));
  }
  const result=new Float32Array(48*48);
  for(let y=0;y<48;y++)for(let x=0;x<48;x++){
    const c=cy[y];let sum=2097152;
    for(let k=0;k<c.weights.length;k++)sum+=horizontal[(c.start+k)*48+x]*c.weights[k];
    result[y*48+x]=Math.max(0,Math.min(255,Math.floor(sum/4194304)))/255;
  }
  return result;
}

/** Portable seeded RNG for repeatable sampling tests; independent of torch RNG. */
export function seededRandom(seed){
  let state=seed>>>0;
  return ()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
}
export function tokenDistribution(logits,vocab,temperature,topK){
  const excluded=new Set([vocab['<PAD>'],vocab['<BOS>'],vocab['<UNK>']]);
  const sorted=Array.from(logits,(value,id)=>({id,value:Math.fround(value/temperature)}))
    .filter(t=>!excluded.has(t.id)).sort((a,b)=>b.value-a.value||a.id-b.id).slice(0,topK);
  const weights=sorted.map(t=>Math.exp(t.value-sorted[0].value)),sum=weights.reduce((a,b)=>a+b,0);
  return sorted.map((t,i)=>({id:t.id,probability:weights[i]/sum}));
}
export function sampleToken(logits,vocab,temperature,topK,random){
  const distribution=tokenDistribution(logits,vocab,temperature,topK);
  let remainder=random();
  for(const token of distribution){remainder-=token.probability;if(remainder<0)return token.id;}
  return distribution.at(-1).id;
}
