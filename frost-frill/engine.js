/* Deterministic simulation. Times and effects are in simulated seconds. */
class Battle {
 constructor(data,difficulty=0,positions={},emit=()=>{}){this.data=data;this.difficulty=difficulty;this.emit=emit;this.time=90;this.wave=0;this.state='running';this.auto=true;this.transition=0;this.allies=data.map((c,i)=>({...c,position:positions[c.id]||c.position,maxHp:c.hp,hp:c.hp,cool:3+i*.65,attack:1+i*.25,freeze:0,shield:0,shieldTime:0}));this.nextWave();}
 nextWave(){this.wave++;const d=this.difficulty;const factor=1+d*.18;this.enemies=Array.from({length:this.wave===3?3:4},(_,i)=>{const boss=this.wave===3&&i===0;return {id:'e'+i,name:boss?'氷砂糖の番人':'シュガーウィスプ',boss,maxHp:Math.round((boss?12500:2600+this.wave*600)*factor),hp:Math.round((boss?12500:2600+this.wave*600)*factor),atk:(boss?640:240+this.wave*50)*factor,def:boss?260:140,freeze:0,attack:1+i*.5,shield:0,shieldTime:0};});this.emit('wave',{wave:this.wave});}
 alive(list){return list.filter(x=>x.hp>0)}
 front(list){const order={'前方':0,'中央':1,'後方':2};return this.alive(list).slice().sort((a,b)=>(order[a.position]??0)-(order[b.position]??0))[0]}
 damage(target,raw,source){if(!target||target.hp<=0)return;let amount=Math.round(raw*1000/(1000+target.def));const absorbed=Math.min(target.shield||0,amount);target.shield-=absorbed;amount-=absorbed;target.hp=Math.max(0,target.hp-amount);this.emit('damage',{target,amount,source});}
 skill(index){const a=this.allies[index];if(this.state!=='running'||this.transition>0||!a||a.hp<=0||a.cool>0||!this.alive(this.enemies).length)return false;a.cool=a.ct;this.emit('skill',{actor:a});if(a.type==='freeze'){const t=this.front(this.enemies);this.damage(t,a.atk*1.06,a);if(t.hp>0)t.freeze=5;}
 if(a.type==='shield'){for(const t of this.alive(this.allies)){t.shield=t.maxHp*.2;t.shieldTime=6;}this.damage(this.front(this.enemies),a.atk*1.5,a);}
 if(a.type==='rush')this.damage(this.front(this.enemies),a.atk*2.8,a);
 if(a.type==='magic')for(const t of this.alive(this.enemies))this.damage(t,a.atk*1.6,a);
 if(a.type==='heal')for(const t of this.alive(this.allies)){const amount=Math.min(t.maxHp-t.hp,Math.round(a.atk*1.8));t.hp+=amount;this.emit('heal',{target:t,amount});}return true;}
 update(dt){if(this.state!=='running')return;this.time=Math.max(0,this.time-dt);if(this.time<=0){this.finish('defeat');return;}
 if(this.transition>0){this.transition-=dt;if(this.transition<=0)this.nextWave();return;}
 for(const t of [...this.allies,...this.enemies]){t.freeze=Math.max(0,t.freeze-dt);t.shieldTime=Math.max(0,t.shieldTime-dt);if(!t.shieldTime)t.shield=0;}
 this.allies.forEach((a,i)=>{if(a.hp<=0)return;a.cool=Math.max(0,a.cool-dt);if(this.auto)this.skill(i);a.attack-=dt;if(a.attack<=0){a.attack=1.8;this.damage(this.front(this.enemies),a.atk*.42,a);}});
 for(const e of this.alive(this.enemies)){if(e.freeze>0)continue;e.attack-=dt;if(e.attack<=0){e.attack=e.boss?1.65:2.1;this.damage(this.front(this.allies),e.atk,e);}}
 if(!this.alive(this.allies).length)this.finish('defeat');else if(!this.alive(this.enemies).length){if(this.wave===3)this.finish('victory');else this.transition=1.3;}}
 finish(state){this.state=state;this.emit('finish',{state});}
}
if(typeof module!=='undefined')module.exports=Battle;
