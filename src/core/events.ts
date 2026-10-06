import type { Exhibit,Discovery,MemoryFragment,ArtworkInteraction } from './types';
type Events = { demo:Exhibit;harbor:void;harborNearby:boolean; artworkNearby:ArtworkInteraction|null; artwork:ArtworkInteraction; select: Exhibit; interact: Exhibit; view: 'first-person'|'map'; look: boolean; region: string; nearby: Exhibit | null; move: { x:number; z:number }; sound: 'ui'|'interaction'; expression: string; wonderNearby:Discovery|null; discover:Discovery; melody:number[]; memoryNearby:MemoryFragment|'constellation'|null; memory:MemoryFragment; constellation:void; photo:boolean; horizon:string; whisper:string };
export class EventBus {
  private target = new EventTarget();
  on<K extends keyof Events>(key: K, handler: (value:Events[K])=>void) {
    const listener = (event: Event) => handler((event as CustomEvent).detail);
    this.target.addEventListener(key, listener);
    return () => this.target.removeEventListener(key, listener);
  }
  emit<K extends keyof Events>(key:K, value:Events[K]) { this.target.dispatchEvent(new CustomEvent(key,{detail:value})); }
}
