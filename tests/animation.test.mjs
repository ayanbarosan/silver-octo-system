import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBoy} from '../src/character.js';
import {MOVEMENT} from '../src/movement.js';

const flightDuration=2*MOVEMENT.jumpVelocity/MOVEMENT.gravity;
const flightVelocity=seconds=>MOVEMENT.jumpVelocity-MOVEMENT.gravity*seconds;
const flightHeight=seconds=>Math.max(0,MOVEMENT.jumpVelocity*seconds-.5*MOVEMENT.gravity*seconds*seconds);

function rig() {
  const boy=createBoy(THREE);
  assert.equal(typeof boy.reset,'function','The animation must be restartable.');
  boy.group.rotation.y=Math.PI/2;
  let time=0;
  function step(options={},dt=1/120) {
    const {speed=0,grounded=true,wake=1,push=false,vy=0,acceleration=0,landImpact=0,jumpPrep=0,airTime=0,takeoff=0,climb=null,launchSpeed,landingDistance}=options;
    const travel=options.travel??Math.abs(speed)*dt;
    time+=dt;
    boy.group.position.x+=Math.sign(speed)*travel;
    const result=boy.animate({time,dt,travel,speed,grounded,wake,push,vy,acceleration,landImpact,jumpPrep,airTime,takeoff,climb,launchSpeed,landingDistance});
    boy.group.updateWorldMatrix(true,true);
    const state=boy.group.userData.animation;
    assert(state&&Array.isArray(state.feet),'Animation should report actual foot contact states.');
    return {result,state:structuredClone(state),points:['leftSole','rightSole'].map(name=>{
      const marker=boy.group.getObjectByName(name);
      assert(marker,`${name} must track the rendered shoe.`);
      return marker.getWorldPosition(new THREE.Vector3());
    })};
  }
  function settle(seconds=1) {let frame;for(let n=0;n<seconds*120;n++)frame=step();return frame;}
  function transforms() {
    const values=[];
    boy.group.traverse(object=>{
      if(object!==boy.group)values.push(object.position.x,object.position.y,object.position.z,object.quaternion.x,object.quaternion.y,object.quaternion.z,object.quaternion.w,object.scale.x,object.scale.y,object.scale.z);
    });
    return values;
  }
  function dispose() {
    const geometries=new Set(),materials=new Set();
    boy.group.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)for(const material of [object.material].flat())materials.add(material);});
    geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());
  }
  return {boy,step,settle,transforms,dispose};
}

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

// These assertions inspect the rendered shoe markers. An IK target alone can be
// correct while an incorrectly rotated knee still moves the visible shoe.
test('walking plants the supporting shoe and clears the roof during swing',()=>{
  const r=rig();
  try {
    r.settle();
    for(let n=0;n<180;n++)r.step({speed:2.3});
    let previous,contacts=0,swingSamples=0,maxDrift=0,maxContactDrift=0,maxClearance=0,longContacts=0;
    const contactStarts=[null,null],contactFrames=[0,0];
    const stanceHeights=[];
    for(let n=0;n<720;n++) {
      const frame=r.step({speed:2.3});
      frame.state.feet.forEach((foot,index)=>{
        const point=frame.points[index];
        assert(distance(foot.position,point)<1e-6,'Foot diagnostics must match the rendered marker.');
        if(foot.stance&&foot.contactWeight>.98) {
          stanceHeights.push(point.y);
          assert(Math.abs(point.y)<.015,`Supporting sole floats or sinks relative to roof: y=${point.y.toFixed(4)}m.`);
          const before=previous?.state.feet[index];
          if(before?.stance&&before.contactWeight>.98) {
            maxDrift=Math.max(maxDrift,Math.abs(point.x-previous.points[index].x));
            maxContactDrift=Math.max(maxContactDrift,Math.abs(point.x-contactStarts[index].x));contacts++;contactFrames[index]++;
          } else {
            contactStarts[index]=point.clone();contactFrames[index]=1;
          }
        } else {
          if(contactFrames[index]>=10)longContacts++;contactFrames[index]=0;
          if(!foot.stance&&foot.contactWeight<.1){maxClearance=Math.max(maxClearance,point.y);swingSamples++;}
        }
      });
      previous=frame;
    }
    assert(contacts>80,'Several complete planted-foot intervals must execute.');
    assert(swingSamples>80,'Several swing phases must execute.');
    assert(longContacts>=6,'At least six planted intervals must each last more than 0.08s.');
    assert(maxDrift<.012,`Supporting shoe slid ${maxDrift.toFixed(4)}m in one frame.`);
    assert(maxContactDrift<.03,`Supporting shoe drifted ${maxContactDrift.toFixed(4)}m across a planted interval.`);
    const floor=stanceHeights.reduce((a,b)=>a+b,0)/stanceHeights.length;
    assert(maxClearance-floor>.035,`Swing clearance was only ${(maxClearance-floor).toFixed(4)}m.`);
  } finally {r.dispose();}
});

