'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Match}=require('../engine.js');
const {positions,keyframes,sample}=require('../graphics.js');
const cases=[['takedown','standing',null],['pass','guard',0],['sweep','guard',1],['mount','side',0],['back','side',0],['escape','mount',1],['submit','mount',0],['submit','back',0],['defend','standing',null]];
test('all techniques produce finite articulated frames for either fighter, success and defense',()=>{
  for(const actor of [0,1])for(const success of [true,false])for(const [id,position,top]of cases){
    const m=new Match(0,()=>success?0:.999);m.position=position;m.top=top===null?null:(actor===0?top:1-top);
    const original=positions(m);assert.equal(m.act(actor,id),true);
    const event=m.lastAction;assert.equal(event.actor,actor);assert.equal(event.id,id);
    assert.equal(event.success,id==='defend'||success);assert.equal(event.before.position,position);
    const frames=keyframes(event);assert.deepEqual(frames.start,original);
    for(const p of [0,.2,.5,.8,1]){
      const poses=sample(frames,p);assert.equal(poses.length,2);
      for(const pose of poses){assert.ok(Number.isFinite(pose.x));assert.ok(Number.isFinite(pose.y));assert.ok(Number.isFinite(pose.angle));assert.equal(pose.limbs.length,4);pose.limbs.flat().forEach(n=>assert.ok(Number.isFinite(n)));}
    }
    assert.notDeepEqual(frames.middle,frames.start);
    if(!event.success)assert.deepEqual(frames.end,frames.start);
  }
});
test('armbar and choke have distinct final grips and event snapshots remain immutable',()=>{
  const finals=[];
  for(const position of ['mount','back']){
    const m=new Match(0,()=>0);m.position=position;m.top=0;m.act(0,'submit');
    const event=m.lastAction;finals.push(keyframes(event).end);
    m.position='standing';assert.equal(event.before.position,position);assert.equal(event.after.position,position);
  }
  assert.notDeepEqual(finals[0],finals[1]);
});
test('illegal input does not emit animation; serial increases on valid actions only',()=>{
  const m=new Match(0,()=>0);assert.equal(m.act(0,'submit'),false);assert.equal(m.lastAction,null);
  m.act(0,'takedown');assert.equal(m.lastAction.serial,1);m.act(0,'pass');assert.equal(m.lastAction.serial,1);
  m.cooldown=0;m.act(0,'pass');assert.equal(m.lastAction.serial,2);
});
