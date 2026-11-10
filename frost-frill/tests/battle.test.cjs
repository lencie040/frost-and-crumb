const { test } = require('node:test');
const assert = require('node:assert/strict');
const Battle = require('../engine.js'), data = require('../data.js');
function ready(b) { b.travel = 0; b.allies.forEach(a => a.attack = 100); b.enemies.forEach(e => e.attack = 100); return b; }
function advance(b, seconds) { for (let i = 0; i < Math.ceil(seconds / .025); i++) b.update(.025); }

test('Frozen Frill matches the source sheet', () => {
 const c = data[0]; assert.deepEqual([c.atk, c.hp, c.def, c.ct], [1370, 1390, 350, 18]);
});
test('freeze deals 106%, lasts five seconds and enforces cooldown', () => {
 const b = ready(new Battle(data)), a = b.allies[0], e = b.enemies[0]; a.cool = 0; const hp = e.hp;
 assert.equal(b.skill(0), true); assert.equal(hp - e.hp, Math.round(1370 * 1.06 * 1000 / (1000 + e.def)));
 assert.equal(e.freeze, 5); assert.equal(a.cool, 18); assert.equal(b.skill(0), false); b.update(1); assert.equal(e.freeze, 4);
});
test('party runs toward enemies and attacks only after reaching melee range', () => {
 const b = new Battle(data); const original = b.allies[1].x;
 assert.equal(b.skill(0), false); advance(b, 2); assert.ok(b.allies[1].x > original);
 b.enemies.forEach(e => e.attack = 100); advance(b, 3); assert.ok(b.enemies[0].hp < b.enemies[0].maxHp);
});
test('normal attacks resolve after travel time and target the frontline', () => {
 const b = ready(new Battle(data)); const e = b.enemies[0]; e.x = b.allies[1].x + 110; e.attack = 0;
 b.update(.01); assert.equal(b.allies[1].hp, 6700); advance(b, .25);
 assert.equal(b.allies[0].hp, 1390); assert.ok(b.allies[1].hp < 6700);
});
test('healing is capped and shields expire after six seconds', () => {
 const b = ready(new Battle(data)); b.allies[4].cool = 0; b.allies[0].hp = 1300; b.skill(4);
 assert.equal(b.allies[0].hp, 1390); b.allies[1].cool = 0; b.skill(1); assert.ok(b.allies[0].shield > 0);
 advance(b, 6.1); assert.equal(b.allies[0].shield, 0);
});
test('freeze interrupts a telegraphed boss attack without changing its five second duration', () => {
 const events = []; const b = ready(new Battle(data, 0, {}, t => events.push(t)));
 b.wave = 2; b.nextWave(); b.enemies.forEach(e => e.attack = 100); const boss = b.enemies[0]; boss.special = 0;
 b.update(.01); assert.ok(boss.cast > 0); assert.ok(events.includes('warning'));
 b.allies[0].cool = 0; b.skill(0); assert.equal(boss.cast, 0); assert.equal(boss.freeze, 5); assert.ok(events.includes('interrupt'));
 advance(b, 3); assert.equal(events.includes('slam'), false);
});
test('uninterrupted boss charge damages the entire party', () => {
 const b = ready(new Battle(data)); b.wave = 2; b.nextWave(); b.enemies.forEach(e => e.attack = 100); b.enemies[0].special = 0;
 advance(b, 2.6); for(const a of b.allies) assert.ok(a.hp < a.maxHp);
});
test('all three stages can be cleared and completed simulations stop', () => {
 for(let d = 0; d < 3; d++) { const b = new Battle(data, d); b.auto = true;
 for(let n = 0; n < 10000 && b.state === 'running'; n++) b.update(.025);
 assert.equal(b.state, 'victory'); assert.equal(b.wave, 3); const time = b.time; b.update(1); assert.equal(b.time, time); }
});
test('timeout and party wipe cause defeat', () => {
 const b = new Battle(data); b.time = .01; b.update(.02); assert.equal(b.state, 'defeat');
 const c = ready(new Battle(data)); c.allies.forEach(a => a.hp = 0); c.update(.01); assert.equal(c.state, 'defeat'); assert.equal(c.skill(0), false);
});