test('gait follows distance rather than continuing a walk cycle while stationary',()=>{
  const r=rig();
  try {
    r.settle();for(let n=0;n<240;n++)r.step({speed:2.3});
    let frame;
    // Settle the transition, then observe another two seconds at rest.
    for(let n=0;n<180;n++)frame=r.step();
    const phase=frame.state.phase,feet=frame.points;
    for(let n=0;n<240;n++)frame=r.step();
    const phaseError=Math.abs(frame.state.phase-phase);
    assert(phaseError<1e-6,'An idle character must not keep cycling its legs.');
    for(let i=0;i<2;i++)assert(distance(feet[i],frame.points[i])<.025,'Breathing should not slide the resting shoe.');
  } finally {r.dispose();}
});

test('the same walking distance gives the same stride at 30 and 120 fps',()=>{
  function sample(fps) {
    const r=rig();
    try {
      r.settle();let frame;
      for(let n=0;n<fps*4;n++)frame=r.step({speed:2.3},1/fps);
      return {phase:frame.state.phase,feet:frame.points.map(p=>p.clone())};
    } finally {r.dispose();}
  }
  const low=sample(30),high=sample(120);
  const phaseError=Math.abs(low.phase-high.phase);
  assert(phaseError<.03||Math.abs(phaseError-1)<.03,`Frame rate changed stride phase by ${phaseError.toFixed(4)}.`);
  for(let i=0;i<2;i++)assert(distance(low.feet[i],high.feet[i])<.055,'Frame rate changed the visible foot pose by more than 5.5cm.');
});

test('idle, walking, air, landing and pushing remain finite with continuous poses',()=>{
  const r=rig();
  try {
    r.settle();let previous=r.transforms(),maxPoseStep=0;
    const phases=[
      [100,{speed:2.3}],
      [24,{speed:2.3,grounded:false,vy:5.7}],
      [24,{speed:2.3,grounded:false,vy:-3}],
      [1,{speed:2.3,landImpact:1}],
      [65,{speed:2.3}],
      [90,{speed:1.05,push:true}],
      [120,{speed:0}],
    ];
    for(const [frames,options] of phases)for(let n=0;n<frames;n++){
      r.step(options);const next=r.transforms();
      assert(next.every(Number.isFinite),'Animation produced a NaN or infinite transform.');
      next.forEach((value,i)=>maxPoseStep=Math.max(maxPoseStep,Math.abs(value-previous[i])));
      previous=next;
    }
    assert(maxPoseStep<.2,`A visible transform snapped by ${maxPoseStep.toFixed(3)} in a 1/120s frame.`);
  } finally {r.dispose();}
});

test('restart clears old gait and landing state reproducibly',()=>{
  const r=rig();
  try {
    r.settle();for(let n=0;n<150;n++)r.step({speed:3.35});r.step({grounded:false,vy:4});r.step({landImpact:1});
    function restartedPose(){
      r.boy.reset();r.boy.group.position.set(0,0,0);r.boy.group.rotation.y=Math.PI/2;
      // Fixed input time makes breathing as reproducible as the leg pose.
      for(let n=0;n<120;n++)r.boy.animate({time:n/120,dt:1/120,travel:0,speed:0,grounded:true,wake:1,push:false,vy:0,acceleration:0,landImpact:0});
      r.boy.group.updateWorldMatrix(true,true);return r.transforms();
    }
    const first=restartedPose();for(let n=0;n<80;n++)r.step({speed:2.3,push:true});
    const second=restartedPose();assert.equal(first.length,second.length);
    first.forEach((value,i)=>assert(Math.abs(value-second[i])<1e-7,'Restart retained an old pose or spring velocity.'));
  } finally {r.dispose();}
});

