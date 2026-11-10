import test from 'node:test';
import assert from 'node:assert/strict';
import {STAIRWELL,createStairwell,stairDirection,stairHeight,normalizeStairSave} from '../src/stairwell.js';

const setup=(saved=null)=>{const stairs=createStairwell(),p={};assert(stairs.begin(p,saved));return {stairs,p};};
function move(stairs,p,direction,frames=120,fps=90){const events=[];for(let n=0;n<frames;n++){const event=stairs.update(1/fps,{direction},p);if(event)events.push(event);}return events;}
function reachNext(stairs,p,fps=90){
  const flight=stairs.state.flight,heights=[];let event;
  for(let n=0;n<fps*15&&stairs.state.flight===flight;n++){
    event=stairs.update(1/fps,{direction:stairDirection(flight)},p);heights.push(p.y);
    assert([p.x,p.y,p.vx,p.vy].every(Number.isFinite));assert(p.grounded);
  }
  assert.equal(stairs.state.flight,flight+1);assert.equal(event,'floor');
  for(let n=1;n<heights.length;n++)assert(heights[n]<=heights[n-1]+1e-7,'Continuous descent may not step upward.');
}

test('four flights descend in alternating directions and each turn selects a new lower floor',()=>{
  const {stairs,p}=setup();assert.equal(p.y,12.8);assert.equal(p.face,-1);
  for(let flight=0;flight<4;flight++){
    assert.equal(stairs.state.flight,flight);reachNext(stairs,p);
    assert(Math.abs(p.y-(3-flight)*3.2)<1e-7);
    const landingY=p.y;move(stairs,p,stairDirection(flight),45);
    assert.equal(p.y,landingY,'Continuing onto a landing stays on that landing.');
    assert.equal(stairs.state.completedFlights,flight+1);
  }
  let complete=0;
  for(let n=0;n<1800;n++)if(stairs.update(1/90,{direction:-1},p)==='complete')complete++;
  assert.equal(complete,1);assert.equal(p.x,STAIRWELL.exit.x);assert.equal(p.y,0);
  assert(stairs.state.completed);assert.equal(p.vx,0);
});

test('stopping holds the supported height and reversing midway can return toward the current landing',()=>{
  const {stairs,p}=setup();move(stairs,p,-1,400);assert(stairs.state.onStairs);assert.equal(stairs.state.flight,0);
  move(stairs,p,0,180);const stopped={...p};move(stairs,p,0,180);
  assert(Math.abs(p.x-stopped.x)<.001);assert(Math.abs(p.y-stopped.y)<.001);assert.equal(p.vx,0);
  move(stairs,p,1,180);assert(p.x>stopped.x+1);assert(p.y>stopped.y);assert.equal(stairs.state.flight,0);
});

test('completed stairs cannot be selected again from a landing and outer ends are solid',()=>{
  const {stairs,p}=setup();reachNext(stairs,p);
  move(stairs,p,-1,900);assert.equal(p.x,STAIRWELL.minX);assert.equal(p.vx,0);assert(Math.abs(p.y-9.6)<1e-8);
  move(stairs,p,1,230);assert(p.x>STAIRWELL.left);assert(p.y<9.6);assert.equal(stairs.state.flight,1);
  reachNext(stairs,p);move(stairs,p,1,900);assert.equal(p.x,STAIRWELL.maxX);assert(Math.abs(p.y-6.4)<1e-8);
  assert.equal(stairs.state.flight,2);
});

test('paused and invalid updates leave all root and controller values untouched',()=>{
  const {stairs,p}=setup();move(stairs,p,-1,350);
  const before=structuredClone({state:stairs.state,player:p});
  for(const dt of [0,-1,NaN,Infinity,undefined])stairs.update(dt,{direction:1,running:true},p);
  assert.deepEqual({state:stairs.state,player:p},before);
});

test('saved flight and position restore at derived support height without reopening completed stairs',()=>{
  const {stairs,p}=setup();reachNext(stairs,p);move(stairs,p,1,300);
  const snapshot=stairs.snapshot(),copy={...snapshot};assert.equal(snapshot.flight,1);
  const restored=setup(snapshot);assert.equal(restored.p.x,p.x);assert.equal(restored.p.y,p.y);assert.equal(restored.p.vx,0);
  snapshot.flight=0;snapshot.x=14;
  assert.deepEqual(restored.stairs.snapshot(),copy);
  restored.stairs.reset();assert.equal(restored.stairs.active,false);assert.equal(restored.stairs.state,null);assert.equal(restored.stairs.snapshot(),null);
  assert(restored.stairs.begin(restored.p));assert.equal(restored.p.x,13);assert.equal(restored.p.y,12.8);
});

test('save validation rejects malformed flight data and impossible landing sides',()=>{
  assert.deepEqual(normalizeStairSave({flight:2,x:6,face:-1,extra:true}),{flight:2,x:6,face:-1});
  for(const value of [null,[],{}, {flight:NaN,x:6,face:1},{flight:5,x:6,face:1},{flight:1.5,x:6,face:1},{flight:0,x:2,face:1},{flight:1,x:14,face:1},{flight:1,x:NaN,face:1},{flight:1,x:6,face:0}])assert.equal(normalizeStairSave(value),null);
});

test('analytical speed damping keeps descending trajectories stable across update rates',()=>{
  const results=[];
  for(const fps of [30,60,90,120]){
    const {stairs,p}=setup();move(stairs,p,-1,fps*4,fps);results.push({x:p.x,y:p.y,vx:p.vx});
    assert.equal(stairs.state.flight,0);
  }
  for(const result of results){assert(Math.abs(result.x-results[0].x)<1e-8);assert(Math.abs(result.y-results[0].y)<1e-8);assert(Math.abs(result.vx-results[0].vx)<1e-8);}
});

test('support samples clamp to landings and expose the downward slope sign',()=>{
  assert.equal(stairHeight(0,13),12.8);assert(Math.abs(stairHeight(0,3.4)-9.6)<1e-8);
  assert(Math.abs(stairHeight(1,2)-9.6)<1e-8);assert.equal(stairHeight(1,11.6),6.4);
  assert.equal(stairHeight(4,9),0);
  const {stairs,p}=setup();move(stairs,p,-1,350);assert(stairs.state.onStairs);assert(stairs.state.slope>0);
  assert.equal(stairs.sample(p.x),p.y);reachNext(stairs,p);move(stairs,p,1,300);assert(stairs.state.onStairs);assert(stairs.state.slope<0);
});
