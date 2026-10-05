const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req,res)=>{
  const files = {'/':'index.html','/index.html':'index.html','/style.css':'style.css','/engine.js':'engine.js','/game.js':'game.js','/graphics.js':'graphics.js','/audio.js':'audio.js'};
  const file = files[req.url.split('?')[0]];
  if(!file){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type', file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css':'text/javascript');
  res.end(fs.readFileSync(path.join(root,file)));
});
(async()=>{
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base = 'http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
try {
const errors=[];
const page=await browser.newPage({viewport:{width:1280,height:1000}});
page.on('pageerror',e=>errors.push(e.message));
await page.goto(base);
await page.screenshot({path:'/tmp/jiujitsu-desktop.png',fullPage:true});
assert.equal(await page.evaluate(()=>sound.context),null,'no autoplay before interaction');
await page.getByRole('button',{name:'START'}).click();
await page.waitForFunction(()=>sound.context?.state==='running');
assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'),'true');
await page.locator('#sound-toggle').click();assert.equal(await page.evaluate(()=>sound.enabled),false);
assert.equal(await page.evaluate(()=>sound.voices.size),0);
await page.locator('#sound-toggle').click();assert.equal(await page.evaluate(()=>sound.enabled),true);
assert.equal(await page.locator('[data-action=submit]').isDisabled(),true);
await page.keyboard.press('p');
const pausedTime=await page.evaluate(()=>match.time);
await page.waitForTimeout(300);
assert.equal(await page.evaluate(()=>match.time),pausedTime);
assert.equal(await page.evaluate(()=>sound.voices.size),0,'pause stops scheduled effects');
await page.getByRole('button',{name:'경기 계속하기'}).click();
// Controlled RNG/AI clock exercises actual UI tournament transitions reliably.
for(let round=0;round<3;round++){
await page.evaluate(()=>{match.random=()=>0;match.aiClock=9999;});
for(const id of ['takedown','pass',round===1?'back':'mount','submit']){
await page.locator(`[data-action=${id}]`).click();
if(id!=='submit')await page.waitForTimeout(1050);
}
assert.equal(await page.evaluate(()=>match.result.winner),0);
if(round<2)await page.getByRole('button',{name:'다음 경기'}).click();
}
await page.waitForFunction(()=>phase==='result');
assert.equal(await page.locator('#overlay-title').textContent(),'동굴바리 챔피언!');
assert.equal(await page.locator('#trophy').isVisible(),true);
await page.screenshot({path:'/tmp/jiujitsu-champion.png',fullPage:true});
await page.getByRole('button',{name:'처음부터 다시 플레이'}).click();
assert.equal(await page.evaluate(()=>match.round),0);
await page.evaluate(()=>{match.fighters[1].score=3;match.time=.01;});
await page.waitForTimeout(200);
assert.equal(await page.locator('#overlay-title').textContent(),'도전은 계속된다.');
await page.getByRole('button',{name:'처음부터 다시 도전'}).click();
await page.evaluate(()=>{match.time=.01;});await page.waitForTimeout(200);
assert.equal(await page.locator('#overlay-title').textContent(),'팽팽한 승부!');
await page.getByRole('button',{name:'같은 경기 다시 도전'}).click();
await page.getByRole('button',{name:'도움말',exact:true}).click();
assert.equal(await page.evaluate(()=>paused),true);
await page.getByRole('button',{name:'경기 계속하기'}).click();
// Keyboard invokes legal action.
await page.evaluate(()=>{match.random=()=>0;match.aiClock=9999;});
await page.keyboard.press('1');assert.equal(await page.evaluate(()=>match.position),'guard');
const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
mobile.on('pageerror',e=>errors.push(e.message));
await mobile.goto(base);
await mobile.getByRole('button',{name:'START'}).tap();
await mobile.waitForFunction(()=>sound.context?.state==='running');
await mobile.locator('#sound-toggle').tap();
assert.equal(await mobile.evaluate(()=>sound.enabled),false);
await mobile.locator('#sound-test').tap();
await mobile.waitForFunction(()=>sound.enabled&&sound.context?.state==='running');
assert.equal(await mobile.locator('#sound-toggle').textContent(),'소리 켜짐');
await mobile.evaluate(()=>{match.random=()=>0;match.aiClock=9999;});
await mobile.locator('[data-action=takedown]').tap();assert.equal(await mobile.evaluate(()=>match.position),'guard');
await mobile.waitForTimeout(1050);await mobile.locator('[data-action=pass]').tap();assert.equal(await mobile.evaluate(()=>match.position),'side');
await mobile.screenshot({path:'/tmp/jiujitsu-mobile.png',fullPage:true});
for(const width of [320,360,390,768,1280]){
await mobile.setViewportSize({width,height:844});
assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}`);
const size=await mobile.locator('[data-action=defend]').boundingBox();assert.ok(size.height>=44);
}
// Exercise every animation through the live Canvas renderer, including AI and blocked moves.
const scenarios=[['takedown','standing',null],['pass','guard',0],['sweep','guard',1],['mount','side',0],['back','side',0],['escape','mount',1],['submit','mount',0],['submit','back',0],['defend','standing',null]];
for(const actor of [0,1])for(const success of [true,false])for(const [id,position,top]of scenarios){
  await page.evaluate(({actor,success,position,top})=>{
    startRound(0);match.position=position;match.top=top===null?null:(actor===0?top:1-top);
    match.random=()=>success?0:.999;match.aiClock=9999;render();
  },{actor,success,position,top});
  if(actor===0)await page.locator(`[data-action=${id}]`).click();
  else await page.evaluate(id=>{match.act(1,id);observeAction();render();},id);
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(()=>animation.event.id),id);
  assert.equal(await page.evaluate(()=>animation.event.actor),actor);
  assert.equal(await page.evaluate(()=>animation.event.success),id==='defend'||success);
  if(id==='submit'&&success){
    assert.equal(await page.locator('#overlay').isVisible(),false,'finish must wait for tap-out');
    await page.keyboard.press('p');
    const frozen=await page.evaluate(()=>animation.elapsed);await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>animation.elapsed),frozen);await page.keyboard.press('p');
  }
  if(actor===0&&success){
    await page.locator('#mat').screenshot({path:`/tmp/jiujitsu-${id}-${position}.png`});
  }
}
await mobile.setViewportSize({width:390,height:844});
await mobile.evaluate(()=>{startRound(0);match.position='back';match.top=0;match.random=()=>0;match.aiClock=9999;render();});
await mobile.locator('[data-action=submit]').tap();await mobile.waitForTimeout(430);
await mobile.screenshot({path:'/tmp/jiujitsu-mobile-choke.png',fullPage:true});
assert.equal(await mobile.evaluate(()=>animation.event.technique),'초크');
await page.emulateMedia({reducedMotion:'reduce'});
await page.evaluate(()=>{startRound(0);match.random=()=>0;match.aiClock=9999;});
await page.locator('[data-action=takedown]').click();
assert.equal(await page.evaluate(()=>reducedMotion.matches),true);await page.waitForTimeout(100);
// Offline render verifies every effect produces audible samples, without speakers in CI.
const audioResults=await page.evaluate(async()=>{
  const out=[];
  for(const name of ['bell','move','mat','position','block','recover','lock','tap','win','champion','loss','draw']){
    const fx=new JiuJitsuSound();fx.enabled=true;fx.context=new OfflineAudioContext(1,96000,48000);
    fx.master=fx.context.createGain();fx.master.gain.value=.24;fx.master.connect(fx.context.destination);
    // Offline context starts suspended; temporarily allow recipe scheduling only.
    Object.defineProperty(fx.context,'state',{value:'running'});fx.play(name);
    const buffer=await fx.context.startRendering();const data=buffer.getChannelData(0);
    let peak=0,energy=0;for(const v of data){peak=Math.max(peak,Math.abs(v));energy+=v*v;}
    out.push({name,peak,energy});
  }
  return out;
});
for(const {name,peak,energy}of audioResults){assert.ok(energy>0,`${name} should produce sound`);assert.ok(peak<1,`${name} should not clip`);}
await page.locator('#sound-toggle').click();
await page.reload();assert.equal(await page.evaluate(()=>sound.enabled),false,'mute persists');
assert.equal(await page.evaluate(()=>sound.context),null,'muted reload does not create audio context');
assert.deepEqual(errors,[]);
console.log('PASS: desktop tournament, armbar/choke, trophy, restart, loss, draw, pause, help, keyboard, mobile taps, 320–1280px layout; all technique success/defense/AI animations, paused tap-out, mobile choke and reduced motion; desktop/mobile audio unlock, mute persistence, pause silence, 12 non-silent sound recipes; no browser errors.');
} finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(e=>{console.error(e);server.close();process.exit(1);});