function point(r,name) {
  const marker=r.boy.group.getObjectByName(name);
  assert(marker,`${name} must observe the rendered body or contact surface.`);
  return marker.getWorldPosition(new THREE.Vector3());
}

function visiblePose(r) {
  return ['leftSole','rightSole','leftPalm','rightPalm','pelvis','head'].map(name=>point(r,name));
}

const biggestPointChange=(before,after)=>Math.max(...before.map((p,i)=>distance(p,after[i])));

test('a stationary jump visibly changes through preparation, ascent, apex and descent',()=>{
  const r=rig();
  try {
    r.settle();
    const uprightHead=point(r,'head').y;
    let lowestHead=uprightHead,previous=visiblePose(r),largestStep=0;
    for(let n=1;n<=18;n++) {
      r.step({jumpPrep:n/18});
      lowestHead=Math.min(lowestHead,point(r,'head').y);
      const pose=visiblePose(r);largestStep=Math.max(largestStep,biggestPointChange(previous,pose));previous=pose;
    }
    assert(uprightHead-lowestHead>.035,'Preparation should visibly lower the child before takeoff.');
    const stages=new Set(),samples=[];
    for(let n=1;n<=100;n++) {
      const airTime=n/120,vy=flightVelocity(airTime);
      const frame=r.step({grounded:false,vy,airTime,takeoff:Math.min(1,airTime/.12)});
      assert.equal(typeof frame.state.jumpStage,'string','A jump must expose its current visual stage.');
      stages.add(frame.state.jumpStage);
      const pose=visiblePose(r);
      pose.forEach(p=>assert([p.x,p.y,p.z].every(Number.isFinite),'A jump produced invalid visible geometry.'));
      largestStep=Math.max(largestStep,biggestPointChange(previous,pose));previous=pose;
      // No root translation: these differences must come from the animated limbs.
      if([24,53,84].includes(n))samples.push(pose);
    }
    assert(stages.size>=3,'The pose must progress through at least three airborne stages.');
    assert(biggestPointChange(samples[0],samples[1])>.03,'Ascent and apex use an effectively frozen body pose.');
    assert(biggestPointChange(samples[1],samples[2])>.03,'Apex and descent use an effectively frozen body pose.');
    const finalAirPose=previous;
    for(let n=0;n<90;n++) {
      r.step({landImpact:n===0?1:0});
      const pose=visiblePose(r);largestStep=Math.max(largestStep,biggestPointChange(previous,pose));previous=pose;
    }
    assert(biggestPointChange(finalAirPose,previous)>.035,'The child must recover from the airborne pose after landing.');
    assert(largestStep<.1,`Jump/landing snapped visible geometry by ${largestStep.toFixed(3)}m in one 1/120s frame.`);
  } finally {r.dispose();}
});

