import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBoy} from '../src/character.js';
import {HOME,createHome,homeDirection,homeHeight} from '../src/home.js';
function tread(f,x){if(f>=3)return 9.6;const d=homeDirection(f),start=d>0?HOME.left:HOME.right,p=(x-start)*d/(HOME.right-HOME.left);return p<=0?f*3.2:p>=1?(f+1)*3.2:(f+(Math.floor(p*20)+1)/20)*3.2;}
test('ascending home feet bear weight on the actual treads in each lane and settle at the second-floor door',()=>{
 const home=createHome(),player={},boy=createBoy(THREE);home.begin(player);let time=0,contacts=0,previous={...player};
 for(let n=0;n<4000;n++){
  const direction=home.state.flight===1?-1:home.state.flight===2&&player.x<=3.4?-1:1;
  home.update(1/90,{direction},player);time+=1/90;boy.group.position.set(player.x,player.y,player.z);boy.group.rotation.y=home.state.heading;
  boy.animate({time,dt:1/90,speed:Math.hypot(player.vx,player.vz),travel:Math.hypot(player.x-previous.x,player.z-previous.z),grounded:true,wake:1,stairs:home.state});boy.group.updateWorldMatrix(true,true);
  const a=boy.group.userData.animation;assert(['head','pelvis','leftKnee','rightKnee'].every(name=>boy.group.getObjectByName(name).getWorldPosition(new THREE.Vector3()).toArray().every(Number.isFinite)));
  if(home.state.phase==='walk')for(let i=0;i<2;i++)if(a.feet[i].stance&&a.feet[i].contactWeight>.98){
   const sole=boy.group.getObjectByName(i?'rightSole':'leftSole').getWorldPosition(new THREE.Vector3()),support=tread(home.state.flight,sole.x);
   assert(Math.abs(sole.y-support)<.045,`A supporting home shoe missed tread by ${(sole.y-support).toFixed(3)} at flight${home.state.flight}.`);contacts++;
  }
  previous={...player};if(home.state.nearApartment&&player.x<2.3)break;
 }
 assert.equal(home.state.flight,2);assert(home.state.nearApartment);assert(Math.abs(player.y-6.4)<1e-8);assert(contacts>600);
});

test('real trouser and shin vertices clear every ascending riser, including approach and toe-off',()=>{
 const home=createHome(),p={},boy=createBoy(THREE);home.begin(p);let time=0,old={...p},samples=0;
 const boxes=[];for(let f=0;f<3;f++)for(let i=0;i<20;i++){const dir=homeDirection(f),x=(dir>0?HOME.left:HOME.right)+dir*(i+.5)*.41,y=(f+(i+1)/20)*3.2,z=HOME.lanes[f%2];boxes.push({minX:x-.211,maxX:x+.211,minY:y-.19,maxY:y+.0045,minZ:z-.5175,maxZ:z+.5175});}
 const v=new THREE.Vector3();
 for(let n=0;n<2500;n++){
  home.update(1/90,{direction:homeDirection(Math.min(home.state.flight,2))},p);time+=1/90;
  boy.group.position.set(p.x,p.y,p.z);boy.group.rotation.y=home.state.heading;
  boy.animate({time,dt:1/90,speed:Math.hypot(p.vx,p.vz),travel:Math.hypot(p.x-old.x,p.z-old.z),grounded:true,wake:1,stairs:home.state});boy.group.updateWorldMatrix(true,true);
  if(n%3===0)boy.group.traverse(object=>{
   if(!object.isMesh)return;let parent=object,leg=false,shoe=false;while(parent){leg||=parent.name.endsWith('Hip');shoe||=parent.name.endsWith('Ankle');parent=parent.parent;}if(!leg||shoe)return;
   const data=object.geometry.getAttribute('position');for(let i=0;i<data.count;i+=2){v.fromBufferAttribute(data,i).applyMatrix4(object.matrixWorld);samples++;
    for(const b of boxes)if(v.x>b.minX+.005&&v.x<b.maxX-.005&&v.y>b.minY+.005&&v.y<b.maxY-.015&&v.z>b.minZ+.005&&v.z<b.maxZ-.005)assert.fail(`A real shin vertex crossed the stair at ${v.toArray()} on flight ${home.state.flight}.`);
   }
  });
  old={...p};if(home.state.flight===3&&home.state.phase==='walk')break;
 }
 assert.equal(home.state.flight,3);assert(samples>10000);
});
