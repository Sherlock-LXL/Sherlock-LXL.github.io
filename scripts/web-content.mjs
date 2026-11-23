import {readdir, readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {moduleSchema, regionSchema} from '../shared/schema.mjs';

/** Build only explicitly public content and versioned, hash-checked AI exports. */
export async function webContent(root) {
  const json = async file => JSON.parse(await readFile(path.join(root,file),'utf8'));
  const world = await json('data/world.json');
  const regions = world.regions.map(r=>regionSchema.parse(r));
  const modules = [];
  const folders = (await readdir(path.join(root,'modules'),{withFileTypes:true}))
    .filter(d=>d.isDirectory()&&!d.name.startsWith('_')).sort((a,b)=>a.name.localeCompare(b.name));
  for (const folder of folders) {
    try { regions.push(regionSchema.parse(await json(`modules/${folder.name}/region.json`))); }
    catch(error) { if(error.code!=='ENOENT') throw error; }
    const m = moduleSchema.parse(await json(`modules/${folder.name}/manifest.json`));
    if(m.id!==folder.name) throw new Error(`Module folder/id mismatch: ${folder.name}`);
    const {runtime, interface:workbench, ...exhibit} = m;
    if(exhibit.world) delete exhibit.world.audio;
    exhibit.media = m.media.filter(media=>media.kind==='image');
    exhibit.albums = m.albums?.map(a=>{
      if(!a.link) throw new Error(`Album needs an external link: ${m.id}/${a.id}`);
      return {...a,tracks:a.tracks.map(({src,...track})=>track)};
    });
    modules.push({...exhibit,status:{state:'exhibition',detail:m.simulation?'浏览器交互模拟 · 演示参数':runtime?'项目档案 · 源码与运行说明见 GitHub':'展览已开放'}});
  }
  if(new Set(regions.map(r=>r.id)).size!==regions.length) throw new Error('Duplicate region id');
  for(const m of modules) {
    if(!regions.some(r=>r.id===m.region)) throw new Error(`Unknown region: ${m.region}`);
    for(const c of m.world?.connections??[]) if(!modules.some(p=>p.id===c.target)) throw new Error(`Unknown connection: ${c.target}`);
  }
  const projects = modules.map(m=>({
    id:m.id,name:m.portfolio?.name??m.title,
    category:m.portfolio?.category??(m.category==='RESEARCH'?'Research':m.category==='AI PROJECT'?'AI':'Creative'),
    description:m.portfolio?.summary??m.description,
    technologies:m.portfolio?.technologies??m.tags,
    github:m.portfolio?.github,demo:m.portfolio?.demo??m.link,
    featured:m.portfolio?.featured??false,order:m.portfolio?.order??100,
    position:m.position,region:m.region,owner:m.owner,
    screenshots:m.portfolio?.screenshots??[],facts:m.facts,story:m.story,
    albums:m.albums,media:m.media,simulation:m.simulation
  })).sort((a,b)=>a.order-b.order);
  const audio = await json('data/audio.json');
  const music = [...audio.playlist,...Object.values(audio.seasonal)];
  const musicAssets = new Set(music.map(track=>track.src));
  if(music.length!==11||musicAssets.size!==11||music.some(t=>!/^\/assets\/music\/(backing-0[1-7]|spring|summer|autumn|winter)\.mp3$/.test(t.src)))
    throw new Error('Only the seven BGM tracks and four seasonal MP3s may be published');
  const imagePreviews = await json('data/image-previews.json');
  const catalog = {regions,modules,agents:[],warnings:[],audio,imagePreviews};
  const portfolio = {profile:await json('data/profile.json'),projects};
  // Explicit images/GLBs and compressed background tracks; never copy whole archives.
  const assets = new Map();
  async function collect(value) {
    if(typeof value==='string' && value.startsWith('/assets/')) {
      if(assets.has(value)) return;
      if((!/^\/assets\/[a-zA-Z0-9_./-]+\.(webp|png|jpe?g|glb)$/.test(value)&&!musicAssets.has(value))||value.includes('..'))
        throw new Error(`Unsupported web asset: ${value}`);
      const relative=value.startsWith('/assets/modules/')?value.slice('/assets/'.length).replace(/^modules\/([^/]+)\//,'modules/$1/assets/'):path.join('public',value.slice(1));
      const file=path.join(root,relative);
      const info=await stat(file);
      if(info.size>(musicAssets.has(value)?8:5)*1024*1024) throw new Error(`Web asset exceeds size budget: ${value}`);
      assets.set(value,{file,size:info.size});
    } else if(Array.isArray(value)) { for(const item of value) await collect(item); }
    else if(value&&typeof value==='object') { for(const item of Object.values(value)) await collect(item); }
  }
  await collect(catalog);await collect(portfolio);
  const aiLab=await json('data/ai-lab-models.json');
  for(const project of aiLab.projects)for(const resource of project.resources){
    if(!/^\/assets\/ai-lab\/[a-z0-9-]+\/[a-z0-9.-]+\.(json|onnx|bin)$/.test(resource.path)||resource.path.includes('..')||!/^[a-f0-9]{64}$/.test(resource.sha256))
      throw new Error(`Unsupported AI export: ${resource.path}`);
    const file=path.join(root,'public',resource.path.slice(1)),info=await stat(file);
    if(info.size!==resource.bytes||info.size>=100*1024*1024)throw new Error(`AI export size mismatch: ${resource.path}`);
    assets.set(resource.path,{file,size:info.size,sha256:resource.sha256});
  }
  const runtime=await json('node_modules/onnxruntime-web/package.json');
  if(runtime.version!==aiLab.runtimeVersion)throw new Error('ONNX Web runtime version mismatch');
  for(const name of ['ort-wasm-simd-threaded.mjs','ort-wasm-simd-threaded.wasm']){
    const file=path.join(root,'node_modules/onnxruntime-web/dist',name),info=await stat(file);
    assets.set(`/assets/ai-runtime/${name}`,{file,size:info.size});
  }
  return {catalog,portfolio,aiLab,assets};
}

export function webContentPlugin() {
  let root,content,base;
  const labOnly=Boolean(process.env.AI_LAB_ONLY);
  const files=()=>new Map(labOnly?[
    ['/content/ai-lab.json',JSON.stringify(content.aiLab)]
  ]:[
    ['/content/world.json',JSON.stringify(content.catalog)],
    ['/content/projects.json',JSON.stringify(content.portfolio)],
    ['/content/ai-lab.json',JSON.stringify(content.aiLab)]
  ]);
  return {
    name:'xiangmeta-public-content',
    async configResolved(config){root=config.root;base=config.base;content=await webContent(root);},
    configureServer(server){
      server.watcher.add([path.join(root,'modules'),path.join(root,'data')]);
      server.watcher.on('change',async file=>{
        if(!/\/(manifest|region|world|profile|audio|image-previews|ai-lab-models)\.json$/.test(file))return;
        try{content=await webContent(root);server.ws.send({type:'full-reload'});}
        catch(error){server.config.logger.error(error.message);}
      });
      server.middlewares.use(async(req,res,next)=>{
        let url=new URL(req.url,'http://localhost').pathname;
        if(base!=='/'&&url.startsWith(base))url='/'+url.slice(base.length);
        const text=files().get(url),asset=content.assets.get(url);
        if(text!==undefined){res.setHeader('Content-Type','application/json');res.end(text);return;}
        if(asset){try{res.setHeader('Content-Type',url.endsWith('.mp3')?'audio/mpeg':url.endsWith('.webp')?'image/webp':url.endsWith('.png')?'image/png':url.endsWith('.glb')?'model/gltf-binary':url.endsWith('.wasm')?'application/wasm':url.endsWith('.mjs')?'text/javascript':url.endsWith('.json')?'application/json':/\.(onnx|bin)$/.test(url)?'application/octet-stream':'image/jpeg');res.end(await readFile(asset.file));}catch{res.statusCode=404;res.end();}return;}
        next();
      });
    },
    async generateBundle(){
      content=await webContent(root);
      for(const [fileName,source] of files())this.emitFile({type:'asset',fileName:fileName.slice(1),source});
      for(const [url,{file,sha256}] of content.assets){
        if(labOnly&&!url.startsWith('/assets/ai-'))continue;
        const source=await readFile(file);
        if(sha256&&createHash('sha256').update(source).digest('hex')!==sha256)throw new Error(`AI export hash mismatch: ${url}`);
        this.emitFile({type:'asset',fileName:url.slice(1),source});
      }
      this.emitFile({type:'asset',fileName:'.nojekyll',source:''});
      const notices=[];
      for(const name of ['three','zod'])notices.push(`${name}\n\n${await readFile(path.join(root,'node_modules',name,'LICENSE'),'utf8')}`);
      notices.push(`onnxruntime-web ${content.aiLab.runtimeVersion}\n\n${await readFile(path.join(root,'scripts/ai-lab-originals/onnxruntime/LICENSE'),'utf8')}`);
      for(const name of ['gift-chooser','expression-recognition-cnn','blind-verse-rnn']){
        const license=await readFile(path.join(root,'scripts/ai-lab-originals',name,'LICENSE'),'utf8');
        notices.push(`Original model: ${name}\n\n${license}`);
      }
      notices.push(await readFile(path.join(root,'scripts/ai-lab-originals/gift-chooser/MODEL_AND_DATA_NOTICE.md'),'utf8'));
      this.emitFile({type:'asset',fileName:'THIRD_PARTY_NOTICES.txt',source:notices.join('\n\n----------------\n\n')});
    }
  };
}