test('getting up uses stable palm support while the body rises into an upright pose',()=>{
  const r=rig();
  try {
    r.boy.reset();let frame;
    for(let n=0;n<40;n++)frame=r.step({wake:0});
    const lyingHead=point(r,'head').y,lyingPelvis=point(r,'pelvis').y;
    let previous=visiblePose(r),previousTransforms=r.transforms(),largestStep=0,largestTransformStep=0;
    let supportSamples=0,longSupports=0,maxSupportDrift=0;
    let headAtSupportStart=Infinity,pelvisAtSupportStart=Infinity,highestSupportedHead=-Infinity,highestSupportedPelvis=-Infinity;
    const starts=[null,null],counts=[0,0],stages=new Set();
    for(let n=0;n<=408;n++) {
      frame=r.step({wake:n/408});
      assert.equal(typeof frame.state.wakeStage,'string','Getting up must expose its current visual stage.');
      stages.add(frame.state.wakeStage);
      const pose=visiblePose(r),transforms=r.transforms();
      assert(transforms.every(Number.isFinite),'Getting up produced invalid rig transforms.');
      largestStep=Math.max(largestStep,biggestPointChange(previous,pose));
      transforms.forEach((value,i)=>largestTransformStep=Math.max(largestTransformStep,Math.abs(value-previousTransforms[i])));
      previous=pose;previousTransforms=transforms;
      assert(Array.isArray(frame.state.hands)&&frame.state.hands.length===2,'Palm contacts must be observed for both actual hands.');
      frame.state.hands.forEach((hand,index)=>{
        const actual=point(r,index===0?'leftPalm':'rightPalm');
        assert(distance(hand.position,actual)<1e-6,'Hand diagnostics must match actual rendered palm markers.');
        if(hand.contactWeight>.98) {
          assert(Math.abs(actual.y)<.018,`A supporting palm floats or penetrates the roof: y=${actual.y.toFixed(3)}m.`);
          if(starts[index])maxSupportDrift=Math.max(maxSupportDrift,distance(starts[index],actual));
          else starts[index]=actual.clone();
          counts[index]++;supportSamples++;
          headAtSupportStart=Math.min(headAtSupportStart,point(r,'head').y);
          pelvisAtSupportStart=Math.min(pelvisAtSupportStart,point(r,'pelvis').y);
          highestSupportedHead=Math.max(highestSupportedHead,point(r,'head').y);
          highestSupportedPelvis=Math.max(highestSupportedPelvis,point(r,'pelvis').y);
        } else {
          if(counts[index]>=12)longSupports++;counts[index]=0;starts[index]=null;
        }
      });
    }
    for(let index=0;index<2;index++)if(counts[index]>=12)longSupports++;
    assert(stages.size>=4,'Getting up needs visibly distinct lying, supporting, kneeling and standing phases.');
    assert(supportSamples>35&&longSupports>=1,'A real palm-supported interval lasting at least0.1s must execute.');
    assert(maxSupportDrift<.03,`A supporting palm slid ${maxSupportDrift.toFixed(3)}m along the roof.`);
    assert(highestSupportedHead-headAtSupportStart>.1,'The head must rise while the hands support the body.');
    assert(highestSupportedPelvis-pelvisAtSupportStart>.065,'The pelvis must rise while the hands support the body.');
    for(let n=0;n<120;n++) {
      r.step({wake:1});const pose=visiblePose(r);
      largestStep=Math.max(largestStep,biggestPointChange(previous,pose));previous=pose;
    }
    assert(point(r,'head').y-lyingHead>.65,'The child does not rise from lying to a visibly upright head height.');
    assert(point(r,'pelvis').y-lyingPelvis>.25,'The pelvis does not reach an upright standing height.');
    assert(largestStep<.1,`Getting up snapped visible geometry by ${largestStep.toFixed(3)}m per frame.`);
    assert(largestTransformStep<.2,`Getting up snapped a local transform by ${largestTransformStep.toFixed(3)} per frame.`);
  } finally {r.dispose();}
});

test('restart after an unfinished get-up or airborne pose reproduces a fresh wake',()=>{
  const r=rig();
  try {
    function wakeAfterReset(){
      r.boy.reset();r.boy.group.position.set(0,0,0);r.boy.group.rotation.y=Math.PI/2;
      for(let n=0;n<140;n++)r.boy.animate({time:n/120,dt:1/120,travel:0,speed:0,grounded:true,wake:n/408,push:false,vy:0,acceleration:0,landImpact:0,jumpPrep:0,airTime:0,takeoff:0});
      r.boy.group.updateWorldMatrix(true,true);return r.transforms();
    }
    const first=wakeAfterReset();
    for(let n=0;n<60;n++)r.step({grounded:false,vy:flightVelocity(n/120),airTime:n/120,takeoff:Math.min(1,(n/120)/.12)});
    const afterAir=wakeAfterReset();
    for(let n=0;n<80;n++)r.step({wake:.55});
    const afterWake=wakeAfterReset();
    first.forEach((value,i)=>{
      assert(Math.abs(value-afterAir[i])<1e-7,'Airborne state leaked through reset into getting up.');
      assert(Math.abs(value-afterWake[i])<1e-7,'An interrupted wake leaked through reset into the next wake.');
    });
  } finally {r.dispose();}
});

