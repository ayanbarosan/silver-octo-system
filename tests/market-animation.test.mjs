import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBoy} from '../src/character.js';
import {createMarket,MARKET} from '../src/market.js';

const dt=1/120;
const make=(x=0,y=0,z=1.4)=>{const boy=createBoy(THREE);boy.group.position.set(x,y,z);boy.group.rotation.y=Math.PI/2;boy.reset();return boy;};
const probes=boy=>['leftSole','rightSole','leftPalm','rightPalm','head','pelvis','leftKnee','rightKnee'].map(name=>boy.group.getObjectByName(name).getWorldPosition(new THREE.Vector3()));
const transforms=boy=>{const values=[];boy.group.traverse(o=>values.push(...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray(),Number(o.visible)));return values;};
const animate=(boy,time,action,extra={})=>boy.animate({time,dt,grounded:true,wake:1,story:{marketAction:action,food:['carry-food','eat'].includes(action?.type)?'held':'display'},...extra});
const pose=(type,p,time,extra={})=>({type,progress:p,elapsed:time,face:1,...extra});
const point=v=>new THREE.Vector3(v.x,v.y,v.z);

test('the food prop joins the character only while held and leaves legacy scene bounds after reset',()=>{
 const boy=make();assert.equal(boy.group.getObjectByName('held-market-bread'),undefined);
 animate(boy,0,pose('carry-food',1,0));assert(boy.group.getObjectByName('held-market-bread'));
 boy.animate({time:dt,dt,grounded:true,wake:1,story:null});
 assert.equal(boy.group.getObjectByName('held-market-bread'),undefined);
 animate(boy,dt*2,pose('carry-food',1,dt*2));assert(boy.group.getObjectByName('held-market-bread'));
 boy.reset();assert.equal(boy.group.getObjectByName('held-market-bread'),undefined);
});

test('hunger keeps taking real steps while one palm clutches the jacket and the head bends toward the stomach',()=>{
 const boy=make();let footsteps=0,phase=0,headDrop=0;
 for(let n=0;n<=240;n++){
  const time=n*dt,x=time*1.05;boy.group.position.x=x;
  const before=boy.group.userData.animation.phase;
  if(animate(boy,time,pose('hunger',Math.min(time/1.8,1),time),{speed:1.05,travel:1.05*dt}).footstep)footsteps++;
  phase+=Math.abs(boy.group.userData.animation.phase-before);
  const p=probes(boy);headDrop=Math.max(headDrop,1.30-p[4].y);
  assert(transforms(boy).every(Number.isFinite));assert.equal(boy.group.userData.animation.food.visible,false);
 }
 assert(footsteps>=3);assert(phase>1);assert(headDrop>.04);
});

test('the grabbing palm contacts the real counter roll before lifting the bread into its carrying grip',()=>{
 const boy=make(24.5),handle={x:25,y:1.02,z:1},duration=.95;
 let error=0,contact=0,previous=null,maxStep=0,shown=false;
 for(let n=0;n<250;n++){
  const time=n*dt,p=Math.min(time/duration,1),taking=time<duration;
  const action=taking?pose('take-food',p,time,{handle,aligning:p<.30}):pose('carry-food',1,time);
  animate(boy,time,action,{story:{marketAction:action,food:taking?'display':'held'}});
  const q=probes(boy),meta=boy.group.userData.animation;
  if(previous)q.forEach((v,i)=>maxStep=Math.max(maxStep,v.distanceTo(previous[i])));previous=q;
  if(p>.38&&p<.52){error=Math.max(error,Math.min(...meta.hands.map(hand=>point(hand.position).distanceTo(point(handle)))));contact=Math.max(contact,...meta.hands.map(hand=>hand.contactWeight));}
  if(taking&&p<.54)assert.equal(meta.food.visible,false);
  if(meta.food.visible){shown=true;assert(Math.abs(point(meta.food.position).distanceTo(point(meta.hands[meta.food.arm].position))-.035)<.001);}
  assert(transforms(boy).every(Number.isFinite));
 }
 assert(error<.045,`The hand misses the counter roll by ${error.toFixed(3)}m`);assert(contact>.65);assert(shown);
 assert(maxStep<.12,`Taking and holding the roll snaps a joint ${maxStep.toFixed(3)}m.`);
});

