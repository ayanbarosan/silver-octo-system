import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createApartmentFather} from '../src/apartment-father.js';

const make=()=>{const m=createApartmentFather(THREE);m.group.position.set(6,0,-.2);return m;};
function meshes(model){const result=[];model.group.traverse(o=>{if(o.isSkinnedMesh)result.push(o)});return result;}
function components(g){
 const p=g.attributes.position,byPosition=new Map(),vertex=new Int32Array(p.count),parents=[];
 for(let i=0;i<p.count;i++){
  const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e5)).join('/');
  if(!byPosition.has(key)){byPosition.set(key,parents.length);parents.push(parents.length)}vertex[i]=byPosition.get(key);
 }
 const root=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i]}return i;};
 const merge=(a,b)=>{a=root(a);b=root(b);if(a!==b)parents[b]=a;};
 for(let i=0;i<g.index.count;i+=3){const a=vertex[g.index.getX(i)];merge(a,vertex[g.index.getX(i+1)]);merge(a,vertex[g.index.getX(i+2)])}
 return new Set(parents.map((_,i)=>root(i))).size;
}

test('each garment is a connected smooth surface with valid skeletal weights and texture coordinates',()=>{
 const model=make(),surfaces=meshes(model);assert.equal(surfaces.length,2);
 for(const mesh of surfaces){
  const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,w=g.attributes.skinWeight,ids=g.attributes.skinIndex;
  assert.equal(components(g),1,`${mesh.name} must not be assembled from disconnected limb shells.`);
  assert.equal(uv.count,p.count);assert.equal(n.count,p.count);assert.equal(w.count,p.count);
  for(let i=0;i<p.count;i++){
   assert([p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i),uv.getX(i),uv.getY(i)].every(Number.isFinite));
   const weights=[w.getX(i),w.getY(i),w.getZ(i),w.getW(i)],bones=[ids.getX(i),ids.getY(i),ids.getZ(i),ids.getW(i)];
   assert(weights.every(v=>v>=0&&v<=1));assert(Math.abs(weights.reduce((a,b)=>a+b,0)-1)<1e-5);
   assert(bones.every(v=>Number.isInteger(v)&&v>=0&&v<mesh.skeleton.bones.length));
   assert(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))>.9);
  }
 }
});

test('the open cardigan and inset shirt share the skinned mesh without missing or overlapping material groups',()=>{
 const coat=meshes(make()).find(m=>m.name.includes('coat')),g=coat.geometry;
 assert(Array.isArray(coat.material)&&coat.material.length>=2);
 const covered=new Uint8Array(g.index.count),used=new Set();
 for(const part of g.groups){assert(part.start%3===0&&part.count%3===0);used.add(part.materialIndex);for(let i=part.start;i<part.start+part.count;i++){assert(!covered[i],'Garment triangles must not be drawn twice.');covered[i]=1;}}
 assert(covered.every(Boolean));assert(used.has(0)&&used.has(1));
 assert(coat.material[0].map?.isTexture&&coat.material[1].map?.isTexture);
 assert(coat.material[0].map.image.width>=256,'Knit detail must remain readable at the game camera distance.');
 const p=g.attributes.position;
 for(const part of g.groups.filter(part=>part.materialIndex===1))for(let i=part.start;i<part.start+part.count;i++){
  const vertex=g.index.getX(i),x=p.getX(vertex),y=p.getY(vertex),z=p.getZ(vertex),halfWidth=.055+.052*THREE.MathUtils.clamp((y-1.10)/.47,0,1);
  assert(Math.abs(x)<=halfWidth+.00001&&y>=.945-.00001&&y<=1.72+.00001&&z>=.06-.00001,'The shirt edge must follow the opening, without whole triangles protruding into the cardigan.');
 }
});