test('solid body and clothing stay above the roof throughout grounded get-up poses',()=>{
  const r=rig();
  try {
    r.boy.reset();
    for(let n=0;n<40;n++)r.step({wake:0});
    let progress=0,totalVertices=0;
    const position=new THREE.Vector3();
    for(const sample of [0,.12,.25,.38,.402,.46,.6,.8,.95,1]) {
      while(progress<sample) {
        const next=Math.min(sample,progress+1/408);
        r.step({wake:next},(next-progress)*3.4);progress=next;
      }
      r.boy.group.updateWorldMatrix(true,true);
      let lowest=Infinity,lowestPart='unknown',lowestVertex=-1;
      // Inspect rendered surfaces, not just IK targets or sole/palm markers.
      // A correctly placed contact marker can hide a bent knee or thumb that
      // still passes through the roof.
      r.boy.group.traverse(object=>{
        if(!object.isMesh||!object.visible)return;
        const vertices=object.geometry.getAttribute('position');
        if(!vertices)return;
        for(let vertex=0;vertex<vertices.count;vertex++) {
          position.fromBufferAttribute(vertices,vertex).applyMatrix4(object.matrixWorld);
          assert(Number.isFinite(position.y),'A rendered get-up vertex became invalid.');
          if(position.y<lowest) {
            lowest=position.y;lowestVertex=vertex;
            lowestPart=`${object.parent?.name||object.name||object.geometry.type} (${object.material?.color?.getHexString()??'material'})`;
          }
          totalVertices++;
        }
      });
      assert(lowest>=-.012,`At wake=${sample}, ${lowestPart} vertex${lowestVertex} penetrates the roof by ${(-lowest).toFixed(4)}m.`);
    }
    assert(totalVertices>10000,'The contact regression must inspect real detailed body geometry.');
  } finally {r.dispose();}
});

test('climbing keeps real palms anchored on the ledge while the body rises and feet plant',async()=>{
  const {createClimb,sampleClimb}=await import('../src/climb.js');
  for(const face of [1,-1]) {
    const r=rig();
    try {
      const target={id:'test-vent',x:6.2,w:1.6,y:.85};
      const startX=face===1?5.99:8.01;
      const action=createClimb({x:startX,y:0,face,target});
      assert(action,'A reachable ledge must yield a continuous climb action.');
      r.boy.group.position.set(startX,0,0);r.boy.group.rotation.y=face*Math.PI/2;
      r.boy.reset();r.settle();
      let previous=visiblePose(r),largestStep=0,supportSamples=0,supportedIntervals=0,maxHandDrift=0;
      const anchors=[null,null],counts=[0,0],stages=new Set();
      let earliestSupportedPelvis=Infinity,highestSupportedPelvis=-Infinity;
      let lastFrame;
      const frames=Math.ceil(action.duration*120);
      for(let n=0;n<=frames;n++) {
        const progress=n/frames,path=sampleClimb(action,progress);
        assert([path.x,path.y].every(Number.isFinite),'The climb root path must remain finite.');
        r.boy.group.position.set(path.x,path.y,0);
        lastFrame=r.step({grounded:false,takeoff:1,climb:{...action,progress}},action.duration/frames);
        const pose=visiblePose(r);largestStep=Math.max(largestStep,biggestPointChange(previous,pose));previous=pose;
        assert.equal(typeof lastFrame.state.climbStage,'string','The climb must progress through visible body stages.');
        stages.add(lastFrame.state.climbStage);
        assert(r.transforms().every(Number.isFinite),'Climbing produced invalid body transforms.');
        lastFrame.state.hands.forEach((hand,index)=>{
          const actual=point(r,index===0?'leftPalm':'rightPalm');
          assert(distance(hand.position,actual)<1e-6,'Climb hand contacts must follow actual rendered palms.');
          if(hand.contactWeight>.98) {
            assert(Math.abs(actual.y-action.topY)<.025,`Climb palm is not on the ledge top: y=${actual.y.toFixed(3)}, top=${action.topY}.`);
            assert(Math.abs(actual.x-action.edgeX)<.18,'The child must grip the ledge edge rather than floating far inside or outside it.');
            if(anchors[index])maxHandDrift=Math.max(maxHandDrift,distance(anchors[index],actual));else anchors[index]=actual.clone();
            counts[index]++;supportSamples++;
            earliestSupportedPelvis=Math.min(earliestSupportedPelvis,point(r,'pelvis').y);
            highestSupportedPelvis=Math.max(highestSupportedPelvis,point(r,'pelvis').y);
          } else {
            if(counts[index]>=18)supportedIntervals++;
            counts[index]=0;anchors[index]=null;
          }
        });
      }
      for(let i=0;i<2;i++)if(counts[i]>=18)supportedIntervals++;
      assert(stages.size>=3,'Reaching, pulling and settling must use distinct climbing stages.');
      assert(supportSamples>50&&supportedIntervals>=2,'Both hands need sustained ledge-supported intervals, not a brief touch.');
      assert(maxHandDrift<.035,`A gripping hand slid ${maxHandDrift.toFixed(3)}m while supporting the climb.`);
      assert(highestSupportedPelvis-earliestSupportedPelvis>.25,'The pelvis must visibly rise while the hands support the body weight.');
      for(const name of ['leftSole','rightSole'])assert(Math.abs(point(r,name).y-action.topY)<.025,'The climb must finish with actual shoes on the upper roof.');
      const end=sampleClimb(action,1);r.boy.group.position.set(end.x,end.y,0);
      for(let n=0;n<80;n++) {
        r.step();const pose=visiblePose(r);largestStep=Math.max(largestStep,biggestPointChange(previous,pose));previous=pose;
      }
      assert(largestStep<.085,`Climbing or its endpoint snapped visible geometry by ${largestStep.toFixed(3)}m per frame.`);
      for(const name of ['leftSole','rightSole'])assert(Math.abs(point(r,name).y-action.topY)<.018,'The character must remain planted after climb control returns.');
    } finally {r.dispose();}
  }
});

