const KEY = 'xiangmeta:visitor:v1';
export class VisitorStore {
  visited = new Set<string>(); favorites = new Set<string>(); discoveries = new Set<string>(); memories=new Set<string>(); muted = true;
  constructor() {
    try { const data=JSON.parse(localStorage.getItem(KEY) ?? '{}');
      this.visited=new Set(Array.isArray(data.visited)?data.visited.filter((s:unknown)=>typeof s==='string'):[]);
      this.favorites=new Set(Array.isArray(data.favorites)?data.favorites.filter((s:unknown)=>typeof s==='string'):[]);
      this.discoveries=new Set(Array.isArray(data.discoveries)?data.discoveries.filter((s:unknown)=>typeof s==='string'):[]);
      this.memories=new Set(Array.isArray(data.memories)?data.memories.filter((s:unknown)=>typeof s==='string'):[]);
      this.muted=data.muted!==false;
    } catch { /* A damaged save must not prevent entering the world. */ }
  }
  save() { try { localStorage.setItem(KEY,JSON.stringify({version:1,visited:[...this.visited],favorites:[...this.favorites],discoveries:[...this.discoveries],memories:[...this.memories],muted:this.muted})); } catch { /* Browsing still works with storage disabled. */ } }
}
