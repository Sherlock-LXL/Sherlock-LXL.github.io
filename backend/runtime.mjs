import { spawn } from 'node:child_process';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
export async function runWorker(module,input,{signal,timeout=180_000,onToken}={}) {
  // Electron extracts workers into a temporary directory. Read once in Node, then execute
  // the trusted adapter as code so Python never reopens that transient filename.
  const adapter=await readFile(path.join(module.folder,module.runtime.entry),'utf8');
  return new Promise((resolve,reject)=>{
    if(signal?.aborted) return reject(new Error('请求已取消'));
    const child=spawn(module.python,['-I','-B','-X','utf8','-u','-c',adapter],{
      cwd:module.source,windowsHide:true,shell:false,
      env:{...process.env,PYTHONUTF8:'1',PYTHONDONTWRITEBYTECODE:'1',XIANGMETA_SOURCE:module.source}
    });
    child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
    let output='',pending='',error='',settled=false;
    const finish=(err,result)=>{
      if(settled)return; settled=true; clearTimeout(timer);signal?.removeEventListener('abort',abort);
      child.stdin.destroy(); if(err){child.kill();reject(err);}else resolve(result);
    };
    const abort=()=>finish(new Error('请求已取消'));
    const timer=setTimeout(()=>finish(new Error('模型运行超时，已停止本次推理')),timeout);
    signal?.addEventListener('abort',abort,{once:true});
    child.on('error',e=>finish(new Error(e.code==='ENOENT'?'找不到 Python 解释器，请配置 data/local.json 的 python 路径':`无法启动模型：${e.message}`)));
    child.stdout.on('data',chunk=>{output+=chunk;pending+=chunk;if(output.length>1_000_000){finish(new Error('模型输出超出限制'));return;}let end;while((end=pending.indexOf('\n'))!==-1){const line=pending.slice(0,end);pending=pending.slice(end+1);if(line.startsWith('XIANGMETA_TOKEN:'))try{const token=JSON.parse(line.slice('XIANGMETA_TOKEN:'.length));if(typeof token.text==='string'&&!settled)onToken?.(token);}catch{finish(new Error('模型返回了无效的流式片段'));}}});
    child.stderr.on('data',chunk=>{error=(error+chunk.toString('utf8')).slice(-5000);});
    child.stdin.on('error',()=>{});
    child.on('close',code=>{
      if(settled)return;
      if(code!==0) return finish(new Error(`模型运行失败：${error.split('\n').filter(Boolean).at(-1) ?? '进程退出'}`));
      try {
        const line=output.split('\n').findLast(s=>s.startsWith('XIANGMETA_RESULT:'));
        const result=JSON.parse(line?.slice('XIANGMETA_RESULT:'.length) ?? 'null');
        if(!result || typeof result.text!=='string') throw new Error('Invalid response');
        finish(null,{...result,mode:'live'});
      } catch { finish(new Error('模型未返回有效的 XiangMeta 响应')); }
    });
    child.stdin.end(JSON.stringify(input));
  });
}
