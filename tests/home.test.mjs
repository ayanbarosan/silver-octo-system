import test from 'node:test';
import assert from 'node:assert/strict';
import {HOME,createHome,homeHeight,homeLane,normalizeHomeSave} from '../src/home.js';
const setup=saved=>{const home=createHome(),p={};assert(home.begin(p,saved));return{home,p};};
function walk(r,direction,frames=120){const events=[];for(let i=0;i<frames;i++){const event=r.home.update(1/120,{direction},r.p);if(event)events.push(event);}return events;}
test('home has three ascending flights and the child apartment on the second floor',()=>{
 assert.equal(HOME.floors,3);assert.equal(HOME.apartmentFloor,2);assert.equal(HOME.apartmentX,2.2);
 for(let f=0;f<3;f++){const left=homeHeight(f,HOME.left),right=homeHeight(f,HOME.right);assert(Math.abs(Math.abs(left-right)-3.2)<1e-8);assert(Math.abs(Math.min(left,right)-f*3.2)<1e-8);}
 assert(Math.abs(homeHeight(3,13.1)-9.6)<1e-8);
 const r=setup();assert.equal(r.p.y,0);assert.equal(r.p.z,homeLane(0));assert(r.p.grounded);
});
test('ascending switchbacks transfer to the next depth before reaching the second-floor apartment',()=>{
 const r=setup();let previousY=0,turns=0;
 for(const [next,direction]of[[1,1],[2,-1]]){
  let done=false;
  for(let i=0;i<1800;i++){
   const event=r.home.update(1/120,{direction},r.p);assert(r.p.y>=previousY-1e-8);previousY=r.p.y;
   if(r.home.state.phase==='turn'){turns++;assert.equal(r.home.snapshot(),null);}
   if(event==='floor'){assert.equal(r.home.state.flight,next);assert.equal(r.p.z,homeLane(next));done=true;break;}
  }assert(done);
 }
 walk(r,-1,200);assert.equal(r.p.x,HOME.minX);assert(Math.abs(r.p.y-6.4)<1e-8);assert(r.home.state.nearApartment);assert(turns>100);
 const snapshot=r.home.snapshot(),restored=setup(snapshot);assert.deepEqual(restored.home.snapshot(),snapshot);assert.equal(restored.p.z,homeLane(2));
});
test('third floor remains connected above the apartment without extra floors',()=>{
 const r=setup({flight:2,x:HOME.apartmentX,face:1});let complete=false;
 for(let i=0;i<2200;i++){const event=r.home.update(1/120,{direction:1},r.p);if(event==='floor'){complete=true;break;}}
 assert(complete);walk(r,1,400);assert.equal(r.home.state.flight,3);assert.equal(r.p.x,HOME.maxX);assert(Math.abs(r.p.y-9.6)<1e-8);assert(!r.home.state.nearApartment);
});
test('pause and invalid time freeze a landing turn and New Game reset clears progress',()=>{
 const r=setup({flight:0,x:11.59,face:1});walk(r,1,10);assert.equal(r.home.state.phase,'turn');
 const before=structuredClone({s:r.home.state,p:r.p});for(const dt of [0,-1,NaN,Infinity])r.home.update(dt,{direction:-1},r.p);assert.deepEqual({s:r.home.state,p:r.p},before);
 r.home.reset();assert.equal(r.home.state,null);assert.equal(r.home.snapshot(),null);assert(r.home.begin(r.p));assert.equal(r.home.state.flight,0);assert.equal(r.p.y,0);
});
test('home Continue rejects unsupported or impossible positions and returns independent snapshots',()=>{
 for(const value of [null,[],{}, {flight:4,x:13,face:1},{flight:1,x:2.2,face:-1},{flight:0,x:14,face:1},{flight:3,x:2.2,face:1},{flight:2,x:NaN,face:1}])assert.equal(normalizeHomeSave(value),null);
 const r=setup({flight:2,x:2.2,face:-1}),s=r.home.snapshot();s.flight=0;s.x=9;assert.equal(r.home.state.flight,2);assert.equal(r.p.x,2.2);
});
