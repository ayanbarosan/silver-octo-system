import test from 'node:test';
import assert from 'node:assert/strict';
import {ALLEY,alleyHeight,createAlley,normalizeAlleySave} from '../src/alley.js';

const setup=(saved,fps=60)=>{const alley=createAlley(),player={};assert(alley.begin(player,saved));return {alley,player,fps,time:0,events:[]};};
function step(r,input={}){
 const event=r.alley.update(1/r.fps,input,r.player);r.time+=1/r.fps;r.events.push(...r.alley.state.events);
 assert([r.player.x,r.player.y,r.player.z,r.player.vx,r.player.vy,r.player.vz].every(Number.isFinite),'Every action must leave finite physical state.');
 assert(r.player.y>=-.001,'The child cannot fall through the supported alley.');
 return event;
}
function advance(r,input={},seconds=1){for(let n=0;n<Math.ceil(seconds*r.fps);n++)step(r,input);}
function until(r,predicate,input={},timeout=90){
 for(let n=0;n<Math.ceil(timeout*r.fps)&&!predicate();n++)step(r,input);
 assert(predicate(),`Input route stalled at ${JSON.stringify({x:r.player.x,y:r.player.y,z:r.player.z,phase:r.alley.state.phase,area:r.alley.state.area,crates:r.alley.state.crates.map(c=>c.x),owner:r.alley.state.owner})}`);
}
const press=(r,key)=>{step(r,{});step(r,{[key]:true});};
const finishClimb=r=>until(r,()=>!r.alley.state.climb,{},5);
const yardSeed=(x=140.3)=>({area:'yard',x,face:1,jackStatus:'raised',pumpProgress:1});
const garageSeed=(x=111.5)=>({area:'garage',x,face:1,jackStatus:'raised',pumpProgress:1});

test('alley entry and Continue restore only canonical supported positions',()=>{
 const r=setup();assert.deepEqual(r.player,{x:2,y:0,z:1.4,vx:0,vy:0,vz:0,grounded:true,face:1});
 assert.equal(r.alley.state.dog.phase,'sleep');assert.equal(r.alley.state.owner.role,'garage-resident');
 assert.equal(alleyHeight(r.alley.snapshot()),0);assert(r.alley.snapshot());
 const saved={...garageSeed(137),y:.75,crateXs:[43,53.9,137],vx:100,phase:'caught',events:['complete']};
 const restored=setup(saved);assert.equal(restored.player.z,4.2);assert.equal(restored.player.y,.75);assert.equal(restored.player.vx,0);assert.equal(restored.alley.state.phase,'walk');
 const snapshot=restored.alley.snapshot();snapshot.crateXs[2]=125;assert.equal(restored.alley.state.crates[2].x,137);
 assert.equal(restored.alley.begin(restored.player),false);restored.alley.reset();assert.equal(restored.alley.active,false);assert.equal(restored.alley.snapshot(),null);assert(restored.alley.begin(restored.player));
});

test('malformed and unsupported saves cannot strand a player or create overlapping crates',()=>{
 const valid={x:2,face:1};
 for(const value of [null,[],{}, {...valid,x:NaN},{...valid,x:Infinity},{...valid,face:0},{...valid,y:1.2},{...valid,area:'other'},{...valid,x:116},{...valid,x:55.05},{...valid,x:43},{...valid,crateXs:Array(3)},{...valid,crateXs:[43,43,126]},{...valid,crateXs:[43,47,138]},{...valid,crateXs:[43,47,undefined]},{...valid,jackStatus:'raised',pumpProgress:.5},{...valid,jackStatus:'ground',pumpProgress:.5},{...valid,jackStatus:'carried'},{...garageSeed(),jackStatus:'ground'},{...yardSeed(),completed:true},{...valid,fencePassed:'yes'}])assert.equal(normalizeAlleySave(value),null,JSON.stringify(value));
 assert(normalizeAlleySave({...valid,x:43,y:.65}));assert(normalizeAlleySave({...yardSeed(190),completed:true}));
 assert.deepEqual(normalizeAlleySave(valid).crateXs,[43,47,126]);
});

