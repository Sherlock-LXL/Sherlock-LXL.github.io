import * as T from 'three';
import {FullScreenQuad} from 'three/addons/postprocessing/Pass.js';

/** Album palette: mineral pigments on silk. Shared by the renderer, materials and painted canvases. */
export const pigment={
  silk:'#efe6d2',paper:'#f6f0e2',ink:'#2b2824',inkSoft:'#5b554c',
  azurite:'#3f6f8f',azuriteDeep:'#284d66',malachite:'#4f9a80',malachiteLight:'#8cc2a4',
  ochre:'#b07a45',ochreLight:'#d8b483',gamboge:'#dcb04c',cinnabar:'#b8432f',cinnabarDeep:'#8e2f22',
  leadWhite:'#f3eee2',celadon:'#a9c8b4',bronze:'#8a6a3e',bronzeLight:'#c3a067',stone:'#d9d1bf',stoneDeep:'#9b9484',timber:'#6f4a33',tile:'#59626a'
} as const;

/** Each island's data colour is a pastel; in the painting it is laid as the matching mineral pigment. */
const accents:Record<string,string>={'#ebbdcf':'#b5564e','#cbdde9':'#3f6f8f','#e3c385':'#b0823c','#acd9c5':'#4f8f78'};
export function pigmentAccent(color:T.ColorRepresentation){
  const c=new T.Color(color),known=accents['#'+c.getHexString()];if(known)return known;
  const hsl={h:0,s:0,l:0};c.getHSL(hsl);return '#'+new T.Color().setHSL(hsl.h,Math.min(.5,hsl.s*.7+.1),.42).getHexString();
}

let installed=false;
/** Every built-in material shares two painted conventions: mist that settles over the sea, and a gouache light ramp. */
export function installInkShading(){
  if(installed)return;installed=true;
  const C=T.ShaderChunk as Record<string,string>;
  C.fog_pars_vertex='#ifdef USE_FOG\nvarying float vFogDepth;varying float vFogHeight;\n#endif';
  C.fog_vertex='#ifdef USE_FOG\nvFogDepth=-mvPosition.z;vFogHeight=cameraPosition.y+(transpose(mat3(viewMatrix))*mvPosition.xyz).y;\n#endif';
  C.fog_pars_fragment='#ifdef USE_FOG\nuniform vec3 fogColor;varying float vFogDepth;varying float vFogHeight;\n#ifdef FOG_EXP2\nuniform float fogDensity;\n#else\nuniform float fogNear;uniform float fogFar;\n#endif\n#endif';
  C.fog_fragment=`#ifdef USE_FOG
#ifdef FOG_EXP2
float fogFactor=1.0-exp(-fogDensity*fogDensity*vFogDepth*vFogDepth);
float mistAmount=clamp(fogDensity*330.0,0.0,1.0);
#else
float fogFactor=smoothstep(fogNear,fogFar,vFogDepth);
float mistAmount=.5;
#endif
// Low air holds the wash; ridges and a raised viewpoint look through it.
float mistLayer=exp(-max(vFogHeight+5.6,0.0)*.11)*smoothstep(18.0,140.0,vFogDepth)*exp(-max(cameraPosition.y-2.0,0.0)*.025);
fogFactor=clamp(fogFactor+mistLayer*mistAmount*.8,0.0,1.0);
gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,fogFactor);
#endif`;
  // Flatter, gouache-like terminator; specular keeps its own term.
  C.lights_physical_pars_fragment=C.lights_physical_pars_fragment.replace('vec3 irradiance = dotNL * directLight.color;','vec3 irradiance = mix( dotNL, smoothstep( 0.0, 0.42, dotNL ), 0.62 ) * directLight.color;');
}

