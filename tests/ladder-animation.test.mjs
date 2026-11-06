import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBoy} from '../src/character.js';
import {createLadder} from '../src/ladder.js';
import {LEVEL} from '../src/level.js';
import {movementVelocity} from '../src/movement.js';

const config=LEVEL.ladder,dt=1/120;
const markerNames=['leftPalm','rightPalm','leftSole','rightSole','pelvis','head'];
const separation=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const greatestMotion=(a,b)=>Math.max(...a.map((point,index)=>separation(point,b[index])));
const smooth=value=>{const p=Math.max(0,Math.min(1,value));return p*p*(3-2*p);};

function assertRoofClearance(group) {
  const point=new THREE.Vector3();
  group.traverse(object=>{
    if(!object.isMesh)return;
    const vertices=object.geometry.getAttribute('position');
    for(let index=0;index<vertices.count;index++) {
      point.fromBufferAttribute(vertices,index);object.localToWorld(point);
      assert(!(point.x>config.wallX+.012&&point.y<config.topY-.012),`Rendered body enters the raised roof solid at x=${point.x.toFixed(3)}, y=${point.y.toFixed(3)}.`);
    }
  });
}

function rig() {
  const boy=createBoy(THREE),ladder=createLadder();
  const player={x:config.x-.2,y:config.bottomY,vx:0,vy:0,grounded:true,face:1};
  let time=0;
  boy.group.rotation.y=Math.PI/2;
  function step(input={},advance=true,motion={}) {
    const event=advance?ladder.update(dt,input,player):undefined;
    const speed=ladder.active?0:motion.speed??0;
    player.vx=speed;
    player.x+=speed*dt;
    time+=dt;
    boy.group.position.set(player.x,player.y,0);
    if(ladder.active) {
      const state=ladder.state;
      const turn=state.phase==='mount'||state.phase==='top-in'?smooth(state.progress/.22):1;
      boy.group.rotation.y=THREE.MathUtils.lerp(state.turnStart??Math.PI/2,Math.PI/2,turn);
    }
    boy.animate({time,dt,travel:Math.abs(speed)*dt,speed,grounded:ladder.active||player.grounded,wake:1,push:false,vy:0,acceleration:motion.acceleration??0,landImpact:0,jumpPrep:0,airTime:0,takeoff:1,climb:null,ladder:ladder.state});
    boy.group.updateWorldMatrix(true,true);
    const points=markerNames.map(name=>{
      const marker=boy.group.getObjectByName(name);
      assert(marker,`${name} must observe the rendered body or contact surface.`);
      return marker.getWorldPosition(new THREE.Vector3());
    });
    for(const point of points)assert([point.x,point.y,point.z].every(Number.isFinite),'Climbing must preserve finite rendered limb positions.');
    return {event,points,state:structuredClone(boy.group.userData.animation),phase:ladder.state?.phase};
  }
  function settle(frames=120){let frame;for(let n=0;n<frames;n++)frame=step({},false);return frame;}
  function begin(entry='bottom') {
    assert(ladder.begin(player,entry),'The animation fixture must begin at a valid real ladder entry.');
    ladder.state.turnStart=boy.group.rotation.y;
  }
  function mount() {
    begin();let frame;
    for(let n=0;n<180&&ladder.state?.phase!=='climb';n++)frame=step();
    assert.equal(ladder.state?.phase,'climb');return frame;
  }
  function dispose() {
    const geometries=new Set(),materials=new Set();
    boy.group.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)for(const material of [object.material].flat())materials.add(material);});
    geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());
  }
  return {boy,ladder,player,step,settle,begin,mount,dispose};
}

