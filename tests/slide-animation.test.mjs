import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBoy} from '../src/character.js';
import {createSlide} from '../src/slide.js';

function run(face=1,low=false,held=false){
 const boy=createBoy(THREE),action=createSlide();boy.group.rotation.y=face*Math.PI/2;
 const player={x:0,y:0,vx:face*3.3,vy:0,face,grounded:true};let time=0;
 const animate=(slide=null,crouch=0)=>{time+=1/120;boy.group.position.x=player.x;boy.animate({time,dt:1/120,speed:player.vx,travel:Math.abs(player.vx)/120,grounded:true,wake:1,slide,crouch});boy.group.updateWorldMatrix(true,true);};
 for(let n=0;n<180;n++){player.x+=player.vx/120;animate();}
 const frame=()=>({head:boy.group.getObjectByName('head').getWorldPosition(new THREE.Vector3()),feet:['leftSole','rightSole'].map(name=>boy.group.getObjectByName(name).getWorldPosition(new THREE.Vector3())),box:new THREE.Box3().setFromObject(boy.group,true),animation:structuredClone(boy.group.userData.animation)});
 let previous=frame(),maxHead=0,maxFoot=0,top=0,minY=0,glides=0;const stages=new Set();
 assert(action.begin(player));
 for(let n=0;n<120&&action.active;n++){
  action.update(1/120,{underLowGate:low},player);player.x+=player.vx/120;
  const s=action.state,crouch=low||held&&s?.phase==='recover'?1:s?.lowAmount??(held?1:0);
  animate(s,crouch);const f=frame();stages.add(f.animation.slideStage);
  maxHead=Math.max(maxHead,f.head.distanceTo(previous.head));f.feet.forEach((p,k)=>maxFoot=Math.max(maxFoot,p.distanceTo(previous.feet[k])));
  minY=Math.min(minY,f.box.min.y);
  if(s?.phase==='glide'){top=Math.max(top,f.box.max.y);glides++;assert.equal(f.animation.mode,'slide');assert(f.animation.feet.every(x=>x.contactWeight===0),'Sliding feet cannot report planted walking contacts.');}
  assert([f.head.x,f.head.y,...f.box.min.toArray(),...f.box.max.toArray()].every(Number.isFinite));previous=f;
 }
 for(let n=0;n<60;n++){player.x+=player.vx/120;animate(null,low||held?1:0);const f=frame();maxHead=Math.max(maxHead,f.head.distanceTo(previous.head));previous=f;}
 return {boy,stages,maxHead,maxFoot,top,minY,glides,last:previous};
}
for(const face of [-1,1])test(`running slide ${face<0?'left':'right'} uses a low real mesh and blends through drop, glide and recovery`,()=>{
 const r=run(face);assert(r.stages.has('drop')&&r.stages.has('glide')&&r.stages.has('recover'));
 assert(r.glides>40);assert(r.top<1.0,`Full sliding mesh reached ${r.top}m.`);assert(r.minY>-.045,`Mesh buried ${r.minY}m under pavement.`);
 assert(r.maxHead<.12,`Head moved ${r.maxHead}m in one frame.`);assert(r.maxFoot<.16,`Foot moved ${r.maxFoot}m in one frame.`);
 assert(!['slide','air'].includes(r.last.animation.mode));
});
test('slide recovery under a low fence blends into a supported crouch',()=>{
 const r=run(1,true,true);assert(r.top<1);assert(r.maxHead<.12);assert(r.last.box.max.y<.95);assert.equal(r.last.animation.mode,'crouch-walk');
});
test('holding crouch after a running slide recovers into the low gait without standing first',()=>{
 const r=run(-1,false,true);assert(r.last.box.max.y<.95);assert(r.maxHead<.12);assert.equal(r.last.animation.mode,'crouch-walk');
});