test('reset clears an interrupted climb before the next wake or idle pose',async()=>{
  const {createClimb,sampleClimb}=await import('../src/climb.js');
  const r=rig();
  try {
    function resetPose(){
      r.boy.reset();r.boy.group.position.set(0,0,0);r.boy.group.rotation.y=Math.PI/2;
      for(let n=0;n<120;n++)r.boy.animate({time:n/120,dt:1/120,travel:0,speed:0,grounded:true,wake:1,push:false,vy:0,jumpPrep:0,airTime:0,takeoff:0,climb:null});
      r.boy.group.updateWorldMatrix(true,true);return r.transforms();
    }
    const initial=resetPose(),action=createClimb({x:5.99,y:0,face:1,target:{id:'test-vent',x:6.2,w:1.6,y:.85}});
    assert(action,'The reset regression needs a real reachable climb.');
    for(let n=0;n<=90;n++) {
      const progress=n/180,path=sampleClimb(action,progress);
      r.boy.group.position.set(path.x,path.y,0);
      r.step({grounded:false,climb:{...action,progress}},1/120);
    }
    assert.equal(typeof r.boy.group.userData.animation.climbStage,'string','The reset regression must enter the real climbing animation.');
    assert(r.boy.group.userData.animation.hands.some(hand=>hand.contactWeight>.98),'The interrupted climb must have an active grip anchor before reset.');
    const after=resetPose();assert.equal(initial.length,after.length);
    initial.forEach((value,i)=>assert(Math.abs(value-after[i])<1e-7,'A climb anchor, limb angle or spring leaked through reset.'));
    assert.equal(r.boy.group.userData.animation.hands.some(hand=>hand.contactWeight>.01),false,'Reset must release stale hand contacts.');
  } finally {r.dispose();}
});