// These are skin/sole markers on the rendered meshes, rather than IK targets:
// a correct target alone cannot reveal a wrong shoulder or ankle transform.
test('climbing alternates real limb contacts on physical rungs without sliding supporting grips',()=>{
  const r=rig();
  try {
    r.settle();r.mount();
    const starts=Array(4).fill(null),lengths=Array(4).fill(0),longContacts=Array(4).fill(0);
    const loaded=Array(4).fill(0),swings=Array(4).fill(0),first=Array(4).fill(null),last=Array(4).fill(null);
    let samples=0,maxDrift=0;
    for(let n=0;n<900&&r.player.y<config.topY-.61;n++) {
      const frame=r.step({up:true});
      assert.equal(frame.state.mode,'ladder','Attached motion must use the ladder rig.');
      if(frame.phase!=='climb'||r.player.y<1.3)continue;
      samples++;
      const contacts=[...frame.state.hands,...frame.state.feet];
      contacts.forEach((contact,index)=>{
        const point=frame.points[index];
        assert(separation(contact.position,point)<1e-6,'Contact diagnostics must match actual rendered contact markers.');
        first[index]??=point.clone();last[index]=point.clone();
        if(contact.contactWeight>.98) {
          loaded[index]++;
          const rung=Math.round((point.y-config.rungBaseY)/config.spacing);
          const rungY=config.rungBaseY+rung*config.spacing;
          assert(rung>=0&&rungY<config.topY,'Loaded limbs cannot grip an imaginary rung outside the real ladder.');
          assert(Math.abs(point.y-rungY)<.04,`Supporting ${markerNames[index]} misses the real rung height by ${(point.y-rungY).toFixed(3)}m.`);
          assert(Math.abs(point.x-config.rungX)<.04,`Supporting ${markerNames[index]} floats ${Math.abs(point.x-config.rungX).toFixed(3)}m away from the rung.`);
          assert(Math.abs(point.z)<config.width/2+.025,'A loaded contact must stay within the width of the actual rung.');
          if(!starts[index])starts[index]=point.clone();
          lengths[index]++;
          maxDrift=Math.max(maxDrift,separation(point,starts[index]));
        } else {
          if(lengths[index]>=10)longContacts[index]++;
          starts[index]=null;lengths[index]=0;
          if(contact.contactWeight<.1)swings[index]++;
        }
      });
    }
    assert(samples>150,'The fixture must climb far enough to exercise several real hand and foot transfers.');
    for(let index=0;index<4;index++) {
      if(lengths[index]>=10)longContacts[index]++;
      assert(loaded[index]>20&&swings[index]>10,`${markerNames[index]} must both support weight and transfer to another rung.`);
      assert(longContacts[index]>=1,`${markerNames[index]} never sustained a planted grip for 0.08 seconds.`);
      assert(last[index].y-first[index].y>.6,`${markerNames[index]} must advance to higher real rungs during ascent.`);
    }
    assert(maxDrift<.03,`A supporting hand or shoe drifted ${maxDrift.toFixed(3)}m across one loaded grip.`);
  } finally {r.dispose();}
});

test('releasing ladder input holds the actual hands and shoes on the same rungs',()=>{
  const r=rig();
  try {
    r.settle();r.mount();for(let n=0;n<240;n++)r.step({up:true});
    for(let n=0;n<120;n++)r.step();
    assert.equal(r.ladder.state?.phase,'climb');assert.equal(r.ladder.state.velocity,0);
    const stopped=r.step(),height=r.player.y;
    let maxMotion=0;
    for(let n=0;n<240;n++) {
      const frame=r.step();
      maxMotion=Math.max(maxMotion,greatestMotion(stopped.points.slice(0,4),frame.points.slice(0,4)));
      assert.equal(frame.state.mode,'ladder');
    }
    assert.equal(r.player.y,height,'The stop test must keep the root anchored at a fixed ladder height.');
    assert(maxMotion<.005,`Stopped limb contacts continue cycling or drifting by ${maxMotion.toFixed(3)}m.`);
  } finally {r.dispose();}
});

test('reversing the climb moves the limbs back down continuously without teleporting to another rung',()=>{
  const r=rig();
  try {
    r.settle();r.mount();let frame;
    for(let n=0;n<270;n++)frame=r.step({up:true});
    const high=frame.points.map(point=>point.clone()),rootHigh=r.player.y;
    let previous=frame.points,maxStep=0,sawDescending=false;
    for(let n=0;n<180;n++) {
      frame=r.step({down:true});
      maxStep=Math.max(maxStep,greatestMotion(previous,frame.points));previous=frame.points;
      assert.equal(frame.state.mode,'ladder');assert.equal(frame.phase,'climb');
      sawDescending||=r.ladder.state.velocity<-.4;
    }
    assert(sawDescending&&r.player.y<rootHigh-.6,'A reversed climb must descend rather than keep playing the upward cycle.');
    for(let index=0;index<4;index++)assert(high[index].y-frame.points[index].y>.3,`${markerNames[index]} did not descend to lower rungs.`);
    assert(maxStep<.085,`Changing direction snapped a visible contact by ${maxStep.toFixed(3)}m in one frame.`);
  } finally {r.dispose();}
});

