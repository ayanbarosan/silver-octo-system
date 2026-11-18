import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createApartmentFather} from '../src/apartment-father.js';
import {createBoy} from '../src/character.js';
import {CAUGHT} from '../src/apartment.js';
const dt=1/120;
function father(){const model=createApartmentFather(THREE);model.group.position.set(6,0,-.2);return model;}

test('the held tumbler reaches the guarded head at impact on the floor and above it in both directions',()=>{
 const adult=father(),boy=createBoy(THREE);
 for(const startY of[0,.8,1.05])for(const face of[-1,1])for(const fatherFace of[-1,1]){
  boy.reset();boy.group.rotation.y=face*Math.PI/2;let closest=Infinity;
  for(let n=0;n<=64;n++){
   const elapsed=n*dt,fallProgress=THREE.MathUtils.clamp((elapsed-CAUGHT.impactAt)/CAUGHT.fallDuration,0,1),caught={elapsed,progress:elapsed/CAUGHT.duration,duration:CAUGHT.duration,impactAt:CAUGHT.impactAt,fallProgress,startY,impactDirection:fatherFace*face};
   boy.group.position.set(15,startY,1.4);
   boy.animate({time:elapsed,dt,grounded:true,story:{caught}});
   adult.update(elapsed,{fatherPhase:'catch',fatherPhaseTime:elapsed,fatherX:15-fatherFace*.6,fatherY:0,fatherZ:1.4,fatherFace,attackProgress:Math.min(1,elapsed/.95),glassThrown:false,caught});
   if(elapsed>=.43&&elapsed<=.52){const head=boy.group.getObjectByName('head').getWorldPosition(new THREE.Vector3()),glass=new THREE.Vector3(...adult.metadata.probes.glass);closest=Math.min(closest,head.distanceTo(glass));}
  }
  assert(closest<.25,`The ${fatherFace} strike must contact a head facing ${face} at support ${startY}, measured gap ${closest}.`);
 }
});

test('the father looks down from the platform without moving any watched joint',()=>{
 const adult=father(),state={fatherPhase:'watch',fatherPhaseTime:0,fatherX:27.1,fatherY:0,fatherZ:1.4,fatherFace:1,glassThrown:true,glassRetrieved:true};
 adult.update(0,state);const original=structuredClone(adult.metadata.probes);
 for(const time of[.1,1,5,40]){adult.update(time,state);for(const[name,point]of Object.entries(adult.metadata.probes))assert(new THREE.Vector3(...point).distanceTo(new THREE.Vector3(...original[name]))<1e-8,`${name} must stay still.`);}
 assert(adult.group.getObjectByName('father-head').rotation.x>.7);
});

test('retrieving the intact tumbler places its hand near the floor behind the closed door',()=>{
 const adult=father();
 adult.update(0,{fatherPhase:'throw',fatherPhaseTime:.85,fatherX:16.65,fatherZ:1.4,glassThrown:true,throwProgress:1});assert(!adult.metadata.glassHeld);
 adult.update(.55,{fatherPhase:'retrieve',fatherPhaseTime:.55,fatherX:16.65,fatherZ:1.4,glassThrown:true,glassRetrieved:true});
 assert(adult.metadata.glassHeld);assert(adult.metadata.probes.leftHand[1]<.25);assert(adult.metadata.probes.head[0]<17.1);
 for(const point of Object.values(adult.metadata.probes))assert(point.every(Number.isFinite));
});
