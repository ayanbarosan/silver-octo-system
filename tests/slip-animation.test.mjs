import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBoy} from '../src/character.js';
import {createSlip} from '../src/slip.js';
import {LEVEL} from '../src/level.js';
import {movementVelocity} from '../src/movement.js';

const puddle=LEVEL.slipPuddle,dt=1/120;
const names=['leftPalm','rightPalm','leftSole','rightSole','pelvis','head','leftKnee','rightKnee'];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const biggestChange=(a,b)=>Math.max(...a.map((point,index)=>distance(point,b[index])));

function rig(face=1,{zeroWobble=false}={}) {
  const boy=createBoy(THREE),slip=createSlip();
  const initialX=face===1?puddle.x-.95:puddle.x+puddle.w+.95;
  const player={x:initialX,y:puddle.y,vx:0,vy:0,grounded:true,face};
  let time=0;
  boy.group.rotation.y=face*Math.PI/2;
  function object(name) {
    const found=boy.group.getObjectByName(name);assert(found,`${name} must observe an actual rendered body/contact part.`);return found;
  }
  function step({speed=0,acceleration=0}={}) {
    const events=slip.update(dt,player);
    if(!slip.active){player.x+=speed*dt;player.vx=speed;}
    boy.group.position.set(player.x,player.y,0);boy.group.rotation.y=face*Math.PI/2;time+=dt;
    const pose=slip.state&&structuredClone(slip.state);
    if(pose&&zeroWobble)for(const joint of Object.keys(pose.wobble))pose.wobble[joint]=0;
    boy.animate({time,dt,travel:slip.active?0:Math.abs(speed)*dt,speed:slip.active?0:speed,acceleration,grounded:player.grounded,wake:1,push:false,vy:0,landImpact:0,jumpPrep:0,airTime:0,takeoff:1,climb:null,ladder:null,slip:pose});
    boy.group.updateWorldMatrix(true,true);
    const points=names.map(name=>object(name).getWorldPosition(new THREE.Vector3()));
    for(const point of points)assert([point.x,point.y,point.z].every(Number.isFinite),'The slip must keep rendered body positions finite.');
    return {events,points,phase:slip.state?.phase,pose:slip.state&&structuredClone(slip.state),state:structuredClone(boy.group.userData.animation)};
  }
  function settle(frames=120){let frame;for(let n=0;n<frames;n++)frame=step();return frame;}
  function enter() {
    settle();let speed=0,frame;
    const entry=face===1?puddle.x+.08:puddle.x+puddle.w-.08;
    for(let n=0;n<400&&(entry-player.x)*face>0;n++) {
      const next=movementVelocity(speed,face,false,true,dt);
      frame=step({speed:next,acceleration:(next-speed)/dt});speed=next;
    }
    assert(slip.tryStart(player),'The fixture must enter the real puddle from a grounded walking stride.');
    return frame;
  }
  function transforms() {
    const values=[];
    boy.group.traverse(part=>{if(part!==boy.group)values.push(...part.position.toArray(),...part.quaternion.toArray(),...part.scale.toArray());});
    return values;
  }
  function restart() {
    slip.reset();boy.reset();time=0;
    Object.assign(player,{x:initialX,y:puddle.y,vx:0,vy:0,grounded:true,face});
    boy.group.position.set(initialX,puddle.y,0);boy.group.rotation.y=face*Math.PI/2;
  }
  function dispose() {
    const geometries=new Set(),materials=new Set();
    boy.group.traverse(part=>{if(part.geometry)geometries.add(part.geometry);if(part.material)for(const material of [part.material].flat())materials.add(material);});
    geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());
  }
  return {boy,slip,player,object,step,settle,enter,transforms,restart,dispose};
}

function assertSolidClearance(r,phase) {
  const point=new THREE.Vector3();
  r.boy.group.traverse(part=>{
    if(!part.isMesh)return;
    const vertices=part.geometry.getAttribute('position');
    for(let index=0;index<vertices.count;index++) {
      point.fromBufferAttribute(vertices,index);part.localToWorld(point);
      assert(point.y>=puddle.y-.012,`A rendered mesh penetrates the roof by ${(puddle.y-point.y).toFixed(3)}m during ${phase}.`);
      if(point.y<.838) {
        assert(!(point.x>6.212&&point.x<7.788),'The fall cannot pass through the preceding vent.');
        assert(!(point.x>12.462&&point.x<13.538),'The fall cannot pass through the crate ahead.');
      }
    }
  });
}

