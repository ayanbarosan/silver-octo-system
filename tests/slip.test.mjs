import test from 'node:test';
import assert from 'node:assert/strict';
import {createSlip} from '../src/slip.js';
import {LEVEL} from '../src/level.js';
import {groundStepY} from '../src/movement.js';

const puddle=LEVEL.slipPuddle,dt=1/120;
const player=(x=puddle.x+.1,vx=1.9,y=puddle.y)=>({x,y,vx,vy:0,grounded:true,face:Math.sign(vx)||1});
const channels=state=>Object.values(state.wobble);
const magnitude=values=>Math.hypot(...values);
const rms=values=>Math.sqrt(values.reduce((sum,value)=>sum+value*value,0)/values.length);

test('slipping requires actual grounded motion across the puddle and handles entry from either direction',()=>{
  for(const [before,x,vx] of [
    [puddle.x-.2,puddle.x+.05,1.9],
    [puddle.x+puddle.w+.2,puddle.x+puddle.w-.05,-1.9],
    [puddle.x-.3,puddle.x+puddle.w+.25,3.3],
    [puddle.x+puddle.w+.3,puddle.x-.25,-3.3]
  ]) {
    const slip=createSlip(),p={...player(x,vx),face:-Math.sign(vx)};
    assert(slip.tryStart(p,before),'A grounded swept crossing must not skip a narrow puddle between frames.');
    assert.equal(slip.state.face,Math.sign(vx),'The fall must follow actual travel even if the previous facing direction is stale.');
    assert.equal(p.face,Math.sign(vx));assert.equal(p.vx,0);assert.equal(p.vy,0);
  }
  const invalid=[
    {...player(),grounded:false,vy:3},player(puddle.x+.1,0),player(puddle.x+.1,.2),
    player(puddle.x+.1,1.9,puddle.y+.15),player(puddle.x+.1,1.9,LEVEL.roofs.middle.y),
    player(puddle.x-2,1.9),player(puddle.x+puddle.w+2,-1.9),{...player(),x:NaN}
  ];
  for(const p of invalid) {
    const slip=createSlip();assert.equal(slip.tryStart(p),false);
    assert.equal(slip.active,false);assert.equal(slip.played,false,'An invalid crossing must not consume the once-per-restart event.');
    assert(slip.tryStart(player()),'An ignored airborne or unrelated crossing cannot disable the later grounded encounter.');
  }
});

test('the whole slip, backward fall, recovery, brushing and look sequence emits ordered cues exactly once per crossing',()=>{
  const slip=createSlip(),p=player();assert(slip.tryStart(p));
  const phases=[],events=[];let elapsed=0;
  for(let frame=0;frame<1000&&slip.active;frame++) {
    const state=slip.state;
    if(phases.at(-1)!==state.phase)phases.push(state.phase);
    assert(Number.isFinite(state.progress)&&state.progress>=0&&state.progress<=1);
    assert(Number.isFinite(state.phaseTime)&&state.phaseTime>=0);
    elapsed+=dt;events.push(...slip.update(dt,p));
  }
  assert.deepEqual(phases,['slip','fall','ragdoll','recover','brush','look','settle']);
  const mainCues=events.filter(name=>['impact','recover','brush','look','complete'].includes(name));
  assert.deepEqual(mainCues.filter((name,index)=>name!==mainCues[index-1]),['impact','recover','brush','look','complete'],'Story cues must accompany their visible actions in order.');
  for(const cue of ['impact','recover','look','complete'])assert.equal(events.filter(name=>name===cue).length,1,`${cue} must not repeat every update.`);
  assert(events.filter(name=>name==='brush').length>=1&&events.filter(name=>name==='brush').length<=3,'Brushing should have a few deliberate strokes, not emit continuously.');
  assert(elapsed>5.5&&elapsed<7,'The action must allow a readable fall and recovery before returning control.');
  assert.equal(slip.active,false);assert.equal(slip.state,null);assert.equal(slip.played,true);assert.equal(p.grounded,true);
  assert.deepEqual(slip.update(1,p),[],'A completed action must not replay completion or impact cues.');
  const delayed=createSlip(),other=player();assert(delayed.tryStart(other));
  assert.deepEqual(delayed.update(7,other),events,'A long frame must preserve all intermediate action cues in chronological order.');
  assert.equal(delayed.active,false);assert.equal(other.y,p.y);assert(Math.abs(other.x-p.x)<1e-9);
});

test('the puddle plays once until restart and repeated entry cannot restart an active fall',()=>{
  const slip=createSlip(),p=player();assert(slip.tryStart(p));
  slip.update(.5,p);const state=slip.state,elapsed=state.elapsed;
  p.vx=3.3;assert.equal(slip.tryStart(p),false);assert.equal(slip.state,state);assert.equal(slip.state.elapsed,elapsed);
  slip.update(20,p);
  Object.assign(p,player());assert.equal(slip.tryStart(p),false,'Walking back into the same water must not trap the child in another unskippable fall.');
  slip.reset();assert.equal(slip.played,false);assert.equal(slip.active,false);assert.equal(slip.state,null);
  assert(slip.tryStart(p),'A deliberate restart must restore the puddle encounter.');
});

