import test from 'node:test';
import assert from 'node:assert/strict';
import {developerLocation,moveDeveloperCamera} from '../src/developer-tools.js';
import {createSession} from '../src/session.js';
test('every developer location is a valid independent supported Continue snapshot',()=>{
 const session=createSession(null);
 for(const id of['roof','stairwell','street','home','apartment','bedroom','fireescape','playground','alley','workshop','backyard']){
  const seed=developerLocation(id);assert(seed,`${id} must be supported`);assert(session.save(seed));assert.deepEqual(session.getSave(),seed);
  seed.player.x=1000;assert.notEqual(developerLocation(id).player.x,1000);
 }
 assert.equal(developerLocation('unknown'),null);
});
test('free movement crosses all three axes with diagonal speed bounded and independent of update rate',()=>{
 const move=hz=>{const p={x:0,y:0,z:0,vx:0,vy:0,vz:0,face:1};for(let i=0;i<hz;i++)moveDeveloperCamera(p,1/hz,{x:1,y:1,z:-1});return p;};
 const reference=move(120);assert(reference.x>1&&reference.y>1&&reference.z<-1);assert(Math.hypot(reference.vx,reference.vy,reference.vz)<=3.8+1e-8);assert(!reference.grounded);
 for(const hz of[30,60,240]){const p=move(hz);assert(Math.abs(p.x-reference.x)<1e-7);assert(Math.abs(p.y-reference.y)<1e-7);assert(Math.abs(p.z-reference.z)<1e-7);}
});
test('paused or invalid free movement freezes and boost remains finite within the scene bounds',()=>{
 const p={x:0,y:0,z:0,vx:0,vy:0,vz:0,face:1},before={...p};for(const dt of[0,-1,NaN,Infinity])moveDeveloperCamera(p,dt,{x:1});assert.deepEqual(p,before);
 for(let i=0;i<10000;i++)moveDeveloperCamera(p,1/60,{x:1,y:1,z:1,fast:true});assert(p.x<=220&&p.y<=65&&p.z<=90);assert(Object.values(p).every(v=>typeof v!=='number'||Number.isFinite(v)));
});

test('garage shortcuts restore independent playable puzzle checkpoints',async()=>{
 const {createAlley}=await import('../src/alley.js');
 for(const [id,area,x]of[['alley','alley',2],['workshop','garage',111.5],['backyard','yard',143]]){
  const seed=developerLocation(id),controller=createAlley(),player={};controller.begin(player,seed.alley);
  assert.equal(controller.state.area,area);assert.equal(player.x,x);assert.equal(player.y,0);assert(player.grounded);
  assert.deepEqual(controller.snapshot(),seed.alley);
  assert.equal(controller.state.jackStatus,area==='alley'?'ground':'raised');
  if(area!=='alley'){assert.equal(controller.state.pumpProgress,1);assert.equal(controller.state.fencePassed,true);}
  seed.alley.crateXs[0]=52;assert.deepEqual(developerLocation(id).alley.crateXs,[43,47,126]);
 }
});

test('free movement can inspect the entire final courtyard past the former x180 limit',()=>{
 const p={x:179,y:0,z:0,vx:0,vy:0,vz:0,face:1};
 for(let i=0;i<180;i++)moveDeveloperCamera(p,1/60,{x:1,fast:true});
 assert(p.x>194&&p.x<=220);
});

test('the storage shortcut restores the actual optional room and keeps the gate locked',async()=>{
 const {ALLEY,createAlley}=await import('../src/alley.js'),seed=developerLocation('storage');
 assert(seed);assert.equal(seed.alley.area,'storage');assert.equal(seed.alley.gateOpened,false);
 const player={},controller=createAlley();controller.begin(player,seed.alley);
 assert.equal(player.z,ALLEY.storage.lane);assert(controller.state.storageVisited);
 assert.equal(controller.state.gateKey,false);assert(controller.snapshot());
});

test('freezing pursuit holds the father while the player can still move, and release resumes him',async()=>{
 const {createApartment}=await import('../src/apartment.js');
 const apartment=createApartment(),player={};apartment.begin(player,{x:10,face:1});
 const before={x:apartment.state.fatherX,z:apartment.state.fatherZ,time:apartment.state.fatherPhaseTime};
 for(let n=0;n<90;n++)apartment.update(1/90,{direction:1,freezeFather:true},player);
 assert(player.x>11);assert.equal(apartment.state.fatherX,before.x);assert.equal(apartment.state.fatherZ,before.z);assert.equal(apartment.state.fatherPhaseTime,before.time);
 for(let n=0;n<270;n++)apartment.update(1/90,{direction:1,running:true},player);
 assert(apartment.state.fatherX>before.x);assert.notEqual(apartment.state.fatherPhase,'rising');
});
