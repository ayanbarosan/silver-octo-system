import test from 'node:test';
import assert from 'node:assert/strict';
import {ALLEY,createAlley} from '../src/alley.js';
import {captureAlleyPose,interpolateAlleyState} from '../src/alley-render.js';

const near=(actual,expected,message)=>assert(Math.abs(actual-expected)<1e-9,`${message??'Values differ'}: ${actual} vs ${expected}`);
function state(){const controller=createAlley();controller.begin({});return controller.state;}

test('render pose capture clones mutable physics actor, crate and hand records',()=>{
 const live=state();live.alleyAction={type:'crank',progress:.2,handle:{x:1,y:2,z:3}};
 const snapshot=captureAlleyPose(live),expected=structuredClone(snapshot);
 live.owner.x+=3;live.dog.alert=1;live.crates[0].x+=2;live.alleyAction.handle.y=9;
 assert.deepEqual(snapshot,expected);
 snapshot.owner.x=200;snapshot.crates[1].x=200;snapshot.alleyAction.handle.x=200;
 assert.notEqual(live.owner.x,200);assert.notEqual(live.crates[1].x,200);assert.notEqual(live.alleyAction.handle.x,200);
 assert.equal(captureAlleyPose(null),null);assert.equal(interpolateAlleyState(null,null,.5),null);
});

test('between 90 Hz steps the carried tool and hand targets use the same interpolation fraction',()=>{
 const live=state();live.jackStatus='carried';
 Object.assign(live.jackVisual,{x:80,y:ALLEY.carry.y,z:ALLEY.lane,carried:true});
 live.alleyAction={type:'carry',progress:1,elapsed:2,objectX:80,objectY:ALLEY.carry.y,objectZ:ALLEY.lane};
 const previous=captureAlleyPose(live);live.jackVisual.x+=ALLEY.carrySpeed/90;live.alleyAction.objectX=live.jackVisual.x;live.alleyAction.elapsed+=1/90;
 live.crates[0].x+=.01;live.doorGap+=.01;live.crouch=.1;live.owner.x+=.02;live.owner.time+=1/90;
 const before=structuredClone(live);
 for(const alpha of[0,.2,.5,.9,1]){
  const rendered=interpolateAlleyState(live,previous,alpha);
  near(rendered.jackVisual.x,80+ALLEY.carrySpeed/90*alpha);near(rendered.alleyAction.objectX,rendered.jackVisual.x);
  near(rendered.crates[0].x,previous.crates[0].x+.01*alpha);near(rendered.doorGap,previous.doorGap+.01*alpha);
  near(rendered.crouch,.1*alpha);near(rendered.owner.x,previous.owner.x+.02*alpha);near(rendered.owner.time,alpha/90);
 }
 assert.deepEqual(live,before,'Rendering must not move the next physics step or rewrite action handles.');
});

test('crank phase wrap uses continuous pump progress for the hand, jack and garage door',()=>{
 const live=state(),G=ALLEY.garage;
 const crank=turns=>{
  live.pumpProgress=turns/G.pumpCycles;live.doorGap=G.initialGap+(G.raisedGap-G.initialGap)*live.pumpProgress;
  Object.assign(live.jackVisual,{x:G.doorX-.02,y:live.doorGap/2,z:G.lane,raised:live.pumpProgress});
  live.alleyAction={type:'crank',progress:live.pumpProgress,elapsed:turns,crankPhase:turns%1,
   objectX:G.doorX-.02,objectY:live.doorGap/2,objectZ:G.lane,
   handle:{x:G.handle.x,y:G.handle.y+G.handle.amplitude*Math.sin(turns*2*Math.PI),z:G.handle.z}};
 };
 crank(.99);const previous=captureAlleyPose(live);crank(1.01);const before=structuredClone(live);
 for(const alpha of[0,.25,.5,.75,1]){
  const rendered=interpolateAlleyState(live,previous,alpha),turns=.99+.02*alpha,action=rendered.alleyAction;
  near(action.elapsed,turns);near(action.crankPhase,turns%1);near(action.progress,rendered.pumpProgress);
  near(action.handle.y,G.handle.y+G.handle.amplitude*Math.sin(turns*2*Math.PI));
  near(rendered.jackVisual.y,rendered.doorGap/2);near(action.objectY,rendered.jackVisual.y);
 }
 assert.deepEqual(live,before);
});

