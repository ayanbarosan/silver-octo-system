import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBoy} from '../src/character.js';
import {createApartment,ESCAPE} from '../src/apartment.js';

const dt=1/120;
const points=boy=>['leftSole','rightSole','leftPalm','rightPalm','pelvis','head'].map(name=>boy.group.getObjectByName(name).getWorldPosition(new THREE.Vector3()));
const distance=(a,b)=>a.distanceTo(b);
function transforms(boy){const values=[];boy.group.traverse(o=>values.push(...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()));return values;}
function treadY(f,x){
  const direction=f===0?1:-1,start=direction>0?28:33,q=(x-start)*direction/5;
  return q<=0?-f*3.2:q>=1?-(f+1)*3.2:-f*3.2-(Math.floor(q*20)+1)*.16;
}

test('exterior foot contacts follow both real metal flights below apartment level',()=>{
  const apartment=createApartment(),player={},boy=createBoy(THREE);apartment.begin(player,{x:27.1,face:1,stage:'fireescape',flight:0});
  boy.group.position.set(player.x,player.y,player.z);boy.group.rotation.y=Math.PI/2;boy.reset();
  let loaded=0,maxError=0,maxDrift=0,previous=null,stairFrames=0;
  const flights=new Set();
  for(let n=0;n<3000&&apartment.state.area!=='playground';n++){
    const before={...player},direction=apartment.state.escapeFlight===0?1:-1;
    apartment.update(dt,{direction},player);const s=apartment.state;
    boy.group.position.set(player.x,player.y,player.z);boy.group.rotation.y=THREE.MathUtils.damp(boy.group.rotation.y,s.heading,8,dt);
    boy.animate({time:n*dt,dt,speed:Math.hypot(player.vx,player.vz),travel:Math.hypot(player.x-before.x,player.z-before.z),grounded:true,stairs:s.stairs,story:s});
    const p=points(boy),a=boy.group.userData.animation;
    assert(transforms(boy).every(Number.isFinite));
    if(s.onStairs&&player.x>28.5&&player.x<32.5){
      flights.add(s.escapeFlight);if(a.mode==='stairs')stairFrames++;
      for(let i=0;i<2;i++)if(a.feet[i].contactWeight>.98&&a.feet[i].stance){
        loaded++;maxError=Math.max(maxError,Math.abs(p[i].y-treadY(s.escapeFlight,p[i].x)));
        if(previous?.flight===s.escapeFlight&&previous.feet[i].stance&&previous.feet[i].contactWeight>.98)maxDrift=Math.max(maxDrift,distance(p[i],previous.p[i]));
      }
    }
    previous={flight:s.escapeFlight,p:p.map(v=>v.clone()),feet:structuredClone(a.feet)};
  }
  assert.equal(apartment.state.area,'playground');assert.equal(player.y,ESCAPE.groundY);assert.equal(player.z,ESCAPE.groundZ);
  assert.deepEqual([...flights],[0,1]);assert(loaded>250&&stairFrames>250);
  assert(maxError<.045,`A loaded exterior shoe misses its tread by ${maxError.toFixed(4)}m.`);
  assert(maxDrift<.02,`A loaded exterior sole slides ${maxDrift.toFixed(4)}m.`);
});

