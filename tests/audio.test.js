'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(state='suspended',reject=false){
 const instances=[];
 class Context{
  constructor(){this.state=state;this.sampleRate=48000;this.destination={};this.primed=0;this.resumed=0;instances.push(this);}
  createGain(){return{gain:{value:0},connect(){}};}
  createDynamicsCompressor(){return{threshold:{},knee:{},ratio:{},connect(){}};}
  createBuffer(){return{};}
  createBufferSource(){const context=this;return{connect(){},disconnect(){},start(){context.primed++;}};}
  resume(){this.resumed++;if(reject)return Promise.reject({name:'NotAllowedError'});this.state='running';return Promise.resolve();}
 }
 const root={AudioContext:Context,localStorage:{getItem(){return null;},setItem(){}},navigator:{audioSession:{}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../audio.js'),'utf8'),root);
 return{sound:new root.JiuJitsuSound(),instances,root};
}
test('audio stays lazy and primes hardware synchronously on a gesture',async()=>{
 const {sound,instances,root}=setup();assert.equal(sound.context,null);
 const ready=sound.unlock();assert.equal(instances[0].primed,1);await ready;
 assert.equal(sound.context.state,'running');assert.equal(root.navigator.audioSession.type,'playback');
});
test('Safari interrupted state resumes and closed contexts are recreated',async()=>{
 const {sound,instances}=setup('interrupted');await sound.unlock();assert.equal(sound.context.resumed,1);
 sound.context.state='closed';await sound.unlock();assert.equal(instances.length,2);assert.equal(sound.context.state,'running');
});
test('rejected audio resume is reported and can be retried without crashing gameplay',async()=>{
 const {sound}=setup('suspended',true);await sound.unlock();assert.equal(sound.lastError,'NotAllowedError');
 await sound.unlock();assert.equal(sound.context.resumed,2);assert.equal(sound.supported,true);
});
test('muted or unsupported audio does not create a context',async()=>{
 const {sound,instances}=setup();sound.setEnabled(false);await sound.unlock();assert.equal(instances.length,0);
 sound.enabled=true;sound.supported=false;await sound.unlock();assert.equal(instances.length,0);
});
test('Korean announcer voice respects mute and is canceled on pause',()=>{
 const {sound,root}=setup();const spoken=[];let canceled=0;
 root.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
 root.speechSynthesis={getVoices:()=>[{lang:'ko-KR',localService:true}],speak:u=>spoken.push(u),cancel:()=>canceled++};
 sound.speak('청 코너! 동굴바리!');assert.equal(spoken.length,1);assert.equal(spoken[0].lang,'ko-KR');
 sound.setPaused(true);assert.equal(canceled,1);assert.equal(sound.utterance,null);
 sound.speak('홍 코너!');assert.equal(spoken.length,1);
 sound.setPaused(false);sound.speak('두 선수 준비!');sound.setEnabled(false);
 assert.equal(canceled,2);sound.speak('시작!');assert.equal(spoken.length,2);
});
test('without Korean speech support introductions use text and effects safely',()=>{
 const {sound,root}=setup();sound.speak('청 코너');
 root.SpeechSynthesisUtterance=class{};root.speechSynthesis={getVoices:()=>[{lang:'en-US'}],speak(){throw Error('wrong voice');}};
 sound.speak('동굴바리');assert.equal(sound.utterance,null);
});