test('manipulating a crate interpolates the hand target with its moving collider',()=>{
 const live=state(),crate=live.crates[0];
 live.interaction={kind:'push',objectX:crate.x,objectY:crate.y,objectZ:crate.z};
 const previous=captureAlleyPose(live);crate.x+=.012;live.interaction.objectX=crate.x;
 const before=structuredClone(live),rendered=interpolateAlleyState(live,previous,.4);
 near(rendered.interaction.objectX,rendered.crates[0].x);near(rendered.crates[0].x,previous.crates[0].x+.012*.4);
 rendered.interaction.objectX=100;rendered.crates[0].x=100;assert.deepEqual(live,before);
});

test('new action phases start at their own pose instead of blending from a previous task',()=>{
 const live=state();live.phase='pickup-jack';live.phaseTime=.6;
 live.alleyAction={type:'pickup-jack',progress:.8,elapsed:.6,objectX:82,objectY:.6,objectZ:ALLEY.lane};
 const previous=captureAlleyPose(live);live.phase='walk';live.phaseTime=0;
 live.alleyAction={type:'carry',progress:1,elapsed:12,objectX:84,objectY:ALLEY.carry.y,objectZ:ALLEY.lane};
 const rendered=interpolateAlleyState(live,previous,0);
 assert.equal(rendered.phaseTime,0);assert.deepEqual(rendered.alleyAction,live.alleyAction);
});

test('slides blend within each pose phase and reset the local clock when the phase changes',()=>{
 const live=state();live.slide={phase:'drop',elapsed:.15,progress:.94,lowAmount:.99};
 const previous=captureAlleyPose(live);live.slide.phase='glide';live.slide.elapsed=.17;
 live.slide.progress=.02;live.slide.lowAmount=1;
 const crossed=interpolateAlleyState(live,previous,0);
 assert.deepEqual(crossed.slide,live.slide,'The start of glide cannot inherit the end-of-drop normalized progress.');
 const glide=captureAlleyPose(live);live.slide.progress=.06;live.slide.elapsed=.19;
 const rendered=interpolateAlleyState(live,glide,.5);near(rendered.slide.progress,.04);near(rendered.slide.elapsed,.18);
 rendered.slide.progress=.9;assert.equal(live.slide.progress,.06);
});

test('garage resident and yard owner retain separate positions when the window exit changes roles',()=>{
 const live=state();Object.assign(live.owner,{role:'garage-resident',phase:'inspect',x:132,y:0,z:ALLEY.garageLane,time:12});
 const previous=captureAlleyPose(live);live.garageResident={...live.owner};
 Object.assign(live.owner,{role:'yard-owner',phase:'patrol',x:171,y:0,z:ALLEY.owner.z,time:0});
 for(const alpha of[0,.25,.75,1]){
  const rendered=interpolateAlleyState(live,previous,alpha);
  assert.deepEqual(rendered.owner,live.owner,'A different NPC cannot travel between the two actor positions.');
  assert.deepEqual(rendered.garageResident,live.garageResident);
 }
});

test('render interpolation clamps the remainder and does not rewind a changed actor phase clock',()=>{
 const live=state(),previous=captureAlleyPose(live);live.owner.x+=1;live.owner.phase='inspect';live.owner.time=.1;
 near(interpolateAlleyState(live,previous,-.2).owner.x,previous.owner.x);
 near(interpolateAlleyState(live,previous,1.2).owner.x,live.owner.x);
 near(interpolateAlleyState(live,previous,.5).owner.time,.1);
 const first=interpolateAlleyState(live,null,.5);assert.deepEqual(first.owner,live.owner);assert.notEqual(first.owner,live.owner);
});
