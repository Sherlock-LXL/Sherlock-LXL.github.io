import http from 'node:http';
import { readFile, stat,realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog } from './catalog.mjs';
import { validateInput } from '../shared/schema.mjs';
import { runWorker } from './runtime.mjs';
import {serveFile} from './static-file.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg','.mp4':'video/mp4','.woff2':'font/woff2'};
export async function createServer({root=path.resolve(here,'..'),webRoot=path.resolve(here,'../dist'),configPath,port=4318,dev=false,runner=runWorker}={}) {
  const catalog=await loadCatalog(root,configPath);
  let active=null;
  const server=http.createServer(async(req,res)=>{
    const send=(status,body)=>{if(!res.destroyed){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(body));}};
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Cross-Origin-Resource-Policy','same-origin');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    try {
      const address=server.address();
      const hosts=new Set([`127.0.0.1:${address.port}`,`localhost:${address.port}`,...(dev?['127.0.0.1:5173','localhost:5173']:[])]);
      if(!hosts.has(req.headers.host))return send(403,{error:'Host not allowed'});
      if(req.headers.origin && ![...hosts].some(h=>req.headers.origin===`http://${h}`))return send(403,{error:'Origin not allowed'});
      const url=new URL(req.url,`http://${req.headers.host}`);
      if(url.pathname==='/api/catalog' && req.method==='GET')return send(200,catalog.public);
      if(url.pathname==='/api/health' && req.method==='GET')return send(200,{ok:true,busy:!!active,modules:catalog.public.modules.length});
      const match=url.pathname.match(/^\/api\/modules\/([a-z][a-z0-9-]*)\/invoke$/);
      if(match && req.method==='POST') {
        if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'Expected JSON'});
        const module=catalog.privateModules.get(match[1]);
        if(!module)return send(404,{error:'模块不存在'});
        if(!module.runtime || module.status.state!=='configured')return send(503,{error:module.status.detail});
        let body='',size=0;
        for await (const chunk of req) { size+=chunk.length;if(size>7_100_000){send(413,{error:'图片或请求过大（上限 5 MB）'});req.resume();return;}body+=chunk; }
        let input;
        try {input=validateInput(module,JSON.parse(body));} catch {return send(400,{error:'输入不符合模块要求，请检查字段、数值范围或图片格式'});}
        if(active)return send(429,{error:'另一个模型正在运行，请稍后重试'});
        const controller=new AbortController();active=controller;
        const disconnect=()=>{if(!res.writableEnded)controller.abort();};res.on('close',disconnect);
        const streaming=req.headers.accept?.includes('application/x-ndjson');
        const event=record=>{if(!res.destroyed&&!res.writableEnded)res.write(JSON.stringify(record)+'\n');};
        if(streaming){res.writeHead(200,{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store','X-Accel-Buffering':'no'});res.flushHeaders();event({type:'status',text:'正在加载本地模型…'});}
        try {const result=await runner(module,input,{signal:controller.signal,onToken:streaming?token=>event({type:'token',...token}):undefined});if(streaming){event({type:'done',result});res.end();}else send(200,result);}
        catch(e){if(streaming){event({type:'error',error:e.message});res.end();}else send(502,{error:e.message});}
        finally {res.removeListener('close',disconnect);if(active===controller)active=null;}
        return;
      }
      if(url.pathname.startsWith('/api/'))return send(404,{error:'Unknown endpoint'});
      if(req.method!=='GET' && req.method!=='HEAD')return send(405,{error:'Method not allowed'});
      let relative=decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
      const moduleAsset=relative.match(/^assets\/modules\/([a-z][a-z0-9-]*)\/(.+)$/);
      if(moduleAsset){
        const module=catalog.privateModules.get(moduleAsset[1]);if(!module||!/^[-a-zA-Z0-9_./]+$/.test(moduleAsset[2])||moduleAsset[2].includes('..')||!['.png','.jpg','.jpeg','.webp','.svg','.mp3','.wav','.ogg','.mp4','.glb','.woff2'].includes(path.extname(moduleAsset[2]).toLowerCase()))return send(404,{error:'资源不存在'});
        const base=await realpath(path.join(module.folder,'assets')),file=await realpath(path.resolve(base,moduleAsset[2]));
        if(!file.startsWith(base+path.sep))return send(403,{error:'Forbidden'});
        const info=await stat(file);if(!info.isFile())return send(404,{error:'资源不存在'});
        res.setHeader('Content-Type',mime[path.extname(file)]??'application/octet-stream');res.setHeader('Cache-Control','public, max-age=3600');serveFile(req,res,file,info.size);return;
      }
      const filename=path.resolve(webRoot,relative);
      if(!filename.startsWith(path.resolve(webRoot)+path.sep))return send(403,{error:'Forbidden'});
      const info=await stat(filename);if(!info.isFile())return send(404,{error:'Not found'});
      res.setHeader('Content-Type',mime[path.extname(filename)]??'application/octet-stream');
      res.setHeader('Cache-Control',relative==='index.html'?'no-cache':'public, max-age=3600');
      serveFile(req,res,filename,info.size);
    }catch(e){send(e.code==='ENOENT'?404:500,{error:e.code==='ENOENT'?'资源不存在':'服务处理失败'});}
  });
  server.requestTimeout=200_000;
  server.on('close',()=>active?.abort());
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  return {server,catalog,url:`http://127.0.0.1:${server.address().port}`};
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const {url}=await createServer({dev:process.argv.includes('--dev')});console.log(`XiangMeta ready: ${url}`);
}
