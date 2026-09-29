// Models transcribed from the supplied manuscripts. SI units internally.
export const P0=101325,T0=293.15,GAS=8.314462618;
export function popovFactor(theta){
 const f=x=>x===0?(Math.PI-theta)/Math.PI:(2*Math.exp(-2*Math.PI*x)+Math.exp(-2*(Math.PI-theta)*x)+Math.exp(-2*(Math.PI+theta)*x))/(-Math.expm1(-4*Math.PI*x))*Math.tanh((Math.PI-theta)*x);
 const n=2000,end=24,h=end/n;let sum=f(0)+f(end);for(let i=1;i<n;i++)sum+=f(i*h)*(i%2?4:2);
 return Math.sin(theta)/(1+Math.cos(theta))+4*sum*h/3;
}
export function growthRate(radius,p,f=popovFactor(p.angle*Math.PI/180)){
 const theta=p.angle*Math.PI/180,sigma=p.tension*.001,kH=1e-5,D=p.diffusion*1e-9;
 const kV=Math.PI/3*(2-3*Math.cos(theta)+Math.cos(theta)**3);
 return Math.PI*Math.sin(theta)*f/kV*GAS*T0*D*(p.saturation*kH*P0-kH*(P0+2*sigma/radius))/(3*P0*radius+4*sigma);
}
export function solveGrowth(p){
 let r=p.radius*1e-6;const f=popovFactor(p.angle*Math.PI/180),samples=[],step=.5;let stopped=false;
 for(let i=0;i<=7200;i++){
  if(i%24===0||stopped)samples.push({t:i*step/60,r:r*1e6,rate:growthRate(r,p,f)*6e7});if(stopped)break;
  const k1=growthRate(r,p,f),k2=growthRate(Math.max(1e-6,r+k1*step/2),p,f),k3=growthRate(Math.max(1e-6,r+k2*step/2),p,f),k4=growthRate(Math.max(1e-6,r+k3*step),p,f);
  r+=step*(k1+2*k2+2*k3+k4)/6;if(r<2e-6){r=2e-6;stopped=true;}
 }
 return {samples,status:stopped?'气泡已溶解至 2 μm 停止阈值。':'固定远场浓度下的球冠生长计算。',xLabel:'时间 / min',rateLabel:'dR/dt / μm·min⁻¹',f};
}
const rk4=(fn,t,y,h)=>{const add=(k,s)=>y.map((v,i)=>v+k[i]*s),a=fn(t,y),b=fn(t+h/2,add(a,h/2)),c=fn(t+h/2,add(b,h/2)),d=fn(t+h,add(c,h));return y.map((v,i)=>v+h*(a[i]+2*b[i]+2*c[i]+d[i])/6);};
export function solveOscillation(p,tolerance=2e-6){
 const R0=p.radius*1e-6,omega=2*Math.PI*p.frequency*1000,rho=998,mu=.001,sigma=p.tension*.001;
 const aw=Math.exp(-.01801528*p.osmotic*2*p.molality),pv=aw*2339,pg=P0+2*sigma/R0-pv,scale=rho*R0*R0*omega*omega;
 const fn=(t,[u,v])=>[v,((pg*u**(-3*p.kappa)+pv-2*sigma/(R0*u)-4*mu*omega*v/u-P0-p.drive*1e5*Math.sin(t))/scale-1.5*v*v)/u];
 let time=0,y=[1,0],h=.001,steps=0,status='不可压缩球对称模型 · 显示三个驱动周期';const end=6*Math.PI,samples=[];
 while(time<end&&steps++<120000){
  h=Math.min(h,end-time);const a=rk4(fn,time,y,h),b=rk4(fn,time+h/2,rk4(fn,time,y,h/2),h/2);
  const err=Math.max(...a.map((v,i)=>Math.abs(v-b[i])/(1+Math.abs(b[i]))));
  if(!Number.isFinite(err)||b[0]<=0||err>tolerance){h*=.5;if(h<1e-10){status='坍缩过于剧烈，已停止：当前简化模型不能可靠继续。';break;}continue;}
  time+=h;y=b;samples.push({t:time/omega*1e6,r:y[0]*p.radius,rate:y[1]*R0*omega});
  if(Math.abs(y[1]*R0*omega)>450||y[0]<.025){status='已达到强坍缩适用边界，停止计算；需要可压缩性和更完整热模型。';break;}
  if(err<tolerance/32)h=Math.min(.012,h*1.5);
 }
 if(steps>=120000)status='计算达到步数上限，请降低驱动幅值。';
 samples.unshift({t:0,r:p.radius,rate:0});
 return {samples,status,xLabel:'时间 / μs',rateLabel:'dR/dt / m·s⁻¹',aw,pv};
}
