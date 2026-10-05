const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req,res)=>{
  const files = {'/':'index.html','/index.html':'index.html','/style.css':'style.css','/engine.js':'engine.js','/game.js':'game.js'};
  const file = files[req.url];
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
await page.getByRole('button',{name:'START'}).click();
assert.equal(await page.locator('[data-action=submit]').isDisabled(),true);
await page.keyboard.press('p');
const pausedTime=await page.evaluate(()=>match.time);
await page.waitForTimeout(300);
assert.equal(await page.evaluate(()=>match.time),pausedTime);
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
await mobile.evaluate(()=>{match.random=()=>0;match.aiClock=9999;});
await mobile.locator('[data-action=takedown]').tap();assert.equal(await mobile.evaluate(()=>match.position),'guard');
await mobile.waitForTimeout(1050);await mobile.locator('[data-action=pass]').tap();assert.equal(await mobile.evaluate(()=>match.position),'side');
await mobile.screenshot({path:'/tmp/jiujitsu-mobile.png',fullPage:true});
for(const width of [320,360,390,768,1280]){
await mobile.setViewportSize({width,height:844});
assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}`);
const size=await mobile.locator('[data-action=defend]').boundingBox();assert.ok(size.height>=44);
}
assert.deepEqual(errors,[]);
console.log('PASS: desktop tournament, armbar/choke, trophy, restart, loss, draw, pause, help, keyboard, mobile taps, 320–1280px layout; no browser errors.');
} finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(e=>{console.error(e);server.close();process.exit(1);});
