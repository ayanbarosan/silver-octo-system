import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {findClimbTarget,createClimb,sampleClimb} from '../src/climb.js';
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
