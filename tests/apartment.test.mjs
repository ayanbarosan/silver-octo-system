import test from 'node:test';
import assert from 'node:assert/strict';
import {APARTMENT,apartmentRoom,createApartment,normalizeApartmentSave} from '../src/apartment.js';

const setup=saved=>{const apartment=createApartment(),player={};assert(apartment.begin(player,saved));return{apartment,player};};
function advance(r,input,seconds,hz=120){for(let i=0;i<Math.round(seconds*hz);i++)r.apartment.update(1/hz,input,r.player);}

test('entry reveals the kitchen and a continuous supported lane reaches living and bedroom in order',()=>{
 const r=setup(),visited=new Set();
 assert.equal(r.player.x,APARTMENT.entry.x);assert.equal(r.apartment.state.room,'kitchen');assert(r.apartment.state.nearExit);
 for(let i=0;i<2400;i++){
  r.apartment.update(1/120,{direction:1},r.player);visited.add(r.apartment.state.room);
  assert.equal(r.player.y,0);assert.equal(r.player.z,APARTMENT.lane);assert(r.player.grounded);
  assert.equal(r.apartment.state.onStairs,false);assert.equal(r.apartment.state.slope,0);
 }
 assert.deepEqual([...visited],['kitchen','living','bedroom']);assert.equal(r.player.x,APARTMENT.maxX);assert.equal(r.player.vx,0);
 assert.equal(r.apartment.state.room,'bedroom');assert(!r.apartment.state.nearExit);
 advance(r,{direction:-1,running:true},12);
 assert.equal(r.player.x,APARTMENT.minX);assert.equal(r.player.vx,0);assert(r.apartment.state.nearExit);
 assert.equal(apartmentRoom(9.5),'living');assert.equal(apartmentRoom(17.3),'bedroom');
});

test('running accelerates into motion and reversing retains momentum before turning',()=>{
 const r=setup({x:12,face:1});
 advance(r,{direction:1,running:true},1);
 assert(r.player.vx>2.5&&r.player.vx<=APARTMENT.runSpeed);
 const before=r.player.x;r.apartment.update(1/120,{direction:-1},r.player);
 assert(r.player.x>before,'A direction change must decelerate the moving body before moving backward.');assert.equal(r.player.face,1);
 advance(r,{direction:-1},.4);assert(r.player.vx<0);assert.equal(r.player.face,-1);
 const speed=Math.abs(r.player.vx);advance(r,{direction:0},1);
 assert(Math.abs(r.player.vx)<.002&&Math.abs(r.player.vx)<speed);assert.equal(r.apartment.state.velocity,Math.abs(r.player.vx));
});

test('movement covers the same physical distance at low and high update rates',()=>{
 const run=hz=>{const r=setup({x:12,face:1});for(const [seconds,input]of[[2,{direction:1,running:true}],[1,{direction:0}],[2,{direction:-1}]])advance(r,input,seconds,hz);return r.player;};
 const reference=run(120);
 for(const hz of[30,60,240]){const result=run(hz);assert(Math.abs(result.x-reference.x)<.00005,`${hz} Hz must not alter travel.`);assert(Math.abs(result.vx-reference.vx)<.00001);assert.equal(result.face,reference.face);}
});

test('pause and invalid time freeze the exact room position while jump inputs keep feet supported',()=>{
 const r=setup({x:9.4,face:1});advance(r,{direction:1},.3);
 const before=structuredClone({player:r.player,state:r.apartment.state});
 for(const dt of[0,-1,NaN,Infinity,undefined])r.apartment.update(dt,{direction:-1,running:true},r.player);
 assert.deepEqual({player:r.player,state:r.apartment.state},before);
 for(let i=0;i<100;i++){r.apartment.update(1/120,{direction:1,jump:true,up:true},r.player);assert.equal(r.player.y,0);assert.equal(r.player.vy,0);assert(r.player.grounded);}
 const x=r.player.x;advance(r,{direction:NaN},1);assert(r.player.x>=x);assert.equal(r.player.vx,0);
});

test('Continue restores supported positions in every room with no carried velocity or mutable snapshot',()=>{
 for(const x of[APARTMENT.minX,1.4,8,9.5,14,17.3,23,APARTMENT.maxX])for(const face of[-1,1]){
  const r=setup({x,face,room:'wrong',vx:200});
  assert.equal(r.player.x,x);assert.equal(r.player.face,face);assert.equal(r.player.vx,0);assert.equal(r.apartment.state.room,apartmentRoom(x));
  const snapshot=r.apartment.snapshot();assert.deepEqual(snapshot,{x,face});snapshot.x=100;snapshot.face=0;
  assert.equal(r.player.x,x);assert.equal(r.player.face,face);
  assert.equal(r.apartment.begin(r.player,{x:7,face:1}),false,'An active chapter must not replace its live position.');
 }
 for(const value of[null,[],{}, {x:NaN,face:1},{x:Infinity,face:1},{x:.5,face:1},{x:25.01,face:1},{x:'4',face:1},{x:4,face:0}])assert.equal(normalizeApartmentSave(value),null);
 const r=setup({x:5,face:-1});
 for(const patch of[{y:.1},{y:NaN},{z:0},{z:Infinity},{grounded:false},{grounded:'yes'}]){
  const before={...r.player};Object.assign(r.player,patch);assert.equal(r.apartment.snapshot(),null);Object.assign(r.player,before);
 }
 r.apartment.reset();assert.equal(r.apartment.state,null);assert.equal(r.apartment.active,false);assert.equal(r.apartment.snapshot(),null);
 assert(r.apartment.begin(r.player));assert.equal(r.player.x,APARTMENT.entry.x);assert.equal(r.player.face,1);
});