test('the airborne body stays long with thighs down, trailing heels and a staggered landing reach',()=>{
  for(const speed of [0,MOVEMENT.walk,MOVEMENT.run]) {
    const r=rig();
    try {
      r.settle();
      const restLegLength=(point(r,'leftHip').y+point(r,'rightHip').y-point(r,'leftSole').y-point(r,'rightSole').y)/2;
      const thighLength=distance(point(r,'leftHip'),point(r,'leftKnee'));
      if(speed>0)walkToObservedLead(r,speed,0);
      let previous=relativeBodyPose(r),largestStep=0,coreSamples=0;
      let smallestSoleDrop=Infinity,smallestKneeDrop=Infinity,largestLandingStagger=0;
      let apexLeadDrop=0,apexSamples=0,lateLeadDrop=0,lastLegOrder=0,legOrderChanges=0;
      for(let n=1;n<Math.ceil(flightDuration*120);n++) {
        const airTime=n/120,progress=airTime/flightDuration;
        const frame=r.step({speed,grounded:false,vy:flightVelocity(airTime),airTime,takeoff:Math.min(1,airTime/.12),launchSpeed:n===1?speed:undefined});
        const pelvis=point(r,'pelvis'),head=point(r,'head');
        const soles=['leftSole','rightSole'].map(name=>point(r,name));
        const hips=['leftHip','rightHip'].map(name=>point(r,name));
        const knees=['leftKnee','rightKnee'].map(name=>point(r,name));
        const pose=relativeBodyPose(r);largestStep=Math.max(largestStep,biggestPointChange(previous,pose));previous=pose;
        if(progress>=.28&&progress<=.70) {
          coreSamples++;
          // These are proportions of the rendered rig, not authored IK targets.
          // A seated tuck has knees near hip height and both soles pulled up
          // beside the pelvis; the supplied reference retains hanging thighs.
          for(let leg=0;leg<2;leg++) {
            smallestSoleDrop=Math.min(smallestSoleDrop,pelvis.y-soles[leg].y);
            smallestKneeDrop=Math.min(smallestKneeDrop,hips[leg].y-knees[leg].y);
          }
          assert(Math.min(...soles.map(p=>p.x-pelvis.x))<-.035,'At least one heel should trail behind the pelvis through the quiet airborne arc.');
          assert(Math.abs(head.x-pelvis.x)<.32*(head.y-pelvis.y),'The reference jump keeps a long, mostly upright chest rather than a seated forward fold.');
        }
        const separation=soles[0].x-soles[1].x;
        if(progress>=.2&&progress<=.94&&Math.abs(separation)>.055) {
          const order=Math.sign(separation);
          if(lastLegOrder&&order!==lastLegOrder)legOrderChanges++;
          lastLegOrder=order;
        }
        const lead=frame.state.launchLead;
        assert(lead===0||lead===1,'Landing reach must follow an observed physical lead leg.');
        if(progress>=.48&&progress<=.52){apexLeadDrop+=pelvis.y-soles[lead].y;apexSamples++;}
        if(progress>=.58&&progress<=.90) {
          largestLandingStagger=Math.max(largestLandingStagger,soles[1-lead].y-soles[lead].y);
          lateLeadDrop=Math.max(lateLeadDrop,pelvis.y-soles[lead].y);
        }
      }
      assert(coreSamples>25,'A substantial central flight interval must be inspected.');
      assert(smallestSoleDrop>restLegLength*.58,`Both ankles pull too close to the pelvis in mid-flight: smallest drop ${smallestSoleDrop.toFixed(3)}m.`);
      assert(smallestKneeDrop>thighLength*.55,`A thigh rises into a seated position: smallest knee drop ${smallestKneeDrop.toFixed(3)}m.`);
      assert(legOrderChanges<=1,'The heels must not repeatedly trade places in a mid-air cycling motion.');
      assert(largestLandingStagger>.04,'One leg must reach for landing while the other heel remains bent behind it.');
      assert(apexSamples>0&&lateLeadDrop-apexLeadDrop/apexSamples>.025,'The landing leg should unfold after the quiet apex.');
      assert(largestStep<.09,`The reference-shaped jump snaps visible geometry by ${largestStep.toFixed(3)}m per frame.`);
    } finally {r.dispose();}
  }
});

function walkToObservedLead(r,speed,wanted) {
  let frame;
  for(let n=0;n<720;n++) {
    frame=r.step({speed});
    const separation=frame.points[wanted].x-frame.points[1-wanted].x;
    if(n>180&&separation>.18)return frame;
  }
  assert.fail('The locomotion fixture never produced the requested visible leading foot.');
}

function relativeBodyPose(r) {
  const pelvis=point(r,'pelvis');
  return visiblePose(r).map(p=>p.sub(pelvis));
}

test('jump takeoff follows the visible leading foot from alternating walking phases',()=>{
  const choices=[];
  for(const wanted of [0,1]) {
    const r=rig();
    try {
      r.settle();const before=walkToObservedLead(r,MOVEMENT.walk,wanted);
      assert(before.points[wanted].x-before.points[1-wanted].x>.18,'The two launches must start from different actual foot leads.');
      let frame;
      for(let n=1;n<=30;n++) {
        const airTime=n/120;
        frame=r.step({speed:n<2?MOVEMENT.walk:0,grounded:false,vy:flightVelocity(airTime),airTime,takeoff:Math.min(1,airTime/.12),launchSpeed:n===1?MOVEMENT.walk:undefined});
        assert.equal(frame.state.launchLead,wanted,'The chosen jump leg must follow the actual visible foot lead at takeoff.');
        assert(Math.abs(frame.state.launchSpeed-MOVEMENT.walk)<1e-6,'Air control must not overwrite the captured launch gait speed.');
      }
      const feet=['leftSole','rightSole'].map(name=>point(r,name));
      assert(feet[wanted].x-feet[1-wanted].x>.08,'The actual early airborne silhouette must reflect its chosen lead leg.');
      choices.push(frame.state.launchLead);
    } finally {r.dispose();}
  }
  assert.deepEqual(choices,[0,1],'Alternating takeoff phases must produce alternating visible jump leads.');
});