test('mounting, topping out and descending hand off continuously to actual roof soles',()=>{
  const r=rig();
  try {
    let previous=r.settle().points,maxStep=0;
    const phases=new Set();r.begin();
    for(let n=0;n<1800&&r.ladder.active;n++) {
      const frame=r.step({up:true});if(frame.phase)phases.add(frame.phase);
      maxStep=Math.max(maxStep,greatestMotion(previous,frame.points));previous=frame.points;
      if(frame.phase==='top-out'&&n%8===0)assertRoofClearance(r.boy.group);
    }
    assert.equal(r.ladder.active,false,'The full ascent must finish on the real raised roof.');
    assert(phases.has('mount')&&phases.has('climb')&&phases.has('top-out'));
    let frame;
    for(let n=0;n<120;n++) {
      frame=r.step();maxStep=Math.max(maxStep,greatestMotion(previous,frame.points));previous=frame.points;
    }
    for(const sole of frame.points.slice(2,4))assert(Math.abs(sole.y-config.topY)<.02,'Top-out must finish with the actual shoes on the upper roof.');
    r.begin('top');
    for(let n=0;n<1800&&r.ladder.active;n++) {
      frame=r.step({down:true});if(frame.phase)phases.add(frame.phase);
      maxStep=Math.max(maxStep,greatestMotion(previous,frame.points));previous=frame.points;
      if(frame.phase==='top-in'&&n%8===0)assertRoofClearance(r.boy.group);
    }
    assert.equal(r.ladder.active,false,'The complete descent must release onto the lower landing.');
    assert(phases.has('top-in')&&phases.has('bottom-out'));
    for(let n=0;n<120;n++) {
      frame=r.step();maxStep=Math.max(maxStep,greatestMotion(previous,frame.points));previous=frame.points;
    }
    for(const sole of frame.points.slice(2,4))assert(Math.abs(sole.y-config.bottomY)<.02,'Bottom release must put the actual shoes on the lower landing.');
    assert(maxStep<.09,`A ladder entry, transfer or release teleported rendered geometry by ${maxStep.toFixed(3)}m in one frame.`);
  } finally {r.dispose();}
});

test('reset clears interrupted ladder contacts before a fresh grounded pose and new mount',()=>{
  const r=rig();
  try {
    r.settle();r.mount();for(let n=0;n<240;n++)r.step({up:true});
    assert.equal(r.boy.group.userData.animation.mode,'ladder');
    r.ladder.reset();r.boy.reset();
    Object.assign(r.player,{x:config.x-.2,y:config.bottomY,vx:0,vy:0,grounded:true,face:1});
    const idle=r.settle();
    assert.equal(idle.state.mode,'idle');
    assert(idle.state.hands.every(hand=>hand.contactWeight===0),'Reset must release old world-rung palm anchors.');
    for(const sole of idle.points.slice(2,4))assert(Math.abs(sole.y-config.bottomY)<.02,'An old ladder target cannot pull the reset shoes above the landing.');
    r.mount();for(let n=0;n<120;n++)r.step({up:true});
    assert.equal(r.boy.group.userData.animation.mode,'ladder');
    assert(r.player.y>config.rungBaseY+.5,'A fresh climb must proceed after an interrupted ladder reset.');
  } finally {r.dispose();}
});