/** Exact-colour surfaces (artworks, signs) keep their pixels: the silk grade skips them. */
export function exact<M extends T.Material>(material:M){
  const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
  material.onBeforeCompile=(shader,renderer)=>{previous.call(material,shader,renderer);shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>','#include <dithering_fragment>\ngl_FragColor.a=min(gl_FragColor.a,.5);');};
  material.customProgramCacheKey=()=>key+'-exact';
  return material;
}

const vertexShader='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const fragmentShader=`
uniform sampler2D tColor;uniform sampler2D tDepth;uniform vec2 texel;uniform float near,far,aspect,pixelAngle,lineWidth,exposure,strength;
uniform vec2 inkRange;uniform vec3 inkColor,paperTint,shadowInk;varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float rz(vec2 uv){return (far-(far-near)*texture2D(tDepth,uv).x)/(far*near);}
void main(){
  vec4 source=texture2D(tColor,vUv);vec3 color=source.rgb;bool exactColor=source.a<.75;
  // A slightly wandering sample grid turns ruled edges into brush lines.
  vec2 jitter=(vec2(noise(gl_FragCoord.xy*.045),noise(gl_FragCoord.yx*.045+7.3))-.5)*texel*lineWidth*1.1;
  vec2 o=texel*lineWidth,uv=vUv+jitter;
  float c=rz(uv),l=rz(uv-vec2(o.x,0.)),r=rz(uv+vec2(o.x,0.)),d=rz(uv-vec2(0.,o.y)),u=rz(uv+vec2(0.,o.y));
  float z=1./max(c,1e-7);
  // 1/z is planar in screen space: its second difference marks folds and silhouettes, never sloping ground.
  float fold=(abs(l+r-2.*c)+abs(u+d-2.*c))/(c*pixelAngle);
  float nearer=max(max(l-c,r-c),max(d-c,u-c))/c;
  float edge=smoothstep(.7,1.6,fold)*(1.-smoothstep(.02,.06,nearer));
  float silhouette=smoothstep(12.,40.,fold)*(1.-smoothstep(.02,.06,nearer));
  float distanceFade=(1.-smoothstep(inkRange.x,inkRange.y,z)*.72)*(1.-smoothstep(480.,700.,z));
  float brush=.7+.3*noise(gl_FragCoord.xy*vec2(.19,.31));
  float ink=clamp(max(edge*.62,silhouette)*distanceFade*brush*strength,0.,1.);
  if(!exactColor){
    // Filmic shoulder (fitted ACES), then a gentle return toward pigment saturation.
    color*=exposure/.6;
    color=mat3(.59719,.07600,.02840,.35458,.90834,.13383,.04823,.01566,.83777)*color;
    vec3 a=color*(color+.0245786)-.000090537,b=color*(.983729*color+.4329510)+.238081;color=a/b;
    color=clamp(mat3(1.60475,-.10208,-.00327,-.53108,1.10813,-.07276,-.07367,-.00605,1.07602)*color,0.,1.);
    float grey=dot(color,vec3(.299,.587,.114));color=max(mix(vec3(grey),color,.92),0.);
    color=shadowInk+color*(1.-shadowInk);
    float fiber=noise(gl_FragCoord.xy*vec2(.011,.4))*.6+noise(gl_FragCoord.xy*vec2(.05,.85))*.4;
    color*=mix(vec3(1.),paperTint,.35+.4*fiber);
    color+=(hash(gl_FragCoord.xy)-.5)*.01;
  }
  color=mix(color,inkColor*(.5+.5*color),ink*.86);
  vec2 v=(vUv-.5)*vec2(aspect,1.);color*=mix(vec3(.9,.86,.79),vec3(1.),smoothstep(1.1,.45,length(v)));
  gl_FragColor=vec4(clamp(color,0.,1.),1.);
  #include <colorspace_fragment>
}`;

/** Scene → HDR target with depth → one painted resolve: ink lines, silk grade, aged edges. */
export class InkPipeline{
  readonly target:T.WebGLRenderTarget;readonly material:T.ShaderMaterial;private quad:FullScreenQuad;private samples=4;
  readonly range=new T.Vector2(40,150);
  constructor(private renderer:T.WebGLRenderer){
    const hdr=renderer.extensions.has('EXT_color_buffer_float')||renderer.extensions.has('EXT_color_buffer_half_float');
    this.target=new T.WebGLRenderTarget(1,1,{type:hdr?T.HalfFloatType:T.UnsignedByteType,samples:this.samples,depthTexture:new T.DepthTexture(1,1,T.FloatType)});
    this.target.texture.name='ink-scene';
    this.material=new T.ShaderMaterial({vertexShader,fragmentShader,depthTest:false,depthWrite:false,toneMapped:false,uniforms:{
      tColor:{value:this.target.texture},tDepth:{value:this.target.depthTexture},texel:{value:new T.Vector2(1,1)},near:{value:.1},far:{value:900},aspect:{value:1},
      pixelAngle:{value:.002},lineWidth:{value:1},exposure:{value:1},strength:{value:1},inkRange:{value:this.range},
      inkColor:{value:new T.Color(pigment.ink)},paperTint:{value:new T.Color('#fff6e6')},shadowInk:{value:new T.Color('#0f0e0c')}
    }});
    this.quad=new FullScreenQuad(this.material);
  }
  setSize(width:number,height:number,pixelRatio:number){
    const w=Math.max(1,Math.round(width*pixelRatio)),h=Math.max(1,Math.round(height*pixelRatio)),u=this.material.uniforms;
    // Whole-texel offsets: depth is sampled nearest, so a fractional step (1.275 at pixel ratio 1.5) snaps to
    // uneven neighbours and flat ground reads as folds, blotting floors with false ink.
    this.target.setSize(w,h);u.texel.value.set(1/w,1/h);u.aspect.value=width/Math.max(1,height);u.lineWidth.value=Math.max(1,Math.round(pixelRatio*.85));
  }
  set quality(low:boolean){const samples=low?0:4;if(samples===this.samples)return;this.samples=samples;this.target.dispose();this.target.samples=samples;}
  render(scene:T.Scene,camera:T.PerspectiveCamera){
    const u=this.material.uniforms,renderer=this.renderer;
    u.near.value=camera.near;u.far.value=camera.far;
    // Angular size of one depth sample step, so fold strength is independent of resolution and field of view.
    u.pixelAngle.value=2*Math.tan(T.MathUtils.degToRad(camera.fov)/2)/camera.zoom*u.lineWidth.value/this.target.height;
    const previous=renderer.getRenderTarget();
    renderer.setRenderTarget(this.target);renderer.render(scene,camera);
    renderer.setRenderTarget(previous);this.quad.render(renderer);
  }
  dispose(){this.target.depthTexture?.dispose();this.target.dispose();this.material.dispose();this.quad.dispose();}
}
