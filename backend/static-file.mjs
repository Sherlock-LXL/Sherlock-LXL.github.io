import {createReadStream} from 'node:fs';
/** Single byte ranges let large local WAV/MP3 files seek without buffering them in the gateway. */
export function serveFile(req,res,file,size){
  res.setHeader('Accept-Ranges','bytes');let start=0,end=size-1;
  if(req.headers.range&&req.method==='GET'){
    const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if(!match||!size||(!match[1]&&!match[2])){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}
    if(!match[1])start=Math.max(0,size-Number(match[2]));
    else {start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}
    res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${size}`);
  }
  res.setHeader('Content-Length',Math.max(0,end-start+1));if(req.method==='HEAD'||!size){res.end();return;}
  const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
}
