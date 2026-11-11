import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBoy} from '../src/character.js';

const names=['leftPalm','rightPalm','leftSole','rightSole'];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

function rig(side) {
  const boy=createBoy(THREE);
  boy.group.position.x=side*1.17;
  boy.group.rotation.y=-side*Math.PI/2;
  boy.reset();
  let time=0,objectX=0;
  function step(kind=null,speed=0,dt=1/120,extra={}) {
    time+=dt;
    boy.group.position.x+=speed*dt;
    if(kind)objectX+=speed*dt;
    boy.animate({time,dt,speed,travel:Math.abs(speed)*dt,grounded:true,wake:1,
      interaction:kind?{kind,side,objectX,topY:1.05}:null,...extra});
    boy.group.updateWorldMatrix(true,true);
    return {state:structuredClone(boy.group.userData.animation),
      points:names.map(name=>boy.group.getObjectByName(name).getWorldPosition(new THREE.Vector3())),objectX};
  }
  function settle(kind=null,speed=0,frames=120) {let frame;for(let n=0;n<frames;n++)frame=step(kind,speed);return frame;}
  function transforms() {
    const values=[];
    boy.group.traverse(o=>values.push(...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()));
    return values;
  }
  function dispose() {
    const geometries=new Set(),materials=new Set();
    boy.group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const material of [o.material].flat())materials.add(material);});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
  }
  return {boy,step,settle,transforms,dispose};
}

for(const side of [-1,1])for(const kind of ['push','pull','hold']) {
  test(`${kind} on the ${side<0?'left':'right'} keeps real palms on the moving dumpster and planted feet on the pavement`,()=>{
    const r=rig(side);
    try {
      const speed=kind==='push'?-side*.7:kind==='pull'?side*.5:0;
      r.settle(kind,speed);
      let previous,contacts=0,swing=0,maxDrift=0;
      for(let n=0;n<360;n++) {
        const frame=r.step(kind,speed),{state,points,objectX}=frame;
        assert.equal(state.mode,kind);
        assert.equal(r.boy.group.rotation.y,-side*Math.PI/2,'Pulling must keep looking at the bin while moving backwards.');
        for(let i=0;i<2;i++) {
          const target={x:objectX+side*.965,y:.82,z:(i===0?-1:1)*side*.16};
          assert(distance(points[i],target)<.006,'The rendered palm must stay on its handle, including chest sway and breathing.');
          assert(distance(state.hands[i].position,points[i])<1e-7,'Hand diagnostics must observe the rendered palm.');
          assert(state.hands[i].contactWeight>.98,'A reachable held handle must have actual supporting contact.');
          const foot=state.feet[i],sole=points[i+2];
          assert(distance(foot.position,sole)<1e-7);
          if(foot.stance&&foot.contactWeight>.98) {
            contacts++;
            assert(Math.abs(sole.y)<.015,'A supporting shoe must rest on the pavement.');
            if(previous?.state.feet[i].stance&&previous.state.feet[i].contactWeight>.98)
              maxDrift=Math.max(maxDrift,distance(sole,previous.points[i+2]));
          } else if(!foot.stance&&sole.y>.025)swing++;
        }
        previous=frame;
      }
      assert(contacts>150,'The sequence must include sustained weight-bearing foot plants.');
      assert(maxDrift<.012,`A planted shoe slid ${maxDrift.toFixed(4)}m in one frame.`);
      if(kind!=='hold')assert(swing>40,'Both pushing and backwards pulling need a real recovery step.');
      const lean=r.boy.group.getObjectByName('pelvis').rotation.x;
      if(kind==='push')assert(lean>.14,'Pushing should carry weight into the bin.');
      if(kind==='pull')assert(lean<-.10,'Pulling should brace backwards, with bent knees.');
    } finally {r.dispose();}
  });
}

test('gripping, reversing and releasing blend the actual hands without a contact snap',()=>{
  for(const side of [-1,1]) {
    const r=rig(side);
    try {
      let previous=r.settle(),maxStep=0;
      const phases=[['hold',0,60],['push',-side*.7,180],['pull',side*.5,180],['hold',0,90],[null,0,180]];
      for(const [kind,speed,frames] of phases)for(let n=0;n<frames;n++) {
        const frame=r.step(kind,speed);
        frame.points.slice(0,2).forEach((p,i)=>maxStep=Math.max(maxStep,distance(p,previous.points[i])));
        assert(r.transforms().every(Number.isFinite),'Reversing or releasing a grip must keep every joint finite.');
        previous=frame;
      }
      assert(maxStep<.035,`A hand teleported ${maxStep.toFixed(4)}m in a 1/120s frame.`);
      assert.equal(previous.state.mode,'idle');
      assert(previous.state.hands.every(hand=>hand.contactWeight===0),'Released hands must stop reporting support.');
    } finally {r.dispose();}
  }
});

test('a stationary grip stops the gait and zero-delta pause freezes the complete pose',()=>{
  const r=rig(-1);
  try {
    r.settle('pull',-.5,180);
    const before=r.settle('hold',0,180),after=r.settle('hold',0,180);
    assert.equal(before.state.phase,after.state.phase,'Holding still must not continue the backwards walk cycle.');
    for(let i=2;i<4;i++)assert(distance(before.points[i],after.points[i])<.005,'Holding must not skate the resting shoes.');
    const pose=r.transforms(),diagnostics=structuredClone(after.state);
    const paused=r.step('push',0,0,{interaction:{kind:'push',side:1,objectX:30,topY:2}});
    assert.deepEqual(r.transforms(),pose,'Paused input must not advance the grip or joints.');
    assert.deepEqual(paused.state,diagnostics,'Paused contact diagnostics must match the frozen pose.');
  } finally {r.dispose();}
});

test('an unreachable grip does not claim contact and resetting clears an interrupted grip',()=>{
  const r=rig(1);
  try {
    r.settle('hold');
    const unreachable=r.step('hold',0,1/120,{interaction:{kind:'hold',side:1,objectX:-10,topY:1.05}});
    assert(unreachable.state.hands.every(hand=>hand.contactWeight===0),'Arm extension alone cannot report a real grip.');
    r.boy.reset();
    const reset=r.settle();
    assert.equal(reset.state.mode,'idle');
    assert(reset.state.hands.every(hand=>hand.contactWeight===0));
    // The original boolean input remains valid for the rooftop crate.
    let old;
    for(let n=0;n<120;n++)old=r.step(null,1.05,1/120,{push:true});
    assert.equal(old.state.mode,'push');
    assert(old.state.hands.every(hand=>hand.contactWeight===0),'Legacy pushing must not inherit a street handle.');
    assert(r.transforms().every(Number.isFinite));
  } finally {r.dispose();}
});
