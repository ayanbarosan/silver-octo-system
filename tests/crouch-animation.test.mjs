import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBoy} from '../src/character.js';

const point=(boy,name)=>boy.group.getObjectByName(name).getWorldPosition(new THREE.Vector3());
function rig(face=1){
  const boy=createBoy(THREE);boy.group.rotation.y=face*Math.PI/2;
  let time=0;
  const step=(crouch=1,speed=0,dt=1/120,extra={})=>{
    time+=dt;boy.group.position.x+=face*speed*dt;
    boy.animate({time,dt,crouch,speed,travel:Math.abs(speed)*dt,grounded:true,wake:1,...extra});
    boy.group.updateWorldMatrix(true,true);
    return {animation:structuredClone(boy.group.userData.animation),feet:['leftSole','rightSole'].map(name=>point(boy,name)),head:point(boy,'head')};
  };
  const settle=(crouch=1,speed=0,frames=180)=>{let f;for(let i=0;i<frames;i++)f=step(crouch,speed);return f;};
  const transforms=()=>{const values=[];boy.group.traverse(o=>values.push(...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()));return values;};
  return {boy,step,settle,transforms};
}

for(const face of [-1,1])test(`crouching toward ${face<0?'left':'right'} fits the real head, hair and backpack beneath the opening`,()=>{
  const r=rig(face),upright=r.settle(0),uprightBox=new THREE.Box3().setFromObject(r.boy.group,true);
  assert(uprightBox.max.y>1.5,'The same child must retain his original standing height.');
  const standingHead=upright.head.y,standingPelvis=point(r.boy,'pelvis').y;
  for(const speed of [0,.8]){
    r.settle(1,speed);
    for(let i=0;i<240;i++){
      const frame=r.step(1,speed);
      assert.equal(frame.animation.mode,speed?'crouch-walk':'crouch');
      if(i%12===0){
        const box=new THREE.Box3().setFromObject(r.boy.group,true);
        const bag=new THREE.Box3().setFromObject(r.boy.group.getObjectByName('backpack'),true);
        assert(box.max.y<.95,`Actual crouched mesh reached ${box.max.y.toFixed(4)}m, including hair.`);
        assert(bag.max.y<.93,'The lime backpack must also clear the bar.');
        assert(box.min.y>-.008,'Crouching cannot bury a shoe beneath the floor.');
        assert(Math.max(box.max.x-r.boy.group.position.x,r.boy.group.position.x-box.min.x)<.70,'The controller clearance margin must contain the real bent posture.');
      }
      assert(r.transforms().every(Number.isFinite));
    }
  }
  assert(standingHead-point(r.boy,'head').y>.55,'Crouching must visibly lower the head.');
  assert(standingPelvis-point(r.boy,'pelvis').y>.24,'The knees must carry the lower pelvis.');
  assert.deepEqual(r.boy.group.scale.toArray(),[1,1,1],'A crouch must bend joints rather than shrink the whole character.');
  assert(point(r.boy,'leftKnee').y>.08&&point(r.boy,'rightKnee').y>.08);
});

test('crouch walking plants the actual shoes and alternates short recovery steps',()=>{
  const r=rig();r.settle(1,.8);
  let previous=null,contacts=0,swings=0,maxDrift=0;
  for(let i=0;i<600;i++){
    const frame=r.step(1,.8);
    for(let k=0;k<2;k++){
      const foot=frame.animation.feet[k],sole=frame.feet[k];
      assert(sole.distanceTo(new THREE.Vector3(...Object.values(foot.position)))<1e-7,'Diagnostics must observe the actual sole.');
      if(foot.stance&&foot.contactWeight>.98){
        contacts++;assert(Math.abs(sole.y)<.015,'A supporting shoe must stay on the floor.');
        if(previous?.animation.feet[k].stance&&previous.animation.feet[k].contactWeight>.98)maxDrift=Math.max(maxDrift,sole.distanceTo(previous.feet[k]));
      }else if(!foot.stance&&sole.y>.025)swings++;
    }
    previous=frame;
  }
  assert(contacts>400,'Bent knees still need sustained supporting steps.');
  assert(swings>100,'Crouch movement must lift the recovering foot rather than slide both shoes.');
  assert(maxDrift<.008,`A planted crouching shoe slid ${maxDrift.toFixed(4)}m in one frame.`);
});

test('ducking and standing follow the controller blend without a visible head or foot snap',()=>{
  const r=rig();let previous=r.settle(0),duck=0,maxHeadStep=0,maxFootStep=0;
  for(const target of [1,0,1,0])for(let i=0;i<180;i++){
    duck=Math.max(0,Math.min(1,duck+(target?1:-1)/(120*.36)));
    const frame=r.step(duck);
    maxHeadStep=Math.max(maxHeadStep,frame.head.distanceTo(previous.head));
    frame.feet.forEach((p,k)=>maxFootStep=Math.max(maxFootStep,p.distanceTo(previous.feet[k])));
    assert(r.transforms().every(Number.isFinite));previous=frame;
  }
  assert(maxHeadStep<.06,`The head jumped ${maxHeadStep.toFixed(4)}m in a 1/120s frame.`);
  assert(maxFootStep<.01,'Changing stance height must not move the planted shoes.');
  assert.equal(previous.animation.mode,'idle');
});

test('crouch holds still and pause freezes the exact joints while reset restores the original child',()=>{
  const r=rig();r.settle(1,.8);r.settle(1,0,360);
  const before=r.settle(1),after=r.settle(1);
  assert.equal(before.animation.phase,after.animation.phase,'A held crouch cannot keep walking in place.');
  before.feet.forEach((p,k)=>assert(p.distanceTo(after.feet[k])<.005));
  const pose=r.transforms(),diagnostics=after.animation;
  const paused=r.step(0,0,0);
  assert.deepEqual(r.transforms(),pose);assert.deepEqual(paused.animation,diagnostics);
  r.boy.reset();r.settle(0);
  assert.equal(r.boy.group.userData.animation.mode,'idle');
  assert(new THREE.Box3().setFromObject(r.boy.group,true).max.y>1.5);
});
