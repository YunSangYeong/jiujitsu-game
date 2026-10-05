/* Pure game rules: no DOM, server, or external dependencies. */
(function (root) {
  'use strict';
  const ACTIONS = [
    { id: 'takedown', name: '테이크다운', cost: 16, chance: .78 },
    { id: 'pass', name: '가드 패스', cost: 15, chance: .74 },
    { id: 'sweep', name: '스윕', cost: 15, chance: .70 },
    { id: 'mount', name: '마운트 이동', cost: 13, chance: .75 },
    { id: 'back', name: '백 컨트롤', cost: 15, chance: .70 },
    { id: 'submit', name: '암바 / 초크', cost: 24, chance: .48 },
    { id: 'escape', name: '탈출', cost: 12, chance: .70 },
    { id: 'defend', name: '방어 / 회복', cost: 0, chance: 1 }
  ];
  const OPPONENTS = [
    { name: '돌주먹 민수', style: '힘은 세지만 빈틈이 많은 첫 상대', skill: 0, interval: 3.2 },
    { name: '가드 장인 수진', style: '방어와 스윕에 능한 준결승 상대', skill: .06, interval: 2.8 },
    { name: '검은띠 태오', style: '포지션과 서브미션을 노리는 결승 상대', skill: .12, interval: 2.4 }
  ];
  const POSITIONS = { standing: '스탠딩', guard: '가드', side: '사이드 컨트롤', mount: '마운트', back: '백 컨트롤' };
  class Match {
    constructor(round = 0, random = Math.random) {
      this.round = round; this.random = random; this.position = 'standing'; this.top = null;
      this.fighters = [{ name: '동굴바리', stamina: 100, score: 0, defending: false },
        { name: OPPONENTS[round].name, stamina: 100, score: 0, defending: false }];
      this.time = 75; this.result = null; this.messages = []; this.cooldown = 0;
      this.aiClock = OPPONENTS[round].interval; this.awarded = new Set();
    }
    available(actor, id) {
      if (this.result) return false;
      if (id === 'defend') return true;
      if (id === 'takedown') return this.position === 'standing';
      if (id === 'pass') return this.position === 'guard' && this.top === actor;
      if (id === 'sweep') return this.position === 'guard' && this.top !== actor;
      if (id === 'mount' || id === 'back') return this.position === 'side' && this.top === actor;
      if (id === 'submit') return ['mount', 'back'].includes(this.position) && this.top === actor;
      if (id === 'escape') return this.position !== 'standing' && this.top !== actor;
      return false;
    }
    chance(actor, action) {
      const me = this.fighters[actor], other = this.fighters[1 - actor];
      const skill = OPPONENTS[this.round].skill;
      return Math.max(.12, Math.min(.92, action.chance + (actor === 1 ? skill : -skill * .4)
        - (100 - me.stamina) * .004 + (100 - other.stamina) * .0015 - (other.defending ? .25 : 0)));
    }
    say(message) { this.messages.unshift(message); this.messages = this.messages.slice(0, 4); }
    award(actor, position, points) {
      const key = actor + ':' + position;
      if (!this.awarded.has(key)) { this.fighters[actor].score += points; this.awarded.add(key); }
    }
    act(actor, id) {
      const action = ACTIONS.find(a => a.id === id);
      if (!action || !this.available(actor, id) || (actor === 0 && this.cooldown > 0)) return false;
      const me = this.fighters[actor], other = this.fighters[1 - actor];
      if (me.stamina < action.cost) return false;
      if (actor === 0) this.cooldown = .9;
      if (id === 'defend') {
        me.stamina = Math.min(100, me.stamina + 18); me.defending = true;
        this.say(`${me.name} 방어 자세! 스태미나 회복`); return true;
      }
      const success = this.random() < this.chance(actor, action);
      me.stamina -= action.cost; me.defending = false; other.defending = false;
      const technique = id === 'submit' ? (this.position === 'back' ? '초크' : '암바') : action.name;
      if (!success) { this.say(`${me.name} ${technique} 시도! ${other.name} 방어 성공`); return true; }
      if (id === 'takedown') {
        this.top = actor; this.position = 'guard'; this.awarded.clear(); this.award(actor, 'takedown', 2);
      } else if (id === 'pass') { this.position = 'side'; this.award(actor, 'pass', 3);
      } else if (id === 'sweep') {
        this.top = actor; this.awarded.clear(); this.award(actor, 'sweep', 2);
      } else if (id === 'mount' || id === 'back') { this.position = id; this.award(actor, id, 4);
      } else if (id === 'escape') {
        if (this.position === 'guard') { this.position = 'standing'; this.top = null; this.awarded.clear(); }
        else if (this.position === 'side') this.position = 'guard';
        else this.position = 'side';
      } else if (id === 'submit') {
        this.result = { winner: actor, method: 'submission', technique };
        this.say(`${me.name} ${technique} 성공! SUBMISSION!`); return true;
      }
      this.say(`${me.name} ${technique} 성공!`); return true;
    }
    chooseAI() {
      const me = this.fighters[1], other = this.fighters[0];
      if (me.stamina < 30 || (other.defending && this.random() < .55)) return 'defend';
      if (this.position === 'standing') return 'takedown';
      if (this.top !== 1) {
        if (this.random() < .22 - OPPONENTS[this.round].skill) return 'defend';
        return this.position === 'guard' ? 'sweep' : 'escape';
      }
      if (this.position === 'guard') return 'pass';
      if (this.position === 'side') return this.random() < .55 ? 'mount' : 'back';
      return me.stamina >= 24 ? 'submit' : 'defend';
    }
    tick(seconds) {
      if (this.result) return;
      this.time = Math.max(0, this.time - seconds); this.cooldown = Math.max(0, this.cooldown - seconds);
      this.fighters.forEach(f => { f.stamina = Math.min(100, f.stamina + seconds * 2.2); });
      if (this.time === 0) {
        const [p, a] = this.fighters;
        this.result = { winner: p.score === a.score ? null : (p.score > a.score ? 0 : 1), method: 'points' };
        this.say(p.score === a.score ? '동점! 같은 상대와 다시 도전하세요.' : `${this.fighters[this.result.winner].name} 판정승!`);
        return;
      }
      this.aiClock -= seconds;
      if (this.aiClock <= 0) { this.act(1, this.chooseAI()); this.aiClock = OPPONENTS[this.round].interval; }
    }
  }
  const api = { Match, ACTIONS, OPPONENTS, POSITIONS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.JiuJitsu = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