test('pause, invalid deltas and freezeThreats preserve all threat clocks without consuming input',()=>{
 const r=setup({x:18,face:1});advance(r,{direction:1},.5);
 const before=structuredClone({player:r.player,state:r.alley.state});
 for(const dt of [0,-1,NaN,Infinity,undefined])r.alley.update(dt,{direction:-1,jump:true,interact:true,crouch:true},r.player);
 assert.deepEqual({player:r.player,state:r.alley.state},before);step(r,{jump:true});assert(r.alley.state.jump.preparing);
 const frozen=setup({...garageSeed(),crateXs:[43,53.9,130]});const threat=structuredClone({dog:frozen.alley.state.dog,owner:frozen.alley.state.owner,t:frozen.alley.state.investigationTime});
 advance(frozen,{freezeThreats:true},120);assert.deepEqual({dog:frozen.alley.state.dog,owner:frozen.alley.state.owner,t:frozen.alley.state.investigationTime},threat);
 advance(frozen,{},1);assert(frozen.alley.state.investigationTime>.9);
});

test('walking into a crate blocks; climbing requires a fresh deliberate jump and stepping down falls normally',()=>{
 const r=setup({x:42.23,face:1});advance(r,{direction:1},2);
 assert(Math.abs(r.player.x-42.255)<.001);assert.equal(r.player.y,0);assert.equal(r.alley.state.climb,null);
 assert.equal(step(r,{jump:true}),'climb-start');assert.equal(r.alley.snapshot(),null);finishClimb(r);assert.equal(r.player.y,.65);assert(r.player.grounded);
 advance(r,{jump:true},2);assert.equal(r.player.y,.65);assert.equal(r.alley.state.climbsCompleted,1,'Holding jump cannot chain a second action.');
 advance(r,{direction:-1},2);assert.equal(r.player.y,0);assert(r.player.grounded);advance(r,{direction:1},2);assert.equal(r.player.y,0);assert.equal(r.alley.state.climb,null);
});

test('crate push/pull stays attached to either side, respects the other crate and cannot pass the fence',()=>{
 for(const side of [-1,1]){
  const r=setup({x:47+side*(.65+.22),face:-side,fencePassed:true});const start=r.alley.state.crates[1].x;
  advance(r,{direction:-side,interact:true},2);assert((r.alley.state.crates[1].x-start)*-side>.7);assert.equal(r.player.face,-side);assert.equal(r.alley.state.interaction.kind,'push');
  const pushed=r.alley.state.crates[1].x;advance(r,{direction:side,interact:true},2);assert((r.alley.state.crates[1].x-pushed)*side>.4);assert.equal(r.alley.state.interaction.kind,'pull');assert.equal(r.alley.state.interaction.objectId,'alley-fence-crate');
 }
 const r=setup({x:45.77,face:1,fencePassed:true});advance(r,{direction:1,interact:true},25);assert.equal(r.alley.state.crates[1].x,53.9);assert.equal(r.player.y,0);
 advance(r,{direction:-1,interact:true},40);const [a,b]=r.alley.state.crates;assert(b.x-a.x>=(a.w+b.w)/2+.0299);assert(r.alley.snapshot());
});

test('mobile interaction becomes available beside either side of every movable crate before grabbing',()=>{
 for(const crate of ALLEY.crates)for(const side of [-1,1]){
  const saved={...(crate.area==='garage'?garageSeed():{face:-side,fencePassed:true}),x:crate.x+side*(crate.w/2+.34),face:-side};
  const r=setup(saved);assert.equal(r.alley.state.interaction,null);assert(r.alley.state.nearInteraction,`${crate.id} must reveal mobile E from side ${side}.`);
  step(r,{interact:true,direction:-side});assert.equal(r.alley.state.interaction?.objectId,crate.id);assert(r.alley.state.nearInteraction);
  step(r,{});step(r,{jump:true});assert(r.alley.state.climb);assert.equal(r.alley.state.nearInteraction,false,'The mobile action must hide while climbing.');
 }
 const away=setup({x:39,face:1,fencePassed:true});assert.equal(away.alley.state.nearInteraction,false);
});