test('walking and sprinting jumps have distinct airborne silhouettes with smooth transitions',()=>{
  function capture(speed) {
    const r=rig();
    try {
      r.settle();walkToObservedLead(r,speed,0);
      let previous=relativeBodyPose(r),largestStep=0;
      const samples=[];
      for(let n=1;n<=90;n++) {
        const airTime=n/120;
        r.step({speed,grounded:false,vy:flightVelocity(airTime),airTime,takeoff:Math.min(1,airTime/.12),launchSpeed:n===1?speed:undefined});
        const pose=relativeBodyPose(r);
        largestStep=Math.max(largestStep,biggestPointChange(previous,pose));previous=pose;
        if([30,60,90].includes(n))samples.push(pose);
      }
      assert(largestStep<.09,`The speed${speed} takeoff snaps visible limbs by ${largestStep.toFixed(3)}m per frame.`);
      return samples;
    } finally {r.dispose();}
  }
  const walking=capture(MOVEMENT.walk),running=capture(MOVEMENT.run);
  let distinctSamples=0;
  walking.forEach((pose,index)=>{
    // Root movement is removed, so a faster trajectory alone cannot pass.
    if(biggestPointChange(pose,running[index])>.055)distinctSamples++;
  });
  assert(distinctSamples>=2,'Walking and sprinting must visibly differ in at least two airborne body silhouettes.');
});

test('landing reaches the roof and flows back into walking without foot snaps or stale air poses',()=>{
  const r=rig();
  try {
    r.settle();walkToObservedLead(r,MOVEMENT.walk,0);
    let previous=relativeBodyPose(r),largestStep=0;
    for(let n=1;n<Math.ceil(flightDuration*120);n++) {
      const airTime=n/120;
      r.boy.group.position.y=flightHeight(airTime);
      r.step({speed:MOVEMENT.walk,grounded:false,vy:flightVelocity(airTime),airTime,takeoff:Math.min(1,airTime/.12),launchSpeed:n===1?MOVEMENT.walk:undefined});
      const pose=relativeBodyPose(r);largestStep=Math.max(largestStep,biggestPointChange(previous,pose));previous=pose;
    }
    assert(Math.min(point(r,'leftSole').y,point(r,'rightSole').y)<.085,'A descending foot must reach toward the roof before touchdown.');
    r.boy.group.position.y=0;
    let footReachedFloor=false,contactSamples=0,steps=0,lastFrame;
    const anchors=[null,null];let largestContactDrift=0;
    for(let n=0;n<120;n++) {
      lastFrame=r.step({speed:MOVEMENT.walk,landImpact:n===0?1:0});
      const pose=relativeBodyPose(r);largestStep=Math.max(largestStep,biggestPointChange(previous,pose));previous=pose;
      if(n<=12&&Math.min(...lastFrame.points.map(p=>p.y))<.025)footReachedFloor=true;
      lastFrame.points.forEach((p,index)=>{
        assert(p.y>-.012,`A landing shoe penetrates the roof by ${(-p.y).toFixed(3)}m.`);
        const foot=lastFrame.state.feet[index];
        if(foot.stance&&foot.contactWeight>.98) {
          assert(Math.abs(p.y)<.018,'A supporting foot must return to the actual roof plane.');
          if(anchors[index])largestContactDrift=Math.max(largestContactDrift,distance(anchors[index],p));
          else anchors[index]=p.clone();
          contactSamples++;
        }else anchors[index]=null;
      });
      if(lastFrame.result?.footstep)steps++;
    }
    assert(footReachedFloor,'The landing must establish visible shoe contact within the first0.1s.');
    assert(contactSamples>12,'Normal planted walking contacts must resume after the landing.');
    assert(largestContactDrift<.035,`A recovered stance drifts ${largestContactDrift.toFixed(3)}m.`);
    assert(steps>0,'The landing must flow into a real following walking step.');
    assert.equal(lastFrame.state.mode,'walk','The rig must leave its airborne/landing state and resume walking.');
    assert(largestStep<.09,`Landing or resumed walking snaps visible geometry by ${largestStep.toFixed(3)}m per frame.`);
  } finally {r.dispose();}
});
