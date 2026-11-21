import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createMarketVendor} from '../src/market-vendor.js';

function make(){const model=createMarketVendor(THREE);model.group.visible=true;return model;}
const record=(phase,x=0,time=0,extra={})=>({phase,x,y:0,z:1.4,face:1,time,...extra});
const points=model=>Object.values(model.metadata.probes).flat();
function transforms(model){const a=[];model.group.traverse(o=>a.push(...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()));return a;}
function components(g){
 const p=g.attributes.position,parents=Array.from({length:p.count},(_,i)=>i),root=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;};
 for(let i=0;i<g.index.count;i+=3){const a=root(g.index.getX(i));for(let j=1;j<3;j++)parents[root(g.index.getX(i+j))]=a;}
 return new Set(parents.map((_,i)=>root(i))).size;
}

test('the vendor has continuous skinned clothing and a connected apron with valid fabric coordinates',()=>{
 const model=make(),surfaces=[];model.group.traverse(o=>{if(o.isSkinnedMesh)surfaces.push(o)});assert.equal(surfaces.length,3);
 assert.equal(model.metadata.hasGlass,false);assert.match(model.metadata.appearance,/apron/);
 assert(!model.group.getObjectByName('father-tumbler'));
 const apron=surfaces.find(o=>o.name==='vendor-continuous-apron');assert(apron);assert.equal(components(apron.geometry),1);assert(apron.material.map.image.width>=256);
 for(const mesh of surfaces){
  const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,w=g.attributes.skinWeight,ids=g.attributes.skinIndex;
  assert(g.attributes.uv.count===p.count&&n.count===p.count);
  for(let i=0;i<p.count;i++){
   assert([p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i)].every(Number.isFinite));
   assert(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<1e-5);
   assert([ids.getX(i),ids.getY(i),ids.getZ(i),ids.getW(i)].every(k=>k>=0&&k<mesh.skeleton.bones.length));
  }
 }
});

test('chasing advances the gait by distance while each supporting foot stays on its world anchor',()=>{
 const model=make();let previous=null,plantedSamples=0,largestSlide=0;
 for(let n=0;n<240;n++){
  const time=n/60;model.update(time,{vendor:record('chase',time*2.8,time)});
  assert(points(model).every(Number.isFinite));assert(transforms(model).every(Number.isFinite));
  assert(model.metadata.bounds.min[1]>-.006,'The seller must not sink through the street.');
  assert(model.metadata.bounds.max[1]<2.30,'The skeleton must keep the expected adult silhouette.');
  for(let i=0;i<2;i++){
   const foot=model.metadata.feet[i],old=previous?.[i];
   if(n>20&&foot.stance&&old?.stance&&foot.contactWeight>.95){
    largestSlide=Math.max(largestSlide,new THREE.Vector3(...foot.position).distanceTo(new THREE.Vector3(...old.position)));plantedSamples++;
   }
  }
  previous=structuredClone(model.metadata.feet);
 }
 assert(plantedSamples>100);assert(largestSlide<.002,`A planted shoe slides ${largestSlide.toFixed(3)}m.`);assert(model.metadata.gait>8);
});

test('counter, notice, physical exit, braking, watch and catch poses stay finite and the seller settles at the rail',()=>{
 const model=make();let time=0;
 for(const phase of ['idle','notice','exit','chase','brake','watch','caught']){
  for(let n=0;n<60;n++){
   time+=1/60;const moving=phase==='exit'||phase==='chase';
   model.update(time,{vendor:record(phase,moving?21+n*.025:22,n/60,{z:phase==='exit'?-1+n*.04:1.4,heading:phase==='exit'?Math.PI*.2:Math.PI/2})});
   assert(points(model).every(Number.isFinite));assert(transforms(model).every(Number.isFinite));
  }
 }
 for(let n=0;n<90;n++){time+=1/60;model.update(time,{vendor:record('watch',65.4,n/60)});}
 assert(model.metadata.watchingDown);assert(model.metadata.feet.every(f=>Math.abs(f.position[1])<.01&&f.contactWeight>.99));
 const before=transforms(model),gait=model.metadata.gait,s=record('watch',65.4,89/60);
 for(let n=0;n<60;n++)model.update(time,{vendor:s});
 assert.deepEqual(transforms(model),before,'Pausing must freeze the actual pose.');assert.equal(model.metadata.gait,gait);
 assert.equal(model.metadata.phase,'watch');
});

test('running alternates the empty hands instead of pumping both arms together',()=>{
 const model=make();let separation=0,opposition=0,samples=0;
 for(let n=0;n<180;n++){
  const time=n/60;model.update(time,{vendor:record('chase',time*2.8,time)});
  if(n<20)continue;
  const p=model.metadata.probes,hands=p.leftHand[0]-p.rightHand[0],feet=p.leftFoot[0]-p.rightFoot[0];
  separation=Math.max(separation,Math.abs(hands));opposition+=hands*feet;samples++;
 }
 assert(separation>.35,'The seller must alternate his arms while running.');
 assert(opposition/samples<-.02,'Arms should counterbalance the opposite legs.');
});

test('a replay resets the foot anchors instead of retaining the old street position',()=>{
 const model=make();for(let n=0;n<90;n++)model.update(n/60,{vendor:record('chase',40+n*.04,n/60)});
 model.update(0,{vendor:record('idle',27.4,0,{z:-1})});
 const b=model.preciseBounds;assert(b.min[0]>26.5&&b.max[0]<28.4);assert(b.min[2]>-1.9&&b.max[2]<0);
 assert(points(model).every(Number.isFinite));assert.equal(model.metadata.gait,0);
});
