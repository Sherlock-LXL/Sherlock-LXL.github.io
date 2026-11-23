import {sitePath} from './portfolio';

/** One browsing context for all stations; same app as the standalone page. */
export function aiLabFrame(host:HTMLElement,close:()=>void){
  let frame:HTMLIFrameElement|undefined,project:string,ready=false;
  const send=()=>frame?.contentWindow?.postMessage({type:'xiangmeta:ai-activate',project},location.origin);
  window.addEventListener('message',event=>{
    if(event.source!==frame?.contentWindow||event.origin!==location.origin)return;
    if(event.data?.type==='xiangmeta:ai-ready'){
      ready=true;
      if(!host.hidden)send();
      else frame?.contentWindow?.postMessage({type:'xiangmeta:ai-suspend'},location.origin);
    }
    if(event.data?.type==='xiangmeta:ai-close'&&!host.hidden)close();
  });
  return {
    open(id:string){
      project=id;host.hidden=false;
      if(!frame){
        frame=document.createElement('iframe');frame.title='XiangMeta AI Lab 交互体验';
        frame.allow='camera';frame.referrerPolicy='same-origin';
        const inspect=new URLSearchParams(location.search).has('inspect')?'&inspect':'';
        frame.src=sitePath(`ai-lab/?embed=1&project=${encodeURIComponent(id)}${inspect}`);
        host.append(frame);
      }else if(ready)send();
    },
    suspend(){
      host.hidden=true;
      frame?.contentWindow?.postMessage({type:'xiangmeta:ai-suspend'},location.origin);
    },
  };
}
