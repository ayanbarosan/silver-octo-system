import test from 'node:test';
import assert from 'node:assert/strict';
import {createSlide,SLIDE} from '../src/slide.js';

const player=(face=1,speed=3.3)=>({x:8,y:0,vx:face*speed,vy:0,face:-face,grounded:true});
const setup=(face=1,speed=3.3)=>{const slide=createSlide(),p=player(face,speed);assert(slide.begin(p));return {slide,p};};
const step=(r,dt=1/120,input={})=>r.slide.update(dt,input,r.p);

test('a slide requires real grounded running speed and captures actual travel rather than old facing',()=>{
  for(const face of [-1,1]){
    const r=setup(face);assert.equal(r.slide.state.face,face);assert.equal(r.p.face,face);
    assert.equal(r.slide.state.lowAmount,0);assert.equal(r.p.vx,face*3.3);
    const before=structuredClone(r.slide.state);assert(!r.slide.begin(r.p));assert.deepEqual(r.slide.state,before);
  }
  for(const values of [{vx:0},{vx:1.9},{vx:2.199},{grounded:false},{vy:1},{x:NaN},{y:Infinity},{vx:NaN}]){
    const slide=createSlide(),p={...player(),...values},before={...p};
    assert(!slide.begin(p));assert(!slide.active);assert.deepEqual(p,before);
  }
  const threshold=setup(1,SLIDE.minSpeed);assert(threshold.slide.active);
});

test('drop, glide and recovery keep smooth low support and monotonically lose running momentum',()=>{
  for(const face of [-1,1]){
    const r=setup(face),phases=[],position={x:r.p.x,y:r.p.y};
    let previousSpeed=Math.abs(r.p.vx),previousLow=0,maximumStep=0,events=[];
    for(let n=0;n<180&&r.slide.active;n++){
      const event=step(r);if(event)events.push(event);
      assert.deepEqual({x:r.p.x,y:r.p.y},position,'World collision, rather than the action, must integrate the root.');
      assert.equal(r.p.face,face);assert.equal(r.p.vy,0);assert.equal(r.p.grounded,true);
      assert(Math.abs(r.p.vx)<=previousSpeed+1e-9,'Friction cannot add momentum.');previousSpeed=Math.abs(r.p.vx);
      if(r.slide.active){
        const s=r.slide.state;if(phases.at(-1)!==s.phase)phases.push(s.phase);
        assert(s.progress>=0&&s.progress<=1);assert(s.lowAmount>=0&&s.lowAmount<=1);
        maximumStep=Math.max(maximumStep,Math.abs(s.lowAmount-previousLow));previousLow=s.lowAmount;
        if(s.phase==='glide')assert.equal(s.lowAmount,1);
      }
    }
    assert.deepEqual(phases,['drop','glide','recover']);assert.deepEqual(events,['complete']);
    assert(maximumStep<.09,'The posture needs smooth drop and recovery, not an instant height change.');
    assert(Math.abs(Math.abs(r.p.vx)-SLIDE.exitSpeed)<1e-9);
    assert.equal(step(r),null,'Completion must emit once.');
  }
});

test('a low ceiling preserves the low recovery pose, then hands off to ordinary crouch without endless scripted travel',()=>{
  const r=setup();
  const events=[];let frames=0,recoveryFrames=0;
  while(r.slide.active){
    frames++;const event=step(r,1/120,{underLowGate:true});if(event)events.push(event);
    if(r.slide.state?.phase==='recover'){
      recoveryFrames++;assert.equal(r.slide.state.recoverLow,true);assert.equal(r.slide.state.lowAmount,1);
    }
    assert(frames<125,'A ceiling must not trap the player in an indefinitely scripted slide.');
  }
  assert(recoveryFrames>25);assert.deepEqual(events,['complete']);assert.equal(r.p.vx,SLIDE.exitSpeed);
  const exits=setup();step(exits,.7,{underLowGate:true});assert.equal(exits.slide.state.recoverLow,true);
  step(exits,.1);assert.equal(exits.slide.state.lowAmount,1,'Once low recovery starts, it cannot raise the head before the caller takes over.');
});

test('hitting a solid obstacle stops immediately and never restores lost momentum during recovery',()=>{
  for(const delay of [.05,.3,.8]){
    const r=setup();step(r,delay);const beforeLow=r.slide.state.lowAmount;
    step(r,1/120,{blocked:true});assert.equal(r.p.vx,0);assert.equal(r.slide.state.phase,'recover');
    assert(r.slide.state.lowAmount<=beforeLow+1e-9,'A collision must not abruptly push the child deeper into a slide.');
    for(let n=0;n<80;n++){step(r);assert.equal(r.p.vx,0);}
    assert(!r.slide.active);
  }
  const r=setup();step(r,.3);assert.equal(step(r,1/120,{blocked:true,underLowGate:true}),'complete');
  assert.equal(r.p.vx,0);assert(!r.slide.active,'A blocked underpass must hand back to ceiling-constrained crouch so the child can reverse out.');
});

test('losing ground support ends the slide without cancelling the ordinary fall',()=>{
  const r=setup();step(r,.3);Object.assign(r.p,{grounded:false,vy:-1.5,vx:1.7});
  const before={...r.p};assert.equal(step(r),'complete');assert(!r.slide.active);assert.deepEqual(r.p,before);
});

test('paused and invalid updates freeze both the action and the player, and resetting clears an interrupted slide',()=>{
  const r=setup();step(r,.3);const before=structuredClone({state:r.slide.state,p:r.p});
  for(const dt of [0,-1,NaN,Infinity,undefined]){
    assert.equal(r.slide.update(dt,{blocked:true,underLowGate:true},r.p),null);
    assert.deepEqual({state:r.slide.state,p:r.p},before);
  }
  r.slide.reset();assert(!r.slide.active);assert.equal(r.slide.state,null);assert.equal(step(r),null);
  Object.assign(r.p,player());assert(r.slide.begin(r.p));assert.equal(r.slide.state.elapsed,0);
});

test('phase, posture, friction and externally integrated travel agree at low and high update rates',()=>{
  const samples=[];
  for(const fps of [30,60,120]){
    const r=setup(),observations=[];let time=0;
    while(r.slide.active){
      const previous=r.p.vx;step(r,1/fps);r.p.x+=(previous+r.p.vx)*.5/fps;time+=1/fps;
      if([.2,.4,.6,.8].some(t=>Math.abs(time-t)<1e-8))observations.push({phase:r.slide.state.phase,low:r.slide.state.lowAmount,speed:r.p.vx});
    }
    samples.push({x:r.p.x,observations,time});
  }
  const baseline=samples.at(-1);
  for(const sample of samples){
    assert(Math.abs(sample.x-baseline.x)<.02);assert(Math.abs(sample.time-SLIDE.duration)<=1/30+1e-9);
    sample.observations.forEach((value,i)=>{
      const expected=baseline.observations[i];assert.equal(value.phase,expected.phase);
      assert(Math.abs(value.low-expected.low)<1e-8);assert(Math.abs(value.speed-expected.speed)<1e-8);
    });
  }
});