test('the curled fingers grip the outside of the tumbler instead of crossing its transparent wall',()=>{
 const model=make(),mesh=model.group.getObjectByName('father-left-sculpted-hand'),p=mesh.geometry.attributes.position;
 let deepest=0;
 for(let i=0;i<p.count;i++){
  const y=p.getY(i);if(y<-.090||y>.076)continue;
  const radius=.054+.008*(y+.092)/.17,distance=Math.hypot(p.getX(i)-.026,p.getZ(i)-.060);
  deepest=Math.max(deepest,radius-distance);
 }
 assert(deepest<.004,`A finger passes ${(deepest*100).toFixed(2)}cm through the held glass.`);
});

test('the trouser waist stays behind the shirt hem in the slouched standing pose',()=>{
 const model=make();model.update(0,{fatherPhase:'chase',fatherX:0,fatherZ:0,fatherSpeed:0});
 model.group.getObjectByName('father-articulated-rig').rotation.y=0;model.group.updateWorldMatrix(true,true);
 const coat=model.group.getObjectByName('father-continuous-coat'),trousers=model.group.getObjectByName('father-continuous-trousers');
 for(const y of[.92,.94,.95,.96]){
  const ray=new THREE.Raycaster(new THREE.Vector3(0,y,1),new THREE.Vector3(0,0,-1)),front=ray.intersectObject(coat,false)[0],back=ray.intersectObject(trousers,false)[0];
  assert(front&&back);assert.equal(front.face.materialIndex,1);
  assert(front.point.z>back.point.z+.001,'The trousers must not form a brown patch through the grey shirt.');
 }
});

test('garments remain finite and attached through the seated, pursuit, strike and escape poses',()=>{
 const model=make(),surfaces=meshes(model),point=new THREE.Vector3();
 for(const [phase,time]of[['sleep',0],['rising',.5],['rising',1.8],['chase',2],['retrieve',.46],['catch',.48],['window',.65],['watch',0]]){
  const state={fatherPhase:phase,fatherPhaseTime:time,fatherX:0,fatherY:0,fatherZ:0,fatherFace:1,fatherSpeed:2,attackProgress:time/.95,fatherWindowProgress:.5};
  model.update(time,state);model.group.updateWorldMatrix(true,true);
  const bounds=new THREE.Box3().makeEmpty();
  for(const mesh of surfaces){
   const g=mesh.geometry;for(let i=0;i<g.attributes.position.count;i++){
    mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld);assert(point.toArray().every(Number.isFinite));bounds.expandByPoint(point);
   }
  }
  assert(bounds.min.y>-.1,`${phase} garments pass below the floor.`);
  assert(bounds.max.y<2.35,`${phase} garment deformation explodes above the actor.`);
  assert(bounds.max.x-bounds.min.x<2.2,`${phase} skin stretches away from its rig.`);
  assert(bounds.max.z-bounds.min.z<2.5,`${phase} skin stretches away from its rig.`);
  assert(Object.values(model.metadata.probes).every(p=>p.every(Number.isFinite)));
 }
});

test('the fitted scalp stays outside the face instead of exposing jagged skin islands between the hair locks',()=>{
 const model=make(),head=model.group.getObjectByName('father-head'),skin=head.getObjectByName('father-smooth-face'),cap=head.getObjectByName('father-fitted-wavy-scalp');
 assert(skin?.isMesh&&cap?.isMesh);head.updateWorldMatrix(true,true);
 const original=skin.material.side;skin.material.side=THREE.DoubleSide;
 const origin=new THREE.Vector3(0,.239,-.006);head.localToWorld(origin);
 const ray=new THREE.Raycaster(),point=new THREE.Vector3(),delta=new THREE.Vector3(),vertices=cap.geometry.attributes.position;
 let worst=0,samples=0;
 for(let i=1;i<vertices.count;i+=29){
  point.fromBufferAttribute(vertices,i).applyMatrix4(cap.matrixWorld);delta.copy(point).sub(origin);const distance=delta.length();
  if(distance<.01)continue;ray.set(origin,delta.normalize());const hit=ray.intersectObject(skin,false)[0];
  if(hit){worst=Math.max(worst,hit.distance-distance);samples++;}
 }
 skin.material.side=original;assert(samples>30);assert(worst<.004,`The cap sinks ${worst.toFixed(4)}m inside the skin and will expose flickering islands.`);
});
