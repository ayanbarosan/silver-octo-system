import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBoy} from '../src/character.js';

const joints=['pelvis','head','leftKnee','rightKnee','leftAnkle','rightAnkle','leftPalm','rightPalm'];
const points=boy=>joints.map(name=>boy.group.getObjectByName(name).getWorldPosition(new THREE.Vector3()));
const transforms=boy=>{const a=[];boy.group.traverse(o=>a.push(...o.position.toArray(),...o.quaternion.toArray()));return a;};
function setup(startY=0){const boy=createBoy(THREE);boy.group.position.y=startY;return boy;}
function frame(boy,elapsed,{hz=120,startY=0,direction=1,colliders=[]}={}){
  return boy.animate({time:elapsed,dt:1/hz,grounded:true,story:{caught:{elapsed,startY,impactAt:.48,impactDirection:direction,colliders}}});
}
function forEachVertex(boy,visit){
  const p=new THREE.Vector3();boy.group.traverse(object=>{if(!object.isMesh)return;const a=object.geometry.attributes.position;for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(object.matrixWorld);visit(p,object);}});
}

test('the impact transfers momentum through the head, trunk and loose limbs in both directions',()=>{
  for(const direction of[-1,1]){
    const boy=setup();let previous=null,maxMotion=0,impact=0,headAtHit,pelvisAtHit,earlyHead,earlyPelvis;
    for(let n=0;n<=336;n++){
      const elapsed=n/120,result=frame(boy,elapsed,{direction}),p=points(boy);
      assert(transforms(boy).every(Number.isFinite));
      if(previous)p.forEach((v,i)=>maxMotion=Math.max(maxMotion,v.distanceTo(previous[i])));previous=p;
      if(n===58){pelvisAtHit=p[0].clone();headAtHit=p[1].clone();}
      if(n===76){earlyPelvis=p[0].clone();earlyHead=p[1].clone();}
      if(result.bodyImpact){impact++;assert(elapsed>.65);assert(result.bodyImpact>.25);assert(Math.abs(result.bodyImpactPosition.y)<.02);}
    }
    const p=points(boy);
    assert((earlyHead.z-headAtHit.z)*direction>(earlyPelvis.z-pelvisAtHit.z)*direction+.035,'The struck head must react before the heavy pelvis.');
    assert(p[0].z*direction>.35,'The body must carry weight away from the strike.');
    assert(p[1].y<.6,'The head must finish close to the floor.');
    assert.equal(impact,1,'Only the first substantial body contact emits the floor thud.');
    assert(maxMotion<.12,`A ragdoll joint jumps ${maxMotion.toFixed(3)}m in one 120 Hz frame.`);
  }
});

test('the rendered hair, canvas bag, jacket and boots clear the floor, including airborne catches',()=>{
  for(const direction of[-1,1])for(const startY of[0,.8,1.05]){
    const boy=setup(startY);let minY=Infinity;
    for(let n=0;n<=336;n++){
      frame(boy,n/120,{direction,startY});
      if(n>90&&n%4===0)forEachVertex(boy,p=>{minY=Math.min(minY,p.y);});
    }
    assert(minY>-.025,`A rendered vertex sinks ${(-minY).toFixed(3)}m through the floor (direction ${direction}, root ${startY}).`);
    assert(points(boy)[1].y<.6,'An airborne catch must actually reach the floor, rather than hover at the original root height.');
  }
});

test('loose hands stay outside the jacket and knees retain a forward hinge',()=>{
  for(const direction of[-1,1]){
    const boy=setup(),trunkAxis=new THREE.Vector3(),relative=new THREE.Vector3(),closest=new THREE.Vector3();let minPalm=Infinity,minBend=Infinity;
    for(let n=0;n<=336;n++){
      frame(boy,n/120,{direction});if(n<100)continue;
      const pelvis=boy.group.getObjectByName('pelvis'),hip=pelvis.getWorldPosition(new THREE.Vector3()),neck=new THREE.Vector3(0,.53,.011).applyMatrix4(pelvis.matrixWorld);
      trunkAxis.copy(neck).sub(hip);
      for(const side of['left','right']){
        const palm=boy.group.getObjectByName(side+'Palm').getWorldPosition(new THREE.Vector3());
        const u=THREE.MathUtils.clamp(relative.copy(palm).sub(hip).dot(trunkAxis)/trunkAxis.lengthSq(),0,1);
        closest.copy(hip).addScaledVector(trunkAxis,u);minPalm=Math.min(minPalm,palm.distanceTo(closest));
        const h=boy.group.getObjectByName(side+'Hip').getWorldPosition(new THREE.Vector3()),k=boy.group.getObjectByName(side+'Knee').getWorldPosition(new THREE.Vector3()),a=boy.group.getObjectByName(side+'Ankle').getWorldPosition(new THREE.Vector3());
        const limb=a.sub(h).normalize(),forward=new THREE.Vector3(0,0,1).applyQuaternion(pelvis.quaternion);forward.addScaledVector(limb,-forward.dot(limb)).normalize();
        closest.copy(h).addScaledVector(limb,relative.copy(k).sub(h).dot(limb));minBend=Math.min(minBend,relative.copy(k).sub(closest).dot(forward));
      }
    }
    assert(minPalm>.20,`A palm enters the trunk (${minPalm.toFixed(3)}m from its axis).`);
    assert(minBend>-.025,`A knee bends behind its hinge (${minBend.toFixed(3)}m).`);
  }
});

