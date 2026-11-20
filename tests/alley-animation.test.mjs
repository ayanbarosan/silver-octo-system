import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBoy} from '../src/character.js';
import {ALLEY} from '../src/alley.js';

const dt=1/120,clamp=THREE.MathUtils.clamp,smooth=x=>THREE.MathUtils.smoothstep(clamp(x,0,1),0,1);
const jointNames=['leftSole','rightSole','leftPalm','rightPalm','leftKnee','rightKnee','pelvis','head'];
const points=boy=>[...jointNames.map(name=>boy.group.getObjectByName(name).getWorldPosition(new THREE.Vector3())),
 ...['leftPalm','rightPalm'].flatMap(name=>{const palm=boy.group.getObjectByName(name);return [palm.parent,palm.parent.parent].map(joint=>joint.getWorldPosition(new THREE.Vector3()));})];
const transforms=boy=>{const a=[];boy.group.traverse(o=>a.push(...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()));return a;};
function make(face=1){const boy=createBoy(THREE);boy.group.position.set(0,0,1.4);boy.group.rotation.y=face*Math.PI/2;boy.reset();return boy;}
function action(type,objectX,objectY,face=1,extra={}){return {type,progress:1,elapsed:0,objectX,objectY,objectZ:1.4,face,...extra};}
function animate(boy,time,alleyAction,extra={}){return boy.animate({time,dt,grounded:true,wake:1,story:alleyAction?{alleyAction}:null,...extra});}
function gripError(boy,a,rear=0){
 const p=points(boy);let result=0;
 for(let i=0;i<2;i++)result=Math.max(result,p[i+2].distanceTo(new THREE.Vector3(a.objectX-a.face*rear,a.objectY+.06,a.objectZ-a.face*(i===0?-1:1)*.15)));
 return result;
}

test('carrying the jack keeps both palms on its side handles while the walking gait and planted feet continue',()=>{
 for(const face of[-1,1]){
  const boy=make(face);let steps=0,grip=0,floor=0,swing=0,maxMotion=0,previous=null,phaseChanges=0,lastPhase=0;
  for(let n=0;n<=480;n++){
   const time=n*dt,x=face*.95*time;boy.group.position.x=x;
   const a=action('carry',x+face*.38,.77,face,{elapsed:time});
   if(animate(boy,time,a,{speed:.95,travel:.95*dt}).footstep)steps++;
   const p=points(boy),meta=boy.group.userData.animation;assert(transforms(boy).every(Number.isFinite));
   if(previous)p.forEach((v,i)=>maxMotion=Math.max(maxMotion,v.distanceTo(previous[i])));previous=p;
   if(Math.abs(meta.phase-lastPhase)>.001)phaseChanges++;lastPhase=meta.phase;
   if(n>60){
    grip=Math.max(grip,gripError(boy,a));assert.equal(meta.mode,'carry-walk');
    for(const foot of meta.feet){if(foot.contactWeight>.9)floor=Math.max(floor,Math.abs(foot.position.y));else swing=Math.max(swing,foot.position.y);}
   }
  }
  assert(grip<.015,`A carrying palm leaves its handle by ${grip.toFixed(3)}m.`);
  assert(floor<.02);assert(swing>.045);assert(steps>=5&&phaseChanges>200,'A carried tool must not freeze the legs into a sliding pose.');
  assert(maxMotion<.09,`A carrying joint snaps ${maxMotion.toFixed(3)}m in one frame.`);
 }
});

test('pickup bends through the knees, transfers the jack to the hands and lowers it without a pose jump',()=>{
 const boy=make();let previous=null,maxMotion=0,headMin=Infinity,minFloor=Infinity;
 for(let n=0;n<=500;n++){
  const time=n*dt;let a=null;
  if(time<.8){const p=time/.8,w=smooth((p-.32)/.68);a=action('pickup-jack',THREE.MathUtils.lerp(.55,.38,w),THREE.MathUtils.lerp(.12,.77,w),1,{progress:p,elapsed:time});}
  else if(time<1.4)a=action('carry',.38,.77,1,{elapsed:time});
  else if(time<2.9){const p=(time-1.4)/1.5,w=smooth((p-.55)/.45);a=action('place-jack',THREE.MathUtils.lerp(.38,.78,w),THREE.MathUtils.lerp(.77,.11,w),1,{progress:p,elapsed:time-1.4});}
  animate(boy,time,a);const p=points(boy);assert(transforms(boy).every(Number.isFinite));
  if(previous)p.forEach((v,i)=>maxMotion=Math.max(maxMotion,v.distanceTo(previous[i])));previous=p;
  headMin=Math.min(headMin,p[7].y);minFloor=Math.min(minFloor,new THREE.Box3().setFromObject(boy.group,true).min.y);
  if(a?.type==='pickup-jack'&&a.progress>.42)assert(gripError(boy,a)<.025,'The rising jack must stay in both hands.');
  if(a?.type==='place-jack'&&a.progress>.58&&a.progress<.86){const rear=.14*THREE.MathUtils.smoothstep(a.progress,.55,.98);assert(gripError(boy,a,rear)<.045,'The lowering palms must stay on the rear portions of the side rails.');}
 }
 assert(headMin<.85,'The boy must lower his body to reach a jack on the floor.');assert(minFloor>-.03);
 assert(maxMotion<.10,`A pickup/place joint jumps ${maxMotion.toFixed(3)}m.`);assert(points(boy)[7].y>1.2);
 assert.equal(boy.group.userData.animation.alleyStage,'none');
});

