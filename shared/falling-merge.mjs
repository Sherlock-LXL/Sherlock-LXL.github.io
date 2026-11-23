/** 冬季落球合并游戏使用小型圆碰撞求解器，单位为画布宽度。 */
export const orbRadii = [0.032, 0.044, 0.058, 0.075, 0.094, 0.116, 0.14, 0.165, 0.191];
export const orbNames = ["芽", "花", "露", "叶", "果", "月", "星", "云", "日"];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export class FallingMerge {
  constructor(random = Math.random) {
    this.random = random;
    this.score = 0;
    this.over = false;
    this.time = 0;
    this.aim = 0.5;
    this.cooldown = 0;
    this.overflow = 0;
    this.drops = 0;
    this.highest = 0;
    this.id = 0;
    /** @type {{id:number;x:number;y:number;vx:number;vy:number;level:number;r:number;age:number;wait:number;pulse:number}[]} */
    this.balls = [];
    /** @type {{x:number;y:number;r:number;age:number;kind:string}[]} */ this.effects = [];
    this.next = [this.draw(), this.draw()];
  }
  draw() {
    return Math.floor(this.random() * 3);
  }
  get radius() {
    return orbRadii[this.next[0]];
  }
  get ready() {
    return !this.over && this.cooldown <= 0;
  }
  make(level, x, y, vx = 0, vy = 0) {
    return { id: ++this.id, level, r: orbRadii[level], x, y, vx, vy, age: 0, wait: 0.08, pulse: 0 };
  }
  drop() {
    if (!this.ready) return false;
    const level = this.next[0],
      r = orbRadii[level],
      x = clamp(this.aim, 0.07 + r, 0.93 - r);
    if (this.balls.some((b) => Math.hypot(b.x - x, b.y - 0.085) < b.r + r)) return false;
    this.balls.push(this.make(level, x, 0.085, 0, 0.45));
    this.next.shift();
    this.next.push(this.draw());
    this.cooldown = 0.24;
    this.drops++;
    return true;
  }
  walls(b, h = 0) {
    const low = 0.07 + b.r,
      high = 0.93 - b.r,
      floor = 0.94 - b.r;
    if (b.x < low) {
      b.x = low;
      if (b.vx < 0) b.vx *= -0.4;
    }
    if (b.x > high) {
      b.x = high;
      if (b.vx > 0) b.vx *= -0.4;
    }
    if (b.y > floor) {
      b.y = floor;
      if (b.vy > 0.5) {
        b.pulse = Math.min(0.16, b.vy * 0.07);
        this.effects.push({ x: b.x, y: b.y, r: b.r, age: 0, kind: "hit" });
      }
      if (b.vy > 0) b.vy = b.vy < 0.18 ? 0 : -b.vy * 0.3;
      // 每个时间步仅施加一次摩擦。
      b.vx *= Math.exp(-h * 2.2);
    }
  }
  step(h) {
    for (const b of this.balls) {
      b.age += h;
      b.wait = Math.max(0, b.wait - h);
      b.pulse *= Math.exp(-h * 18);
      b.vy = Math.min(2.6, b.vy + 3.4 * h);
      b.vx *= Math.exp(-h * 0.28);
      b.x += b.vx * h;
      b.y += b.vy * h;
      this.walls(b, h);
    }
    for (let pass = 0; pass < 5; pass++) {
      const sorted = this.balls.slice().sort((a, b) => a.x - a.r - (b.x - b.r)),
        gone = new Set(),
        born = [];
      for (let i = 0; i < sorted.length; i++) {
        const a = sorted[i];
        if (gone.has(a.id)) continue;
        for (let j = i + 1; j < sorted.length; j++) {
          const b = sorted[j];
          if (b.x - b.r > a.x + a.r) break;
          if (gone.has(b.id)) continue;
          const dx = b.x - a.x,
            dy = b.y - a.y,
            r = a.r + b.r;
          if (Math.abs(dy) >= r) continue;
          const d = Math.hypot(dx, dy);
          if (d >= r) continue;
          if (a.level === b.level && a.level < orbRadii.length - 1 && !a.wait && !b.wait) {
            const child = this.make(
              a.level + 1,
              (a.x + b.x) / 2,
              (a.y + b.y) / 2,
              (a.vx + b.vx) / 2,
              (a.vy + b.vy) / 2,
            );
            child.age = 1;
            child.vy = Math.min(child.vy, -0.25);
            child.pulse = 0.1;
            this.walls(child);
            born.push(child);
            gone.add(a.id);
            gone.add(b.id);
            this.score += 2 ** child.level * 10;
            this.highest = Math.max(this.highest, child.level);
            this.effects.push({ x: child.x, y: child.y, r: child.r, age: 0, kind: "merge" });
            break;
          }
          const nx = d ? dx / d : 1,
            ny = d ? dy / d : 0,
            overlap = r - d;
          // 质量按游戏半径计算，使新生成的小球可推动大球。
          const ma = a.r,
            mb = b.r,
            wa = mb / (ma + mb),
            wb = 1 - wa;
          a.x -= nx * overlap * wa;
          a.y -= ny * overlap * wa;
          b.x += nx * overlap * wb;
          b.y += ny * overlap * wb;
          const approach = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (approach < 0) {
            const impulse = approach * 1.52;
            a.vx += nx * impulse * wa;
            a.vy += ny * impulse * wa;
            b.vx -= nx * impulse * wb;
            b.vy -= ny * impulse * wb;
            if (approach < -0.45) {
              a.pulse = Math.max(a.pulse, Math.min(0.14, -approach * 0.04));
              b.pulse = Math.max(b.pulse, Math.min(0.14, -approach * 0.04));
            }
            // 轻微接触摩擦稳定堆叠，同时保持圆球下落。
            const tangent = (b.vx - a.vx) * -ny + (b.vy - a.vy) * nx;
            a.vx += -ny * tangent * 0.05 * wa;
            a.vy += nx * tangent * 0.05 * wa;
            b.vx -= -ny * tangent * 0.05 * wb;
            b.vy -= nx * tangent * 0.05 * wb;
          }
          this.walls(a);
          this.walls(b);
        }
      }
      if (gone.size) this.balls = this.balls.filter((b) => !gone.has(b.id)).concat(born);
    }
  }
  update(dt) {
    if (this.over) return;
    dt = clamp(dt, 0, 0.1);
    if (!dt) return;
    this.time += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    const count = Math.max(1, Math.ceil(dt * 120)),
      h = dt / count;
    for (let i = 0; i < count; i++) this.step(h);
    this.effects.forEach((e) => (e.age += dt));
    this.effects = this.effects.filter((e) => e.age < 0.3).slice(-16);
    const crowded = this.balls.some((b) => b.age > 1 && b.y - b.r < 0.2 && Math.abs(b.vy) < 0.15);
    this.overflow = crowded ? this.overflow + dt : Math.max(0, this.overflow - dt * 2);
    if (this.overflow > 1.1) this.over = true;
  }
}