test('the rendered hands and forearms cannot poke through the solid backpack body',()=>{
  for(const direction of[-1,1]){
    const boy=setup(),bag=boy.group.getObjectByName('backpack'),p=new THREE.Vector3(),inverse=new THREE.Matrix4();let penetration=0;
    // This box lies inside the rounded canvas shell. Checking actual limb
    // vertices catches a visible hand-through-bag defect that joint targets
    // outside the torso alone cannot detect.
    const min={x:-.13,y:-.18,z:-.118},max={x:.13,y:.18,z:.035};
    for(let n=0;n<=336;n++){
      frame(boy,n/120,{direction});if(n<90||n%3)continue;
      inverse.copy(bag.matrixWorld).invert();
      for(const side of['left','right'])boy.group.getObjectByName(side+'Palm').parent.parent.traverse(object=>{
        if(!object.isMesh)return;const a=object.geometry.attributes.position;
        for(let i=0;i<a.count;i++){
          p.fromBufferAttribute(a,i).applyMatrix4(object.matrixWorld).applyMatrix4(inverse);
          if(p.x>min.x&&p.x<max.x&&p.y>min.y&&p.y<max.y&&p.z>min.z&&p.z<max.z)penetration=Math.max(penetration,Math.min(p.x-min.x,max.x-p.x,p.y-min.y,max.y-p.y,p.z-min.z,max.z-p.z));
        }
      });
    }
    assert(penetration<.004,`A rendered hand/forearm enters the canvas bag by ${penetration.toFixed(3)}m.`);
  }
});

test('a nearby nightstand blocks the actual falling body instead of letting it tunnel through',()=>{
  const boy=setup(),box={min:{x:-.36,y:0,z:.42},max:{x:.36,y:.8,z:1.14}};let penetration=0;
  for(let n=0;n<=336;n++){
    frame(boy,n/120,{colliders:[box]});if(n<70||n%4)continue;
    forEachVertex(boy,p=>{
      if(p.x>box.min.x&&p.x<box.max.x&&p.y>0&&p.y<.8&&p.z>.42&&p.z<1.14)penetration=Math.max(penetration,Math.min(p.x+.36,.36-p.x,p.y,.8-p.y,p.z-.42,1.14-p.z));
    });
  }
  assert(penetration<.035,`A mesh penetrates the cabinet by ${penetration.toFixed(3)}m.`);
});

test('the same physical fall remains consistent at 30, 60 and 120 Hz',()=>{
  const results=[];
  for(const hz of[30,60,120]){
    const boy=setup();for(let n=0;n<=Math.round(2.8*hz);n++)frame(boy,n/hz,{hz});results.push(points(boy));
  }
  for(let i=0;i<2;i++)results[i].forEach((p,n)=>assert(p.distanceTo(results[2][n])<.015,'Display rate changes the settled body pose.'));
});

test('pause freezes every physical joint and reset discards all impact momentum',()=>{
  const boy=setup();for(let n=0;n<=145;n++)frame(boy,n/120);
  const before=transforms(boy);boy.animate({time:100,dt:0,story:{caught:{elapsed:2.7,startY:1}}});assert.deepEqual(transforms(boy),before);
  boy.reset();assert.equal(boy.group.userData.animation.ragdoll,null);assert.equal(boy.group.userData.animation.storyStage,'none');assert(points(boy)[1].y>1.2);
  for(let n=0;n<=336;n++)frame(boy,n/120,{direction:-1});assert(points(boy)[0].z<-.35,'A second catch must seed fresh momentum in its own direction.');
});
