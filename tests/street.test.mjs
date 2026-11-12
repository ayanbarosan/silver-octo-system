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
  assert.deepEqual(r.street.snapshot(),{x:STREET.entry.x,y:0,face:1,dumpsterX:STREET.dumpster.startX});
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
  const left=setup({x:STREET.minX+.1,face:-1});
  advance(left,{direction:-1,running:true},300);
  assert.equal(left.player.x,STREET.minX);assert(left.player.grounded);
  const jumpEvents=advance(left,{direction:-1,jump:true},180);
  assert.equal(left.player.x,STREET.minX);assert.deepEqual(jumpEvents,['takeoff','land']);
});

test('saved snapshots reject malformed data and never share state or contain airborne positions',()=>{
  const seed={x:14,face:-1,velocity:9};
  assert.deepEqual(normalizeStreetSave(seed),{x:14,y:0,face:-1,dumpsterX:STREET.dumpster.startX});
  for(const value of [null,[],{}, {x:'2',face:1},{x:NaN,face:1},{x:Infinity,face:1},{x:STREET.maxX+1,face:1},{x:-1,face:-1},{x:2,face:0}])assert.equal(normalizeStreetSave(value),null);
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

const D=STREET.dumpster,F=STREET.fence;
const beside=(side=-1,dumpsterX=D.startX)=>setup({x:dumpsterX+side*(D.w/2+.22),y:0,face:-side,dumpsterX});
function finishClimb(r){
  for(let n=0;n<300&&r.street.state.climb;n++)r.street.update(1/120,{},r.player);
  assert.equal(r.street.state.climb,null);
}
test('walking into the dumpster blocks the body without automatically climbing it',()=>{
  const r=beside();advance(r,{direction:1},350);
  assert(Math.abs(r.player.x-(D.startX-D.w/2-.22))<.001);
  assert.equal(r.player.y,0);assert.equal(r.street.state.climb,null);assert.equal(r.street.state.dumpsterX,D.startX);
  assert.equal(r.street.update(1/120,{jump:true},r.player),'climb-start');
  finishClimb(r);assert.equal(r.player.y,D.y);assert(r.player.grounded);assert(r.street.snapshot());
});
test('E plus a direction pushes and pulls from both sides while facing the object',()=>{
  for(const side of [-1,1]){
    const r=beside(side),before=r.player.x;
    advance(r,{interact:true,direction:-side},240);
    const pushed=r.street.state.dumpsterX;
    assert((pushed-D.startX)*-side>1);assert((r.player.x-before)*-side>1);
    assert.equal(r.player.face,-side);assert.equal(r.street.state.interaction.kind,'push');
    advance(r,{interact:true,direction:side},240);
    assert((r.street.state.dumpsterX-pushed)*side>.6);assert.equal(r.player.face,-side);
    assert.equal(r.street.state.interaction.kind,'pull');
    advance(r,{interact:true},200);const stopped=r.street.state.dumpsterX;advance(r,{interact:true},100);
    assert.equal(r.street.state.interaction.kind,'hold');assert.equal(r.street.state.dumpsterX,stopped);
    advance(r,{},20);assert.equal(r.street.state.interaction,null);
  }
});
test('jumping onto a reachable edge catches at the attained height',()=>{
  const r=setup({x:D.startX-D.w/2-.5,face:1,dumpsterX:D.startX});
  Object.assign(r.player,{y:.6,vy:-1,vx:1.3,grounded:false});r.street.state.jump.launched=true;
  assert.equal(r.street.update(1/120,{direction:1},r.player),'climb-start');
  assert.equal(r.street.state.climb.startY,.6);assert.equal(r.player.y,.6);
  finishClimb(r);assert.equal(r.player.y,D.y);assert(r.player.grounded);
});
test('walking off either lid edge falls normally and can move away without sticking',()=>{
  for(const side of [-1,1]){
    const r=setup({x:D.startX,y:D.y,face:side,dumpsterX:D.startX});
    advance(r,{direction:side},240);
    assert.equal(r.player.y,0);assert(r.player.grounded);assert((r.player.x-D.startX)*side>D.w/2+.3);
  }
});
test('a ground jump cannot bypass the tall fence, including a held jump',()=>{
  const r=setup({x:F.x-.22,y:0,face:1,dumpsterX:D.startX});
  const events=advance(r,{direction:1,running:true,jump:true},420);
  assert(!events.includes('climb-start'));assert(r.player.x<=F.x-.219);assert.equal(r.player.y,0);
});
test('the complete bin puzzle pushes, climbs, catches the fence and lands beyond it',()=>{
  const r=beside();
  for(let n=0;n<2400&&r.street.state.dumpsterX<52.85;n++)r.street.update(1/120,{interact:true,direction:1},r.player);
  assert(r.street.state.dumpsterX>=52.85);
  advance(r,{},5);assert.equal(r.street.update(1/120,{jump:true},r.player),'climb-start');finishClimb(r);
  const bin=r.street.state.dumpsterX;assert.equal(r.player.y,D.y);
  for(let n=0;n<180&&r.player.x<bin+.55;n++)r.street.update(1/120,{direction:1},r.player);
  advance(r,{},70);
  assert(r.player.grounded&&r.player.y===D.y,'The jump must start from the lid.');
  const events=[];for(let n=0;n<700;n++){
    const event=r.street.update(1/120,{direction:1,jump:true},r.player);if(event)events.push(event);
    if(r.player.x>F.x+F.w+.3&&r.player.grounded&&r.player.y===0)break;
  }
  assert(events.includes('climb-start'),'Hands must catch the fence top.');assert(events.includes('climb-end'));
  assert(r.player.x>F.x+F.w+.3);assert.equal(r.player.y,0);assert(r.player.grounded);assert(r.street.snapshot());
});
test('paused manipulation and climbing preserve every controller and root value',()=>{
  const r=beside();advance(r,{interact:true,direction:1},100);
  let before=structuredClone({p:r.player,s:r.street.state});
  for(let n=0;n<50;n++)r.street.update(0,{direction:-1,jump:true},r.player);
  assert.deepEqual({p:r.player,s:r.street.state},before);
  advance(r,{},3);r.street.update(1/120,{jump:true},r.player);assert(r.street.state.climb);
  before=structuredClone({p:r.player,s:r.street.state});r.street.update(0,{},r.player);
  assert.deepEqual({p:r.player,s:r.street.state},before);assert.equal(r.street.snapshot(),null);
});


const G=STREET.crawl;
test('raised panel blocks standing and jumping from either direction',()=>{
  for(const side of [-1,1]) {
    const edge=side<0?G.x:G.x+G.w,r=setup({x:edge+side*1.6,face:-side});
    advance(r,{direction:-side,running:true,jump:true},480);
    assert((r.player.x-edge)*side>=.719,'A standing body must stop before the raised panel, including during a jump.');
    assert.equal(r.street.state.climb,null);assert.equal(r.street.state.crouch,0);
    assert(r.player.grounded);
  }
});
test('ducking crosses the opening in both directions and releasing cannot stand inside it',()=>{
  for(const side of [-1,1]) {
    const r=setup({x:side<0?G.x-1.5:G.x+G.w+1.5,face:-side});
    for(let n=0;n<600&&(r.player.x-(G.x+G.w/2))*side>0;n++)r.street.update(1/120,{direction:-side,crouch:true},r.player);
    assert(Math.abs(r.player.x-(G.x+G.w/2))<.5);
    assert.equal(r.street.state.crouch,1);assert(r.street.state.underLowGate);
    advance(r,{},180);assert.equal(r.street.state.crouch,1,'The head and backpack must stay low after releasing the button under a beam.');
    const under=r.street.snapshot();assert.equal(under.crouched,true);
    const restored=setup(under);assert.equal(restored.street.state.crouch,1);assert.deepEqual(restored.street.snapshot(),under);
    advance(r,{direction:-side},360);advance(r,{},100);
    assert.equal(r.street.state.crouch,0);assert(!r.street.state.underLowGate);
    assert(!('crouched' in r.street.snapshot()));
  }
});
test('crouch slows movement, suppresses running/jumps and does not queue a jump on standing',()=>{
  const r=setup({x:64,face:1});
  advance(r,{direction:1,crouch:true,running:true,jump:true},240);
  assert(Math.abs(r.player.vx-.8)<.005);assert.equal(r.player.y,0);assert(r.player.grounded);
  assert(!r.street.state.jump.preparing&&!r.street.state.jump.launched);assert(!r.street.state.running);
  advance(r,{jump:true},140);assert.equal(r.player.y,0);assert.equal(r.street.state.crouch,0);
  advance(r,{},2);const events=advance(r,{jump:true},180);assert.deepEqual(events,['takeoff','land']);
});
test('crouch transition is gradual, paused poses freeze and Continue never saves half a crouch',()=>{
  const r=setup({x:58,face:1});
  r.street.update(1/120,{crouch:true},r.player);
  assert(r.street.state.crouch>0&&r.street.state.crouch<.1);assert.equal(r.street.snapshot(),null);
  const before=structuredClone({player:r.player,state:r.street.state});
  for(const dt of [0,-1,NaN,Infinity])r.street.update(dt,{direction:1,crouch:false},r.player);
  assert.deepEqual({player:r.player,state:r.street.state},before);
  advance(r,{crouch:true},60);assert.equal(r.street.state.crouch,1);assert.equal(r.street.snapshot().crouched,true);
  advance(r,{},1);assert.equal(r.street.snapshot(),null);
  advance(r,{},60);assert.equal(r.street.state.crouch,0);assert(r.street.snapshot());
});
test('crouch does not shrink an airborne body or bypass low gate collisions',()=>{
  const r=setup({x:G.x-1.0,face:1});
  Object.assign(r.player,{grounded:false,y:.5,vy:1,vx:3});r.street.state.jump.launched=true;
  advance(r,{direction:1,crouch:true},35);
  assert.equal(r.street.state.crouch,0);assert(r.player.x<=G.x-.719);
});
test('crouch opening and low movement remain consistent across update rates',()=>{
  const samples=[];
  for(const fps of [30,60,120]) {
    const r=setup({x:G.x-1.5,face:1});advance(r,{direction:1,crouch:true},fps*6,fps);
    assert(r.player.x>G.x+G.w+.72);assert.equal(r.player.y,0);samples.push(r.player.x);
  }
  assert(Math.max(...samples)-Math.min(...samples)<.04);
});

test('fresh crouch while actually running starts one intentional slide and holding cannot repeat it',()=>{
 const r=setup({x:64.5,face:1});advance(r,{direction:1,running:true},100);
 const x=r.player.x;assert.equal(r.street.update(1/120,{direction:1,running:true,crouch:true},r.player),'slide-start');
 assert(r.street.state.slide);assert.equal(r.street.snapshot(),null);
 advance(r,{direction:1,running:true,crouch:true,jump:true},180);
 assert.equal(r.street.state.slidesCompleted,1);assert.equal(r.street.state.slide,null);assert.equal(r.street.state.crouch,1);
 assert(r.player.x>x+.8&&r.player.x<x+3);assert.equal(r.player.y,0);
 advance(r,{direction:1,running:true,crouch:true},200);assert.equal(r.street.state.slidesCompleted,1);
 const walking=setup({x:64.5,face:1});advance(walking,{direction:1},100);advance(walking,{direction:1,crouch:true},100);
 assert.equal(walking.street.state.slidesCompleted,0,'Walking into a crouch must not start a slide.');
});
test('slide keeps its heading, stops at solid objects and hands a low fence recovery to crouch',()=>{
 const r=setup({x:58.9,face:1});r.player.vx=3.3;
 assert.equal(r.street.update(1/120,{direction:1,running:true,crouch:true},r.player),'slide-start');
 for(let n=0;n<150&&r.street.state.slide;n++)r.street.update(1/120,{direction:-1},r.player);
 assert.equal(r.player.face,1,'Reversing input during a slide cannot reverse its momentum instantly.');
 assert(r.street.state.underLowGate);assert.equal(r.street.state.crouch,1);
 advance(r,{direction:1},600);assert(r.player.x>STREET.crawl.x+STREET.crawl.w+.72);assert.equal(r.street.state.crouch,0);
 const wall=beside();wall.player.vx=3.3;
 wall.street.update(1/120,{running:true,crouch:true},wall.player);advance(wall,{},180);
 assert(wall.player.x<=D.startX-D.w/2-.219);assert.equal(wall.player.vx,0);assert.equal(wall.street.state.slide,null);
});
test('the wooden home door requires a fresh E press and opens before walking into its supported passage',()=>{
 const r=setup({x:STREET.home.doorX-2.4,face:1});advance(r,{direction:1,interact:true},140);advance(r,{interact:true},100);
 assert(r.street.state.nearHomeDoor);assert.equal(r.street.state.homeDoor.phase,'closed','Holding E before reaching the doorway must not open it later.');
 advance(r,{},1);assert.equal(r.street.update(1/120,{interact:true},r.player),'open-home');
 assert.equal(r.street.snapshot(),null);const startX=r.player.x;advance(r,{},35);assert.equal(r.player.z,0);assert(r.street.state.homeDoor.progress>0);
 const frozen=structuredClone({p:r.player,s:r.street.state});for(const dt of [0,-1,NaN,Infinity])r.street.update(dt,{},r.player);assert.deepEqual({p:r.player,s:r.street.state},frozen);
 const events=advance(r,{},180);assert(events.includes('home-complete'));assert.equal(r.street.state.homeDoor.progress,1);
 assert(Math.abs(r.player.x-STREET.home.doorX)<.001);assert.equal(r.player.z,-2.3);assert(r.player.grounded);assert.equal(r.player.y,0);assert(Number.isFinite(startX));
 assert.equal(r.street.snapshot(),null,'A position inside the passage cannot replace the preceding street save.');
});
