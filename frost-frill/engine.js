/* Deterministic combat. All timers are measured in simulation seconds. */
class Battle {
  constructor(data, difficulty = 0, positions = {}, emit = () => {}) {
    this.data = data;
    this.difficulty = difficulty;
    this.emit = emit;
    this.time = 90;
    this.wave = 0;
    this.state = 'running';
    this.auto = false;
    this.transition = 0;
    this.travel = 1.8;
    this.distance = 0;
    this.pending = [];
    this.combo = 0;
    this.comboTime = 0;
    this.allies = data.map((c, i) => ({
      ...c, position: positions[c.id] || c.position, maxHp: c.hp,
      hp: c.hp, cool: 1.3 + i * .35, attack: .3 + i * .17,
      freeze: 0, shield: 0, shieldTime: 0, x: 0, y: 350,
      anim: 'run', animTime: 0, hurt: 0, knock: 0, deadTime: 0,
      attackCount: 0, side: 'ally'
    }));
    this.arrange();
    this.nextWave();
  }
  arrange() {
    const lanes = { '前方': 0, '中央': 0, '後方': 0 };
    this.allies.forEach(a => {
      const n = lanes[a.position]++;
      a.homeX = { '前方': 460, '中央': 310, '後方': 150 }[a.position] + n * 48;
      a.x = a.homeX - 60;
      a.y = 352 + n * 52;
    });
  }
  nextWave() {
    this.wave++;
    const factor = 1 + this.difficulty * .17;
    this.enemies = Array.from({ length: this.wave === 3 ? 3 : 4 }, (_, i) => {
      const boss = this.wave === 3 && i === 0;
      const ranged = !boss && i >= 2;
      const hp = Math.round((boss ? 15000 : 2500 + this.wave * 500) * factor);
      return {
        id: 'e' + this.wave + '-' + i, name: boss ? '氷砂糖の番人' : ranged ? 'シュガーソーサラー' : 'クランチガード',
        boss, ranged, maxHp: hp, hp, atk: (boss ? 470 : 185 + this.wave * 35) * factor,
        def: boss ? 260 : 140, freeze: 0, attack: .5 + i * .35,
        shield: 0, shieldTime: 0, side: 'enemy', x: 1120 + i * 100,
        y: 350 + (i % 2) * 54, anim: 'run', animTime: 0, hurt: 0, knock: 0,
        deadTime: 0, attackCount: 0, special: boss ? 4 : 9, cast: 0
      };
    });
    this.emit('wave', { wave: this.wave });
  }
  alive(list) { return list.filter(x => x.hp > 0); }
  front(list) {
    const order = { '前方': 0, '中央': 1, '後方': 2 };
    return this.alive(list).slice().sort((a, b) => (order[a.position] ?? 0) - (order[b.position] ?? 0))[0];
  }
  damage(target, raw, source, special = false) {
    if (!target || target.hp <= 0) return;
    let amount = Math.round(raw * 1000 / (1000 + target.def));
    const absorbed = Math.min(target.shield || 0, amount);
    target.shield -= absorbed;
    amount -= absorbed;
    target.hp = Math.max(0, target.hp - amount);
    target.hurt = .24;
    target.knock = special ? 23 : 8;
    if (source?.side === 'ally') { this.combo++; this.comboTime = 2; }
    this.emit('damage', { target, amount, absorbed, source, special });
    if (target.hp === 0) { target.deadTime = .6; this.emit('down', { target }); }
  }
  skill(index) {
    const a = this.allies[index];
    if (this.state !== 'running' || this.travel > 0 || this.transition > 0 || !a || a.hp <= 0 || a.cool > 0 || !this.alive(this.enemies).length) return false;
    a.cool = a.ct;
    a.anim = 'skill'; a.animTime = .7;
    const t = this.front(this.enemies);
    this.emit('skill', { actor: a, target: t });
    if (a.type === 'freeze') {
      this.damage(t, a.atk * 1.06, a, true);
      if (t.hp > 0) {
        t.freeze = 5;
        if (t.cast > 0) { t.cast = 0; t.special = 8; this.emit('interrupt', { target: t }); }
      }
    }
    if (a.type === 'shield') {
      for (const u of this.alive(this.allies)) { u.shield = u.maxHp * .2; u.shieldTime = 6; }
      this.damage(t, a.atk * 1.5, a, true);
    }
    if (a.type === 'rush') { this.damage(t, a.atk * 2.8, a, true); t.knock = 65; }
    if (a.type === 'magic') for (const u of this.alive(this.enemies)) this.damage(u, a.atk * 1.6, a, true);
    if (a.type === 'heal') for (const u of this.alive(this.allies)) {
      const amount = Math.min(u.maxHp - u.hp, Math.round(a.atk * 1.8));
      u.hp += amount; this.emit('heal', { target: u, amount });
    }
    return true;
  }
  attackUnit(a, target, ranged) {
    if (!target) return;
    a.anim = 'attack'; a.animTime = ranged ? .4 : .46;
    a.attackCount++;
    this.emit('attack', { actor: a, target, ranged });
    this.pending.push({ source: a, target, raw: a.side === 'ally' ? a.atk * .42 : a.atk, time: ranged ? .4 : .18 });
  }
  update(dt) {
    if (this.state !== 'running') return;
    this.time = Math.max(0, this.time - dt);
    if (!this.time) { this.finish('defeat'); return; }
    this.comboTime = Math.max(0, this.comboTime - dt);
    if (!this.comboTime) this.combo = 0;
    for (const u of [...this.allies, ...this.enemies]) {
      u.freeze = Math.max(0, u.freeze - dt);
      u.shieldTime = Math.max(0, u.shieldTime - dt);
      if (!u.shieldTime) u.shield = 0;
      u.animTime = Math.max(0, u.animTime - dt);
      u.hurt = Math.max(0, u.hurt - dt);
      u.knock = Math.max(0, u.knock - dt * 95);
      u.deadTime = Math.max(0, u.deadTime - dt);
      if (u.side === 'ally') u.cool = Math.max(0, u.cool - dt);
    }
    if (this.transition > 0) {
      this.transition -= dt;
      this.distance += dt * 160;
      this.allies.forEach(a => { a.anim = 'run'; a.x += (a.homeX - a.x) * Math.min(1, dt * 3); });
      if (this.transition <= 0) { this.nextWave(); this.travel = 1.4; }
      return;
    }
    if (this.travel > 0) {
      this.travel -= dt; this.distance += dt * 150;
      this.allies.forEach(a => { a.anim = 'run'; a.x += (a.homeX - a.x) * Math.min(1, dt * 3); });
      this.enemies.forEach(e => e.x -= dt * 170);
      return;
    }
    for (const hit of this.pending) {
      hit.time -= dt;
      if (hit.time <= 0) this.damage(hit.target, hit.raw, hit.source);
    }
    this.pending = this.pending.filter(h => h.time > 0);
    this.allies.forEach((a, i) => {
      if (a.hp <= 0) return;
      const target = this.front(this.enemies);
      if (!target) return;
      const ranged = a.position !== '前方';
      const desired = ranged ? a.homeX : Math.min(620, target.x - 95 - i % 2 * 18);
      const delta = desired - a.x;
      if (Math.abs(delta) > 5) { a.x += Math.sign(delta) * Math.min(Math.abs(delta), dt * 190); if (!a.animTime) a.anim = 'run'; }
      else if (!a.animTime) a.anim = 'idle';
      if (this.auto) this.skill(i);
      a.attack -= dt;
      if (a.attack <= 0 && (ranged || Math.abs(target.x - a.x) < 155)) {
        a.attack = a.type === 'rush' ? 1.35 : 1.65;
        this.attackUnit(a, target, ranged);
      }
    });
    for (const e of this.alive(this.enemies)) {
      if (e.freeze > 0) { e.anim = 'frozen'; continue; }
      const front = this.front(this.allies);
      if (!front) break;
      if (e.boss) {
        e.special -= dt;
        if (e.cast > 0) {
          e.cast -= dt;
          if (e.cast <= 0) {
            this.emit('slam', { actor: e });
            for (const a of this.alive(this.allies)) this.damage(a, e.atk * 1.8, e, true);
            e.special = 10; e.anim = 'attack'; e.animTime = .8;
          }
          continue;
        }
        if (e.special <= 0) { e.cast = 2.5; e.anim = 'charge'; this.emit('warning', { actor: e }); continue; }
      }
      const desired = e.ranged ? 960 + (e.attackCount % 2) * 25 : Math.max(710, front.x + 108);
      const delta = desired - e.x;
      if (Math.abs(delta) > 5) { e.x += Math.sign(delta) * Math.min(Math.abs(delta), dt * 145); if (!e.animTime) e.anim = 'run'; }
      else if (!e.animTime) e.anim = 'idle';
      e.attack -= dt;
      if (e.attack <= 0 && (e.ranged || Math.abs(e.x - front.x) < 170)) {
        e.attack = e.boss ? 1.8 : e.ranged ? 3.8 : 2.3;
        const target = e.ranged && e.attackCount % 3 === 2 ? this.alive(this.allies).at(-1) : front;
        this.attackUnit(e, target, e.ranged);
      }
    }
    if (!this.alive(this.allies).length) this.finish('defeat');
    else if (!this.alive(this.enemies).length) {
      this.pending = [];
      if (this.wave === 3) this.finish('victory');
      else { this.transition = 2.1; this.emit('march', {}); }
    }
  }
  finish(state) { this.state = state; this.emit('finish', { state }); }
}
if (typeof module !== 'undefined') module.exports = Battle;
