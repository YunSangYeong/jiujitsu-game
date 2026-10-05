'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Match, OPPONENTS } = require('../engine.js');
function action(m, actor, id) { m.cooldown = 0; return m.act(actor, id); }
test('three rounds can be won through takedown, pass, mount and armbar', () => {
  for (let round = 0; round < 3; round++) {
    const m = new Match(round, () => 0);
    assert.equal(action(m, 0, 'submit'), false);
    for (const id of ['takedown','pass','mount','submit']) assert.equal(action(m, 0, id), true);
    assert.deepEqual(m.result, { winner: 0, method: 'submission', technique: '암바' });
    assert.equal(m.fighters[0].score, 9);
    assert.equal(action(m, 1, 'defend'), false);
  }
});
test('back control leads to choke submission', () => {
  const m = new Match(0, () => 0);
  for (const id of ['takedown','pass','back','submit']) action(m, 0, id);
  assert.equal(m.result.technique, '초크');
});
test('bottom guard can sweep and escape; dominant positions escape in stages', () => {
  const m = new Match(0, () => 0);
  action(m, 1, 'takedown');
  assert.equal(m.available(0, 'pass'), false);
  action(m, 0, 'sweep'); assert.equal(m.top, 0); assert.equal(m.fighters[0].score, 2);
  action(m, 0, 'pass'); action(m, 0, 'mount');
  action(m, 1, 'escape'); assert.equal(m.position, 'side');
  action(m, 1, 'escape'); assert.equal(m.position, 'guard');
  action(m, 1, 'escape'); assert.equal(m.position, 'standing'); assert.equal(m.top, null);
});
test('recovering a previously scored position does not farm points', () => {
  const m = new Match(0, () => 0);
  action(m, 0, 'takedown'); action(m, 0, 'pass'); action(m, 0, 'mount');
  action(m, 1, 'escape'); action(m, 0, 'mount');
  assert.equal(m.fighters[0].score, 9);
});
test('defense reduces success, recovers stamina and is consumed by an attack', () => {
  const m = new Match(0, () => .9);
  m.fighters[1].stamina = 50;
  action(m, 1, 'defend'); assert.equal(m.fighters[1].stamina, 68);
  const { ACTIONS } = require('../engine.js');
  const chance = m.chance(0, ACTIONS[0]);
  m.fighters[1].defending = false; assert.ok(m.chance(0, ACTIONS[0]) > chance);
  m.fighters[1].defending = true; action(m, 0, 'takedown');
  assert.equal(m.position, 'standing'); assert.equal(m.fighters[1].defending, false);
  assert.equal(m.fighters[0].stamina, 84);
});
test('low stamina reduces success and prevents unaffordable moves; cooldown blocks spam', () => {
  const m = new Match(0, () => 0), { ACTIONS } = require('../engine.js');
  const high = m.chance(0, ACTIONS[0]); m.fighters[0].stamina = 10;
  assert.ok(m.chance(0, ACTIONS[0]) < high); assert.equal(action(m,0,'takedown'),false);
  action(m,0,'defend'); assert.equal(m.act(0,'defend'),false);
  m.tick(1); assert.equal(m.act(0,'defend'),true);
});
test('timeout handles player win, opponent win and draw without late AI action', () => {
  for (const [p,a,winner] of [[2,0,0],[0,3,1],[0,0,null]]) {
    const m = new Match(); m.fighters[0].score=p; m.fighters[1].score=a;
    m.time=.1; m.aiClock=0; m.tick(.1);
    assert.deepEqual(m.result,{winner,method:'points'}); assert.equal(m.position,'standing');
  }
});
test('AI uses position and stamina; later rounds are stronger and faster', () => {
  const m = new Match(2, () => .5);
  assert.equal(m.chooseAI(),'takedown');
  m.position='guard';m.top=0; assert.equal(m.chooseAI(),'sweep');
  m.position='mount';assert.equal(m.chooseAI(),'escape');
  m.top=1;assert.equal(m.chooseAI(),'submit');
  m.position='side';assert.equal(m.chooseAI(),'mount');
  m.fighters[1].stamina=10;assert.equal(m.chooseAI(),'defend');
  assert.ok(OPPONENTS[2].skill>OPPONENTS[0].skill);
  assert.ok(OPPONENTS[2].interval<OPPONENTS[0].interval);
});
test('normal randomized matches terminate and maintain score/stamina invariants', () => {
  const { ACTIONS } = require('../engine.js');
  for(let n=0;n<120;n++) {
    const m=new Match(n%3);let steps=0;
    while(!m.result&&steps++<800) {
      if(m.cooldown===0) {
        const options=ACTIONS.filter(a=>m.available(0,a.id)&&m.fighters[0].stamina>=a.cost);
        m.act(0,options[Math.floor(Math.random()*options.length)].id);
      }
      m.tick(.1);
      m.fighters.forEach(f=>{assert.ok(f.stamina>=0&&f.stamina<=100);assert.ok(f.score>=0);});
    }
    assert.ok(m.result);assert.ok(m.time>=0);
  }
});