test('a ground jump cannot clear the tall locked gates and a running crouch still slides',()=>{
 const fence=setup({x:54.7,face:1,fencePassed:true});advance(fence,{direction:1,running:true,jump:true},8);assert(fence.player.x<=54.781);assert.equal(fence.player.y,0);assert(!fence.events.includes('climb-start'));
 const gate=setup({x:115.5,face:1,fencePassed:true});advance(gate,{direction:1,running:true,jump:true},8);assert(gate.player.x<=115.781);assert.equal(gate.alley.state.area,'alley');
 const r=setup({x:3,face:1});advance(r,{direction:1,running:true},2);const x=r.player.x;assert.equal(step(r,{direction:1,running:true,crouch:true}),'slide-start');assert(r.alley.state.slide);assert.equal(r.alley.snapshot(),null);
 advance(r,{crouch:true,running:true},2);assert(r.player.x>x+1);assert.equal(r.alley.state.slidesCompleted,1);assert.equal(r.alley.state.slide,null);assert.equal(r.alley.state.crouch,1);
});

test('running wakes the territorial dog, caught/retry is finite, and crouching preserves sleep',()=>{
 const r=setup({x:17,face:1});until(r,()=>r.alley.state.phase==='caught',{direction:1,running:true},12);
 assert.equal(r.alley.state.detectedBy,'dog');assert(r.events.includes('dog-wake'));assert(r.events.includes('dog-bark'));assert.equal(r.alley.snapshot(),null);
 advance(r,{},3);assert.equal(r.events.filter(e=>e==='retry').length,1);assert(r.alley.retry(r.player));assert.equal(r.player.x,13);assert.equal(r.alley.state.phase,'walk');assert.equal(r.alley.state.dog.phase,'sleep');
 until(r,()=>r.player.x>35,{direction:1,crouch:true},40);assert.equal(r.alley.state.dog.phase,'sleep');assert(r.alley.state.dogPassed);
});

test('jack pickup shuffles to a reachable grip, faces the tool and cannot repeat while E is held',()=>{
 for(const x of [81.18,82.82]){
  const r=setup({x,face:x<82?-1:1,fencePassed:true});step(r,{interact:true});assert.equal(r.alley.state.phase,'pickup-jack');
  advance(r,{interact:true},.24);assert(Math.abs(Math.abs(r.player.x-82)-.55)<.001);assert.equal(r.player.face,x<82?1:-1);assert(r.alley.state.jackVisual.y<.2);
  advance(r,{interact:true},2);assert.equal(r.alley.state.jackStatus,'carried');assert.equal(r.alley.state.phase,'walk');assert.equal(r.events.filter(e=>e==='jack-pickup').length,1);
  assert(Math.abs(r.alley.state.jackVisual.x-r.player.x-r.player.face*.38)<1e-8);assert.equal(r.alley.state.jackVisual.y,.77);assert(r.alley.snapshot());
 }
});

test('partial and raised jacks remain reachable after backtracking and Continue',()=>{
 for(const status of ['installed','raised']){
  const progress=status==='raised'?1:.4,r=setup({x:109.2,face:1,fencePassed:true,jackStatus:status,pumpProgress:progress});
  assert(r.alley.state.nearInteraction);press(r,'interact');until(r,()=>r.alley.state.phase==='walk',{},3);assert.equal(r.player.x,109.2);assert.equal(r.player.z,4.2);
  if(status==='installed'){advance(r,{interact:true},1);assert(r.alley.state.pumpProgress>progress);assert(r.alley.state.pumpProgress<1);}
  const retained=r.alley.state.pumpProgress;until(r,()=>r.player.z===1.4&&r.alley.state.phase==='walk',{direction:-1},5);
  const saved=r.alley.snapshot();assert(saved);assert.equal(saved.pumpProgress,retained);assert.equal(saved.jackStatus,status);
  const reload=setup(saved);until(reload,()=>reload.player.x>108.3,{direction:1},3);press(reload,'interact');until(reload,()=>reload.alley.state.phase==='walk',{},3);assert.equal(reload.player.z,4.2);assert.equal(reload.player.x,109.2);
  if(status==='installed')advance(reload,{interact:true},8);assert.equal(reload.alley.state.jackStatus,'raised');
  until(reload,()=>reload.alley.state.area==='garage',{direction:1,crouch:true},5);assert(reload.alley.state.checkpoint);assert.equal(reload.alley.state.checkpoint.area,'garage');
 }
});

