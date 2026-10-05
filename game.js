'use strict';
const { Match, ACTIONS, OPPONENTS, POSITIONS } = JiuJitsu;
const $ = id => document.getElementById(id);
const canvas = $('mat'), ctx = canvas.getContext('2d');
let match = new Match(), phase = 'intro', paused = false, lastFrame = 0, animation = null, seenAction = 0;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const buttons = ACTIONS.map((action, index) => {
  const button = document.createElement('button');
  button.className = 'action'; button.dataset.action = action.id;
  button.innerHTML = `<span class="key">${index + 1}</span><strong>${action.name}</strong><small></small>`;
  button.addEventListener('click', () => play(action.id)); $('actions').append(button); return button;
});
function play(id) {
  if (phase !== 'playing' || paused) return;
  if (match.act(0, id)) { observeAction(); render(); finishIfNeeded(); }
}
function startRound(round) {
  animation = null; seenAction = 0;
  match = new Match(round); phase = 'playing'; paused = false; lastFrame = performance.now();
  $('overlay').hidden = true; match.say(`${OPPONENTS[round].name} 등장! ${OPPONENTS[round].style}`);
  render();
}
function showOverlay(kicker, title, copy, button, note, trophy = false) {
  $('overlay-kicker').textContent = kicker; $('overlay-title').textContent = title;
  $('overlay-copy').textContent = copy; $('primary').textContent = button;
  $('overlay-note').textContent = note; $('trophy').hidden = !trophy;
  $('overlay').hidden = false;
}
function finishIfNeeded() {
  if (!match.result || phase !== 'playing') return;
  if (match.result.method === 'submission' && animation && animation.elapsed < animation.duration) return;
  phase = 'result'; paused = false;
  const { winner, method, technique } = match.result;
  const score = `${match.fighters[0].score} : ${match.fighters[1].score}`;
  if (winner === 0 && match.round === 2) {
    showOverlay('TOURNAMENT COMPLETE', '동굴바리 챔피언!', `${method === 'submission' ? technique + ' 서브미션' : '판정'} 승리! 세 명의 상대를 꺾고 우승했습니다.`, '처음부터 다시 플레이', '당신의 다음 도전을 기다립니다', true);
  } else if (winner === 0) {
    showOverlay('VICTORY · ' + ['예선', '준결승'][match.round], '다음 라운드로!', `${method === 'submission' ? technique + ' 서브미션' : '판정'} 승리 · 점수 ${score}`, '다음 경기 →', OPPONENTS[match.round + 1].name + ' 선수와 대결합니다');
  } else if (winner === null) {
    showOverlay('DRAW', '팽팽한 승부!', `점수 ${score}. 동점으로 경기가 끝났습니다.`, '같은 경기 다시 도전', '동점은 탈락이 아닙니다');
  } else {
    showOverlay('MATCH OVER', '도전은 계속된다.', `${method === 'submission' ? technique + ' 서브미션' : '판정'} 패배 · 점수 ${score}`, '처음부터 다시 도전', '방어로 회복하고 유리한 포지션을 먼저 잡아보세요');
  }
  render(); $('primary').focus({ preventScroll: true });
}
$('primary').addEventListener('click', () => {
  if (phase === 'intro') startRound(0);
  else if (phase === 'result') {
    const round = match.result.winner === null ? match.round :
      (match.result.winner === 0 && match.round < 2 ? match.round + 1 : 0);
    startRound(round);
  }
});
function togglePause(force) {
  if (phase !== 'playing') return;
  paused = typeof force === 'boolean' ? force : !paused;
  lastFrame = performance.now();
  if (paused) showOverlay('TIME OUT', '잠깐, 숨 고르기.', '경기 시간과 AI 행동이 멈췄습니다.', '경기 계속하기', 'P 키 또는 버튼으로 재개');
  else $('overlay').hidden = true;
  render();
}
$('primary').addEventListener('click', () => { if (phase === 'playing' && paused) togglePause(false); });
$('pause').addEventListener('click', () => togglePause());
$('help-toggle').addEventListener('click', () => {
  $('help').hidden = !$('help').hidden; $('help-toggle').setAttribute('aria-expanded', String(!$('help').hidden));
  if (!$('help').hidden && phase === 'playing') togglePause(true);
});
document.addEventListener('visibilitychange', () => { if (document.hidden) togglePause(true); });
document.addEventListener('keydown', event => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key.toLowerCase() === 'p') { event.preventDefault(); togglePause(); }
  const index = Number(event.key) - 1;
  if (index >= 0 && index < ACTIONS.length) { event.preventDefault(); play(ACTIONS[index].id); }
  if (event.key === 'Enter' && !['BUTTON', 'INPUT'].includes(document.activeElement.tagName) && !$('overlay').hidden) {
    event.preventDefault(); $('primary').click();
  }
});
function render() {
  const [p, a] = match.fighters;
  $('player-score').textContent = p.score; $('ai-score').textContent = a.score;
  $('player-stamina').value = p.stamina; $('ai-stamina').value = a.stamina;
  $('player-energy').textContent = Math.floor(p.stamina); $('ai-energy').textContent = Math.floor(a.stamina);
  $('opponent-name').textContent = a.name;
  const time = Math.ceil(match.time); $('time').textContent = `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`;
  $('pause').disabled = phase !== 'playing'; $('pause').textContent = paused ? '계속하기' : '일시정지';
  $('live-label').textContent = phase === 'playing' ? (paused ? 'PAUSED' : '● LIVE') : (phase === 'result' ? 'FINISHED' : 'READY');
  document.querySelectorAll('[data-round]').forEach((el, i) => {
    el.classList.toggle('active', i === match.round); el.classList.toggle('complete', i < match.round || (phase === 'result' && match.result.winner === 0 && i === match.round));
  });
  $('position').textContent = POSITIONS[match.position] + (match.top === null ? '' : match.top === 0 ? ' · 동굴바리 상위' : ' · 동굴바리 하위');
  const hints = { standing: '테이크다운으로 2점을 노리세요', guard: match.top === 0 ? '가드를 패스하면 3점!' : '스윕으로 뒤집거나 탈출하세요', side: match.top === 0 ? '마운트 또는 백으로 이동하세요' : '탈출하면 가드로 돌아갑니다', mount: match.top === 0 ? '암바로 서브미션을 노리세요' : '방어하고 탈출하세요!', back: match.top === 0 ? '초크로 경기를 끝내세요' : '위험! 방어하거나 탈출하세요' };
  $('position-hint').textContent = hints[match.position];
  $('action-hint').textContent = paused ? '일시정지 중' : match.cooldown > 0 && phase === 'playing' ? '다음 동작 준비 중…' : '1~8 키 또는 버튼으로 조작';
  buttons.forEach((button, index) => {
    const action = ACTIONS[index], legal = match.available(0, action.id);
    button.disabled = phase !== 'playing' || paused || !legal || p.stamina < action.cost || match.cooldown > 0;
    button.querySelector('strong').textContent = action.id === 'submit' ? (match.position === 'back' ? '초크' : match.position === 'mount' ? '암바' : '암바 / 초크') : action.name;
    button.querySelector('small').textContent = action.id === 'defend' ? '+18 회복 · 다음 공격 방어' :
      !legal ? '현재 포지션에서 사용 불가' : p.stamina < action.cost ? `스태미나 ${action.cost} 필요` : `−${action.cost} 체력 · 성공 ${Math.round(match.chance(0, action) * 100)}%`;
  });
  if (match.messages.length) {
    $('message').textContent = match.messages[0]; $('log').replaceChildren(...match.messages.slice(1).map(message => {
      const li = document.createElement('li'); li.textContent = message; return li;
    }));
  }
}
// Action events originate in the rule engine, so AI and player share all visual effects.
function observeAction() {
  const event = match.lastAction;
  if (!event || event.serial === seenAction) return;
  seenAction = event.serial;
  const frames = JiuJitsuGraphics.keyframes(event);
  if (animation) frames.start = JiuJitsuGraphics.sample(animation.frames, Math.min(1, animation.elapsed / animation.duration));
  animation = { event, frames, elapsed: 0, duration: event.id === 'submit' ? 1.25 : .82 };
}
function figure(pose, color, highlight = false) {
  const { x,y,angle,facing,limbs } = pose;
  ctx.save(); ctx.translate(x,y);ctx.rotate(angle);ctx.scale(facing,1);
  ctx.lineCap='round';ctx.lineJoin='round';
  if(highlight){ctx.shadowColor='#d4f779';ctx.shadowBlur=6;}
  // Legs behind gi torso, arms in front, to make grips and submissions readable.
  function limb(i) {
    const [a,b,c,d]=limbs[i];
    ctx.strokeStyle='#182a32';ctx.lineWidth=19;ctx.beginPath();ctx.moveTo(i<2?(i===0?-17:17):(i===2?-11:11),i<2?8:49);ctx.lineTo(a,b);ctx.lineTo(c,d);ctx.stroke();
    ctx.strokeStyle=color;ctx.lineWidth=13;ctx.stroke();
    ctx.fillStyle='#e5b18f';ctx.beginPath();ctx.arc(c,d,6,0,Math.PI*2);ctx.fill();
  }
  limb(2);limb(3);
  ctx.fillStyle=color;ctx.strokeStyle='#182a32';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(-22,0,44,55,7);ctx.fill();ctx.stroke();
  ctx.strokeStyle='#ecf3ef';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-13,1);ctx.lineTo(6,32);ctx.moveTo(13,1);ctx.lineTo(-6,32);ctx.stroke();
  ctx.fillStyle='#17232b';ctx.fillRect(-23,39,46,7);ctx.fillRect(8,42,6,19);
  ctx.fillStyle='#e5b18f';ctx.strokeStyle='#182a32';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-21,18,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle='#182329';ctx.beginPath();ctx.arc(0,-26,17,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(5,-22,3,3);
  limb(0);limb(1);ctx.restore();
}
function drawFighters(now) {
  const colors=['#6ab6e6','#ec8f79'];
  const progress=animation?Math.min(1,animation.elapsed/animation.duration):1;
  let poses=JiuJitsuGraphics.positions(match);
  if(animation) poses=reducedMotion.matches?animation.frames.end:JiuJitsuGraphics.sample(animation.frames,progress);
  const event=animation?.event;
  const bottom=match.top===null?1:1-match.top;
  const order=event?.id==='submit'?[1-event.actor,event.actor]:[bottom,1-bottom];
  order.forEach(i=>figure(poses[i],colors[i],Boolean(event&&event.actor===i&&event.success&&event.id==='submit')));
  // Contact cue around the controlled arm/neck, plus a tap-out on success.
  if(event?.id==='submit'&&progress>.28){
    ctx.save();ctx.strokeStyle=event.success?'#d4f779':'#ecf3ef';ctx.lineWidth=3;
    const x=event.technique==='암바'?504:480,y=event.technique==='암바'?240:210;
    ctx.beginPath();ctx.arc(x,y,16+(reducedMotion.matches?0:Math.sin(progress*15)*3),0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#d4f779';ctx.font='bold 16px sans-serif';ctx.textAlign='center';
    ctx.fillText(event.technique==='암바'?'팔 제어':'목 제어',x,y-28);
    if(event.success&&progress>.6){ctx.font='bold 20px sans-serif';ctx.fillText('TAP! TAP!',590,258);}
    ctx.restore();
  }
  // Technique-specific motion trails: arc for sweep, horizontal pass, downward takedown.
  if(event&&progress<.8&&!reducedMotion.matches&&['takedown','pass','sweep','escape'].includes(event.id)){
    ctx.save();ctx.strokeStyle=colors[event.actor]+'aa';ctx.lineWidth=3;ctx.setLineDash([7,8]);
    ctx.beginPath();
    if(event.id==='sweep')ctx.arc(480,248,88,Math.PI*1.1,Math.PI*2.6);
    else if(event.id==='takedown'){ctx.moveTo(580,157);ctx.quadraticCurveTo(620,197,586,280);}
    else{ctx.moveTo(380,288);ctx.quadraticCurveTo(460,315,560,285);}
    ctx.stroke();ctx.restore();
  }
  if(animation){
    const label=event.id==='defend'?'방어 · 회복 +18':event.technique+(event.success?' 성공!':' · 상대 방어!');
    ctx.save();ctx.font='bold 20px sans-serif';ctx.textAlign='center';
    const width=ctx.measureText(label).width+46;
    ctx.fillStyle='#101e26ee';ctx.beginPath();ctx.roundRect(480-width/2,101,width,38,19);ctx.fill();
    ctx.fillStyle=event.success?'#d4f779':'#f3b29d';ctx.fillText(label,480,127);ctx.restore();
  }
  // Persistent defense shield lets players see whether the next attack is protected.
  match.fighters.forEach((fighter,i)=>{
    if(!fighter.defending)return;
    const p=poses[i];ctx.save();ctx.strokeStyle='#d4f779';ctx.lineWidth=3;
    ctx.beginPath();ctx.ellipse(p.x,p.y+20,62,75,0,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#d4f779';ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillText('방어',p.x,p.y-66);ctx.restore();
  });
  canvas.setAttribute('aria-label',animation?`${match.fighters[event.actor].name} ${event.technique} ${event.success?'성공':'방어됨'}`:`현재 포지션: ${POSITIONS[match.position]}`);
}
function draw(now) {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  }
  ctx.setTransform(canvas.width / 960,0,0,canvas.height / 390,0,0);
  ctx.clearRect(0,0,960,390);
  ctx.fillStyle='#273943';ctx.fillRect(0,0,960,390);
  for (let i=0;i<13;i++) { ctx.fillStyle=i%2?'#344a52':'#3e535a';ctx.fillRect(28+i*74,35,42,37);ctx.fillStyle='#526771';ctx.beginPath();ctx.arc(49+i*74,27,10,0,Math.PI*2);ctx.fill(); }
  ctx.fillStyle='#182931';ctx.fillRect(0,78,960,10);
  ctx.fillStyle='#52736a';ctx.beginPath();ctx.moveTo(90,125);ctx.lineTo(870,125);ctx.lineTo(960,365);ctx.lineTo(0,365);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#729489';ctx.lineWidth=1;
  for(let i=0;i<7;i++){ctx.beginPath();ctx.moveTo(90+i*130,125);ctx.lineTo(i*160,365);ctx.stroke();}
  for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(90-i*22.5,125+i*60);ctx.lineTo(870+i*22.5,125+i*60);ctx.stroke();}
  ctx.strokeStyle='#c9ddb37a';ctx.lineWidth=3;ctx.strokeRect(225,159,510,171);
  ctx.fillStyle='#cee0ce18';ctx.font='bold 25px sans-serif';ctx.textAlign='center';ctx.fillText('DONGGUL DOJO',480,307);
  ctx.fillStyle='#101e2640';ctx.beginPath();ctx.ellipse(480,278,155,25,0,0,Math.PI*2);ctx.fill();
  drawFighters(now);
  ctx.fillStyle='#dfede3';ctx.font='11px sans-serif';ctx.textAlign='left';ctx.fillText('BLUE · 동굴바리',26,351);ctx.textAlign='right';ctx.fillText('CORAL · '+match.fighters[1].name,934,351);
}
let renderElapsed = 0;
function frame(now) {
  const elapsed = Math.min((now - (lastFrame || now))/1000,.1); lastFrame=now;
  if(phase==='playing'&&!paused){match.tick(elapsed);observeAction();if(animation){animation.elapsed+=elapsed;if(animation.elapsed>=animation.duration&&!match.result)animation=null;}renderElapsed+=elapsed;if(renderElapsed>.1){render();renderElapsed=0;}finishIfNeeded();}
  draw(now);requestAnimationFrame(frame);
}
render();requestAnimationFrame(frame);