test('the scripted root stays on permanent safe roof support and external motion cannot launch it during the action',()=>{
  for(const face of [-1,1]) {
    const slip=createSlip(),p=player(puddle.x+puddle.w/2,face*3.3),startX=p.x;
    assert(slip.tryStart(p));let maxStep=0,previous=p.x;
    while(slip.active) {
      p.vx=face*40;p.vy=12;p.grounded=false;
      slip.update(dt,p);
      maxStep=Math.max(maxStep,Math.abs(p.x-previous));previous=p.x;
      assert.equal(p.vx,0);assert.equal(p.vy,0);assert.equal(p.grounded,true);
      assert.equal(p.y,puddle.y);
      assert.equal(groundStepY(p.x,p.y,[LEVEL.roofs.first]),puddle.y,'The action cannot leave the actual roof or use a temporary invisible floor.');
      assert(p.x>=puddle.x-.6&&p.x<=puddle.x+puddle.w+.45,'The glide must stay clear of the vent and the crate.');
    }
    assert((p.x-startX)*face>.25&&(p.x-startX)*face<.85,'The fall should retain a short forward skid, rather than stop dead or travel across the roof.');
    assert(maxStep<.025,'The root glide must be continuous at the simulation rate.');
  }
});

test('paused, invalid and negative-time updates preserve the exact slip pose and pending cues',()=>{
  const slip=createSlip(),p=player();assert(slip.tryStart(p));slip.update(.7,p);
  const pose=structuredClone(slip.state),root={...p};
  for(const invalidTime of [0,-1,NaN,Infinity])for(let n=0;n<5;n++) {
    assert.deepEqual(slip.update(invalidTime,p),[]);assert.deepEqual(slip.state,pose);assert.deepEqual(p,root);
  }
  const events=slip.update(.2,p);
  assert.equal(events.filter(name=>name==='impact').length,1,'Pausing must neither lose nor pre-fire the next impact.');
  assert(channels(slip.state).every(Number.isFinite));
});

test('slip trajectory, fixed-step spring poses and cues agree at30,60 and120fps',()=>{
  const sampleTimes=[.6,1.2,1.6,2.4,4.2,5.2,5.8];
  function run(fps) {
    const slip=createSlip(),p=player(puddle.x+.2,3.3),samples=[],events=[];assert(slip.tryStart(p));
    for(let frame=1;frame<=Math.ceil(fps*6.2);frame++) {
      events.push(...slip.update(1/fps,p));
      if(sampleTimes.some(time=>frame===Math.round(time*fps)))samples.push({state:structuredClone(slip.state),x:p.x,y:p.y});
    }
    assert.equal(slip.active,false);assert.equal(samples.length,sampleTimes.length);return {samples,events};
  }
  const baseline=run(120);
  for(const fps of [30,60]) {
    const actual=run(fps);assert.deepEqual(actual.events,baseline.events,'Frame rate cannot drop, duplicate or reorder action cues.');
    actual.samples.forEach((sample,index)=>{
      const expected=baseline.samples[index];assert.equal(sample.state.phase,expected.state.phase);
      assert(Math.abs(sample.x-expected.x)<.005&&Math.abs(sample.y-expected.y)<1e-9,'Frame rate changed the physical skid path.');
      assert(Math.abs(sample.state.elapsed-expected.state.elapsed)<1e-8);
      channels(sample.state).forEach((angle,joint)=>assert(Math.abs(angle-channels(expected.state)[joint])<1e-6,'Frame rate changed the visible spring recoil.'));
    });
  }
});

test('impact excites several loose joints and the oscillation decays instead of continuing indefinitely',()=>{
  const slip=createSlip(),p=player(puddle.x+.2,3.3);assert(slip.tryStart(p));
  const maxima=Array(7).fill(0),early=[],late=[];
  while(slip.active) {
    slip.update(dt,p);if(!slip.state)break;
    const state=slip.state,angles=channels(state);
    assert.equal(angles.length,7);assert(angles.every(Number.isFinite),'Joint springs must stay finite throughout impact and recovery.');
    angles.forEach((angle,index)=>maxima[index]=Math.max(maxima[index],Math.abs(angle)));
    if(state.elapsed>.8&&state.elapsed<1.3)early.push(magnitude(angles));
    if(state.elapsed>1.5&&state.elapsed<1.85)late.push(magnitude(angles));
    if(state.phase==='settle')assert(magnitude(angles)<.01,'Residual recoil must settle before control returns.');
  }
  assert(maxima.filter(amplitude=>amplitude>.025).length>=5,'An impact should visibly loosen several joints rather than apply a single rigid-body rotation.');
  assert(rms(late)<rms(early)*.6,'Ragdoll motion must lose energy after the impact, while allowing natural oscillation.');
});

test('reset removes old spring velocity and reproduces a fresh slip after a different interrupted fall',()=>{
  const slip=createSlip(),p=player();
  function freshSample() {
    slip.reset();Object.assign(p,player(puddle.x+.2,3.3));assert(slip.tryStart(p));
    const events=[];for(let n=0;n<150;n++)events.push(...slip.update(dt,p));
    return {state:structuredClone(slip.state),player:{...p},events};
  }
  const first=freshSample();
  slip.reset();Object.assign(p,player(puddle.x+.7,-1.9));assert(slip.tryStart(p));slip.update(1.05,p);
  assert.deepEqual(freshSample(),first,'A restarted encounter cannot inherit an old impulse, phase or joint spring velocity.');
});
