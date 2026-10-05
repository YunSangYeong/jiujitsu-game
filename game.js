'use strict';
const { Match, ACTIONS, OPPONENTS, POSITIONS } = JiuJitsu;
const $ = id => document.getElementById(id);
const canvas = $('mat'), ctx = canvas.getContext('2d');
let match = new Match(), phase = 'intro', paused = false, lastFrame = 0, motion = 0;
const buttons = ACTIONS.map((action, index) => {
  const button = document.createElement('button');
  button.className = 'action'; button.dataset.action = action.id;
  button.innerHTML = `<span class="key">${index + 1}</span><strong>${action.name}</strong><small></small>`;
  button.addEventListener('click', () => play(action.id)); $('actions').append(button); return button;
});
function play(id) {
  if (phase !== 'playing' || paused) return;
  if (match.act(0, id)) { motion = 1; render(); finishIfNeeded(); }
}
function startRound(round) {
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
// Stylized gi figures. Local joints make each ground position visually distinct.
function figure(x, y, angle, color, pose, facing = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(facing, 1);
  const joints = pose === 'stand' ? [[-25,25,-37,60],[25,25,37,50],[-13,65,-24,100],[13,65,28,100]] :
    pose === 'guard' ? [[-25,10,-38,-10],[25,10,35,-14],[-24,65,-44,30],[24,65,44,30]] :
    pose === 'kneel' ? [[-29,30,-37,49],[29,30,40,48],[-27,57,-35,79],[27,57,43,77]] :
    [[-32,14,-46,36],[32,14,46,36],[-16,68,-35,82],[16,68,35,82]];
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  joints.forEach(([a,b,c,d],i) => { ctx.strokeStyle=color; ctx.lineWidth=15; ctx.beginPath(); ctx.moveTo(i<2 ? (i===0?-16:16) : (i===2?-10:10), i<2?9:48); ctx.lineTo(a,b); ctx.lineTo(c,d); ctx.stroke(); ctx.fillStyle=i<2?'#e5b18f':'#c89478'; ctx.beginPath();ctx.arc(c,d,7,0,Math.PI*2);ctx.fill(); });
  ctx.fillStyle = color; ctx.beginPath();ctx.roundRect(-22,0,44,55,8);ctx.fill();
  ctx.strokeStyle='#edf5e7';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-13,2);ctx.lineTo(5,33);ctx.moveTo(13,2);ctx.lineTo(-5,33);ctx.stroke();
  ctx.fillStyle='#17232b';ctx.fillRect(-23,39,46,7);ctx.fillRect(8,42,6,19);
  ctx.fillStyle='#e5b18f';ctx.beginPath();ctx.arc(0,-20,18,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#182329';ctx.beginPath();ctx.arc(0,-25,17,Math.PI,Math.PI*2);ctx.fill();
  ctx.fillStyle='#162128';ctx.fillRect(5,-21,3,3);ctx.restore();
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
  const bounce = phase === 'playing' && !paused ? Math.sin(now/280)*2 : 0;
  const impact = motion * Math.sin(now/35)*4;
  const colors=['#6ab6e6','#ec8f79'];
  if(match.position==='standing') {
    figure(375+impact,173+bounce,.1,colors[0],'stand',1);figure(585-impact,173-bounce,-.1,colors[1],'stand',-1);
  } else {
    const top = match.top, bottom = 1-top;
    if(match.position==='guard') {figure(460,253,Math.PI/2,colors[bottom],'guard');figure(514+impact,191+bounce,-.35,colors[top],'kneel',-1);}
    if(match.position==='side') {figure(440,242,Math.PI/2,colors[bottom],'ground');figure(483+impact,195+bounce,.2,colors[top],'kneel');}
    if(match.position==='mount') {figure(480,260,Math.PI/2,colors[bottom],'ground');figure(470+impact,195+bounce,0,colors[top],'kneel');}
    if(match.position==='back') {figure(500,200,-.4,colors[top],'guard',-1);figure(460+impact,215,-.4,colors[bottom],'kneel',-1);}
  }
  ctx.fillStyle='#dfede3';ctx.font='11px sans-serif';ctx.textAlign='left';ctx.fillText('BLUE · 동굴바리',26,351);ctx.textAlign='right';ctx.fillText('CORAL · '+match.fighters[1].name,934,351);
}
let renderElapsed = 0;
function frame(now) {
  const elapsed = Math.min((now - (lastFrame || now))/1000,.1); lastFrame=now;
  if(phase==='playing'&&!paused){match.tick(elapsed);motion=Math.max(0,motion-elapsed*3);renderElapsed+=elapsed;if(renderElapsed>.1){render();renderElapsed=0;}finishIfNeeded();}
  draw(now);requestAnimationFrame(frame);
}
render();requestAnimationFrame(frame);