test('the child visibly loses balance and falls backward in either travel direction with continuous solid poses',()=>{
  for(const face of [-1,1]) {
    const r=rig(face);
    try {
      const standing=r.enter();
      let previous=standing.points,maxStep=0,lowestHead=standing.points[5].y,furthestBack=0,lossOfBalance=0;
      const phases=new Set();
      for(let frame=0;frame<900&&r.slip.active;frame++) {
        const state=r.step();if(state.phase)phases.add(state.phase);
        maxStep=Math.max(maxStep,biggestChange(previous,state.points));previous=state.points;
        const backward=(state.points[5].x-state.points[4].x)*face;
        if(state.phase==='slip')lossOfBalance=Math.min(lossOfBalance,backward);
        if(state.phase==='fall'||state.phase==='ragdoll') {
          lowestHead=Math.min(lowestHead,state.points[5].y);furthestBack=Math.min(furthestBack,backward);
        }
        if(state.phase) {
          assert.equal(state.state.mode,'slip');assert.equal(typeof state.state.slipStage,'string');assert.notEqual(state.state.slipStage,'none');
          if(frame%6===0)assertSolidClearance(r,state.phase);
        }
      }
      assert(phases.has('slip')&&phases.has('fall')&&phases.has('ragdoll')&&phases.has('recover')&&phases.has('brush')&&phases.has('look'));
      assert(lossOfBalance<-.045,'The upper body should visibly tip back before the child hits the roof.');
      assert(standing.points[5].y-lowestHead>.65,'The child must actually fall down rather than continue standing with a recoil pose.');
      assert(furthestBack<-.3,'The visible fall must be backward relative to travel, rather than reuse the face-down waking pose.');
      for(let frame=0;frame<120;frame++) {
        const state=r.step();maxStep=Math.max(maxStep,biggestChange(previous,state.points));previous=state.points;
      }
      assert(maxStep<.09,`A slip transition snaps a rendered marker by ${maxStep.toFixed(3)}m in one 1/120s frame.`);
    } finally {r.dispose();}
  }
});

test('physical recoil changes actual knees, arms and body joints, then settles before control returns',()=>{
  const physical=rig(1),quiet=rig(1,{zeroWobble:true});
  try {
    physical.enter();quiet.enter();
    const parts=r=>[
      r.object('leftKnee'),r.object('rightKnee'),r.object('leftPalm').parent.parent,
      r.object('rightPalm').parent.parent,r.object('pelvis'),r.object('head')
    ];
    const actual=parts(physical),unperturbed=parts(quiet),peakAngles=Array(actual.length).fill(0);
    let peakMarkerDifference=0,lateDifference=0,lateSamples=0;
    while(physical.slip.active) {
      const a=physical.step(),b=quiet.step();
      const markerDifference=biggestChange(a.points,b.points);
      if(a.pose&&a.pose.elapsed>.8&&a.pose.elapsed<1.8) {
        peakMarkerDifference=Math.max(peakMarkerDifference,markerDifference);
        actual.forEach((part,index)=>peakAngles[index]=Math.max(peakAngles[index],part.quaternion.angleTo(unperturbed[index].quaternion)));
      }
      if(a.phase==='brush'||a.phase==='settle'){lateDifference=Math.max(lateDifference,markerDifference);lateSamples++;}
    }
    assert(peakAngles.filter(angle=>angle>.025).length>=3,'Joint spring channels must deform several actual limbs/body joints instead of only moving a rigid character.');
    assert(peakMarkerDifference>.015,'The light recoil must have a visible effect on the rendered body.');
    assert(lateSamples>100&&lateDifference<peakMarkerDifference*.2,'The loose impact response must decay before brushing and return of control.');
  } finally {physical.dispose();quiet.dispose();}
});

test('getting up uses sustained real palm support while the pelvis and head rise',()=>{
  const r=rig();
  try {
    r.enter();
    const starts=[null,null],lengths=[0,0],riseStarts=[null,null];
    let maxDrift=0,pelvisRise=0,headRise=0,longSupport=0;
    while(r.slip.active) {
      const frame=r.step();if(frame.phase!=='recover')continue;
      frame.state.hands.forEach((hand,index)=>{
        const palm=frame.points[index];
        assert(distance(hand.position,palm)<1e-6,'Recovery diagnostics must observe the rendered skin contact.');
        if(hand.contactWeight>.98) {
          assert(Math.abs(palm.y-puddle.y)<.015,'A loaded recovery palm must touch the actual roof.');
          if(!starts[index]){starts[index]=palm.clone();riseStarts[index]={pelvis:frame.points[4].y,head:frame.points[5].y};}
          lengths[index]++;maxDrift=Math.max(maxDrift,distance(palm,starts[index]));
          pelvisRise=Math.max(pelvisRise,frame.points[4].y-riseStarts[index].pelvis);
          headRise=Math.max(headRise,frame.points[5].y-riseStarts[index].head);
        } else {
          if(lengths[index]>=15)longSupport++;lengths[index]=0;starts[index]=null;riseStarts[index]=null;
        }
      });
    }
    lengths.forEach(length=>{if(length>=15)longSupport++;});
    assert(longSupport>=1,'Getting up must include a sustained supporting palm rather than a brief hand gesture.');
    assert(maxDrift<.03,`A supporting palm drifts ${maxDrift.toFixed(3)}m while the child gets up.`);
    assert(pelvisRise>.07&&headRise>.15,'The body must visibly rise around its grounded hand support before standing.');
  } finally {r.dispose();}
});

