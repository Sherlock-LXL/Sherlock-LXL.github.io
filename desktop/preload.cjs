const {ipcRenderer}=require('electron');
window.addEventListener('DOMContentLoaded',()=>{
  document.body.classList.add('desktop-shell');const bar=document.createElement('header');bar.className='desktop-titlebar';bar.innerHTML='<span>✳</span> XiangMeta · 一个持续生长的世界';document.body.prepend(bar);
  let previous;const report=()=>{const active=!!document.querySelector('dialog[open]')||document.body.classList.contains('photo-mode');if(active!==previous){previous=active;ipcRenderer.send('xiangmeta:modal-state',active);}};
  new MutationObserver(report).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','class']});report();
});