test('the jammed door enforces crouching and holds a low pose until the child is clear',()=>{
 const r=setup({x:109.2,face:1,fencePassed:true,jackStatus:'raised',pumpProgress:1});press(r,'interact');until(r,()=>r.alley.state.phase==='walk',{},3);
 advance(r,{direction:1},2);assert(r.player.x<=109.451);assert.equal(r.alley.state.area,'alley');
 until(r,()=>r.player.x>109.85,{direction:1,crouch:true},3);assert(r.alley.state.underDoor);advance(r,{direction:1},.7);assert.equal(r.alley.state.crouch,1);assert(r.player.x>110);
 until(r,()=>r.alley.state.area==='garage',{direction:1},3);assert(r.alley.snapshot());assert.equal(r.alley.state.checkpoint.area,'garage');
});

test('the garage investigator approaches physically; caught retry keeps the raised door and moved crate',()=>{
 const r=setup({...garageSeed(),crateXs:[43,53.9,130]});until(r,()=>r.alley.state.owner.phase==='approach',{},72);assert(r.alley.state.owner.y>3);assert.equal(r.alley.state.owner.role,'garage-resident');
 until(r,()=>r.alley.state.phase==='caught',{},24);assert.equal(r.alley.state.detectedBy,'owner');advance(r,{},2);assert(r.events.includes('retry'));assert(r.alley.retry(r.player));
 assert.equal(r.alley.state.area,'garage');assert.equal(r.player.x,111.5);assert.equal(r.alley.state.jackStatus,'raised');assert.equal(r.alley.state.doorGap,1.13);assert.equal(r.alley.state.crates[2].x,130);assert.equal(r.alley.state.investigationTime,0);
});

test('an immediate courtyard sprint is detected and retries at a safe yard checkpoint',()=>{
 const r=setup(yardSeed());until(r,()=>r.alley.state.phase==='caught',{direction:1,running:true},25);assert.equal(r.alley.state.detectedBy,'owner');assert(r.events.includes('yard-alert'));assert(r.alley.retry(r.player));
 assert.equal(r.alley.state.area,'yard');assert.equal(r.player.x,143);assert.equal(r.alley.state.jackStatus,'raised');assert.equal(r.alley.state.owner.role,'yard-owner');assert.equal(r.alley.state.owner.alert,0);
});

test('crossing the end in midair completes only on a supported, serializable landing',()=>{
 const r=setup(yardSeed(189.6));step(r,{jump:true,freezeThreats:true});until(r,()=>r.player.x>190&&!r.player.grounded,{direction:1,freezeThreats:true},2);
 assert.equal(r.alley.state.completed,false);assert.equal(r.alley.snapshot(),null);
 until(r,()=>r.alley.state.completed,{direction:1,freezeThreats:true},2);assert(r.player.grounded);assert(r.alley.snapshot()?.completed);assert.equal(r.events.filter(e=>e==='complete').length,1);
 advance(r,{direction:1},2);assert.equal(r.events.filter(e=>e==='complete').length,1);assert.equal(r.alley.state.owner.alert,0);
});