test('after standing the palms visibly brush the jacket and the head turns to look behind',()=>{
  const r=rig();
  try {
    r.enter();
    const previous=[null,null],paths=[0,0],touchSamples=[0,0];
    let minLookForward=1,lookSamples=0,lastFrame;
    while(r.slip.active) {
      const frame=r.step();lastFrame=frame;
      if(frame.phase==='brush') {
        frame.points.slice(0,2).forEach((palm,index)=>{
          const local=r.object('pelvis').worldToLocal(palm.clone());
          const byJacket=Math.abs(local.x)<.31&&local.y>.05&&local.y<.51&&local.z>.065&&local.z<.29;
          if(byJacket) {
            touchSamples[index]++;
            if(previous[index])paths[index]+=distance(previous[index],local);
            previous[index]=local.clone();
          } else previous[index]=null;
        });
      }
      if(frame.phase==='look') {
        const forward=new THREE.Vector3(0,0,1).applyQuaternion(r.object('head').getWorldQuaternion(new THREE.Quaternion()));
        minLookForward=Math.min(minLookForward,forward.x*r.player.face);lookSamples++;
      }
    }
    assert(touchSamples.some((samples,index)=>samples>=15&&paths[index]>.12),'Brushing must move a real palm across the jacket, rather than simply raise an arm nearby.');
    assert(lookSamples>40&&minLookForward<.1,'The head and torso must actually turn toward the space behind the child.');
    lastFrame=r.settle();
    const forward=new THREE.Vector3(0,0,1).applyQuaternion(r.object('head').getWorldQuaternion(new THREE.Quaternion()));
    assert(forward.x*r.player.face>.8,'After the glance, the child should face along the route again.');
    assert.equal(lastFrame.state.mode,'idle');assert.equal(lastFrame.state.slipStage,'none');
    for(const sole of lastFrame.points.slice(2,4))assert(Math.abs(sole.y-puddle.y)<.015,'The finished sequence must return both actual shoes to the roof.');
  } finally {r.dispose();}
});

test('reset during a fall or recovery removes slip contacts and reproduces a fresh grounded pose',()=>{
  const r=rig();
  try {
    function resetPose(){r.restart();const frame=r.settle();return {state:frame.state,transforms:r.transforms()};}
    const reference=resetPose();
    for(const interruptedAt of [1.15,2.65,4.1]) {
      r.enter();for(let frame=0;frame<Math.round(interruptedAt/dt);frame++)r.step();
      assert.equal(r.boy.group.userData.animation.mode,'slip');
      const actual=resetPose();assert.equal(actual.state.mode,'idle');assert.equal(actual.state.slipStage,'none');
      assert(actual.state.hands.every(hand=>hand.contactWeight===0),'A reset cannot retain a supporting floor palm or jacket grip.');
      assert.equal(actual.transforms.length,reference.transforms.length);
      actual.transforms.forEach((value,index)=>assert(Math.abs(value-reference.transforms[index])<1e-7,'Reset retained old fall rotations or recovery state.'));
    }
  } finally {r.dispose();}
});

test('the finished glance releases three-dimensional arm twists back to the normal idle silhouette',()=>{
  const r=rig(),reference=rig();
  try {
    reference.settle(240);r.enter();while(r.slip.active)r.step();r.settle(240);
    for(const name of ['leftPalm','rightPalm']) {
      const actualPalm=r.object(name),expectedPalm=reference.object(name);
      for(const [actual,expected] of [[actualPalm,expectedPalm],[actualPalm.parent.parent,expectedPalm.parent.parent]]) {
        const a=r.boy.group.worldToLocal(actual.getWorldPosition(new THREE.Vector3()));
        const b=reference.boy.group.worldToLocal(expected.getWorldPosition(new THREE.Vector3()));
        assert(distance(a,b)<.02,`${name} or its elbow retains the fall's sideways twist after returning to idle.`);
      }
    }
    assert.equal(r.boy.group.userData.animation.slipStage,'none');
  } finally {r.dispose();reference.dispose();}
});
