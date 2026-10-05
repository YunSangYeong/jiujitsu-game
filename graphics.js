/* Pose keyframes independent of Canvas: shared by both fighters and testable in Node. */
(function(root) {
  'use strict';
  // Each limb is elbow/knee followed by hand/foot, in local body coordinates.
  const LIMBS = {
    stand: [[-32,12,-47,-3],[32,12,47,-3],[-19,76,-30,104],[19,76,30,104]],
    shoot: [[-29,25,-48,47],[29,20,46,40],[-28,63,-44,84],[29,65,43,90]],
    guard: [[-28,5,-32,-22],[28,5,32,-22],[-38,64,-47,12],[38,64,47,12]],
    ground: [[-33,20,-49,4],[33,20,49,4],[-21,77,-36,95],[21,77,36,95]],
    kneel: [[-26,30,-43,47],[26,30,43,47],[-32,57,-44,78],[32,57,44,78]],
    pass: [[-35,29,-55,35],[35,29,55,35],[-35,64,-55,89],[15,67,19,92]],
    pin: [[-35,7,-52,-12],[35,7,52,-12],[-33,60,-47,82],[33,60,47,82]],
    seat: [[-26,9,-13,-26],[26,9,13,-26],[-35,57,-42,15],[35,57,42,15]],
    choke: [[-30,-16,13,-33],[28,-14,-13,-30],[-35,57,-42,15],[35,57,42,15]],
    trapped: [[-27,-1,-15,-26],[27,-1,15,-26],[-20,70,-26,95],[20,70,26,95]],
    armbar: [[-28,18,-30,44],[20,24,-24,42],[-38,51,-63,-12],[28,56,-34,35]],
    armLocked: [[-24,-22,-19,-67],[31,19,40,2],[-21,77,-36,95],[21,77,36,95]],
    defend: [[-27,-5,-13,-28],[27,-5,13,-28],[-19,76,-30,104],[19,76,30,104]],
    frame: [[-28,-10,-39,-36],[28,-10,39,-36],[-35,63,-40,26],[35,63,40,26]]
  };
  function pose(x,y,angle,name,facing=1) {
    return {x,y,angle,facing,limbs:LIMBS[name].map(l=>l.slice())};
  }
  function positions(state) {
    if(state.position==='standing') return [pose(365,179,.12,'stand'),pose(595,179,-.12,'stand',-1)];
    const pair=[], t=state.top, b=1-t;
    if(state.position==='guard') {pair[b]=pose(426,247,Math.PI/2,'guard');pair[t]=pose(513,214,-.65,'kneel',-1);}
    if(state.position==='side') {pair[b]=pose(417,260,Math.PI/2,'ground');pair[t]=pose(440,203,.3,'pin');}
    if(state.position==='mount') {pair[b]=pose(480,271,Math.PI/2,'ground');pair[t]=pose(462,210,0,'pin');}
    if(state.position==='back') {pair[t]=pose(501,198,-.2,'seat');pair[b]=pose(478,221,-.2,'trapped');}
    return pair;
  }
  function blendPose(a,b,p) {
    const mix=(x,y)=>x+(y-x)*p;
    return {x:mix(a.x,b.x),y:mix(a.y,b.y),angle:mix(a.angle,b.angle),facing:p<.5?a.facing:b.facing,
      limbs:a.limbs.map((l,i)=>l.map((v,j)=>mix(v,b.limbs[i][j])))};
  }
  function keyframes(event) {
    const start=positions(event.before), end=positions(event.after), middle=positions(event.before);
    const a=event.actor,b=1-a, direction=a===0?1:-1;
    if(event.id==='takedown') {
      middle[a]=pose(480-direction*38,224,direction*.95,'shoot',direction);
      middle[b]=pose(480+direction*35,205,-direction*.6,'ground',-direction);
    } else if(event.id==='pass') {
      middle[a]=pose(540,223,-.9,'pass',-1);middle[b]=pose(426,255,Math.PI/2,'frame');
    } else if(event.id==='sweep') {
      middle[a]=pose(484,220,Math.PI,'guard');middle[b]=pose(501,256,Math.PI/2+.8,'kneel');
    } else if(event.id==='mount') {
      middle[a]=pose(486,191,-.2,'kneel');
    } else if(event.id==='back') {
      middle[a]=pose(549,209,-.4,'seat');middle[b]=pose(472,238,-.2,'trapped');
    } else if(event.id==='escape') {
      middle[a]=pose(444,248,Math.PI/2-.65,'frame');middle[b].x+=44;middle[b].angle-=.4;
    } else if(event.id==='submit' && event.technique==='암바') {
      middle[b]=pose(440,263,Math.PI/2,'armLocked');middle[a]=pose(461,214,-Math.PI/2,'armbar');
      if(event.success) {end[a]=middle[a];end[b]=middle[b];}
    } else if(event.id==='submit') {
      middle[a]=pose(501,198,-.2,'choke');middle[b]=pose(478,221,-.2,'trapped');
      if(event.success) {end[a]=middle[a];end[b]=middle[b];}
    } else if(event.id==='defend') {
      middle[a].limbs=LIMBS[event.before.position==='standing'?'defend':'frame'].map(l=>l.slice());
    }
    if(!event.success) {
      // Sprawl/frame response: attack extends then visibly returns to its starting position.
      middle[b].limbs=LIMBS[event.before.position==='standing'?'defend':'frame'].map(l=>l.slice());
      middle[b].x+=direction*15;
    }
    return {start,middle,end};
  }
  function sample(frames,progress) {
    const segment=progress<.5 ? [frames.start,frames.middle,progress*2] : [frames.middle,frames.end,(progress-.5)*2];
    const p=segment[2]*segment[2]*(3-2*segment[2]);
    return segment[0].map((pose,i)=>blendPose(pose,segment[1][i],p));
  }
  const api={positions,keyframes,sample};
  if(typeof module!=='undefined'&&module.exports) module.exports=api;else root.JiuJitsuGraphics=api;
})(typeof globalThis!=='undefined'?globalThis:this);
