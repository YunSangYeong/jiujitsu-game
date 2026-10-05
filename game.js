'use strict';
const { Match, ACTIONS, OPPONENTS, POSITIONS } = JiuJitsu;
const $ = id => document.getElementById(id);
const canvas = $('mat'), ctx = canvas.getContext('2d');
let match = new Match(), phase = 'intro', paused = false, lastFrame = 0, animation = null, seenAction = 0;
const sound = new JiuJitsuSound();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const buttons = ACTIONS.map((action, index) => {
  const button = document.createElement('button');
  button.className = 'action'; button.dataset.action = action.id;
  button.innerHTML = `<span class="key">${index + 1}</span><strong>${action.name}</strong><small></small>`;
  button.addEventListener('click', () => play(action.id)); $('actions').append(button); return button;
});
function play(id) {
  if (phase !== 'playing' || paused) return;
  sound.unlock().then(updateSoundButton);
  if (match.act(0, id)) { observeAction(); render(); finishIfNeeded(); }
}
function startRound(round) {
  sound.stop(); sound.setPaused(false); sound.unlock().then(()=>{updateSoundButton();sound.play('bell');});
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
  sound.play(match.result.winner === null ? 'draw' : match.result.winner === 0 ? (match.round === 2 ? 'champion' : 'win') : 'loss');
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
  sound.setPaused(paused);
  if(!paused)sound.unlock().then(updateSoundButton);
  if (paused) showOverlay('TIME OUT', '잠깐, 숨 고르기.', '경기 시간과 AI 행동이 멈췄습니다.', '경기 계속하기', 'P 키 또는 버튼으로 재개');
  else $('overlay').hidden = true;
  render();
}
$('primary').addEventListener('click', () => { if (phase === 'playing' && paused) togglePause(false); });
function updateSoundButton(){
  const button=$('sound-toggle');
  button.disabled=!sound.supported;
  const ready=sound.context?.state==='running';
  button.textContent=!sound.supported?'소리 미지원':sound.enabled?'소리 켜짐':'소리 꺼짐';
  button.title=sound.lastError?'오디오 활성화 실패: 소리 테스트를 눌러 재시도':!ready&&sound.enabled?'소리 테스트 또는 START를 눌러 활성화':'효과음 켜기 / 끄기';
  $('sound-test').disabled=!sound.supported;
  button.setAttribute('aria-pressed',String(sound.enabled&&sound.supported));
  button.setAttribute('aria-label',sound.enabled?'효과음 켜짐. 눌러 끄기':'효과음 꺼짐. 눌러 켜기');
}
$('sound-toggle').addEventListener('click',()=>{
  sound.setEnabled(!sound.enabled);updateSoundButton();
  if(sound.enabled)sound.unlock().then(()=>{updateSoundButton();sound.play('recover');});
});
$('sound-test').addEventListener('click',()=>{
  sound.setEnabled(true);
  sound.unlock().then(()=>{
    updateSoundButton();sound.play('bell',true);
    $('message').textContent=sound.context?.state==='running'?
      '테스트 종소리를 재생했습니다. 안 들리면 미디어 볼륨·무음 설정을 확인해주세요.':
      '소리가 아직 활성화되지 않았습니다. 소리 테스트를 다시 누르거나 기본 브라우저에서 열어주세요.';
  });
});
// Each button unlocks audio inside its own click gesture. The toggle always toggles,
// even if audio permission is pending; the separate test button handles retries.
updateSoundButton();
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
  sound.play(event.id === 'defend' ? 'recover' : event.id === 'submit' ? 'lock' : 'move');
  animation = { event, frames, elapsed: 0, impactPlayed: false, duration: event.id === 'submit' ? 1.25 : .82 };
}
// 2.5D gi: cylindrical limbs, rounded face, fabric volume and layered contact shadows.
function figure(pose, color, highlight = false) {
  const {x,y,angle,facing,limbs}=pose;
  const palette=color==='#6ab6e6'?
    {light:'#b9e8ff',mid:'#64b0df',dark:'#245780',deep:'#163d60'}:
    {light:'#ffd6b6',mid:'#e9947e',dark:'#984f49',deep:'#643438'};
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(facing,1);
  ctx.lineCap='round';ctx.lineJoin='round';
  function capsule(x1,y1,x2,y2,r,p=palette) {
    const dx=x2-x1,dy=y2-y1,length=Math.hypot(dx,dy)||1;
    const nx=-dy/length*r,ny=dx/length*r;
    const gradient=ctx.createLinearGradient(x1+nx,y1+ny,x1-nx,y1-ny);
    gradient.addColorStop(0,p.dark);gradient.addColorStop(.32,p.mid);
    gradient.addColorStop(.63,p.light);gradient.addColorStop(1,p.mid);
    ctx.strokeStyle=p.deep;ctx.lineWidth=r*2+2;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
    ctx.strokeStyle=gradient;ctx.lineWidth=r*2;ctx.stroke();
  }
  function sphere(x,y,r){
    const gradient=ctx.createRadialGradient(x-r*.35,y-r*.4,r*.1,x,y,r);
    gradient.addColorStop(0,'#ffe3bb');gradient.addColorStop(.55,'#e8b28e');gradient.addColorStop(1,'#a76e59');
    ctx.fillStyle=gradient;ctx.strokeStyle='#704b40';ctx.lineWidth=1;
    ctx.beginPath();ctx.ellipse(x,y,r,r*.94,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  }
  function limb(i){
    const [a,b,c,d]=limbs[i];const sx=i<2?(i===0?-18:18):(i===2?-11:11),sy=i<2?10:47;
    capsule(sx,sy,a,b,i<2?8:9);capsule(a,b,c,d,i<2?7:8);
    // Fold and cuff distinguish sleeve/pants from the exposed hand/foot.
    ctx.strokeStyle=palette.dark;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(a-4,b-2);ctx.lineTo(a+3,b+2);ctx.stroke();
    sphere(c,d,i<2?6:6.5);
  }
  // Contact shadow under the upper body makes overlapping players distinct.
  ctx.save();ctx.translate(5,6);ctx.fillStyle='#08151d50';ctx.beginPath();ctx.ellipse(0,29,27,37,0,0,Math.PI*2);ctx.fill();ctx.restore();
  limb(2);limb(3);
  const gi=ctx.createLinearGradient(-24,0,23,42);
  gi.addColorStop(0,palette.light);gi.addColorStop(.35,palette.mid);gi.addColorStop(.78,palette.mid);gi.addColorStop(1,palette.dark);
  ctx.fillStyle=gi;ctx.strokeStyle=palette.deep;ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-15,-1);ctx.quadraticCurveTo(-27,4,-23,22);ctx.lineTo(-18,55);ctx.quadraticCurveTo(0,61,18,55);ctx.lineTo(23,22);ctx.quadraticCurveTo(27,4,15,-1);ctx.closePath();ctx.fill();ctx.stroke();
  // Raised lapels cast a narrow shadow on the jacket.
  ctx.strokeStyle=palette.dark;ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-12,3);ctx.lineTo(7,34);ctx.moveTo(12,3);ctx.lineTo(-5,31);ctx.stroke();
  ctx.strokeStyle='#edf5e9';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-13,1);ctx.lineTo(5,32);ctx.moveTo(11,1);ctx.lineTo(-7,29);ctx.stroke();
  ctx.strokeStyle=palette.dark;ctx.lineWidth=1.3;
  for(const [x1,y1,x2,y2]of [[-18,22,-10,26],[-17,31,-8,33],[12,26,18,21],[9,35,18,32]]){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
  const belt=ctx.createLinearGradient(0,39,0,48);belt.addColorStop(0,'#56606a');belt.addColorStop(.4,'#17212e');belt.addColorStop(1,'#080e19');
  ctx.fillStyle=belt;ctx.beginPath();ctx.roundRect(-23,39,46,9,3);ctx.fill();
  ctx.fillStyle='#111b28';ctx.beginPath();ctx.roundRect(2,41,9,22,2);ctx.fill();ctx.fillStyle='#596777';ctx.fillRect(4,43,2,15);
  ctx.fillStyle='#152333';ctx.beginPath();ctx.ellipse(4,44,7,5,0,0,Math.PI*2);ctx.fill();
  capsule(0,-2,0,-10,7,{light:'#f3c6a0',mid:'#dfab8a',dark:'#af795f',deep:'#875f4a'});
  sphere(0,-23,19);
  // Hair has a shaded side, curved silhouette and subtle shine.
  const hair=ctx.createLinearGradient(-18,-35,18,-15);hair.addColorStop(0,'#54606b');hair.addColorStop(.4,'#24323e');hair.addColorStop(1,'#101a25');
  ctx.fillStyle=hair;ctx.beginPath();ctx.moveTo(-18,-22);ctx.bezierCurveTo(-25,-48,21,-49,18,-21);ctx.lineTo(13,-27);ctx.quadraticCurveTo(-3,-32,-15,-26);ctx.closePath();ctx.fill();
  sphere(17,-22,4);ctx.fillStyle='#202832';ctx.beginPath();ctx.ellipse(6,-23,1.8,2.2,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#a27056';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(9,-20);ctx.lineTo(12,-17);ctx.lineTo(8,-16);ctx.moveTo(4,-11);ctx.quadraticCurveTo(8,-9,11,-12);ctx.stroke();
  limb(0);limb(1);
  if(highlight){ctx.strokeStyle='#d4f77988';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,21,29,61,0,0,Math.PI*2);ctx.stroke();}
  ctx.restore();
}
function drawFighters(now) {
  const colors=['#6ab6e6','#ec8f79'];
  const progress=animation?Math.min(1,animation.elapsed/animation.duration):1;
  let poses=JiuJitsuGraphics.positions(match);
  if(animation) poses=reducedMotion.matches?animation.frames.end:JiuJitsuGraphics.sample(animation.frames,progress);
  const event=animation?.event;
  const bottom=match.top===null?1:1-match.top;
  const order=event?.id==='submit'?[1-event.actor,event.actor]:[bottom,1-bottom];
  ctx.save();
  poses.forEach(p=>{
    const ground=match.position==='standing'?286:292;
    const shadow=ctx.createRadialGradient(p.x,ground,2,p.x,ground,65);
    shadow.addColorStop(0,'#112a2e55');shadow.addColorStop(1,'#112a2e00');ctx.fillStyle=shadow;
    ctx.beginPath();ctx.ellipse(p.x,ground,65,15,0,0,Math.PI*2);ctx.fill();
  });ctx.restore();
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
function advanceAnimation(seconds) {
  if (!animation) return;
  animation.elapsed += seconds;
  const event = animation.event;
  const impactAt = animation.duration * (event.id === 'submit' ? .62 : .48);
  if (!animation.impactPlayed && animation.elapsed >= impactAt) {
    animation.impactPlayed = true;
    if (event.id !== 'defend') {
      const effect = !event.success ? 'block' : event.id === 'submit' ? 'tap' :
        ['takedown', 'sweep'].includes(event.id) ? 'mat' : 'position';
      sound.play(effect);
    }
  }
  if (animation.elapsed >= animation.duration && !match.result) animation = null;
}
let renderElapsed = 0;
function frame(now) {
  const elapsed = Math.min((now - (lastFrame || now)) / 1000, .1);
  lastFrame = now;
  if (phase === 'playing' && !paused) {
    match.tick(elapsed);
    observeAction();
    advanceAnimation(elapsed);
    renderElapsed += elapsed;
    if (renderElapsed > .1) { render(); renderElapsed = 0; }
    finishIfNeeded();
  }
  draw(now);
  requestAnimationFrame(frame);
}
render();
requestAnimationFrame(frame);
