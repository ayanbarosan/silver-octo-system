import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBoy} from '../src/character.js';
import {createStairwell,STAIRWELL,stairHeight,stairDirection} from '../src/stairwell.js';

const dt=1/120;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
function treadHeight(flight,x){
  if(flight===STAIRWELL.flights)return 0;
  const direction=stairDirection(flight),start=direction<0?STAIRWELL.right:STAIRWELL.left;
  const q=(x-start)*direction/(STAIRWELL.right-STAIRWELL.left);
  if(q<=0||q>=1)return stairHeight(flight,x);
  return (STAIRWELL.flights-flight)*STAIRWELL.rise-(Math.floor(q*STAIRWELL.steps)+1)*STAIRWELL.rise/STAIRWELL.steps;
}
function rig(saved){
  const controller=createStairwell(),player={},boy=createBoy(THREE);controller.begin(player,saved);
  boy.group.position.set(player.x,player.y,0);boy.group.rotation.y=player.face*Math.PI/2;boy.reset();
  let time=0;
  function step(direction=0,delta=dt){
    const before=player.x;controller.update(delta,{direction},player);time+=delta;
    boy.group.position.set(player.x,player.y,0);
    boy.group.rotation.y=THREE.MathUtils.damp(boy.group.rotation.y,player.face*Math.PI/2,8,delta);
    boy.animate({time,dt:delta,speed:player.vx,travel:Math.abs(player.x-before),grounded:true,wake:1,stairs:controller.state});
    const animation=structuredClone(boy.group.userData.animation);
    const points=['leftSole','rightSole','pelvis','head'].map(name=>boy.group.getObjectByName(name).getWorldPosition(new THREE.Vector3()));
    return {animation,points};
  }
  return {controller,player,boy,step};
}

test('the rendered shoes plant on concrete treads throughout all four downward flights',()=>{
  const r=rig();let previous=null,maxMotion=0,maxContactError=0,maxContactDrift=0,loadedSamples=0,stairFrames=0;
  for(let frame=0;frame<6000&&!r.controller.state.completed;frame++){
    const f=r.controller.state.flight,direction=f<4?r.controller.state.direction:-1;
    const current=r.step(direction),state=r.controller.state;
    assert(current.points.every(p=>[p.x,p.y,p.z].every(Number.isFinite)));
    if(previous)current.points.forEach((p,i)=>maxMotion=Math.max(maxMotion,distance(p,previous.points[i])));
    if(state.onStairs&&r.player.x>STAIRWELL.left+.6&&r.player.x<STAIRWELL.right-.6){
      if(current.animation.mode==='stairs')stairFrames++;
      for(let i=0;i<2;i++){
        const foot=current.animation.feet[i],sole=current.points[i];
        assert(distance(foot.position,sole)<1e-6,'Diagnostics must measure the actual rendered shoe.');
        if(foot.stance&&foot.contactWeight>.98){
          loadedSamples++;maxContactError=Math.max(maxContactError,Math.abs(sole.y-treadHeight(state.flight,sole.x)));
          const old=previous?.animation.feet[i];
          if(old?.stance&&old.contactWeight>.98)maxContactDrift=Math.max(maxContactDrift,distance(sole,previous.points[i]));
        }
      }
    }
    previous=current;
  }
  assert.equal(r.controller.state.completed,true);assert.equal(r.controller.state.completedFlights,4);
  assert(stairFrames>1500&&loadedSamples>1500,'Every flight must execute a complete gait with loaded shoe contacts.');
  assert(maxContactError<.045,`A loaded sole misses its concrete tread by ${maxContactError.toFixed(4)}m.`);
  assert(maxContactDrift<.018,`A supporting shoe slides ${maxContactDrift.toFixed(4)}m in one 120Hz frame.`);
  assert(maxMotion<.085,`A shoe or body marker snaps ${maxMotion.toFixed(4)}m during descent or a landing turn.`);
});

test('stopping midway leaves both soles on their treads and pausing preserves the settled pose',()=>{
  const r=rig({flight:1,x:7.1,face:1});
  for(let frame=0;frame<100;frame++)r.step(1);
  let current;for(let frame=0;frame<250;frame++)current=r.step();
  const phase=current.animation.phase,points=current.points.map(p=>p.clone());
  for(let frame=0;frame<240;frame++)current=r.step();
  assert.equal(r.player.vx,0);assert.equal(current.animation.mode,'idle');
  assert(Math.abs(current.animation.phase-phase)<1e-9,'The stair gait cannot continue cycling at rest.');
  for(let i=0;i<2;i++){
    assert(distance(current.points[i],points[i])<.004,'A stopped shoe must stay on its tread.');
    assert(Math.abs(current.points[i].y-treadHeight(r.controller.state.flight,current.points[i].x))<.015,'An idle shoe must remain on a horizontal tread rather than the root ramp.');
  }
  const before=current.points.map(p=>p.clone());
  for(let frame=0;frame<60;frame++)current=r.step(1,0);
  current.points.forEach((p,i)=>assert(distance(p,before[i])<1e-9,'Zero-time input must not change a paused stair pose.'));
});

test('the pelvis prepares for lower treads without abrupt compression at either render rate',()=>{
  for(const fps of [60,120]){
    const r=rig();let previous=null,maxPelvisSpeed=0,maxHeadSpeed=0,samples=0;
    for(let frame=0;frame<fps*45&&!r.controller.state.completed;frame++){
      const flight=r.controller.state.flight,current=r.step(flight<4?r.controller.state.direction:-1,1/fps);
      const straight=r.controller.state.onStairs&&previous?.flight===r.controller.state.flight&&r.player.x>STAIRWELL.left+.6&&r.player.x<STAIRWELL.right-.6&&Math.abs(Math.cos(r.boy.group.rotation.y))<.05;
      if(straight){
        maxPelvisSpeed=Math.max(maxPelvisSpeed,Math.abs(current.points[2].y-previous.frame.points[2].y)*fps);
        maxHeadSpeed=Math.max(maxHeadSpeed,Math.abs(current.points[3].y-previous.frame.points[3].y)*fps);samples++;
      }
      previous={flight:r.controller.state.flight,frame:current};
    }
    assert(samples>fps*15,'The measurements must cover loaded steps on every downward flight.');
    assert(maxPelvisSpeed<1.2,`At ${fps}Hz the pelvis compresses at ${maxPelvisSpeed.toFixed(3)}m/s instead of preparing before support.`);
    assert(maxHeadSpeed<1.1,`At ${fps}Hz the head jerks vertically at ${maxHeadSpeed.toFixed(3)}m/s.`);
  }
});