test('the first walking strides after upper exit plant on the raised roof without old lower-roof anchors',()=>{
  const r=rig();
  try {
    r.settle();r.begin();let frame;
    for(let n=0;n<1800&&r.ladder.active;n++)frame=r.step({up:true});
    assert.equal(r.ladder.active,false);assert.equal(r.player.y,config.topY);
    let previous=frame.points,speed=0,maxStep=0,maxDrift=0,contacts=0;
    const starts=[null,null],lengths=[0,0],intervals=[0,0];
    const startX=r.player.x;
    // Walk immediately; an idle settling period could hide an old anchor by
    // letting the shoes ease back from the lower roof before this assertion.
    for(let n=0;n<360;n++) {
      const nextSpeed=movementVelocity(speed,1,false,true,dt);
      frame=r.step({},true,{speed:nextSpeed,acceleration:(nextSpeed-speed)/dt});speed=nextSpeed;
      maxStep=Math.max(maxStep,greatestMotion(previous,frame.points));previous=frame.points;
      frame.state.feet.forEach((foot,index)=>{
        const sole=frame.points[index+2];
        assert(sole.y>=config.topY-.015,'The first resumed stride cannot pull a shoe below the upper roof toward an old ladder entry anchor.');
        if(foot.stance&&foot.contactWeight>.98) {
          assert(Math.abs(sole.y-config.topY)<.015,`A resumed supporting sole floats ${(sole.y-config.topY).toFixed(3)}m above the upper roof.`);
          if(!starts[index])starts[index]=sole.clone();
          lengths[index]++;contacts++;
          maxDrift=Math.max(maxDrift,separation(sole,starts[index]));
        } else {
          if(lengths[index]>=10)intervals[index]++;
          starts[index]=null;lengths[index]=0;
        }
      });
    }
    lengths.forEach((length,index)=>{if(length>=10)intervals[index]++;});
    assert(r.player.x-startX>4,'The fixture must perform several real walking strides after leaving the ladder.');
    assert(contacts>80&&intervals.every(count=>count>=2),'Both shoes must establish several sustained upper-roof support intervals.');
    assert(maxDrift<.03,`A resumed planted shoe drifts ${maxDrift.toFixed(3)}m across the roof.`);
    assert(maxStep<.075,`Leaving the ladder for walking snaps a rendered limb by ${maxStep.toFixed(3)}m in one frame.`);
  } finally {r.dispose();}
});

test('top entry initially facing left turns continuously and clears the actual raised roof solid',()=>{
  const r=rig();
  try {
    Object.assign(r.player,{x:config.exitX,y:config.topY,face:-1});
    r.boy.group.rotation.y=-Math.PI/2;
    let previous=r.settle().points,maxStep=0,turnSamples=0,loadedSamples=0;
    r.begin('top');assert.equal(r.ladder.state.turnStart,-Math.PI/2);
    for(let n=0;n<360&&r.ladder.state?.phase!=='climb';n++) {
      const frame=r.step({down:true});
      maxStep=Math.max(maxStep,greatestMotion(previous,frame.points));previous=frame.points;
      if(frame.phase==='top-in'&&r.ladder.state.progress<.22) {
        turnSamples++;
        assert(r.boy.group.rotation.y>-Math.PI/2&&r.boy.group.rotation.y<Math.PI/2,'The initial turn must use intermediate orientations rather than switch facing instantly.');
      }
      if(frame.state.hands.some(hand=>hand.contactWeight>.98))loadedSamples++;
      assertRoofClearance(r.boy.group);
    }
    assert.equal(r.ladder.state?.phase,'climb','Turning from the upper roof must still reach a controllable ladder grip.');
    assert(turnSamples>20&&loadedSamples>10,'The fixture must cover both the partial-turn transition and actual supporting grips.');
    assert(Math.abs(r.boy.group.rotation.y-Math.PI/2)<1e-9,'The completed top entry must face the ladder.');
    assert(maxStep<.09,`The left-facing top entry teleports a visible limb by ${maxStep.toFixed(3)}m in one frame.`);
  } finally {r.dispose();}
});

