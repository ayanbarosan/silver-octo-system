import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {findClimbTarget,createClimb,sampleClimb,shouldStartClimb} from '../src/climb.js';
import {createWaterEffects} from '../src/water.js';
import {MOVEMENT} from '../src/movement.js';

test('ledge reach respects height, distance, direction and grounded support',()=>{
 const vent={id:'vent',x:6.2,w:1.6,y:.85},pipe={id:'pipe',x:16.725,w:.55,y:1.65};
 assert.equal(findClimbTarget({x:5.75,y:0,face:1,grounded:true},[vent]),vent);
 assert.equal(findClimbTarget({x:8.2,y:0,face:-1,grounded:true},[vent]),vent);
 assert.equal(findClimbTarget({x:16.2,y:0,face:1,grounded:true},[pipe]),null,'Tall pipe requires the crate.');
 assert.equal(findClimbTarget({x:16.2,y:.85,face:1,grounded:true},[pipe]),pipe);
 assert.equal(findClimbTarget({x:5.75,y:0,face:1,grounded:false},[vent]),null,'Climbing must not teleport an airborne child.');
 assert.equal(findClimbTarget({x:21.8,y:0,face:1,grounded:true},[{x:24.2,w:18,y:.45}]),null,'The rooftop gap must remain a jump.');
});

test('climb root rises outside the wall before crossing onto either face',()=>{
 for(const face of [1,-1]){
  const target={id:'test',x:3,w:1.6,y:.85},edge=face>0?target.x:target.x+target.w;
  const climb=createClimb({x:edge-face*.48,y:0,face,target});assert(climb);
  let previous=sampleClimb(climb,0);
  for(let n=1;n<=600;n++){
   const p=sampleClimb(climb,n/600);assert(Number.isFinite(p.x)&&Number.isFinite(p.y));
   assert(Math.hypot(p.x-previous.x,p.y-previous.y)<.02,'Root motion must not snap.');
   if((p.x-edge)*face>0)assert(p.y>=target.y-1e-6,'The body must clear the wall before moving through it.');
   previous=p;
  }
  assert(Math.abs(previous.x-climb.endX)<1e-8);assert(Math.abs(previous.y-target.y)<1e-8);
 }
});

test('splash droplets rise, settle above the wet surface and expire',()=>{
 const scene=new THREE.Scene(),fx=createWaterEffects(THREE,scene);fx.splash({x:3,y:.85,strength:1});
 assert(fx.activeCount>10);assert.equal(fx.emittedCount,1);
 const drops=scene.getObjectByName('WaterDroplets'),position=drops.geometry.attributes.position,opacity=drops.geometry.attributes.aOpacity;
 let maxY=.85;
 for(let n=0;n<120;n++){
  fx.update(1/120);
  for(let i=0;i<position.count;i++)if(opacity.getX(i)>0){
   const y=position.getY(i);assert(y>=.85,'Particles must not fall through the roof.');maxY=Math.max(maxY,y);
   assert(Number.isFinite(position.getX(i))&&Number.isFinite(position.getZ(i)));
  }
 }
 assert(maxY>.95,'A splash must visibly rise off the surface.');fx.update(2);assert.equal(fx.activeCount,0);assert.equal(scene.getObjectByName('WaterEffects').visible,false);
});

test('water reuses a bounded pool and reset clears all old spray',()=>{
 const scene=new THREE.Scene(),fx=createWaterEffects(THREE,scene),root=scene.getObjectByName('WaterEffects');
 fx.splash({x:2,y:0,strength:.55});const first=Array.from(scene.getObjectByName('WaterDroplets').geometry.attributes.position.array);
 for(let n=0;n<100;n++)fx.splash({x:n,y:0,strength:1});assert(fx.activeCount<=208);assert.equal(root.children.length,2);
 fx.reset();assert.equal(fx.activeCount,0);assert.equal(fx.emittedCount,0);
 fx.splash({x:2,y:0,strength:.55});assert.deepEqual(Array.from(scene.getObjectByName('WaterDroplets').geometry.attributes.position.array),first);
 fx.splash({x:NaN,y:0});assert.equal(fx.emittedCount,1);
});

test('the starting guard cannot be climbed or cleared from the mattress',()=>{
 const guard={id:'rest-wall',x:-1.04,w:.18,y:1.32};
 assert.equal(findClimbTarget({x:-.65,y:.12,face:-1,grounded:true},[guard]),null);
 assert(.12+MOVEMENT.jumpVelocity**2/(2*MOVEMENT.gravity)<guard.y,'The guard must remain higher than the maximum normal jump feet height.');
});

test('the crate requires a fresh buffered climb press from either face even after prolonged walking intent',()=>{
 const crate={id:'crate',x:12.45,w:1.1,y:.85};
 for(const face of [-1,1]){
  const edge=face>0?crate.x:crate.x+crate.w;
  const target=findClimbTarget({x:edge-face*.35,y:0,face,grounded:true},[crate]);
  assert.equal(target,crate,'The manual-input test must exercise a genuinely reachable crate face.');
  for(const ledgeIntent of [0,.2,2,20])assert.equal(shouldStartClimb(target,{jumpBuffered:0,ledgeIntent,direction:face,face}),false,'Walking into a reachable crate must not take control of the character.');
  for(const jumpBuffered of [.001,.08,.16])assert.equal(shouldStartClimb(target,{jumpBuffered,ledgeIntent:0,direction:face,face}),true,'A buffered SPACE/W/UP action must still grab the reachable crate.');
  assert.equal(shouldStartClimb(target,{jumpBuffered:.1,ledgeIntent:1,direction:face,face,pushing:true}),false,'Pushing the movable crate must retain priority over climbing.');
 }
});

test('returning to a crate after stepping down cannot turn held movement into another automatic climb',()=>{
 const crate={id:'crate',x:12.45,w:1.1,y:.85};
 for(const face of [-1,1]){
  const edge=face>0?crate.x:crate.x+crate.w;
  const player={x:edge-face*.3,y:0,face,grounded:true};
  let starts=0;
  // The old automatic ledge timer can already be large after stepping off and
  // landing. It must never substitute for a new explicit crate action.
  for(let frame=0;frame<240;frame++){
   const target=findClimbTarget(player,[crate]);assert.equal(target,crate);
   if(shouldStartClimb(target,{jumpBuffered:0,ledgeIntent:1+frame/120,direction:face,face}))starts++;
  }
  assert.equal(starts,0);
  assert(shouldStartClimb(crate,{jumpBuffered:.1,ledgeIntent:3,direction:face,face}),'A new deliberate press after landing must re-enable climbing.');
 }
});

test('manual crate input preserves the existing automatic vent and pipe ledges',()=>{
 for(const face of [-1,1])for(const id of ['vent','pipe']){
  const target={id,x:3,w:1.6,y:.85};
  assert(shouldStartClimb(target,{jumpBuffered:0,ledgeIntent:.4,direction:face,face}),'Existing automatic ledges must still accept sustained movement toward the obstacle.');
  assert.equal(shouldStartClimb(target,{jumpBuffered:0,ledgeIntent:0,direction:-face,face}),false,'Unrelated input cannot start an automatic ledge climb.');
  assert(shouldStartClimb(target,{jumpBuffered:.1,ledgeIntent:0,direction:0,face}),'An explicit climb press must still work on ordinary ledges.');
 }
 assert.equal(shouldStartClimb(null,{jumpBuffered:.1,ledgeIntent:1,direction:1,face:1}),false);
});