test('running with food preserves leg contacts, stride and the free arm while the roll follows its gripping hand',()=>{
 const boy=make();let steps=0,previousPhase=0,phaseChange=0,minFree=Infinity,maxFree=-Infinity;
 for(let n=0;n<360;n++){
  const time=n*dt;boy.group.position.x=time*2.65;
  if(animate(boy,time,pose('carry-food',1,time),{speed:2.65,travel:2.65*dt}).footstep)steps++;
  const a=boy.group.userData.animation;phaseChange+=Math.abs(a.phase-previousPhase);previousPhase=a.phase;
  assert(a.food.visible);const hand=a.hands[a.food.arm],free=a.hands[1-a.food.arm];
  assert(Math.abs(point(a.food.position).distanceTo(point(hand.position))-.035)<.001);
  minFree=Math.min(minFree,free.position.y);maxFree=Math.max(maxFree,free.position.y);
 }
 assert(steps>=7);assert(phaseChange>2);assert(maxFree-minFree>.1);
});

test('a soft landing compresses through the knees and braces the palms against the moving canvas',()=>{
 const boy=make(69,-2.7);let lowestHip=Infinity,highestHip=-Infinity,contacts=0,braceError=Infinity,floor=-Infinity;
 for(let n=0;n<=160;n++){
  const time=n*dt,p=Math.min(time/1.25,1),sag=.30*Math.sin(p*Math.PI)**2;boy.group.position.y=-2.7-sag;
  const braceY=boy.group.position.y+.025;
  animate(boy,time,pose('awning-impact',p,time,{impact:.8,deflection:sag,surfaceY:boy.group.position.y,braceY,supported:true}));
  const a=boy.group.userData.animation,q=probes(boy);lowestHip=Math.min(lowestHip,q[5].y-boy.group.position.y);highestHip=Math.max(highestHip,q[5].y-boy.group.position.y);
  contacts=Math.max(contacts,...a.hands.map(hand=>hand.contactWeight));
  if(a.hands.some(hand=>hand.contactWeight>.5))braceError=Math.min(braceError,...a.hands.map(hand=>Math.abs(hand.position.y-braceY)));
  floor=Math.max(floor,boy.group.position.y-Math.min(q[0].y,q[1].y));assert(transforms(boy).every(Number.isFinite));assert.equal(a.food.visible,false);
 }
 assert(highestHip-lowestHip>.22);assert(contacts>.5,`Canvas support never acquires a palm (${contacts.toFixed(2)}).`);assert(braceError<.04);assert(floor<.02);
});

test('supported canvas exit advances the walking gait and switches to airborne contacts only after leaving its edge',()=>{
 const boy=make(70,-2.7);let phaseChange=0,previousPhase=0;
 for(let n=0;n<140;n++){
  const time=n*dt;boy.group.position.x=70+time*2.2;
  animate(boy,time,pose('awning-drop',0,time,{supported:true,airborne:false}),{speed:2.2,travel:2.2*dt});
  const a=boy.group.userData.animation;phaseChange+=Math.abs(a.phase-previousPhase);previousPhase=a.phase;assert(transforms(boy).every(Number.isFinite));
 }
 assert(phaseChange>.8,'Crossing the cloth must take steps instead of sliding with planted knees.');
 animate(boy,1.3,pose('awning-drop',.4,.3,{supported:false,airborne:true}),{grounded:false,vy:-3});
 assert(boy.group.userData.animation.feet.every(foot=>foot.contactWeight===0));
});