test('the complete level works through real inputs: sleeping dog, fence, jack, garage window, covered yard',()=>{
 for(const fps of [30,60,120]){const r=setup(undefined,fps);
 until(r,()=>r.player.x>36,{direction:1});assert.equal(r.alley.state.dog.phase,'sleep');
 until(r,()=>r.player.x>42.2,{direction:1});press(r,'jump');finishClimb(r);
 until(r,()=>r.player.x>45.9,{direction:1});advance(r,{},1);until(r,()=>r.alley.state.crates[1].x>=53.89,{interact:true,direction:1});
 press(r,'jump');finishClimb(r);assert.equal(r.player.y,1.05);
 until(r,()=>r.player.x>54.3,{direction:1});step(r,{direction:1,jump:true});until(r,()=>r.player.x>57&&r.player.grounded,{direction:1,jump:true},15);assert(r.alley.state.fencePassed);assert.equal(r.alley.state.checkpoint.area,'alley');
 until(r,()=>r.player.x>81.4,{direction:1,running:true});advance(r,{},.4);press(r,'interact');until(r,()=>r.alley.state.jackStatus==='carried',{},2);
 until(r,()=>r.player.x>108.5,{direction:1});advance(r,{},.4);press(r,'interact');until(r,()=>r.alley.state.jackStatus==='installed',{},3);assert.equal(r.player.z,4.2);
 advance(r,{interact:true},8.1);assert.equal(r.alley.state.jackStatus,'raised');assert(r.alley.state.windowLight);assert(r.events.includes('door-creak'));assert.equal(r.events.filter(e=>e==='jack-crank').length,8);
 until(r,()=>r.alley.state.area==='garage',{direction:1,crouch:true},5);assert.equal(r.alley.state.checkpoint.area,'garage');
 until(r,()=>r.player.x>125.2,{direction:1});advance(r,{},.5);until(r,()=>r.alley.state.crates[2].x>=136.99,{direction:1,interact:true});press(r,'jump');finishClimb(r);assert.equal(r.player.y,.75);
 until(r,()=>r.alley.state.nearWindow,{direction:1},3);const root=r.player.x;press(r,'interact');assert.equal(r.alley.state.phase,'open-window');assert(root>=137.2);
 const resident={role:r.alley.state.owner.role,x:r.alley.state.owner.x,y:r.alley.state.owner.y,z:r.alley.state.owner.z};until(r,()=>r.alley.state.area==='yard',{},4);
 assert.equal(r.alley.state.garageResident.role,resident.role);assert.equal(r.alley.state.garageResident.x,resident.x);assert.equal(r.alley.state.owner.role,'yard-owner');assert.equal(r.alley.state.owner.x,171);assert.equal(r.player.x,140.3);assert.equal(r.player.y,0);assert.equal(r.alley.state.checkpoint.area,'yard');
 until(r,()=>r.player.x>163.5,{direction:1,running:true},12);until(r,()=>r.alley.state.crouch>.99,{crouch:true},1);until(r,()=>r.player.x>166.5,{direction:1,crouch:true},6);until(r,()=>r.player.vx===0,{crouch:true},3);assert(r.alley.state.inCover);
 until(r,()=>r.alley.state.owner.face===-1&&r.alley.state.owner.x<r.player.x-1.6,{crouch:true},30);until(r,()=>r.player.x>179,{direction:1,running:true},8);
 until(r,()=>r.alley.state.crouch>.99,{crouch:true},1);until(r,()=>r.alley.state.owner.alert<.01,{crouch:true},5);until(r,()=>r.alley.state.completed,{direction:1,running:true},8);
 assert.equal(r.alley.state.phase,'walk');assert(!r.events.includes('caught'));assert(r.events.includes('window-open'));assert(r.events.includes('window-exit'));assert(r.events.includes('complete'));
 const saved=r.alley.snapshot();assert(saved?.completed);assert.equal(saved.area,'yard');const continued=setup(saved);assert(continued.alley.state.completed);assert.equal(continued.alley.state.owner.alert,0);
 assert(r.time<240,'A practiced route must not be padded with mandatory idle timers.');
 }
});

test('walking and jumping remain consistent at 30, 60 and 120 updates per second',()=>{
 const samples=[];for(const fps of [30,60,120]){const r=setup({x:3,face:1},fps);advance(r,{direction:1},2);const x=r.player.x;let peak=0;for(let n=0;n<fps*2;n++){step(r,{direction:1,jump:true});peak=Math.max(peak,r.player.y);}assert.equal(r.events.filter(e=>e==='takeoff').length,1);assert.equal(r.events.filter(e=>e==='land').length,1);samples.push({x,peak});}
 assert(Math.max(...samples.map(s=>s.x))-Math.min(...samples.map(s=>s.x))<.015);assert(Math.max(...samples.map(s=>s.peak))-Math.min(...samples.map(s=>s.peak))<.015);
});