test('the upper mantle transfers real ladder support into a planted roof foot before releasing the hands',()=>{
  const r=rig();
  try {
    r.settle();r.begin();
    const anchors=Array(4).fill(null);
    let samples=0,unsupportedTime=0,longestUnsupported=0,handFootOverlap=0,maxContactDrift=0;
    const onRung=point=>{
      const index=Math.round((point.y-config.rungBaseY)/config.spacing),y=config.rungBaseY+index*config.spacing;
      return index>=0&&y<config.topY&&Math.abs(point.x-config.rungX)<.04&&Math.abs(point.y-y)<.04;
    };
    const onLedge=point=>Math.abs(point.x-config.wallX)<.045&&Math.abs(point.y-config.topY)<.035;
    const onRoof=point=>point.x>=config.wallX+.02&&Math.abs(point.y-config.topY)<.02;
    // Independent physical surfaces from world.js: two straight steel rails
    // and their curved extensions, rather than authored animation targets.
    const grabPoints=[-config.width/2,config.width/2].flatMap(z=>new THREE.CatmullRomCurve3([
      [0,.45],[0,.66],[.06,.80],[.19,.85],[.38,.80],[.50,.65]
    ].map(([x,y])=>new THREE.Vector3(config.rungX+x,config.topY+y,z))).getPoints(90));
    const onHandrail=point=>{
      const railZ=Math.abs(Math.abs(point.z)-config.width/2);
      const onStraight=point.y>=config.bottomY&&point.y<=config.topY+.55&&Math.hypot(point.x-config.rungX,railZ)<.06;
      return onStraight||grabPoints.some(center=>separation(point,center)<.06);
    };
    for(let frame=0;frame<1800&&r.ladder.active;frame++) {
      const sample=r.step({up:true});if(sample.phase!=='top-out')continue;samples++;
      let supportingHand=false,supportingFoot=false;
      const contacts=[...sample.state.hands,...sample.state.feet];
      contacts.forEach((contact,index)=>{
        const point=sample.points[index],hand=index<2;
        if(contact.contactWeight>.6) {
          assert(hand?onRung(point)||onLedge(point)||onHandrail(point):onRung(point)||onRoof(point),`Loaded ${markerNames[index]} misses real support at progress ${r.ladder.state.progress.toFixed(3)}: (${point.x.toFixed(3)},${point.y.toFixed(3)},${point.z.toFixed(3)}).`);
          if(hand)supportingHand=true;else supportingFoot=true;
        }
        if(contact.contactWeight>.98) {
          if(!anchors[index])anchors[index]=point.clone();
          maxContactDrift=Math.max(maxContactDrift,separation(point,anchors[index]));
        } else anchors[index]=null;
      });
      const roofFoot=sample.points.slice(2,4).some(onRoof);
      if(supportingHand&&roofFoot)handFootOverlap++;
      // At the final idle blend the actual flat sole already rests on the
      // roof, even while the authored contact weight fades out.
      const supported=supportingHand||supportingFoot||(r.ladder.state.progress>.9&&roofFoot);
      if(supported)unsupportedTime=0;
      else{unsupportedTime+=dt;longestUnsupported=Math.max(longestUnsupported,unsupportedTime);}
    }
    assert(samples>150,'The fixture must cover a full deliberate upper mantle.');
    assert(handFootOverlap>=6,'A hand must keep real support until a foot has visibly reached the roof.');
    assert(longestUnsupported<.12,`The child floats without a supporting grip or planted foot for ${longestUnsupported.toFixed(3)}s.`);
    assert(maxContactDrift<.03,`An allegedly planted mantle contact slides ${maxContactDrift.toFixed(3)}m across its support.`);
  } finally {r.dispose();}
});

test('the free upper hand returns from the rail without a last-moment sweep at normal frame rate',()=>{
  const r=rig();
  try {
    r.settle();r.begin();let previous=null,samples=0,maxTravel=0;
    for(let frame=0;frame<1800&&r.ladder.active;frame++) {
      const sample=r.step({up:true});
      if(frame%2)continue; // Observe the rendered hand at 60 Hz.
      if(sample.phase==='top-out'&&r.ladder.state.progress>.82) {
        const palm=sample.points[0];
        if(previous){maxTravel=Math.max(maxTravel,separation(previous,palm));samples++;}
        previous=palm.clone();
      } else previous=null;
    }
    assert(samples>=12,'The check must include the complete release and balance beat.');
    assert(maxTravel<.09,`The released palm jumps ${maxTravel.toFixed(3)}m within one 60Hz frame instead of settling into the walking pose.`);
  } finally {r.dispose();}
});