test('eating raises the roll to the mouth, removes it after the bites, and pause and reset clear the story pose',()=>{
 const boy=make(79,-5.2);let closest=Infinity,shown=false;
 for(let n=0;n<330;n++){
  const time=n*dt,p=Math.min(time/2.25,1),a=p<1?pose('eat',p,time):null;
  animate(boy,time,a);const meta=boy.group.userData.animation;
  if(p>.30&&p<.65){const mouth=boy.group.getObjectByName('head').localToWorld(new THREE.Vector3(0,-.095,.205));closest=Math.min(closest,point(meta.hands[meta.food.arm].position).distanceTo(mouth));shown ||= meta.food.visible;}
  if(p>.93)assert.equal(meta.food.visible,false);assert(transforms(boy).every(Number.isFinite));
 }
 assert(shown&&closest<.055);
 const before=transforms(boy);boy.animate({time:4,dt:0,story:{marketAction:pose('hunger',.5,1)}});assert.deepEqual(transforms(boy),before);
 boy.reset();assert.equal(boy.group.userData.animation.marketStage,'none');assert.equal(boy.group.userData.animation.food.visible,false);
 boy.animate({time:0,dt,grounded:true,wake:1});assert.equal(boy.group.userData.animation.food.visible,false);
});

test('the actual street vault keeps knees in its lane and changes between carrying and cloth support without hand pops',()=>{
 const controller=createMarket(),player={};controller.begin(player,{x:65.5,y:0,face:1,hungerPlayed:true,food:'held',area:'chase'});
 const boy=make(player.x,player.y,player.z);let previous=null,oldX=player.x,maxArmStep=0,maxVaultKneeStep=0,maxEdgeKneeStep=0,maxLaneOffset=0,seenVault=false,seenCloth=false,finished=false;
 for(let n=0;n<1800;n++){
  controller.update(dt,{jump:n===60},player);const state=controller.state;
  boy.group.position.set(player.x,player.y,player.z);boy.group.rotation.y=state.heading;
  boy.animate({time:n*dt,dt,grounded:player.grounded,wake:1,speed:Math.hypot(player.vx,player.vz),travel:Math.abs(player.x-oldX),vy:player.vy,climb:state.climb,story:state});oldX=player.x;
  const q=probes(boy).map(p=>p.sub(boy.group.position));
  if(previous){
   maxArmStep=Math.max(maxArmStep,q[2].distanceTo(previous[2]),q[3].distanceTo(previous[3]));
   if(state.climb)maxVaultKneeStep=Math.max(maxVaultKneeStep,q[6].distanceTo(previous[6]),q[7].distanceTo(previous[7]));
   if(state.marketAction?.type==='awning-drop'&&state.marketAction.airborne&&state.marketAction.airTime<.20)maxEdgeKneeStep=Math.max(maxEdgeKneeStep,q[6].distanceTo(previous[6]),q[7].distanceTo(previous[7]));
  }
  if(state.climb){seenVault=true;maxLaneOffset=Math.max(maxLaneOffset,Math.abs(q[6].z),Math.abs(q[7].z));}
  seenCloth ||= state.phase==='awning-impact';previous=q;
  assert(transforms(boy).every(Number.isFinite));
  if(state.area==='market'){finished=true;assert.equal(player.y,MARKET.groundY);break;}
 }
 assert(seenVault&&seenCloth&&finished);
 assert(maxLaneOffset<.24,`A railing knee leaves its actual lane by ${maxLaneOffset.toFixed(3)}m.`);
 assert(maxVaultKneeStep<.12,`The planted vault knee flips ${maxVaultKneeStep.toFixed(3)}m in one frame.`);
 assert(maxEdgeKneeStep<.12,`Leaving the cloth snaps a knee ${maxEdgeKneeStep.toFixed(3)}m.`);
 assert(maxArmStep<.14,`A support/carry handoff jumps a palm ${maxArmStep.toFixed(3)}m.`);
});