test('cranking follows the moving handle through repeated strokes without sliding the supporting soles',()=>{
 for(const face of[-1,1]){
  const boy=make(face);let error=0,floor=0,previous=null,maxPalmStep=0;
  for(let n=0;n<=420;n++){
   const time=n*dt,handle={x:face*.36,y:.78+.10*Math.sin(time*Math.PI*2),z:1.4};
   const a=action('crank',face*.78,.11+.3*time/3.5,face,{elapsed:time,crankPhase:time%1,progress:time/8,handle});
   animate(boy,time,a);const p=points(boy),meta=boy.group.userData.animation;assert(transforms(boy).every(Number.isFinite));
   if(previous)for(let i=2;i<4;i++)maxPalmStep=Math.max(maxPalmStep,p[i].distanceTo(previous[i]));previous=p;
   if(n>60)for(let i=0;i<2;i++){
    const expected=new THREE.Vector3(handle.x-(i===0?0:.025)*face,handle.y-(i===0?0:.012),handle.z-face*(i===0?-1:1)*.11);
    error=Math.max(error,p[i+2].distanceTo(expected));floor=Math.max(floor,Math.abs(p[i].y));
    assert(meta.hands[i].contactWeight>.9);
   }
  }
  assert(error<.015,`A cranking palm misses the moving lever by ${error.toFixed(3)}m.`);assert(floor<.02);assert(maxPalmStep<.05);
 }
});

test('opening the high garage window follows its outward moving handle, releases it and braces on the frame',()=>{
 const G=ALLEY.garage,boy=make();boy.group.position.set(G.windowReachX,.75,G.lane);let previous=G.windowReachX,maxError=0,braceError=0,contactFrames=0,previousPoints=null,maxMotion=0;
 for(let n=0;n<=114;n++){
  const time=n*dt,p=time/.95,x=THREE.MathUtils.lerp(G.windowReachX,G.windowAlignX,smooth(p/.35)),travel=x-previous;boy.group.position.x=x;previous=x;
  const angle=smooth((p-.32)/.68)*Math.PI*.56,handle={x:G.windowX+.1-.1*Math.cos(angle)+.78*Math.sin(angle),y:G.windowHandleY,z:G.lane-.78+.1*Math.sin(angle)+.78*Math.cos(angle)};
  const a=action('open-window',G.windowX,G.windowHandleY,1,{objectZ:G.lane,handle,progress:p,elapsed:time});
  animate(boy,time,a,{speed:travel/dt,travel});const q=points(boy);
  if(previousPoints)q.forEach((v,i)=>maxMotion=Math.max(maxMotion,v.distanceTo(previousPoints[i])));previousPoints=q;
  if(p>.30&&p<.43){maxError=Math.max(maxError,q[2].distanceTo(new THREE.Vector3(handle.x,handle.y,handle.z)));contactFrames++;}
  if(p>.30&&p<.80)braceError=Math.max(braceError,q[3].distanceTo(new THREE.Vector3(G.windowX,G.windowHandleY-.15,G.lane-.17)));
  if(p>.6)assert.equal(boy.group.userData.animation.hands[0].contactWeight,0,'The swinging pane must leave the released primary hand.');
  for(const f of boy.group.userData.animation.feet)if(f.contactWeight>.9)assert(Math.abs(f.position.y-.75)<.025);
 }
 assert(contactFrames>12);assert(maxError<.025,`The moving window handle is ${maxError.toFixed(3)}m away from the palm.`);
 assert(braceError<.025,`The bracing palm leaves the fixed lower frame by ${braceError.toFixed(3)}m.`);assert(maxMotion<.08);
});

test('pause freezes the new tool poses and reset drops their grip and weight state',()=>{
 const boy=make();for(let n=0;n<150;n++)animate(boy,n*dt,action('crank',.78,.22,1,{elapsed:n*dt,handle:{x:.36,y:.8,z:1.4}}));
 const before=transforms(boy),stage=boy.group.userData.animation.alleyStage;
 boy.animate({time:100,dt:0,speed:4,story:{alleyAction:action('carry',20,10)}});assert.deepEqual(transforms(boy),before);assert.equal(boy.group.userData.animation.alleyStage,stage);
 boy.reset();assert.equal(boy.group.userData.animation.alleyStage,'none');assert.equal(boy.group.userData.animation.mode,'idle');
 for(let n=0;n<120;n++)animate(boy,n*dt,null);
 assert(points(boy)[7].y>1.2);assert(boy.group.userData.animation.hands.every(hand=>hand.contactWeight===0));
});

