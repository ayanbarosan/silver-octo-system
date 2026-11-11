import test from 'node:test';
import assert from 'node:assert/strict';
import {STREET,createStreet,normalizeStreetSave} from '../src/street.js';

const setup=saved=>{const street=createStreet(),player={};assert(street.begin(player,saved));return {street,player};};
function advance(r,input,frames=120,fps=120){
  const events=[];
  for(let n=0;n<frames;n++){const event=r.street.update(1/fps,input,r.player);if(event)events.push(event);}
  return events;
}

test('street entry is awake, supported and restored Continue data has no live velocity',()=>{
  const r=setup();
  assert.deepEqual(r.player,{x:STREET.entry.x,y:0,z:0,vx:0,vy:0,vz:0,grounded:true,face:1});
  assert.deepEqual(r.street.snapshot(),{x:STREET.entry.x,face:1});
  const restored=setup({x:24.2,face:-1});
  assert.equal(restored.player.x,24.2);assert.equal(restored.player.face,-1);
  assert.equal(restored.player.vx,0);assert.equal(restored.street.state.jump.launched,false);
});

test('walking, running, braking and reversing carry grounded weight on the same clear lane',()=>{
  const r=setup();
  r.street.update(1/120,{direction:1},r.player);
  assert(r.player.vx>0&&r.player.vx<.2,'Walking must accelerate instead of snapping to full speed.');
  advance(r,{direction:1},240);assert(r.player.vx>1.89&&r.player.vx<=1.9);
  advance(r,{direction:1,running:true},240);assert(r.player.vx>3.29&&r.player.vx<=3.3);
  const before=r.player.x;r.street.update(1/120,{direction:-1},r.player);
  assert(r.player.vx>0,'A direction reversal carries a brief decelerating step.');assert(r.player.x>before);
  advance(r,{direction:-1},180);assert(r.player.vx<-1.89);assert.equal(r.player.face,-1);
  advance(r,{},180);const stopped=r.player.x;advance(r,{},180);
  assert.equal(r.player.vx,0);assert.equal(r.player.x,stopped);
  assert.equal(r.player.z,0);assert.equal(r.player.y,0);assert(r.player.grounded);
});

test('a jump has planted anticipation, a changing airborne arc and one supported landing',()=>{
  const r=setup();advance(r,{direction:1,running:true},180);
  const events=[];let anticipation=0,airFrames=0,maxY=0,sawRising=false,sawFalling=false,impact=0;
  for(let n=0;n<240;n++){
    const event=r.street.update(1/120,{direction:1,running:true,jump:true},r.player);if(event)events.push(event);
    if(r.street.state.jump.preparing){anticipation++;assert(r.player.grounded);assert.equal(r.player.y,0);assert.equal(r.street.snapshot(),null);}
    if(!r.player.grounded){airFrames++;maxY=Math.max(maxY,r.player.y);sawRising||=r.player.vy>1;sawFalling||=r.player.vy<-1;assert.equal(r.street.snapshot(),null);}
    if(event==='land')impact=r.street.state.landImpact;
    assert([r.player.x,r.player.y,r.player.vx,r.player.vy].every(Number.isFinite));
  }
  assert(anticipation>=8&&anticipation<=12);assert(sawRising&&sawFalling);
  assert(maxY>.99&&maxY<1.08);assert(airFrames/120>.85&&airFrames/120<.92);
  assert.deepEqual(events,['takeoff','land'],'Holding jump cannot automatically start another jump on landing.');
  assert(impact>.5&&impact<.7);assert(r.player.grounded);assert(r.street.snapshot());
});

test('a fresh jump shortly before landing is buffered into the next deliberate takeoff',()=>{
  const r=setup();r.street.update(1/120,{jump:true},r.player);
  let firstTakeoff=false;
  for(let n=0;n<140;n++){
    r.street.update(1/120,{},r.player);
    firstTakeoff||=r.street.state.jump.launched;
    if(firstTakeoff&&r.street.state.jump.airTime>.80)break;
  }
  assert(firstTakeoff&&!r.player.grounded);
  r.street.update(1/120,{jump:true},r.player);
  const events=advance(r,{jump:true},160);
  assert.deepEqual(events,['land','takeoff','land']);
});

test('paused and invalid time cannot move the child or consume a jump press',()=>{
  const r=setup();advance(r,{direction:1},100);
  const before=structuredClone({player:r.player,state:r.street.state});
  for(const dt of [0,-1,NaN,Infinity,undefined])r.street.update(dt,{direction:-1,jump:true},r.player);
  assert.deepEqual({player:r.player,state:r.street.state},before);
  r.street.update(1/120,{jump:true},r.player);assert(r.street.state.jump.preparing);
});

test('both street ends stay supported and explorable without automatically finishing the next part',()=>{
  const r=setup({x:STREET.maxX-.1,face:1});
  const events=advance(r,{direction:1,running:true},600);
  assert.equal(r.player.x,STREET.maxX);assert.equal(r.player.vx,0);assert(r.player.grounded);
  assert(!events.includes('complete'));
  advance(r,{direction:-1,running:true},2500);
  assert.equal(r.player.x,STREET.minX);assert(r.player.grounded);
  const jumpEvents=advance(r,{direction:-1,jump:true},180);
  assert.equal(r.player.x,STREET.minX);assert.deepEqual(jumpEvents,['takeoff','land']);
});

test('saved snapshots reject malformed data and never share state or contain airborne positions',()=>{
  const seed={x:14,face:-1,velocity:9};
  assert.deepEqual(normalizeStreetSave(seed),{x:14,face:-1});
  for(const value of [null,[],{}, {x:'2',face:1},{x:NaN,face:1},{x:Infinity,face:1},{x:55,face:1},{x:-1,face:-1},{x:2,face:0}])assert.equal(normalizeStreetSave(value),null);
  assert(normalizeStreetSave({x:STREET.minX,face:1}));assert(normalizeStreetSave({x:STREET.maxX,face:-1}));
  const r=setup(seed),snapshot=r.street.snapshot();snapshot.x=50;assert.equal(r.player.x,14);
  r.street.update(1/120,{jump:true},r.player);assert.equal(r.street.snapshot(),null);
  r.street.reset();assert.equal(r.street.active,false);assert.equal(r.street.snapshot(),null);
  assert.equal(r.street.update(1/120,{jump:true},r.player),null);
  assert(r.street.begin(r.player));assert.equal(r.player.x,STREET.entry.x);
});

test('walking and jump height stay consistent at low and high update rates',()=>{
  const samples=[];
  for(const fps of [30,60,120]){
    const r=setup();advance(r,{direction:1},fps*2,fps);const x=r.player.x;
    let peak=0,takeoffs=0,landings=0;
    for(let n=0;n<fps*2;n++){
      const event=r.street.update(1/fps,{direction:1,jump:true},r.player);
      peak=Math.max(peak,r.player.y);takeoffs+=event==='takeoff';landings+=event==='land';
    }
    assert.equal(takeoffs,1);assert.equal(landings,1);samples.push({x,peak});
  }
  assert(Math.max(...samples.map(s=>s.x))-Math.min(...samples.map(s=>s.x))<.015);
  assert(Math.max(...samples.map(s=>s.peak))-Math.min(...samples.map(s=>s.peak))<.015);
});
