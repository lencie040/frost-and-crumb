const $=s=>document.querySelector(s),canvas=$('#scene'),ctx=canvas.getContext('2d');
let battle=null,paused=false,speed=1,auto=false,selected=0,positions={},effects=[],clock=0,last=0,shake=0,hitstop=0,cinematic=0,cutinTime=0,warningTime=0,sound=false,audio,record={};
try{record=JSON.parse(localStorage.getItem('frost-record')||'{}');positions=JSON.parse(localStorage.getItem('frost-formation')||'{}')}catch{};
const frill=new Image();frill.src='assets/frozen-frill.png';const scenery=new Image();scenery.src='assets/frozen-garden.png';
const images={};
function demoSVG(c){const extras=c.id==='biscuit'?'<path d="M28 55L32 24 48 35 60 17 73 35 87 24 93 55" fill="#e5b66c"/><path d="M14 93L37 88 40 122 23 132 9 115Z" fill="#ddad69"/><path d="M19 104L29 116M29 104L19 116" stroke="#fff0bd"/>':c.id==='berry'?'<path d="M23 60Q15 14 60 26Q111 16 99 63L87 42 74 56 58 39 40 59" fill="#ac4d76"/><path d="M54 27L62 15 66 27 79 23 71 35" fill="#719d6c"/>':c.id==='cocoa'?'<path d="M22 53L60 4 96 55Z" fill="#746191"/><path d="M19 54Q57 43 104 57" fill="none" stroke="#c4b5df" stroke-width="10"/><path d="M60 22L63 30 72 30 65 36 68 44 60 39 53 44 55 36 49 30 57 30Z" fill="#ffdf8f"/>':'<path d="M26 51Q21 32 44 30Q39 18 65 18Q84 20 81 34Q102 29 98 52" fill="#e6f2cf"/><path d="M65 23Q62 2 84 10Q84 27 65 23" fill="#6da78d"/>';
return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150"><g stroke="#614c48" stroke-width="3.5" stroke-linejoin="round"><path d="M41 115L34 141 49 143 60 120 71 143 86 140 77 115" fill="#bd885e"/><path d="M35 86L18 105 27 115 43 103M81 87L102 101 96 113 78 104" fill="#ecc58c"/><path d="M39 85L79 85 88 120Q59 135 31 120Z" fill="${c.color}"/><circle cx="60" cy="63" r="39" fill="#f2cd99"/>${extras}<ellipse cx="45" cy="66" rx="5" ry="9" fill="#493d47"/><ellipse cx="78" cy="66" rx="5" ry="9" fill="#493d47"/><path d="M55 80Q61 87 68 80" fill="none"/><circle cx="34" cy="79" r="5" fill="#e99886" stroke="none"/><circle cx="87" cy="79" r="5" fill="#e99886" stroke="none"/><path d="M52 98L61 106 69 97 64 115 56 115Z" fill="#fff5d6"/></g></svg>`}
for(const c of COOKIES.slice(1)){const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(demoSVG(c));images[c.id]=img;}
function portrait(c){return `<div class="portrait">${c.id==='frill'?'<img src="assets/frozen-frill.png" alt="フローズンフリルクッキー">':demoSVG(c)}</div>`}
function showDetail(i){selected=i;const c=COOKIES[i];$('#detail').innerHTML=`<span class="rarity">✦ ${c.rarity}</span><h2>${c.name}</h2><span class="tag">${c.element}属性</span> <span class="tag">${c.role} · ${positions[c.id]||c.position}</span><div class="stats"><span>攻撃力<b>${c.atk.toLocaleString()}</b></span><span>体力<b>${c.hp.toLocaleString()}</b></span><span>防御力<b>${c.def}</b></span></div><strong style="font-size:12px">${c.id==='frill'?'❄':'✧'} ${c.skill} <small style="font-weight:400;color:#8a9a88"> / ${c.ct}秒</small></strong><p>${c.description}</p>`;document.querySelectorAll('.roster button').forEach((b,j)=>b.classList.toggle('selected',j===i));}
$('#roster').innerHTML=COOKIES.map((c,i)=>`<button aria-label="${c.name}の情報" data-index="${i}">${portrait(c)}<small>${c.short}</small></button>`).join('');$('#roster').onclick=e=>{const b=e.target.closest('button');if(b)showDetail(+b.dataset.index)};
$('#skills').innerHTML=COOKIES.map((c,i)=>`<button class="skill" data-index="${i}" aria-label="${c.skill}を発動"><span class="key">${i+1}</span>${portrait(c)}<div><strong>${c.short}</strong><small>${c.skill}</small><small>${positions[c.id]||c.position}</small></div><div class="cool" style="display:none"></div><div class="hp" style="width:100%"></div></button>`).join('');
$('#skills').onclick=e=>{const b=e.target.closest('button');if(b)cast(+b.dataset.index)};
function cast(i){if(!paused&&battle){if(battle.skill(i))showDetail(i)}}
function beep(freq=550){if(!sound)return;try{audio||=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.2);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.2)}catch{}}
function burst(x,y,color,count=16,power=130){for(let i=0;i<count;i++){const angle=i/count*Math.PI*2;effects.push({type:'particle',x,y,vx:Math.cos(angle)*power*(.4+Math.random()),vy:Math.sin(angle)*power-60,life:.45+Math.random()*.4,color,size:3+Math.random()*6});}}
function event(type,p){
 if(type==='attack'){const a=unitPoint(p.actor),b=unitPoint(p.target);effects.push({type:p.ranged?'projectile':'slash',x:a.x,y:a.y-67,tx:b.x,ty:b.y-60,life:p.ranged?.4:.26,max:p.ranged?.4:.26,color:p.actor.color||'#d696e5',enemy:p.actor.side==='enemy'});}
 if(type==='damage'||type==='heal'){const pos=unitPoint(p.target);effects.push({type,x:pos.x+(Math.random()-.5)*22,y:pos.y-95,text:(type==='heal'?'+':'')+p.amount,life:1,special:p.special});if(type==='damage'){burst(pos.x,pos.y-60,p.absorbed?'#ffe7a2':p.source?.color||'#ffe5b2',p.special?24:8,p.special?180:90);shake=Math.max(shake,p.special?7:2);if(p.special)hitstop=.055;beep(p.special?180:340);}else burst(pos.x,pos.y-30,'#b4ffbf',7,60);}
 if(type==='skill'){
  const a=p.actor,pos=unitPoint(a),target=unitPoint(p.target);$('#banner').textContent=a.short+'：'+a.skill;cinematic=.5;cutinTime=1.2;const cut=$('#cutin');cut.style.setProperty('--skill-color',a.color);cut.querySelector('strong').textContent=a.skill;cut.querySelector('small').textContent=a.short+' / SKILL';const im=cut.querySelector('img');im.src=a.id==='frill'?'assets/frozen-frill.png':images[a.id].src;cut.classList.remove('show');void cut.offsetWidth;cut.classList.add('show');
  effects.push({type:a.type,x:pos.x,y:pos.y,tx:target.x,ty:target.y,life:1.2,max:1.2,color:a.color});burst(pos.x,pos.y-70,a.color,28,190);beep(a.type==='freeze'?1046:660);
 }
 if(type==='warning'){warningTime=2.5;$('#warning').textContent='⚠ 氷砕きの大衝撃！　凍結で阻止 / 盾で防御';$('#warning').classList.add('show');beep(150)}
 if(type==='interrupt'){warningTime=1.4;$('#warning').textContent='BREAK!　凍結で大技を中断！';$('#warning').classList.add('show');burst(p.target.x,p.target.y-90,'#c9f7ff',35,250)}
 if(type==='slam'){shake=22;effects.push({type:'slam',x:p.actor.x,y:p.actor.y,life:1,color:'#b2e7ff'});warningTime=0;beep(80)}
 if(type==='march')$('#banner').textContent='WAVE CLEAR!　次の戦いへ！';
 if(type==='wave')$('#banner').textContent=p.wave===3?'BOSS WAVE — 氷砂糖の番人':'WAVE '+p.wave+' — 駆け抜けよう！';
 if(type==='finish')finish(p.state);
}
function start(){effects=[];paused=false;shake=0;hitstop=0;cinematic=0;warningTime=0;$('#warning').classList.remove('show');document.body.classList.add('playing');$('#pause').disabled=false;$('#pause').textContent='Ⅱ';$('#difficulty').disabled=true;$('#formation').disabled=true;$('#curtain').style.display='none';battle=new Battle(COOKIES,+$('#difficulty').value,positions,event);battle.auto=auto;}
function finish(result){const win=result==='victory';document.body.classList.remove('playing');$('#pause').disabled=true;$('#difficulty').disabled=false;$('#formation').disabled=false;const alive=battle.alive(battle.allies).length;const stars=win?(alive===5?3:alive>=3?2:1):0;if(win){const key=$('#difficulty').value;record[key]=Math.max(record[key]||0,stars);try{localStorage.setItem('frost-record',JSON.stringify(record))}catch{}updateRecord();}$('#curtain').style.display='flex';$('#curtain').innerHTML=`<span class="eyebrow">${win?'STAGE CLEAR':'TRY AGAIN'}</span><h2>${win?'冒険、大成功！':'もう一度、挑もう。'}</h2><p>${win?'★'.repeat(stars)+'☆'.repeat(3-stars)+'　残り '+Math.ceil(battle.time)+'秒':'ボスの赤い予告はフリルの凍結で阻止！ 盾と回復も合わせよう。'}</p><button class="primary" id="restart">もう一度遊ぶ ➜</button>`;$('#restart').onclick=start;beep(win?1046:220);}
$('#start').onclick=start;$('#pause').onclick=()=>{if(!battle||battle.state!=='running')return;paused=!paused;$('#pause').textContent=paused?'▶':'Ⅱ';$('#pause').setAttribute('aria-label',paused?'再開':'一時停止');$('#banner').textContent=paused?'一時停止中':'バトル再開';};$('#auto').onclick=()=>{auto=!auto;if(battle)battle.auto=auto;$('#auto').textContent='AUTO '+(auto?'ON':'OFF');$('#auto').classList.toggle('active',auto);$('#auto').setAttribute('aria-pressed',auto)};$('#speed').onclick=()=>{speed=speed===1?1.5:speed===1.5?2:1;$('#speed').textContent='×'+speed};$('#sound').onclick=()=>{sound=!sound;$('#sound').textContent='♪ 音 '+(sound?'ON':'OFF');$('#sound').setAttribute('aria-pressed',sound);beep()};
function updateRecord(){$('#record').textContent=record[$('#difficulty').value]?'クリア　'+'★'.repeat(record[$('#difficulty').value]):'未クリア';$('#stage-title').textContent=['粉雪の庭園','氷砂糖の回廊','凍てつく王冠'][+$('#difficulty').value]}
$('#difficulty').onchange=()=>{updateRecord();if(!battle){$('#curtain h2').textContent=$('#stage-title').textContent;$('#curtain .eyebrow').textContent='CHAPTER 0'+(Number($('#difficulty').value)+1)}};
function openModal(html){$('#modal-body').innerHTML=html;$('#modal').showModal()}
$('#close').onclick=()=>$('#modal').close();$('#help').onclick=()=>openModal('<span class="eyebrow">HOW TO PLAY</span><h2>小さな冒険の手引き</h2><p>「冒険に出発」で戦闘開始。クッキーたちは走って接敵し、通常攻撃を自動で行います。下の5枚のカード、または数字キー1〜5でスキルを発動できます。</p><p>初期設定は手動スキル。AUTOをONにすればスキルも自動化できます。フリルの氷の金平糖は先頭の敵に106%ダメージ＋5秒凍結。ボスの赤い予告中に凍結を当てると全体攻撃を中断！ 盾と回復を合わせて前衛を守りましょう。</p><p>全3ウェーブを90秒以内に倒せば勝利。×1ボタンで1.5倍・2倍速、Ⅱで一時停止できます。星の記録と編成はこのブラウザに保存します。</p>');
$('#formation').onclick=()=>{openModal('<span class="eyebrow">TEAM FORMATION</span><h2>冒険隊を編成</h2><p>前方から優先して攻撃を受けます。防御役を前方に置くのがおすすめ。</p>'+COOKIES.map(c=>`<div class="formation-row"><label for="pos-${c.id}">${c.short}</label><select id="pos-${c.id}" data-id="${c.id}">${['前方','中央','後方'].map(p=>`<option ${p===(positions[c.id]||c.position)?'selected':''}>${p}</option>`).join('')}</select></div>`).join('')+'<button class="primary" id="save-formation">この編成で決定</button>');$('#save-formation').onclick=()=>{$$('#modal select').forEach(s=>positions[s.dataset.id]=s.value);try{localStorage.setItem('frost-formation',JSON.stringify(positions))}catch{}showDetail(selected);$$('.skill').forEach((b,i)=>b.querySelectorAll('small')[1].textContent=positions[COOKIES[i].id]||COOKIES[i].position);$('#modal').close();}};
function $$(s){return [...document.querySelectorAll(s)]}document.addEventListener('keydown',e=>{if($('#modal').open||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.repeat)return;if('12345'.includes(e.key))cast(+e.key-1);if(e.code==='Space'&&battle&&battle.state==='running'){e.preventDefault();$('#pause').click()}});document.addEventListener('visibilitychange',()=>{if(document.hidden&&battle?.state==='running'&&!paused)$('#pause').click()});
function unitPoint(u){
 if(Number.isFinite(u.x))return{x:u.x,y:u.y+55};
 const p=positions[u.id]||u.position,i=COOKIES.filter(c=>(positions[c.id]||c.position)===p).indexOf(u);
 return{x:({'後方':160,'中央':330,'前方':470}[p])+Math.max(0,i)*53,y:405+Math.max(0,i)*52};
}
function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),0,0,Math.PI*2);ctx.fill()}
function poly(points,fill,stroke){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=3;ctx.stroke()}}
function star(x,y,r,color,rotation=0){ctx.save();ctx.translate(x,y);ctx.rotate(rotation);const points=[];for(let i=0;i<8;i++){const a=i/8*Math.PI*2;points.push([Math.cos(a)*(i%2?r*.35:r),Math.sin(a)*(i%2?r*.35:r)])}poly(points,color);ctx.restore()}
function background(){
 const w=1200,h=560,dist=battle?.distance||clock*7;
 if(scenery.complete&&scenery.naturalWidth){const scale=Math.max(w/scenery.naturalWidth,h/scenery.naturalHeight);const iw=scenery.naturalWidth*scale,ih=scenery.naturalHeight*scale;ctx.drawImage(scenery,(w-iw)/2-Math.sin(dist/900)*18,(h-ih)/2,iw+36,ih);}
 else{const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#68c5cf');g.addColorStop(.65,'#d9f2dd');g.addColorStop(1,'#ddcaa7');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);for(let i=0;i<10;i++){const x=(i*160-dist*.2)%1400;poly([[x,40],[x-90,300],[x+90,300]],'#75afaa');poly([[x,40],[x-65,240],[x+65,240]],'#e5f5e4')}ctx.fillStyle='#ecdfc3';ctx.fillRect(0,350,w,210);}
 // The foreground and snow move at different speeds during the march.
 for(let i=0;i<24;i++){const x=((i*163-dist*1.4)%1400+1400)%1400-100,y=455+i%3*34;ellipse(x,y,6+i%3*5,2,'#b4a78545')}
 for(let i=0;i<38;i++){const x=(i*113+clock*18)%1200,y=(i*61+clock*23)%560;ellipse(x,y,1+i%3,1+i%3,'#ffffffb3')}
 const shade=ctx.createLinearGradient(0,0,0,560);shade.addColorStop(0,'#102c3940');shade.addColorStop(.35,'#102c3900');shade.addColorStop(.8,'#102c3900');shade.addColorStop(1,'#143b3440');ctx.fillStyle=shade;ctx.fillRect(0,0,1200,560);
}
function monster(u){
 const boss=u.boss,run=u.anim==='run',stride=run?Math.sin(clock*17+u.x)*8:0;
 ctx.save();if(boss)ctx.scale(1.38,1.38);
 ctx.lineWidth=4;ctx.strokeStyle='#3d5269';
 // Icing boots and arms articulate independently from the monster's body.
 ellipse(-21,-7+stride,16,10,'#465c79');ellipse(22,-7-stride,16,10,'#465c79');
 ctx.save();ctx.translate(-35,-63);ctx.rotate(run?Math.sin(clock*17)*.3:u.anim==='attack'?-.9:.12);poly([[-6,-14],[-22,10],[-15,25],[8,12],[12,-8]],'#cde7ef','#56738a');ctx.restore();
 poly([[-32,-19],[-44,-68],[-25,-119],[7,-133],[36,-99],[43,-42],[24,-12]],u.ranged?'#9375af':'#9bc6d3','#4a6579');
 poly([[-25,-80],[-17,-111],[0,-82],[18,-109],[29,-75],[17,-54],[-9,-59]],'#e4f8f4','#6d9caa');
 ellipse(-12,-63,6,9,'#2d3c55');ellipse(15,-63,6,9,'#2d3c55');
 ctx.strokeStyle='#385071';ctx.beginPath();ctx.moveTo(-5,-42);ctx.lineTo(8,-42);ctx.stroke();
 if(u.ranged){poly([[-43,-112],[0,-169],[40,-116]],'#75518f','#403d66');star(0,-136,12,'#eed783');ctx.strokeStyle='#755e93';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-52,-15);ctx.lineTo(-55,-111);ctx.stroke();star(-55,-113,18,'#eeb8ed',clock)}
 if(boss){poly([[-40,-117],[-49,-155],[-21,-139],[0,-175],[20,-139],[48,-155],[36,-116]],'#e9cc79','#626a72');star(0,-140,13,'#d9feff');ctx.save();ctx.translate(-55,-57);ctx.rotate(u.anim==='attack'?-.8:-.2);ctx.fillStyle='#7189a0';ctx.fillRect(-7,-40,14,91);poly([[-33,-42],[-35,-84],[28,-91],[38,-51]],'#b2dfe5','#4c6b80');poly([[-26,-76],[22,-83],[13,-61],[-30,-53]],'#edfafa');ctx.restore();}
 ctx.restore();
}
function drawUnit(u){
 if(u.hp<=0&&!u.deadTime)return;const p=unitPoint(u),run=u.anim==='run'&&(battle?.state==='running'),attack=u.anim==='attack',skill=u.anim==='skill',freeze=u.freeze>0;
 const bounce=freeze?0:run?Math.abs(Math.sin(clock*13+u.x*.02))*12:Math.sin(clock*3+u.x)*2;
 const side=u.side==='enemy'?-1:1;const thrust=attack?Math.sin(Math.min(1,u.animTime/.46)*Math.PI)*30*side:skill&&u.type==='rush'?Math.sin(u.animTime/.7*Math.PI)*110:0;
 ellipse(p.x,p.y+3, u.boss?65:43,10,'#27434036');ctx.save();
 if(u.hp<=0){ctx.globalAlpha=u.deadTime/.6;ctx.translate(p.x+side*(.6-u.deadTime)*80,p.y);ctx.rotate(side*(.6-u.deadTime)*2)}else ctx.translate(p.x+thrust-u.knock*side,p.y-bounce);
 if(run)ctx.rotate(Math.sin(clock*13+u.x*.02)*.055);else if(attack)ctx.rotate(side*.12);else if(skill)ctx.rotate(-.05);
 if(u.hurt>0){ctx.filter='brightness(1.65)';}if(freeze){ctx.filter='saturate(.5) brightness(1.2)';ctx.shadowColor='#b6faff';ctx.shadowBlur=22;}
 if(u.side==='enemy')monster(u);else{const im=u.id==='frill'?frill:images[u.id],h=u.id==='frill'?182:160,w=u.id==='frill'?173:128;if(im.complete&&im.naturalWidth)ctx.drawImage(im,-w/2,-h,w,h)}
 ctx.restore();if(u.hp<=0)return;
 if(freeze){ctx.save();ctx.globalAlpha=.55;poly([[p.x-62,p.y-7],[p.x-67,p.y-100],[p.x-25,p.y-180],[p.x+30,p.y-169],[p.x+64,p.y-90],[p.x+50,p.y]],'#a5efff','#efffff');ctx.globalAlpha=1;star(p.x+27,p.y-135,19,'#fff',clock*.3);ctx.font='bold 15px sans-serif';ctx.textAlign='center';ctx.fillStyle='#187ca7';ctx.fillText('❄ '+u.freeze.toFixed(1)+'s',p.x,p.y-186);ctx.restore()}
 if(u.shield>0){ctx.save();ctx.strokeStyle='#ffe6a0';ctx.lineWidth=4;ctx.shadowBlur=13;ctx.shadowColor='#ffe082';ctx.beginPath();ctx.ellipse(p.x,p.y-82,65,94,0,0,Math.PI*2);ctx.stroke();ctx.restore()}
 const bw=u.boss?106:76;ctx.fillStyle='#263f47b3';ctx.beginPath();ctx.roundRect(p.x-bw/2,p.y+14,bw,7,4);ctx.fill();ctx.fillStyle=u.side==='enemy'?'#f18c92':'#7ff2aa';ctx.fillRect(p.x-bw/2+1,p.y+15,(bw-2)*u.hp/(u.maxHp||u.hp),5);if(u.shield>0){ctx.fillStyle='#ffe3a1';ctx.fillRect(p.x-bw/2,p.y+23,bw*Math.min(1,u.shield/u.maxHp),3)}
 if(u.cast>0){ctx.strokeStyle='#fc6f75';ctx.lineWidth=7;ctx.beginPath();ctx.arc(p.x,p.y-90,88,-Math.PI/2,-Math.PI/2+(1-u.cast/2.5)*Math.PI*2);ctx.stroke();ctx.save();ctx.globalAlpha=.15+Math.sin(clock*16)*.08;ellipse(550,440,550,60,'#ff304a');ctx.restore();}
}
function drawEffect(e,dt){
 const age=1-e.life/(e.max||1);ctx.save();
 if(e.type==='particle'){e.x+=e.vx*dt;e.y+=e.vy*dt;e.vy+=150*dt;ctx.globalAlpha=Math.min(1,e.life*2);star(e.x,e.y,e.size,e.color,clock*4);}
 else if(e.type==='projectile'){const t=Math.min(1,age),x=e.x+(e.tx-e.x)*t,y=e.y+(e.ty-e.y)*t-Math.sin(t*Math.PI)*30;ctx.strokeStyle=e.color;ctx.lineWidth=6;ctx.shadowBlur=15;ctx.shadowColor=e.color;ctx.beginPath();ctx.moveTo(x-(e.enemy?-30:30),y+5);ctx.lineTo(x,y);ctx.stroke();star(x,y,11,e.color,clock*6);star(x,y,5,'#fff');}
 else if(e.type==='slash'){ctx.translate(e.tx,e.ty);ctx.rotate(e.enemy?.4:-.4);ctx.strokeStyle='#fff8d9';ctx.shadowColor=e.color;ctx.shadowBlur=15;ctx.lineWidth=12*(1-age);ctx.beginPath();ctx.arc(0,0,55,-1.3,1.2);ctx.stroke();}
 else if(e.type==='damage'||e.type==='heal'){ctx.globalAlpha=Math.min(1,e.life*3);ctx.font=`900 ${e.special?36:24}px Outfit,sans-serif`;ctx.textAlign='center';ctx.lineWidth=5;ctx.strokeStyle=e.type==='heal'?'#286344':'#583b48';ctx.strokeText(e.text,e.x,e.y-age*65);ctx.fillStyle=e.type==='heal'?'#b6ffc7':e.special?'#fff0a2':'#fff';ctx.fillText(e.text,e.x,e.y-age*65);}
 else if(e.type==='freeze'){
  ctx.globalAlpha=Math.min(1,e.life*2);const t=Math.min(1,age*2.5);ctx.strokeStyle='#c3faff';ctx.lineWidth=18*(1-age);ctx.shadowColor='#64dfff';ctx.shadowBlur=25;ctx.beginPath();ctx.moveTo(e.x,e.y-100);ctx.lineTo(e.x+(e.tx-e.x)*t,e.y-100+(e.ty-e.y)*t);ctx.stroke();
  for(let i=0;i<11;i++){const x=e.tx-115+i*23,y=e.ty+8;const h=Math.max(0,Math.sin(Math.min(1,age*2)*Math.PI/2))*((i%3)*35+90);poly([[x-15,y],[x-10,y-h*.6],[x,y-h],[x+13,y-h*.4],[x+17,y]],i%2?'#b1f2fc':'#e6feff','#6bcedd');}star(e.tx,e.ty-80,80*(1-age),'#e8ffff',clock);}
 else if(e.type==='magic'){for(let i=0;i<8;i++){const t=Math.min(1,age*2+i*.07),x=750+i*48,y=-120+t*(e.ty+120);ctx.strokeStyle='#d4b5ff';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(x+60,y-100);ctx.lineTo(x,y);ctx.stroke();star(x,y,25,'#fff1b6',clock*2+i);if(t>=1)ellipse(x,e.ty,65*(age+.1),14,'#d6aeed66')}}
 else if(e.type==='rush'){ctx.globalAlpha=e.life;for(let i=0;i<4;i++){ctx.strokeStyle=i%2?'#ffecdb':'#ff93b9';ctx.lineWidth=13-i*2;ctx.beginPath();ctx.moveTo(e.x,e.y-35-i*25);ctx.quadraticCurveTo(e.tx+100,e.ty-180,e.tx+45,e.ty+15);ctx.stroke()}}
 else if(e.type==='shield'||e.type==='heal'){ctx.globalAlpha=e.life;for(const a of battle.allies){const p=unitPoint(a);ctx.strokeStyle=e.type==='shield'?'#ffe5a0':'#abffc7';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(p.x,p.y,35+age*65,12+age*15,0,0,Math.PI*2);ctx.stroke();for(let i=0;i<4;i++)star(p.x-35+i*24,p.y-age*160-i*10,8,ctx.strokeStyle,0)}}
 else if(e.type==='slam'){ctx.globalAlpha=e.life;for(let i=0;i<12;i++){const x=i*105,h=Math.sin(Math.min(1,age*2)*Math.PI/2)*130;poly([[x-20,470],[x+5,470-h],[x+20,470]],'#abe4f1','#f3ffff')}ctx.strokeStyle='#d8faff';ctx.lineWidth=14;ctx.beginPath();ctx.ellipse(e.x,e.y,age*1000,age*170,0,0,Math.PI*2);ctx.stroke();}
 ctx.restore();
}
function render(dt){
 const visualDt=paused?0:dt*speed;clock+=visualDt;shake=Math.max(0,shake-dt*32);ctx.save();if(shake&&!paused)ctx.translate(Math.sin(clock*55)*shake,Math.cos(clock*71)*shake*.5);background();
 if(cinematic>0){ctx.fillStyle='#08243566';ctx.fillRect(0,0,1200,560)}
 const units=battle?[...battle.allies,...battle.enemies]:COOKIES.map(c=>({...c,...unitPoint(c),y:unitPoint(c).y-55,position:positions[c.id]||c.position,side:'ally',anim:'idle',hurt:0,knock:0}));units.sort((a,b)=>unitPoint(a).y-unitPoint(b).y).forEach(drawUnit);
 for(const e of effects){e.life-=visualDt;drawEffect(e,visualDt)}effects=effects.filter(e=>e.life>0);ctx.restore();
 if(!paused){cutinTime=Math.max(0,cutinTime-dt);warningTime=Math.max(0,warningTime-visualDt);cinematic=Math.max(0,cinematic-dt)}if(!cutinTime)$('#cutin').classList.remove('show');if(!warningTime)$('#warning').classList.remove('show');
 const boss=battle?.enemies.find(e=>e.boss&&e.hp>0);$('#bossbar').hidden=!boss;if(boss)$('#bossbar i').style.width=(boss.hp/boss.maxHp*100)+'%';$('#combo').innerHTML=battle&&battle.combo>=2?`<b>${battle.combo}</b><small>COMBO</small>`:'';
}
function frame(now){
 const dt=Math.min((now-last)/1000,.05);last=now;
 if(battle&&!paused){if(hitstop>0)hitstop-=dt;else{let remaining=dt*speed*(cinematic>0?.3:1);while(remaining>0){const step=Math.min(remaining,.025);battle.update(step);remaining-=step}}}
 render(dt);
 if(battle){$('#wave').textContent=`WAVE ${battle.wave} / 3`;const t=Math.ceil(battle.time);$('#timer').textContent=String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');$$('.skill').forEach((b,i)=>{const a=battle.allies[i],cool=b.querySelector('.cool');cool.style.display=a.cool>0||a.hp<=0?'grid':'none';cool.textContent=a.hp<=0?'DOWN':a.cool.toFixed(1)+'s';b.querySelector('.hp').style.width=(a.hp/a.maxHp*100)+'%';b.disabled=a.hp<=0||a.cool>0||paused||battle.travel>0||battle.transition>0||battle.state!=='running';b.classList.toggle('ready',!b.disabled);})}
 requestAnimationFrame(frame);
}
canvas.height=560;showDetail(0);updateRecord();requestAnimationFrame(frame);