test('the final pumping pose is consistent at 30, 60 and 120 display updates per second',()=>{
 const poses=[];
 for(const hz of[30,60,120]){
  const boy=make();for(let n=0;n<=3*hz;n++){
   const time=n/hz,a=action('crank',.78,.28,1,{elapsed:time,handle:{x:.36,y:.78+.10*Math.sin(time*Math.PI*2),z:1.4}});
   animate(boy,time,a,{dt:1/hz});
  }poses.push(points(boy));
 }
 for(let i=0;i<2;i++)poses[i].forEach((p,j)=>assert(p.distanceTo(poses[2][j])<.015,'Display rate changes the tool contact pose.'));
});

test('moving the narrow alley crates keeps the knees outside their fronts and palms on their upper edges',()=>{
 for(const crate of ALLEY.crates)for(const face of[-1,1]){
  const boy=make(face);let palmError=0,kneeGap=Infinity;
  for(let n=0;n<360;n++){
   const time=n*dt,objectX=crate.x+face*.66*time,rootX=objectX-face*(crate.w/2+.40),gripY=Math.min(.82,crate.y-.06);
   boy.group.position.set(rootX,0,crate.z);
   boy.animate({time,dt,grounded:true,wake:1,speed:.66,travel:.66*dt,
    interaction:{kind:'push',side:-face,objectX,objectZ:crate.z,topY:crate.y,gripY,halfWidth:crate.w/2,gripOffset:crate.w/2+.015}});
   if(n>60)for(let i=0;i<2;i++){
    const palm=boy.group.getObjectByName(i===0?'leftPalm':'rightPalm').getWorldPosition(new THREE.Vector3());
    const target=new THREE.Vector3(objectX-face*(crate.w/2+.015),gripY,crate.z+face*(i===0?1:-1)*.16);
    palmError=Math.max(palmError,palm.distanceTo(target));
    const knee=boy.group.getObjectByName(i===0?'leftKnee':'rightKnee').getWorldPosition(new THREE.Vector3());
    kneeGap=Math.min(kneeGap,(objectX-face*crate.w/2-knee.x)*face-.075);
   }
  }
  assert(palmError<.025,`${crate.id} palms miss its real upper grip by ${palmError.toFixed(3)}m.`);
  assert(kneeGap>.005,`${crate.id} knees overlap its front by ${(-kneeGap).toFixed(3)}m.`);
 }
});

test('alignment steps keep advancing the gait until the jack is ready for the planted lift or lowering action',()=>{
 for(const type of ['pickup-jack','place-jack']){
  const boy=make();let previous=0,startPhase=0,phaseChange=0;
  for(let n=0;n<80;n++){
   const time=n*dt,p=type==='pickup-jack'?time/.8:time/1.5;
   const x=type==='pickup-jack'?.3*smooth(p/.28):.6*smooth(p/.62),travel=x-previous;previous=x;boy.group.position.x=x;
   const a=action(type,x+.38,.77,1,{progress:p,elapsed:time});animate(boy,time,a,{speed:travel/dt,travel});
   const phase=boy.group.userData.animation.phase;if(n===0)startPhase=phase;else phaseChange+=Math.abs(phase-startPhase);startPhase=phase;
  }
  assert(phaseChange>.12,`${type} must take actual steps while its root aligns with the tool.`);
 }
});

test('holding or releasing interact after placement rises into cranking without teleporting the released hands or soles',()=>{
 for(const releaseAt of[Infinity,1.63]){
 const boy=make();let previous=null,maxMotion=0,floor=0;
 for(let n=0;n<480;n++){
  const time=n*dt,p=Math.min(time/1.5,1),drop=smooth((p-.55)/.45),pump=time-1.5;
  const a=time>releaseAt?null:time<1.5?action('place-jack',.38+.4*drop,.77-.66*drop,1,{progress:p,elapsed:time}):
   action('crank',.78,.11,1,{progress:pump/8,elapsed:pump,handle:{x:.36,y:.78+.1*Math.sin(pump*Math.PI*2),z:1.4}});
  animate(boy,time,a);const q=points(boy);
  if(previous)q.forEach((v,i)=>maxMotion=Math.max(maxMotion,v.distanceTo(previous[i])));previous=q;
  floor=Math.max(floor,Math.abs(q[0].y),Math.abs(q[1].y));
  if(pump>.01&&pump<.28)assert(boy.group.userData.animation.hands.every(hand=>hand.contactWeight<.1),'Reaching for a new handle must not claim a full supporting grip.');
 }
 assert(maxMotion<.08,`A place-to-crank joint teleports ${maxMotion.toFixed(3)}m.`);assert(floor<.02);
 }
});