function windowRoot(p){
  const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
  return {x:p<.16?25+.43*smooth(p/.16):p<.35?25.43+.22*smooth((p-.16)/.19):p<.8?25.65+smooth((p-.35)/.45):26.65+.45*smooth((p-.8)/.2),
    y:p<.16?.10*smooth(p/.16):p<.35?.10+.92*smooth((p-.16)/.19):p<.8?1.02:1.02*(1-smooth((p-.8)/.2))};
}
test('window escape braces on the frame, passes a tucked leading knee and unfolds outside',()=>{
  const boy=createBoy(THREE);boy.group.position.set(25,0,1.4);boy.group.rotation.y=Math.PI/2;boy.reset();
  const stages=new Set(),head=[],knees=[],hands=[];let maxMotion=0,previous=null;
  for(let n=0;n<=198;n++){
    const p=n/198,r=windowRoot(p);boy.group.position.set(r.x,r.y,1.4);
    boy.animate({time:n*dt,dt,grounded:true,story:{windowClimb:{progress:p,elapsed:p*1.65,duration:1.65}}});
    const q=points(boy);assert(transforms(boy).every(Number.isFinite));stages.add(boy.group.userData.animation.storyStage);
    if(previous)q.forEach((v,i)=>maxMotion=Math.max(maxMotion,distance(v,previous[i])));previous=q.map(v=>v.clone());
    if(p>.30&&p<.8){
      head.push(q[5].y);knees.push(boy.group.getObjectByName('leftKnee').getWorldPosition(new THREE.Vector3()).y);
      for(let i=0;i<2;i++)if(boy.group.userData.animation.hands[i].contactWeight>.8)hands.push(q[i+2].distanceTo(new THREE.Vector3(25.8,1.04,1.4-(i===0?-1:1)*.19)));
    }
  }
  assert(stages.has('window-reach')&&stages.has('window-knee-through')&&stages.has('window-lower'));
  assert(hands.length>5&&Math.max(...hands)<.10,'Supporting palms must remain near the actual sill.');
  assert(Math.max(...head)<2.6,'The child must duck beneath the opening, not stand upright on the sill.');
  assert(Math.max(...knees)>1.25,'A leading knee must visibly lift through the opening.');
  assert(maxMotion<.10,`A window contact snaps ${maxMotion.toFixed(4)}m per frame.`);
  const before=transforms(boy);boy.animate({time:100,dt:0,story:{windowClimb:{progress:.2}}});assert.deepEqual(transforms(boy),before);
  for(let n=0;n<120;n++)boy.animate({time:2+n*dt,dt,grounded:true});
  assert.equal(boy.group.userData.animation.storyStage,'none');assert.equal(boy.group.userData.animation.mode,'idle');
});

test('caught reaction evolves from a guard into a loose supported fall, freezes on pause and resets',()=>{
  const boy=createBoy(THREE);boy.group.position.set(15,0,1.4);boy.group.rotation.y=Math.PI/2;boy.reset();
  const stages=new Set();let upright=null,down=null,maxMotion=0,previous=null;
  for(let n=0;n<=216;n++){
    const elapsed=n*dt,caught={elapsed,progress:elapsed/1.8,duration:1.8,fallProgress:THREE.MathUtils.clamp((elapsed-.48)/.85,0,1)};
    boy.animate({time:elapsed,dt,grounded:true,story:{caught}});const p=points(boy);
    assert(transforms(boy).every(Number.isFinite));stages.add(boy.group.userData.animation.storyStage);
    if(n===0)upright=p[5].clone();if(n===216)down=p[5].clone();
    if(previous)p.forEach((v,i)=>maxMotion=Math.max(maxMotion,distance(v,previous[i])));previous=p.map(v=>v.clone());
    if(n===130){const before=transforms(boy);boy.animate({time:100,dt:0,story:{caught:{elapsed:0}}});assert.deepEqual(transforms(boy),before);}
  }
  assert(stages.has('caught-brace')&&stages.has('caught-recoil')&&stages.has('caught-fall')&&stages.has('caught-settle'));
  assert(upright.y-down.y>.5,'The head must settle close to the ground after the fall.');
  assert(maxMotion<.12,`A caught joint snaps ${maxMotion.toFixed(4)}m per frame.`);
  boy.reset();assert.equal(boy.group.userData.animation.storyStage,'none');assert.equal(boy.group.userData.animation.mode,'idle');
  assert(points(boy)[5].y>1.2);
});

test('nightstand palms reach the narrow object in the actual apartment lane',()=>{
  for(const side of[-1,1]){
    const boy=createBoy(THREE),objectX=21.2;boy.group.position.set(objectX+side*.57,0,1.4);boy.group.rotation.y=-side*Math.PI/2;boy.reset();
    for(let n=0;n<180;n++)boy.animate({time:n*dt,dt,grounded:true,interaction:{kind:'hold',side,objectX,objectY:.8,objectZ:1.4,halfWidth:.36,gripOffset:.4}});
    const a=boy.group.userData.animation;
    for(let i=0;i<2;i++){
      const target=new THREE.Vector3(objectX+side*.4,.57,1.4+(i===0?-1:1)*side*.16);
      assert(points(boy)[i+2].distanceTo(target)<.01);assert(a.hands[i].contactWeight>.98);
    }
  }
});
